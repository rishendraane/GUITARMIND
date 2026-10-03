import type { AIProvider } from './types';
import type { AITextRequest, AITextResponse, AIStructuredRequest } from '@guitarmind/core';

export class ClaudeProvider implements AIProvider {
  name = 'claude' as const;

  async generateText(request: AITextRequest, apiKey: string, modelOverride?: string): Promise<AITextResponse> {
    const model = modelOverride || request.model || 'claude-3-5-sonnet-20241022';
    const url = 'https://api.anthropic.com/v1/messages';

    const messages = request.messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model,
        messages,
        system: request.systemInstruction || undefined,
        max_tokens: request.maxTokens || 1024,
        temperature: request.temperature ?? 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude status ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const text = json.content?.[0]?.text || '';
    return {
      content: text,
      metadata: {
        provider: 'claude',
        model,
        tokensUsed: json.usage?.total_tokens
      }
    };
  }

  async generateStructured<TSchema>(request: AIStructuredRequest<TSchema>, apiKey: string, modelOverride?: string): Promise<TSchema> {
    const model = modelOverride || request.model || 'claude-3-5-sonnet-20241022';
    const url = 'https://api.anthropic.com/v1/messages';

    const schemaStr = JSON.stringify(request.responseSchema, null, 2);
    const userPrompt = `${request.prompt}\n\nYou MUST respond ONLY with a raw JSON object matching this JSON Schema:\n${schemaStr}\n\nDo not wrap the response in markdown blocks (e.g. \`\`\`json). Return ONLY valid raw JSON.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: userPrompt }],
        system: request.systemPrompt || undefined,
        max_tokens: 1024,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude Structured status ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const text = json.content?.[0]?.text || '';

    // Clean potential markdown blocks from response text
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();

    return JSON.parse(cleanText) as TSchema;
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
