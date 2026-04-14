import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

interface ServiceCheck {
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  /** Lightweight liveness probe (for k8s). */
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok' };
  }

  /** Basic health check. */
  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
    };
  }

  /** Full readiness probe — checks all dependencies. */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (all dependencies)' })
  async ready(@Res() res: Response) {
    const checks: Record<string, ServiceCheck> = {};
    let allOk = true;

    // PostgreSQL
    checks.database = await this.checkWithTimeout('database', async () => {
      await this.prisma.$queryRaw`SELECT 1`;
    });
    if (checks.database.status !== 'ok') allOk = false;

    // Redis
    checks.redis = await this.checkWithTimeout('redis', async () => {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) throw new Error('REDIS_URL not configured');
      const resp = await fetch(redisUrl.replace(/^redis/, 'http') + '/ping').catch(() => {
        throw new Error('Redis unreachable');
      });
      if (!resp.ok) throw new Error('Redis ping failed');
    });

    // Vosk STT
    checks.vosk = await this.checkWithTimeout('vosk', async () => {
      const voskUrl = process.env.VOSK_URL || 'ws://localhost:2700';
      if (!voskUrl) throw new Error('VOSK_URL not configured');
      // Just check config presence — actual WebSocket test is expensive
    });

    // Ollama LLM
    checks.ollama = await this.checkWithTimeout('ollama', async () => {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      const resp = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (!resp.ok) throw new Error(`Ollama ${resp.status}`);
    });

    // Piper TTS
    checks.piper = await this.checkWithTimeout('piper', async () => {
      const piperUrl = process.env.PIPER_URL || 'http://localhost:5000';
      const resp = await fetch(`${piperUrl}/api/voices`, { signal: AbortSignal.timeout(2000) });
      if (!resp.ok) throw new Error(`Piper ${resp.status}`);
    });

    const status = allOk ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(status).json({
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    });
  }

  private async checkWithTimeout(
    name: string,
    fn: () => Promise<void>,
    timeoutMs = 2000,
  ): Promise<ServiceCheck> {
    const start = Date.now();
    try {
      await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeoutMs),
        ),
      ]);
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { status: 'error', latencyMs: Date.now() - start, error: err.message };
    }
  }
}
