/**
 * Session server — принимает подключения клиентов, собирает VoicePipeline
 * по AgentConfig, гоняет аудио через transport.
 *
 * Требования (docs/REQUIREMENTS.md § 4):
 * - stateless: состояние сессий в Redis → горизонтальное масштабирование
 * - конфиги агентов: файл/БД + hot reload
 * - история разговоров: storage hook (паритет #15)
 *
 * TODO(extract): перенести session-механику из emdr42 services/orchestrator,
 * отвязав от EMDR-домена (фазы, SUDS, safety-мониторинг остаются в emdr42).
 */
export {};
