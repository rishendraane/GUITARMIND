import type { AIProvider } from './types';
import type { AITextRequest, AITextResponse, AIStructuredRequest } from '@guitarmind/core';

export class GeminiProvider implements AIProvider {
  name = 'gemini' as const;

  async generateText(request: AITextRequest, apiKey: string, modelOverride?: string): Promise<AITextResponse> {
    const model = modelOverride || request.model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = request.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const systemInstruction = request.systemInstruction 
      ? { parts: [{ text: request.systemInstruction }] }
      : undefined;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens || 1000
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini status ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      content: text,
      metadata: {
        provider: 'gemini',
        model,
        tokensUsed: json.usageMetadata?.totalTokenCount
      }
    };
  }

  async generateStructured<TSchema>(request: AIStructuredRequest<TSchema>, apiKey: string, modelOverride?: string): Promise<TSchema> {
    const model = modelOverride || request.model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: `${request.prompt}\n\nYou MUST respond with valid JSON matching the specified schema format.` }]
      }
    ];

    const systemInstruction = request.systemPrompt 
      ? { parts: [{ text: request.systemPrompt }] }
      : undefined;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: request.responseSchema,
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini Structured status ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return JSON.parse(text) as TSchema;
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 5 }
        })
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
