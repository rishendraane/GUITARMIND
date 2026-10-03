import type { AITextRequest, AITextResponse, AIStructuredRequest, AIProviderName, AIMessage } from '@guitarmind/core';
import { appStore } from '../store';
import { ContextEngine } from './context-engine';
import { MemoryEngine } from './memory-engine';
import { RecommendationEngine } from './recommendation-engine';
import { ConversationsRepo } from '../repositories/conversations.repo';
import { ProviderManager } from './ai-providers/manager';

export class AIService {
  static async generateContextualResponse(
    userId: string,
    conversationId: string,
    userMessage: string,
    baseSystemInstruction: string,
    imageMetadata?: { imageUrl: string; analysisText: string; results: any }
  ): Promise<string> {
    // 1. Store user message in DB
    await ConversationsRepo.addMessage(conversationId, userId, {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: userMessage,
      contentType: imageMetadata ? 'image_analysis' : 'text',
      timestamp: new Date().toISOString(),
      metadata: imageMetadata ? {
        imageUrl: imageMetadata.imageUrl,
        analysisText: imageMetadata.analysisText,
        results: imageMetadata.results
      } as any : undefined
    });

    // 2. Build User Context
    const context = await ContextEngine.buildContext(userId, true);
    let contextualSystemPrompt = baseSystemInstruction;

    if (imageMetadata) {
      contextualSystemPrompt += `\n\n[CURRENT IMAGE ANALYSIS CONTEXT]
The user attached an image to this message. The local image recognition model analyzed the image and returned the following result:
"${imageMetadata.analysisText}"

Address this image analysis in your response contextually. If they played a chord or had posture issues, offer specific tips!`;
    }

    if (context) {
      contextualSystemPrompt += `\n\n[USER INTEL & PROFILE CONTEXT]
User Name: ${context.user.name}
Experience Level: ${context.user.level} (XP: ${context.user.xp})
Daily Practice Streak: ${context.user.streak} days
Skill Level: ${context.profile.skillLevel}
Guitar Style: ${context.profile.guitarType}
Learning Goal: ${context.profile.goals.join(', ')}
Preferred Genres: ${context.profile.genres.join(', ')}

Known Chords: ${context.chords.known.join(', ') || 'None yet'}
Weak Chords (Need Practice): ${context.chords.weak.map(c => `${c.chord} (${c.score}%)`).join(', ') || 'None'}
Strong Chords: ${context.chords.strong.map(c => `${c.chord} (${c.score}%)`).join(', ') || 'None'}

Recent Practice Sessions:
${context.recentSessions.map(s => `- ${s.type} for ${Math.round(s.duration / 60)}m (Score: ${s.score}%)`).join('\n') || 'No sessions logged yet'}

Active Daily Missions:
${context.activeMissions.map(m => `- ${m}`).join('\n') || 'None'}

AI Core Memories & Notes:
${JSON.stringify(context.memories)}`;

      // Append roadmap progress
      if (context.roadmap) {
        contextualSystemPrompt += `\n\nActive Roadmap Stages:\n${context.roadmap.stages.map(s => `- Stage ${s.index + 1}: ${s.title} (${s.status})`).join('\n')}`;
      }

      // Append song progress
      if (context.songs && context.songs.length > 0) {
        contextualSystemPrompt += `\n\nActive Song Progress:\n${context.songs.map(s => `- Song ID: ${s.songId} (${s.status}, ${s.progressPercent}%)`).join('\n')}`;
      }

      // Append postural scans
      if (context.vision && context.vision.length > 0) {
        contextualSystemPrompt += `\n\nRecent Posture & Wrist Metrics:\n${context.vision.map(v => `- Wrist: ${v.postureData?.wristAngle ?? 'N/A'}deg, Shoulder: ${v.postureData?.shoulderAngle ?? 'N/A'}deg (${v.postureData?.postureState ?? 'N/A'})`).join('\n')}`;
      }

      contextualSystemPrompt += `\n\nAcknowledge this profile context subtly. Tailor your tips, song recommendations, and difficulty explanations directly to their current progress. If they struggle with certain weak chords, suggest exercises focusing on them.`;
    }

    // 3. Retrieve recent history from DB (up to last 15 messages)
    const dbMessages = await ConversationsRepo.getMessages(conversationId);
    const apiMessages: AIMessage[] = dbMessages.slice(-15).map(m => {
      let content = m.content;
      if (m.metadata && (m.metadata as any).analysisText) {
        content += `\n\n[Vision Model Analysis: ${(m.metadata as any).analysisText}]`;
      }
      return {
        id: m.id,
        role: m.role,
        content: content,
        contentType: m.contentType || 'text',
        timestamp: m.timestamp
      };
    });


    // 4. Generate AI Text Response
    const response = await this.generateText({
      messages: apiMessages,
      systemInstruction: contextualSystemPrompt,
      temperature: 0.7
    });

    const aiReply = response.content;

    // 5. Store AI message in DB
    await ConversationsRepo.addMessage(conversationId, userId, {
      id: `msg_${Date.now()}_a`,
      role: 'assistant',
      content: aiReply,
      contentType: 'text',
      timestamp: new Date().toISOString()
    });

    // 6. Update Memory and Recommendations asynchronously
    if (context) {
      MemoryEngine.updateFromResponse(userId, userMessage, aiReply).then(() => {
        ContextEngine.buildContext(userId, true); // refresh cache with updated memories
      });
      RecommendationEngine.generateMissions(userId, context).catch(err => {
        console.error('Error generating daily missions:', err);
      });
    }

    return aiReply;
  }

