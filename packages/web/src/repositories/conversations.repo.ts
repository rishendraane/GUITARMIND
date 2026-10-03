import pb from '../lib/pocketbase';
import type { AIConversation, AIMessage, CoachPersonalityId } from '@guitarmind/core';
import { appStore } from '../store';

const isOffline = (userId?: string) =>
  userId === 'offline_user_id' || !navigator.onLine;

const convsCacheKey = (userId: string) => `guitarmind_offline_convs_${userId}`;
const msgsCacheKey = (convId: string) => `guitarmind_offline_msgs_${convId}`;

export class ConversationsRepo {
  // ---------------------------------------------------------------------------
  // Conversations
  // ---------------------------------------------------------------------------

  static async createConversation(userId: string, conversation: AIConversation): Promise<boolean> {
    // Always write to localStorage
    const key = convsCacheKey(userId);
    const list: AIConversation[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (!list.some(c => c.id === conversation.id)) {
      list.push(conversation);
      localStorage.setItem(key, JSON.stringify(list));
    }

    if (isOffline(userId)) return true;

    try {
      await pb.create('ai_conversations', {
        user_id: userId,
        coach_id: conversation.personalityId,
        title: conversation.title,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
      });
      return true;
    } catch (err) {
      console.warn('[ConversationsRepo] createConversation PB error:', err);
      return true; // local succeeded
    }
  }

  static async getConversation(conversationId: string): Promise<AIConversation | null> {
    const uid = appStore.getState().currentUser?.uid;
    if (uid) {
      const list: AIConversation[] = JSON.parse(localStorage.getItem(convsCacheKey(uid)) || '[]');
      const found = list.find(c => c.id === conversationId);
      if (found) return found;
    }

    if (!navigator.onLine) return null;

    try {
      const rec = await pb.getFirst('ai_conversations', `user_id="${uid}"`);
      if (!rec) return null;
      return {
        id: rec.id,
        title: rec.title,
        personalityId: rec.coach_id as CoachPersonalityId,
        createdAt: rec.created_at || rec.created,
        updatedAt: rec.updated_at || rec.updated,
        messageCount: 0,
      };
    } catch {
      return null;
    }
  }

  static async getUserConversations(userId: string): Promise<AIConversation[]> {
    const cached: AIConversation[] = JSON.parse(localStorage.getItem(convsCacheKey(userId)) || '[]');

    if (isOffline(userId)) return cached;

    try {
      const res = await pb.list('ai_conversations', {
        filter: `user_id="${userId}"`,
        sort: '-created_at',
        perPage: 50,
      });
      const remote: AIConversation[] = res.items.map(r => ({
        id: r.id,
        title: r.title,
        personalityId: r.coach_id as CoachPersonalityId,
        createdAt: r.created_at || r.created,
        updatedAt: r.updated_at || r.updated,
        messageCount: 0,
      }));
      // Merge: local first (may have unsaved items), then remote
      const ids = new Set(remote.map(c => c.id));
      const merged = [...remote, ...cached.filter(c => !ids.has(c.id))];
      localStorage.setItem(convsCacheKey(userId), JSON.stringify(merged));
      return merged;
    } catch {
      return cached;
    }
  }

  static async updateConversation(userId: string, conversationId: string, updates: Partial<AIConversation>): Promise<boolean> {
    const key = convsCacheKey(userId);
    const list: AIConversation[] = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.findIndex(c => c.id === conversationId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(key, JSON.stringify(list));
    }

    if (isOffline(userId)) return true;

    try {
      const rec = await pb.getFirst('ai_conversations', `user_id="${userId}"`);
      if (rec) await pb.update('ai_conversations', rec.id, { ...updates, updated_at: new Date().toISOString() });
      return true;
    } catch {
      return true;
    }
  }

  static async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    const key = convsCacheKey(userId);
    const list: AIConversation[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(list.filter(c => c.id !== conversationId)));
    localStorage.removeItem(msgsCacheKey(conversationId));

    if (isOffline(userId)) return true;

    try {
      const rec = await pb.getFirst('ai_conversations', `user_id="${userId}" && title="${conversationId}"`);
      if (rec) await pb.delete('ai_conversations', rec.id);
      return true;
    } catch {
      return true;
    }
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  static async addMessage(conversationId: string, userId: string, message: AIMessage): Promise<boolean> {
    const key = msgsCacheKey(conversationId);
    const msgs: AIMessage[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (!msgs.some(m => m.id === message.id)) {
      msgs.push(message);
      localStorage.setItem(key, JSON.stringify(msgs));
    }

    if (isOffline(userId)) return true;

    try {
      await pb.create('ai_messages', {
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        sender: message.role === 'user' ? userId : 'ai',
        content_type: message.contentType || 'text',
        metadata: message.metadata || null,
        timestamp: message.timestamp,
      });
      return true;
    } catch (err) {
      console.warn('[ConversationsRepo] addMessage PB error:', err);
      return true;
    }
  }

  static async getMessages(conversationId: string): Promise<AIMessage[]> {
    const cached: AIMessage[] = JSON.parse(localStorage.getItem(msgsCacheKey(conversationId)) || '[]');

    if (!navigator.onLine) return cached;

    try {
      const res = await pb.list('ai_messages', {
        filter: `conversation_id="${conversationId}"`,
        sort: 'timestamp',
        perPage: 200,
      });
      const remote: AIMessage[] = res.items.map(r => ({
        id: r.id,
        role: r.role as any,
        content: r.content,
        contentType: r.content_type || 'text',
        timestamp: r.timestamp,
        metadata: r.metadata,
      }));
      // Prefer remote, merge unsaved local messages
      const ids = new Set(remote.map(m => m.id));
      const merged = [...remote, ...cached.filter(m => !ids.has(m.id))];
      merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      localStorage.setItem(msgsCacheKey(conversationId), JSON.stringify(merged));
      return merged;
    } catch {
      return cached;
    }
  }

  static async deleteMessage(conversationId: string, messageId: string): Promise<boolean> {
    const key = msgsCacheKey(conversationId);
    const msgs: AIMessage[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(msgs.filter(m => m.id !== messageId)));

    try {
      await pb.delete('ai_messages', messageId);
      return true;
    } catch {
      return true;
    }
  }

  static async clearMessages(conversationId: string): Promise<boolean> {
    localStorage.removeItem(msgsCacheKey(conversationId));
    return true;
  }

  static async getOrCreateConversation(
    userId: string,
    coachId: CoachPersonalityId
  ): Promise<AIConversation> {
    const convs = await this.getUserConversations(userId);
    const existing = convs.find(c => c.personalityId === coachId);
    if (existing) return existing;

    const newConv: AIConversation = {
      id: `conv_${Date.now()}_${coachId}`,
      title: `Chat with ${coachId}`,
      personalityId: coachId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    };
    await this.createConversation(userId, newConv);
    return newConv;
  }

  // ---- Backward-compatible aliases ----
  static async listConversations(userId: string) { return this.getUserConversations(userId); }
}
