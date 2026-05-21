import Anthropic from '@anthropic-ai/sdk';
import type {
  LlmProvider,
  ChatMessage,
  ChatResponse,
  LlmOptions,
} from '../types';
import { applyArmor } from '../armor-helper';

export interface AnthropicProviderConfig {
  apiKey: string;
  model?: string;
}

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  private defaultModel: string;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.defaultModel = config.model ?? 'claude-sonnet-4-20250514';
  }

  async chat(
    messages: ChatMessage[],
    options?: LlmOptions
  ): Promise<ChatResponse> {
    const start = Date.now();
    const armored = applyArmor(messages, options);

    const response = await this.client.messages.create({
      model: options?.model ?? this.defaultModel,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature,
      system: armored.systemPrompt || undefined,
      messages: armored.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const content =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    return {
      content,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
      },
      model: response.model,
      latencyMs: Date.now() - start,
    };
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: LlmOptions
  ): AsyncGenerator<string> {
    const armored = applyArmor(messages, options);

    const stream = this.client.messages.stream({
      model: options?.model ?? this.defaultModel,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature,
      system: armored.systemPrompt || undefined,
      messages: armored.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Anthropic API uses a top-level `system` param rather than a system message.
   * Extract the system prompt from messages or options.
   */
  private extractSystem(
    messages: ChatMessage[],
    options?: LlmOptions
  ): { system: string | null; userMessages: ChatMessage[] } {
    let system: string | null = options?.systemPrompt ?? null;
    const userMessages: ChatMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = msg.content;
      } else {
        userMessages.push(msg);
      }
    }

    return { system, userMessages };
  }
}
