import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  /**
   * Liveness probe — «процесс жив и отвечает».
   * Не проверяет зависимости (DB, Redis), иначе K8s будет рестартовать pod
   * при падении БД, что только усугубит ситуацию.
   */
  @Get(['health', 'healthz', 'health/live'])
  @ApiOperation({ summary: 'Liveness probe (процесс жив)' })
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
    };
  }

  /**
   * Readiness probe — «готов принимать трафик».
   * Проверяет все внешние зависимости. Возвращает 503 если хотя бы одна
   * недоступна, чтобы K8s временно убрал pod из ротации.
   */
  @Get(['readyz', 'health/ready'])
  @ApiOperation({ summary: 'Readiness probe (DB + deps)' })
  async ready() {
    const checks: Record<string, { status: 'up' | 'down'; error?: string }> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'up' };
    } catch (err) {
      checks.database = {
        status: 'down',
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const allUp = Object.values(checks).every((c) => c.status === 'up');

    const body = {
      status: allUp ? 'ok' : 'error',
      checks,
      timestamp: new Date().toISOString(),
    };

    if (!allUp) {
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return body;
  }
}
