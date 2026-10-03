import type { AITextRequest, AITextResponse, AIStructuredRequest, AIProviderName } from '@guitarmind/core';

export interface AIProvider {
  name: AIProviderName;
  generateText(request: AITextRequest, apiKey: string, modelOverride?: string): Promise<AITextResponse>;
  generateStructured<TSchema>(request: AIStructuredRequest<TSchema>, apiKey: string, modelOverride?: string): Promise<TSchema>;
  validateApiKey(apiKey: string): Promise<boolean>;
}
