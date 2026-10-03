import { GroqProvider } from './groq';
import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';
import { OpenRouterProvider } from './openrouter';
import { OllamaProvider } from './ollama';
import type { AIProvider } from './types';
import type { AIProviderName } from '@guitarmind/core';

export class ProviderManager {
  private static providers: Record<string, AIProvider> = {
    groq: new GroqProvider(),
    gemini: new GeminiProvider(),
    google: new GeminiProvider(),
    openai: new OpenAIProvider(),
    claude: new ClaudeProvider(),
    anthropic: new ClaudeProvider(),
    openrouter: new OpenRouterProvider(),
    ollama: new OllamaProvider(),
    local: new OllamaProvider(),
  };

  static getProvider(name: AIProviderName | 'ollama' | 'local'): AIProvider {
    const key = (name as string).toLowerCase();
    const provider = this.providers[key];
    if (!provider) {
      throw new Error(`AI Provider ${name} is not registered or supported.`);
    }
    return provider;
  }

  static hasProvider(name: string): boolean {
    return !!(this.providers as any)[name.toLowerCase()];
  }

  /** Returns the Ollama provider; used as the no-API-key default */
  static getOllamaProvider(): OllamaProvider {
    return this.providers['ollama'] as OllamaProvider;
  }
}

