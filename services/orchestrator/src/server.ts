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

// -- JWT payload type --

interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

// -- Active sessions map --

const activeSessions = new Map<string, SessionHandler>();
const activeVoiceHandlers = new Map<string, VoiceHandler>();

// -- Bootstrap --

const main = async (): Promise<void> => {
  const config = loadConfig();

  // Initialize AI Router
  const aiRouter = new AiRouter(config.ai as AiProviderConfig);
  await aiRouter.initialize();

  // Create HTTP + Socket.io server
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

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

    // ---- session:start ----
    socket.on(
      'session:start',
      async (data: { sessionId: string }) => {
        const { sessionId } = data;

        if (activeSessions.has(sessionId)) {
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
        activeSessions.set(sessionId, handler);

        try {
          await handler.start();
        } catch (err) {
          console.error(`[session:${sessionId}] Start failed:`, err);
          socket.emit('session:error', {
            message: 'Failed to start session',
          });
          activeSessions.delete(sessionId);
        }
      }
    );

    // ---- session:message ----
    socket.on(
      'session:message',
      async (data: { sessionId: string; text: string }) => {
        const handler = activeSessions.get(data.sessionId);
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
        const handler = activeSessions.get(data.sessionId);
        if (!handler) return;
        handler.handleEmotionUpdate(data.emotion);
      }
    );

    // ---- session:suds ----
    socket.on(
      'session:suds',
      (data: { sessionId: string; value: number; context: string }) => {
        const handler = activeSessions.get(data.sessionId);
        if (!handler) return;
        handler.handleSudsRating(data.value, data.context);
      }
    );

    // ---- session:voc ----
    socket.on(
      'session:voc',
      (data: { sessionId: string; value: number; context: string }) => {
        const handler = activeSessions.get(data.sessionId);
        if (!handler) return;
        handler.handleVocRating(data.value, data.context);
      }
    );

    // ---- session:stop_signal ----
    socket.on(
      'session:stop_signal',
      (data: { sessionId: string }) => {
        const handler = activeSessions.get(data.sessionId);
        if (!handler) return;
        handler.handleStopSignal();
      }
    );

    // ---- session:pause ----
    socket.on(
      'session:pause',
      (data: { sessionId: string }) => {
        const handler = activeSessions.get(data.sessionId);
        if (!handler) return;
        handler.handlePause();
      }
    );

    // ---- session:resume ----
    socket.on(
      'session:resume',
      (data: { sessionId: string }) => {
        const handler = activeSessions.get(data.sessionId);
        if (!handler) return;
        handler.handleResume();
      }
    );

    // ---- session:end ----
    socket.on(
      'session:end',
      async (data: { sessionId: string }) => {
        const handler = activeSessions.get(data.sessionId);
        if (!handler) return;

        try {
          await handler.endSession();
        } catch (err) {
          console.error(`[session:${data.sessionId}] End error:`, err);
        } finally {
          activeSessions.delete(data.sessionId);
        }
      }
    );

    // ---- voice:start ----
    socket.on(
      'voice:start',
      async (data: { sessionId: string }) => {
        const handler = activeSessions.get(data.sessionId);
        if (!handler) {
          socket.emit('voice:error', { message: 'Session not found' });
          return;
        }

        // Create voice handler if not exists
        if (!activeVoiceHandlers.has(data.sessionId)) {
          const voiceHandler = new VoiceHandler(
            socket,
            data.sessionId,
            {
              voskUrl: config.voskUrl,
              piperUrl: config.piperUrl,
            },
            handler
          );
          activeVoiceHandlers.set(data.sessionId, voiceHandler);
        }

        try {
          await activeVoiceHandlers.get(data.sessionId)!.start();
        } catch (err) {
          console.error(`[voice:${data.sessionId}] Start failed:`, err);
        }
      }
    );

    // ---- voice:audio ----
    socket.on(
      'voice:audio',
      (data: { sessionId: string; audio: ArrayBuffer; timestamp: number }) => {
        const voiceHandler = activeVoiceHandlers.get(data.sessionId);
        if (!voiceHandler) return;
        voiceHandler.handleAudioChunk(data.audio);
      }
    );

    // ---- voice:stop ----
    socket.on(
      'voice:stop',
      (data: { sessionId: string }) => {
        const voiceHandler = activeVoiceHandlers.get(data.sessionId);
        if (voiceHandler) {
          voiceHandler.stop();
          activeVoiceHandlers.delete(data.sessionId);
        }
      }
    );

    // ---- disconnect ----
    socket.on('disconnect', (reason) => {
      console.log(
        `[ws] Client disconnected: userId=${userId} reason=${reason}`
      );
      // Cleanup voice handlers for disconnected client
      for (const [sessionId, voiceHandler] of activeVoiceHandlers) {
        voiceHandler.stop();
        activeVoiceHandlers.delete(sessionId);
      }
    });
  });

  // -- Start listening --
  httpServer.listen(config.port, () => {
    console.log(
      `[orchestrator] Listening on port ${config.port} (${config.nodeEnv})`
    );
  });
};

main().catch((err) => {
  console.error('[orchestrator] Fatal error:', err);
  process.exit(1);
});
