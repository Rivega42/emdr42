/**
 * WebSocket Server
 *
 * Socket.io server on port 8002 with JWT authentication.
 * Namespace: /session
 * Orchestrates live EMDR therapy sessions.
 */

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AiRouter } from '@emdr42/ai-providers';
import type { AiProviderConfig } from '@emdr42/ai-providers';
import type { EmotionSnapshot } from '@emdr42/emdr-engine';

import { loadConfig } from './config';
import { SessionHandler } from './session-handler';
import { BackendClient } from './backend-client';
import { VoiceHandler } from './voice-handler';
import { SessionRegistry } from './session-registry';
import { metrics, metricsHandler } from './metrics';

// -- JWT payload type --

interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

// -- Registry (replaces naked Maps to prevent leaks, #117) --

const registry = new SessionRegistry();

// -- Bootstrap --

const main = async (): Promise<void> => {
  const config = loadConfig();

  // Initialize AI Router
  const aiRouter = new AiRouter(config.ai as AiProviderConfig);
  await aiRouter.initialize();

  // Start idle sweeper
  registry.startSweeper();

  // Create HTTP + Socket.io server with /metrics + /health routes
  const httpServer = createServer(async (req, res) => {
    if (!req.url) return res.end();
    if (req.url.startsWith('/metrics')) {
      const { contentType, body } = await metricsHandler();
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(body);
      return;
    }
    if (req.url.startsWith('/health') || req.url.startsWith('/healthz')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
      return;
    }
    res.writeHead(404);
    res.end('Not Found');
  });

  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  // Обновляем Gauge метрики периодически
  setInterval(() => {
    const { sessions, voice } = registry.size();
    metrics.activeSessions.set(sessions);
    metrics.activeVoice.set(voice);
  }, 5000).unref();

  // -- /session namespace --
  const sessionNs = io.of('/session');

  // JWT authentication middleware
  sessionNs.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ??
      socket.handshake.query?.token;

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
      (socket as any).userId = payload.sub;
      (socket as any).userToken = token;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // -- Connection handler --
  sessionNs.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const userToken = (socket as any).userToken as string;

    console.log(`[ws] Client connected: userId=${userId} socketId=${socket.id}`);
    metrics.wsConnections.inc();

    // ---- session:start ----
    socket.on(
      'session:start',
      async (data: { sessionId: string }) => {
        const { sessionId } = data;

        if (registry.hasSession(sessionId)) {
          socket.emit('session:error', {
            message: 'Session already active',
          });
          return;
        }

        const backendClient = new BackendClient(
          config.apiBaseUrl,
          userToken
        );
        const handler = new SessionHandler(
          socket,
          sessionId,
          userId,
          aiRouter,
          backendClient
        );
        registry.addSession(sessionId, {
          handler,
          socketId: socket.id,
          userId,
        });

        try {
          await handler.start();
        } catch (err) {
          console.error(`[session:${sessionId}] Start failed:`, err);
          socket.emit('session:error', {
            message: 'Failed to start session',
          });
          registry.removeSession(sessionId);
        }
      }
    );

    // ---- session:message ----
    socket.on(
      'session:message',
      async (data: { sessionId: string; text: string }) => {
        const handler = registry.getSession(data.sessionId);
        if (!handler) {
          socket.emit('session:error', { message: 'Session not found' });
          return;
        }
        try {
          await handler.handlePatientMessage(data.text);
        } catch (err) {
          console.error(`[session:${data.sessionId}] Message error:`, err);
        }
      }
    );

    // ---- session:emotion ----
    socket.on(
      'session:emotion',
      (data: { sessionId: string; emotion: EmotionSnapshot }) => {
        const handler = registry.getSession(data.sessionId);
        if (!handler) return;
        handler.handleEmotionUpdate(data.emotion);
      }
    );

    // ---- session:suds ----
    socket.on(
      'session:suds',
      (data: { sessionId: string; value: number; context: string }) => {
        const handler = registry.getSession(data.sessionId);
        if (!handler) return;
        handler.handleSudsRating(data.value, data.context);
      }
    );

    // ---- session:voc ----
    socket.on(
      'session:voc',
      (data: { sessionId: string; value: number; context: string }) => {
        const handler = registry.getSession(data.sessionId);
        if (!handler) return;
        handler.handleVocRating(data.value, data.context);
      }
    );

    // ---- session:stop_signal ----
    socket.on(
      'session:stop_signal',
      (data: { sessionId: string }) => {
        const handler = registry.getSession(data.sessionId);
        if (!handler) return;
        handler.handleStopSignal();
      }
    );

    // ---- session:pause ----
    socket.on(
      'session:pause',
      (data: { sessionId: string }) => {
        const handler = registry.getSession(data.sessionId);
        if (!handler) return;
        handler.handlePause();
      }
    );

    // ---- session:resume ----
    socket.on(
      'session:resume',
      (data: { sessionId: string }) => {
        const handler = registry.getSession(data.sessionId);
        if (!handler) return;
        handler.handleResume();
      }
    );

    // ---- session:end ----
    socket.on(
      'session:end',
      async (data: { sessionId: string }) => {
        const handler = registry.getSession(data.sessionId);
        if (!handler) return;

        try {
          await handler.endSession();
        } catch (err) {
          console.error(`[session:${data.sessionId}] End error:`, err);
        } finally {
          registry.removeSession(data.sessionId);
        }
      }
    );

    // ---- voice:start ----
    socket.on(
      'voice:start',
      async (data: { sessionId: string }) => {
        const handler = registry.getSession(data.sessionId);
        if (!handler) {
          socket.emit('voice:error', { message: 'Session not found' });
          return;
        }

        if (!registry.getVoice(data.sessionId)) {
          const voiceHandler = new VoiceHandler(
            socket,
            data.sessionId,
            {
              voskUrl: config.voskUrl,
              piperUrl: config.piperUrl,
            },
            handler
          );
          registry.addVoice(data.sessionId, {
            handler: voiceHandler,
            socketId: socket.id,
          });
        }

        try {
          await registry.getVoice(data.sessionId)!.start();
        } catch (err) {
          console.error(`[voice:${data.sessionId}] Start failed:`, err);
        }
      }
    );

    // ---- voice:audio ----
    socket.on(
      'voice:audio',
      (data: { sessionId: string; audio: ArrayBuffer; timestamp: number }) => {
        const voiceHandler = registry.getVoice(data.sessionId);
        if (!voiceHandler) return;
        voiceHandler.handleAudioChunk(data.audio);
      }
    );

    // ---- voice:stop ----
    socket.on(
      'voice:stop',
      (data: { sessionId: string }) => {
        const voiceHandler = registry.getVoice(data.sessionId);
        if (voiceHandler) {
          try {
            voiceHandler.stop();
          } catch (err) {
            console.warn(`[voice:${data.sessionId}] stop error:`, err);
          }
          registry.removeVoice(data.sessionId);
        }
      }
    );

    // ---- error ----
    socket.on('error', (err) => {
      console.error(`[ws] socket error userId=${userId} socketId=${socket.id}:`, err);
    });

    // ---- disconnect ----
    socket.on('disconnect', async (reason) => {
      console.log(
        `[ws] Client disconnected: userId=${userId} socketId=${socket.id} reason=${reason}`
      );
      metrics.wsConnections.dec();

      // Cleanup только сессий ЭТОГО socket (ранее чистились все сессии всех клиентов).
      const voiceIds = registry.voiceBySocket(socket.id);
      for (const sid of voiceIds) {
        const voice = registry.getVoice(sid);
        if (voice) {
          try { voice.stop(); } catch (err) { console.warn(`[voice:${sid}] stop error`, err); }
          registry.removeVoice(sid);
        }
      }

      const sessionIds = registry.sessionsBySocket(socket.id);
      for (const sid of sessionIds) {
        const handler = registry.getSession(sid);
        if (handler) {
          try {
            await handler.endSession();
          } catch (err) {
            console.warn(`[session:${sid}] endSession on disconnect failed:`, err);
          }
          registry.removeSession(sid);
        }
      }
    });
  });

  // -- Start listening --
  httpServer.listen(config.port, () => {
    console.log(
      `[orchestrator] Listening on port ${config.port} (${config.nodeEnv})`
    );
  });

  // -- Graceful shutdown (см. #124) --
  const shutdown = async (signal: string) => {
    console.log(`[orchestrator] Received ${signal}, shutting down...`);
    registry.stopSweeper();
    io.close(() => console.log('[orchestrator] Socket.io closed'));
    httpServer.close(() => {
      console.log('[orchestrator] HTTP server closed');
      process.exit(0);
    });
    // Hard timeout — если open connections не закрылись за 15с, force exit
    setTimeout(() => {
      console.warn('[orchestrator] Forced exit after shutdown timeout');
      process.exit(1);
    }, 15000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

main().catch((err) => {
  console.error('[orchestrator] Fatal error:', err);
  process.exit(1);
});