  /**
   * Safe getter to load keys parsed from JSON string or flat strings.
   */
  private static getApiKeyForProvider(provider: AIProviderName): string {
    const user = appStore.getState().currentUser;
    const rawKey = user?.aiConfig?.apiKeyEncrypted;
    if (!rawKey) return '';

    try {
      const keysObj = JSON.parse(rawKey);
      return keysObj[provider] || '';
    } catch {
      // Legacy compatibility: If rawKey is a single flat key string and active provider matches, use it
      const activeProvider = user?.aiConfig?.provider || 'groq';
      if (provider === activeProvider) {
        return rawKey;
      }
      return '';
    }
  }

  static async generateText(request: AITextRequest): Promise<AITextResponse> {
    const user = appStore.getState().currentUser;
    const provider = request.provider || user?.aiConfig?.provider || 'groq';
    const apiKey = this.getApiKeyForProvider(provider as any);

    // If no API key configured, use local Ollama (free, no key needed)
    if (!apiKey) {
      const ollamaProvider = ProviderManager.getOllamaProvider();
      const isOnline = await ollamaProvider.validateApiKey('');
      if (isOnline) {
        return ollamaProvider.generateText(request, '');
      }
      throw new Error('No AI provider configured. Please start Ollama locally or add an API key in Settings.');
    }

    const providerInstance = ProviderManager.getProvider(provider as any);
    return providerInstance.generateText(request, apiKey);
  }

  static async generateStructured<TSchema>(request: AIStructuredRequest<TSchema>): Promise<TSchema> {
    const user = appStore.getState().currentUser;
    const provider = request.provider || user?.aiConfig?.provider || 'groq';
    const apiKey = this.getApiKeyForProvider(provider as any);

    if (!apiKey) {
      const ollamaProvider = ProviderManager.getOllamaProvider();
      const isOnline = await ollamaProvider.validateApiKey('');
      if (isOnline) {
        return ollamaProvider.generateStructured(request, '');
      }
      throw new Error('No AI provider configured. Please start Ollama locally or add an API key in Settings.');
    }

    const providerInstance = ProviderManager.getProvider(provider as any);
    return providerInstance.generateStructured(request, apiKey);
  }

  static async validateApiKey(provider: AIProviderName, apiKey: string): Promise<boolean> {
    try {
      const providerInstance = ProviderManager.getProvider(provider);
      return await providerInstance.validateApiKey(apiKey);
    } catch (err) {
      console.error('API key validation check failed:', err);
      return false;
    }
  }
}
