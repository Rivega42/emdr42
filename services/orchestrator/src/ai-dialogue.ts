/**
 * AI Dialogue Manager
 *
 * Manages the conversation with the LLM, including system prompt updates,
 * streaming responses, and phase-transition detection from AI output.
 */

import type { AiRouter, ChatMessage } from '@emdr42/ai-providers';
import type { EmdrPhase } from '@emdr42/emdr-engine';

/** Keywords per phase that indicate the AI is suggesting a transition. */
const TRANSITION_PATTERNS: Array<{ pattern: RegExp; phase: EmdrPhase }> = [
  { pattern: /let's move to preparation/i, phase: 'preparation' },
  { pattern: /ready for preparation/i, phase: 'preparation' },
  { pattern: /let's move to assessment/i, phase: 'assessment' },
  { pattern: /ready for assessment/i, phase: 'assessment' },
  { pattern: /shall we begin (the )?assessment/i, phase: 'assessment' },
  { pattern: /let's move to desensitization/i, phase: 'desensitization' },
  { pattern: /ready for desensitization/i, phase: 'desensitization' },
  { pattern: /let's begin (the )?reprocessing/i, phase: 'desensitization' },
  { pattern: /let's move to installation/i, phase: 'installation' },
  { pattern: /ready for installation/i, phase: 'installation' },
  { pattern: /let's strengthen the positive belief/i, phase: 'installation' },
  { pattern: /let's move to (the )?body scan/i, phase: 'body_scan' },
  { pattern: /let's do a body scan/i, phase: 'body_scan' },
  { pattern: /let's move to closure/i, phase: 'closure' },
  { pattern: /let's close (the|this) session/i, phase: 'closure' },
  { pattern: /let's move to reevaluation/i, phase: 'reevaluation' },
];

export class AiDialogue {
  private aiRouter: AiRouter;
  private history: ChatMessage[];
  private systemPrompt: string;

  constructor(aiRouter: AiRouter, systemPrompt: string) {
    this.aiRouter = aiRouter;
    this.systemPrompt = systemPrompt;
    this.history = [];
  }

  /**
   * Send a message and stream the AI response back.
   * Yields text chunks as they arrive, and records the full response in history.
   */
  async *sendMessage(
    userMessage: string,
    context: string
  ): AsyncGenerator<string> {
    // Add user message to history
    this.history.push({ role: 'user', content: userMessage });

    // Build messages array: system prompt (with context prepended), then history
    const systemContent = context
      ? `${this.systemPrompt}\n\n--- Current Session Context ---\n${context}`
      : this.systemPrompt;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemContent },
      ...this.history,
    ];

    let fullResponse = '';

    const stream = this.aiRouter.chatStream(messages);
    for await (const chunk of stream) {
      fullResponse += chunk;
      yield chunk;
    }

    // Record assistant response in history
    if (fullResponse) {
      this.history.push({ role: 'assistant', content: fullResponse });
    }
  }

  /** Get full conversation history (excluding system messages). */
  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  /**
   * Analyze an AI response for phase transition hints.
   * Returns whether a transition is suggested and to which phase.
   */
  analyzeResponse(response: string): {
    suggestsTransition: boolean;
    nextPhase?: EmdrPhase;
  } {
    for (const { pattern, phase } of TRANSITION_PATTERNS) {
      if (pattern.test(response)) {
        return { suggestsTransition: true, nextPhase: phase };
      }
    }
    return { suggestsTransition: false };
  }

  /** Update the system prompt (e.g., when the phase changes). */
  updateSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }
}
