import { supabase } from '../lib/supabase';

export class MemoryEngine {
  static async getMemory(userId: string, key: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('user_memory')
        .select('memory_value')
        .eq('user_id', userId)
        .eq('memory_key', key)
        .single();

      if (error || !data) return null;
      return data.memory_value;
    } catch (err) {
      console.error('Error reading memory:', err);
      return null;
    }
  }

  static async storeMemory(userId: string, key: string, value: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_memory')
        .upsert({
          user_id: userId,
          memory_key: key,
          memory_value: value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,memory_key'
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error storing memory:', err);
      return false;
    }
  }

  static async updateFromResponse(userId: string, userMessage: string, aiResponse: string): Promise<void> {
    try {
      // Basic heuristic-based extraction of learning signals to update memory
      const userLower = userMessage.toLowerCase();
      const aiLower = aiResponse.toLowerCase();

      // 1. Inferred weak chords
      if (userLower.includes('struggle') || userLower.includes('hard to play') || userLower.includes('cannot play')) {
        const chordMatch = userMessage.match(/\b([A-G][m#b]?(maj7|min7|dom7|7|sus4|sus2|add9)?)(\s+chord)?\b/i);
        if (chordMatch) {
          const chord = chordMatch[1].toUpperCase();
          const weakChords = (await this.getMemory(userId, 'weak_chords')) || [];
          if (!weakChords.includes(chord)) {
            weakChords.push(chord);
            await this.storeMemory(userId, 'weak_chords', weakChords);
          }
        }
      }

      // 2. Favorite artists / inspirations discussed
      if (userLower.includes('my favorite band') || userLower.includes('i like to listen to') || userLower.includes('i love playing songs by')) {
        const artists = (await this.getMemory(userId, 'favorite_artists')) || [];
        // Basic extraction (everything after 'by' or 'to')
        const parts = userMessage.split(/\b(by|to|like)\b/i);
        if (parts.length > 2) {
          const artist = parts[parts.length - 1].trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
          if (artist && artist.length > 2 && artist.length < 30 && !artists.includes(artist)) {
            artists.push(artist);
            await this.storeMemory(userId, 'favorite_artists', artists);
          }
        }
      }

      // 3. Keep a rolling log of main topics discussed
      const topics = (await this.getMemory(userId, 'discussed_topics')) || [];
      let newTopic = '';
      if (aiLower.includes('strumming')) newTopic = 'Strumming Patterns';
      else if (aiLower.includes('fingerstyle') || aiLower.includes('fingerpicking')) newTopic = 'Fingerstyle';
      else if (aiLower.includes('barre chord') || aiLower.includes('bar chord')) newTopic = 'Barre Chords';
      else if (aiLower.includes('metronome') || aiLower.includes('tempo')) newTopic = 'Rhythm & Tempo';
      else if (aiLower.includes('tuning')) newTopic = 'Guitar Tuning';

      if (newTopic && !topics.includes(newTopic)) {
        topics.push(newTopic);
        await this.storeMemory(userId, 'discussed_topics', topics.slice(-5)); // keep last 5
      }
    } catch (err) {
      console.error('Error updating memory from AI response:', err);
    }
  }
}
