import OpenAI from 'openai';
import type {
  LlmProvider,
  ChatMessage,
  ChatResponse,
  LlmOptions,
} from '../types';
import { applyArmor } from '../armor-helper';

export interface OpenAiLlmProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class OpenAiLlmProvider implements LlmProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: OpenAiLlmProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.defaultModel = config.model ?? 'gpt-4o';
  }

  async chat(
    messages: ChatMessage[],
    options?: LlmOptions
  ): Promise<ChatResponse> {
    const start = Date.now();
    const allMessages = this.buildMessages(messages, options);

    const response = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
      messages: allMessages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });

    const choice = response.choices[0];
    return {
      content: choice?.message?.content ?? '',
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      },
      model: response.model,
      latencyMs: Date.now() - start,
    };
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: LlmOptions
  ): AsyncGenerator<string> {
    const allMessages = this.buildMessages(messages, options);

    const stream = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
      messages: allMessages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  private buildMessages(
    messages: ChatMessage[],
    options?: LlmOptions
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const armored = applyArmor(messages, options);
    const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (armored.systemPrompt) {
      result.push({ role: 'system', content: armored.systemPrompt });
    }

    for (const msg of armored.messages) {
      if (msg.role === 'system') continue; // уже в armored.systemPrompt
      result.push({ role: msg.role, content: msg.content });
    }

    return result;
  }
}
