import OpenAI from 'openai';
import type {
  LlmProvider,
  ChatMessage,
  ChatResponse,
  LlmOptions,
} from '../types';

export interface OllamaProviderConfig {
  baseUrl?: string;
  model?: string;
}

const DEFAULT_BASE_URL = 'http://localhost:11434/v1';

export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';
  private client: OpenAI;
  private defaultModel: string;
  private baseUrl: string;

  constructor(config: OllamaProviderConfig = {}) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.client = new OpenAI({
      apiKey: 'ollama', // Ollama doesn't require a real key
      baseURL: this.baseUrl,
    });
    this.defaultModel = config.model ?? 'llama3.1';
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
      const response = await fetch(
        this.baseUrl.replace('/v1', '/api/tags')
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private buildMessages(
    messages: ChatMessage[],
    options?: LlmOptions
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      result.push({ role: 'system', content: options.systemPrompt });
    }

    for (const msg of messages) {
      result.push({ role: msg.role, content: msg.content });
    }

    return result;
  }
}
