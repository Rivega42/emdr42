import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private registry: client.Registry;

  public httpRequestsTotal: client.Counter<string>;
  public httpRequestDuration: client.Histogram<string>;
  public activeSessionsGauge: client.Gauge<string>;
  public activeWebsocketConnections: client.Gauge<string>;

  constructor() {
    this.registry = new client.Registry();
    client.collectDefaultMetrics({ register: this.registry });

    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.activeSessionsGauge = new client.Gauge({
      name: 'active_sessions_count',
      help: 'Number of active therapy sessions',
      registers: [this.registry],
    });

    this.activeWebsocketConnections = new client.Gauge({
      name: 'active_websocket_connections',
      help: 'Number of active WebSocket connections',
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // Default metrics already collected
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
