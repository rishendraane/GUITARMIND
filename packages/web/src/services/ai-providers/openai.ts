import type { AIProvider } from './types';
import type { AITextRequest, AITextResponse, AIStructuredRequest } from '@guitarmind/core';

export class OpenAIProvider implements AIProvider {
  name = 'openai' as const;

  async generateText(request: AITextRequest, apiKey: string, modelOverride?: string): Promise<AITextResponse> {
    const model = modelOverride || request.model || 'gpt-4o';
    const url = 'https://api.openai.com/v1/chat/completions';

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
        'Authorization': `Bearer ${apiKey}`
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
      throw new Error(`OpenAI status ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const text = json.choices?.[0]?.message?.content || '';
    return {
      content: text,
      metadata: {
        provider: 'openai',
        model,
        tokensUsed: json.usage?.total_tokens
      }
    };
  }

  async generateStructured<TSchema>(request: AIStructuredRequest<TSchema>, apiKey: string, modelOverride?: string): Promise<TSchema> {
    const model = modelOverride || request.model || 'gpt-4o';
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'structured_response',
            strict: true,
            schema: request.responseSchema
          }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Structured status ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const text = json.choices?.[0]?.message?.content || '';
    return JSON.parse(text) as TSchema;
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
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
