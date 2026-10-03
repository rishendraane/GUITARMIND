import { supabase } from '../lib/supabase';
import type { UserContext } from './context-engine';

export interface Recommendation {
  title: string;
  description: string;
  type: 'drill' | 'theory' | 'song' | 'routine';
  xpReward: number;
}

export class RecommendationEngine {
  static async generateMissions(userId: string, context: UserContext): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // 1. Weak Chords Drill
    if (context.chords.weak.length > 0) {
      const targetChord = context.chords.weak[0].chord;
      recommendations.push({
        title: `Master ${targetChord} Chord`,
        description: `Practice finger placement and clean execution for the ${targetChord} chord (current accuracy is low).`,
        type: 'drill',
        xpReward: 30
      });

      if (context.chords.weak.length > 1) {
        const nextChord = context.chords.weak[1].chord;
        recommendations.push({
          title: `Transition: ${targetChord} to ${nextChord}`,
          description: `Strum back and forth between ${targetChord} and ${nextChord} with a steady rhythm.`,
          type: 'drill',
          xpReward: 35
        });
      }
    } else if (context.chords.known.length > 0) {
      // If no weak chords, recommend a random chord transition drill from known ones
      const chord = context.chords.known[0];
      recommendations.push({
        title: `Strumming with ${chord}`,
        description: `Play an arpeggiated 4/4 pattern with your known ${chord} chord.`,
        type: 'drill',
        xpReward: 20
      });
    } else {
      // Beginner default
      recommendations.push({
        title: 'Learn the E Minor Chord',
        description: 'Open the chord dictionary or ask the coach to teach you Em. The easiest chord to start with!',
        type: 'drill',
        xpReward: 25
      });
    }

    // 2. Music Theory recommendation
    if (context.user.level > 2) {
      recommendations.push({
        title: 'Chord Construction Basics',
        description: 'Read the theory module about how major chords are constructed using the root, 3rd, and 5th scale degrees.',
        type: 'theory',
        xpReward: 30
      });
    } else {
      recommendations.push({
        title: 'Guitar Anatomy & Tuning',
        description: 'Tune your guitar using the chromatic tuner and learn the string names: E-A-D-G-B-E.',
        type: 'theory',
        xpReward: 20
      });
    }

    // 3. Posture suggestion if posture score from vision analysis is low
    if (context.memories.discussed_topics?.includes('Posture Correction')) {
      recommendations.push({
        title: 'Posture Self-check Drill',
        description: 'Sit upright, align your wrist parallel to the fretboard, and make sure not to slouch.',
        type: 'routine',
        xpReward: 25
      });
    }

    // Sync generated missions to the daily_missions table
    await this.syncToDatabase(userId, recommendations);

    return recommendations;
  }

  private static async syncToDatabase(userId: string, recs: Recommendation[]): Promise<void> {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Check if missions for today already exist
      const { data: existing } = await supabase
        .from('daily_missions')
        .select('id')
        .eq('user_id', userId)
        .eq('date', todayStr);

      if (existing && existing.length > 0) {
        // Missions already generated for today, skip recreation
        return;
      }

      // Bulk insert daily missions
      const inserts = recs.map(r => ({
        user_id: userId,
        date: todayStr,
        mission_title: r.title,
        mission_description: r.description,
        mission_type: r.type,
        xp_reward: r.xpReward,
        completed: false
      }));

      const { error } = await supabase
        .from('daily_missions')
        .insert(inserts);

      if (error) throw error;
    } catch (err) {
      console.error('Error syncing recommendations to database:', err);
    }
  }
}
