import type { AIProvider } from './types';
import type { AITextRequest, AITextResponse, AIStructuredRequest } from '@guitarmind/core';

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter' as const;

  async generateText(request: AITextRequest, apiKey: string, modelOverride?: string): Promise<AITextResponse> {
    const model = modelOverride || request.model || 'meta-llama/llama-3.3-70b-instruct';
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const messages = [];
    if (request.systemInstruction) {
      messages.push({ role: 'system', content: request.systemInstruction });
    }
    request.messages.forEach(m => {
      messages.push({ role: m.role, content: m.content });
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'GuitarMind'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens || 1000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter status ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const text = json.choices?.[0]?.message?.content || '';
    return {
      content: text,
      metadata: {
        provider: 'openrouter',
        model,
        tokensUsed: json.usage?.total_tokens
      }
    };
  }

  async generateStructured<TSchema>(request: AIStructuredRequest<TSchema>, apiKey: string, modelOverride?: string): Promise<TSchema> {
    const model = modelOverride || request.model || 'meta-llama/llama-3.3-70b-instruct';
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    const schemaStr = JSON.stringify(request.responseSchema, null, 2);
    const userPrompt = `${request.prompt}\n\nYou MUST respond ONLY with a raw JSON object matching this JSON Schema:\n${schemaStr}\n\nDo not wrap the response in markdown blocks (e.g. \`\`\`json). Return ONLY valid raw JSON.`;
    messages.push({ role: 'user', content: userPrompt });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'GuitarMind'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter Structured status ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const text = json.choices?.[0]?.message?.content || '';

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
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3-8b-instruct:free',
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
