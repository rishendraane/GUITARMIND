import type { AIProvider } from './types';
import type { AITextRequest, AITextResponse, AIStructuredRequest } from '@guitarmind/core';

/**
 * OllamaProvider — connects to a locally running Ollama instance.
 * Ollama exposes an OpenAI-compatible REST API at http://localhost:11434
 * No API key required. Falls back gracefully if server is offline.
 */
export class OllamaProvider implements AIProvider {
  name = 'groq' as const; // reuse 'groq' slot so existing code works
  private baseUrl = 'http://localhost:11434';

  /** Order of models to try, best quality first */
  private modelPriority = [
    'guitarmind-ai',   // custom trained guitar coaching model
    'llama3.2:1b',
    'llama3.2',
    'qwen2.5:7b',
    'llama3.1:8b',
    'llama3.1',
    'mistral',
    'mistral:7b',
    'gemma2',
    'gemma2:2b',
    'phi3',
    'phi3:mini',
    'deepseek-r1:7b',
  ];

  private async getAvailableModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map((m: any) => m.name as string);
    } catch {
      return [];
    }
  }

  private async selectBestModel(preferred?: string): Promise<string | null> {
    const available = await this.getAvailableModels();
    if (available.length === 0) return null;

    if (preferred) {
      const exact = available.find(m => m === preferred || m.startsWith(preferred + ':'));
      if (exact) return exact;
    }

    for (const candidate of this.modelPriority) {
      const match = available.find(m => m === candidate || m.startsWith(candidate + ':'));
      if (match) return match;
    }

    return available[0]; // fallback: first available
  }

  async generateText(request: AITextRequest, _apiKey: string, modelOverride?: string): Promise<AITextResponse> {
    const primaryModel = await this.selectBestModel(modelOverride || request.model);
    if (!primaryModel) {
      throw new Error('No Ollama models available. Please start Ollama or pull llama3.2:1b.');
    }

    const messages: any[] = [];
    if (request.systemInstruction) {
      messages.push({ role: 'system', content: request.systemInstruction });
    }
    request.messages.forEach(m => {
      messages.push({ role: m.role, content: m.content });
    });

    const candidates = Array.from(new Set([primaryModel, 'guitarmind-ai', 'llama3.2:1b']));
    let lastError: any = null;

    for (const candidateModel of candidates) {
      try {
        const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: candidateModel,
            messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens || 1024,
            stream: false,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Ollama error ${res.status}: ${errText}`);
        }

        const json = await res.json();
        const text = json.choices?.[0]?.message?.content || '';
        return {
          content: text,
          metadata: { provider: 'groq', model: candidateModel }
        };
      } catch (err) {
        lastError = err;
        console.warn(`Ollama call with model ${candidateModel} failed, trying next candidate:`, err);
      }
    }

    throw lastError || new Error('Ollama inference failed.');
  }

  async generateStructured<TSchema>(request: AIStructuredRequest<TSchema>, _apiKey: string, modelOverride?: string): Promise<TSchema> {
    const model = await this.selectBestModel(modelOverride || request.model);
    if (!model) {
      throw new Error('No Ollama models available. Please run "ollama pull llama3.2" first.');
    }

    const messages: any[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    const schemaStr = JSON.stringify(request.responseSchema, null, 2);
    messages.push({
      role: 'user',
      content: `${request.prompt}\n\nRespond ONLY with a raw JSON object matching this schema:\n${schemaStr}\nDo NOT wrap in markdown. Return ONLY valid JSON.`
    });

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        stream: false,
        format: 'json',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama structured error ${res.status}: ${errText}`);
    }

    const json = await res.json();
    let text = (json.choices?.[0]?.message?.content || '').trim();
    if (text.startsWith('```json')) text = text.slice(7);
    else if (text.startsWith('```')) text = text.slice(3);
    if (text.endsWith('```')) text = text.slice(0, -3);
    return JSON.parse(text.trim()) as TSchema;
  }

  async validateApiKey(_apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Check if Ollama is running locally */
  static async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}
