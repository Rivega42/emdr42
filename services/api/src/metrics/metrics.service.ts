import { Injectable, OnModuleInit } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const client = require('prom-client');

/**
 * MetricsService (#82).
 *
 * Prometheus-compatible метрики для API сервиса.
 *
 * Стандартные метрики:
 *   - http_requests_total{method,route,status}
 *   - http_request_duration_seconds (histogram)
 *   - process_* (автоматически от prom-client)
 *
 * Бизнес-метрики:
 *   - emdr_sessions_started_total
 *   - emdr_crisis_events_total{severity, type}
 *   - emdr_auth_events_total{action, success}
 *   - emdr_ai_cost_usd (counter)
 */

export interface RequestLabels {
  method: string;
  route: string;
  status: string;
}

@Injectable()
export class MetricsService implements OnModuleInit {
  public readonly register: unknown;

  public readonly httpRequests: {
    inc: (labels: RequestLabels) => void;
  };
  public readonly httpDuration: {
    observe: (labels: RequestLabels, value: number) => void;
  };
  public readonly sessionStarted: { inc: () => void };
  public readonly crisisEvents: {
    inc: (labels: { severity: string; type: string }) => void;
  };
  public readonly authEvents: {
    inc: (labels: { action: string; success: string }) => void;
  };
  public readonly aiCostUsd: {
    inc: (labels: { provider: string; type: string }, value: number) => void;
  };
  public readonly sessionSudsReduction: {
    observe: (value: number) => void;
  };

  constructor() {
    // Автоматические Node.js метрики (heap, event loop, GC)
    client.collectDefaultMetrics({ prefix: 'emdr42_api_' });

    this.register = client.register;

    this.httpRequests = new client.Counter({
      name: 'http_requests_total',
      help: 'HTTP requests count',
      labelNames: ['method', 'route', 'status'],
    });

    this.httpDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.sessionStarted = new client.Counter({
      name: 'emdr_sessions_started_total',
      help: 'Total EMDR sessions started',
    });

    this.crisisEvents = new client.Counter({
      name: 'emdr_crisis_events_total',
      help: 'Crisis events registered',
      labelNames: ['severity', 'type'],
    });

    this.authEvents = new client.Counter({
      name: 'emdr_auth_events_total',
      help: 'Auth events (login/register/etc)',
      labelNames: ['action', 'success'],
    });

    this.aiCostUsd = new client.Counter({
      name: 'emdr_ai_cost_usd_total',
      help: 'AI провайдеров cost в USD',
      labelNames: ['provider', 'type'],
    });

    this.sessionSudsReduction = new client.Histogram({
      name: 'emdr_session_suds_reduction',
      help: 'SUDS reduction за сессию (baseline - final)',
      buckets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    });
  }

  async onModuleInit() {
    // nothing — метрики уже зарегистрированы в constructor
  }

  async getMetrics(): Promise<string> {
    return (this.register as { metrics: () => Promise<string> }).metrics();
  }

  contentType(): string {
    return (this.register as { contentType: string }).contentType;
  }
}
