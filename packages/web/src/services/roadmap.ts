import { AIService } from './ai';
import type { Roadmap, RoadmapStage, SkillLevel } from '@guitarmind/core';

export class RoadmapService {
  /**
   * Generates a personalized roadmap using the AI Provider structured generation,
   * with a static template fallback if the AI key is missing or validation fails.
   */
  static async generatePersonalizedRoadmap(userId: string, skillLevel: SkillLevel, goals: string[], genres: string[]): Promise<Roadmap> {
    if (true) {
      try {
        const prompt = `
          Generate a structured learning roadmap for a guitar student with:
          - Skill Level: ${skillLevel}
          - Goals: ${goals.join(', ')}
          - Favorite Genres: ${genres.join(', ')}
          
          Provide a JSON response matching the following schema. Use realistic task durations, description names, and XP rewards.
        `;

        // Define expected response JSON Schema for the structured generator
        const responseSchema = {
          type: 'object',
          properties: {
            id: { type: 'string' },
            currentStageIndex: { type: 'number' },
            totalStages: { type: 'number' },
            estimatedCompletionDate: { type: 'string' },
            currentFocus: { type: 'array', items: { type: 'string' } },
            stages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  index: { type: 'number' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['locked', 'active', 'completed'] },
                  estimatedDays: { type: 'number' },
                  targetSkills: { type: 'array', items: { type: 'string' } },
                  tasks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        type: { type: 'string' },
                        status: { type: 'string' },
                        estimatedMinutes: { type: 'number' },
                        xpReward: { type: 'number' }
                      },
                      required: ['id', 'title', 'description', 'type', 'status', 'estimatedMinutes', 'xpReward']
                    }
                  }
                },
                required: ['id', 'index', 'title', 'description', 'status', 'estimatedDays', 'targetSkills', 'tasks']
              }
            }
          },
          required: ['id', 'currentStageIndex', 'totalStages', 'estimatedCompletionDate', 'currentFocus', 'stages']
        };

        const generated = await AIService.generateStructured<Roadmap & { stages: RoadmapStage[] }>({
          prompt,
          responseSchema: responseSchema as any,
          systemPrompt: 'You are a professional guitar curriculum designer. Output strictly JSON.'
        });

        // Add generated stages to localStorage or memory cache
        localStorage.setItem(`roadmap_${userId}`, JSON.stringify(generated));
        return generated;
      } catch (err) {
        console.warn('AI Roadmap generation failed, falling back to template:', err);
      }
    }

    // Fallback static template roadmap
    const fallback = this.getStaticRoadmapTemplate(skillLevel, goals);
    localStorage.setItem(`roadmap_${userId}`, JSON.stringify(fallback));
    return fallback;
  }

  /**
   * Retrieves the saved roadmap for a user.
   */
  static getRoadmap(userId: string): Roadmap & { stages: RoadmapStage[] } {
    const cached = localStorage.getItem(`roadmap_${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    // Return a default beginner template if nothing is found
    const defaultRoadmap = this.getStaticRoadmapTemplate('beginner', ['learn_songs']);
    localStorage.setItem(`roadmap_${userId}`, JSON.stringify(defaultRoadmap));
    return defaultRoadmap;
  }

  /**
   * Static roadmap templates matching user skill levels
   */
  private static getStaticRoadmapTemplate(level: SkillLevel, goals: string[]): Roadmap & { stages: RoadmapStage[] } {
    // Reference goals to avoid unused parameter compiler warning
    console.log('Generating static roadmap template for goals:', goals);
    const now = new Date();
    const estCompletion = new Date();
    estCompletion.setMonth(now.getMonth() + 3);

    const baseRoadmap: Roadmap = {
      id: 'active',
      generatedAt: now.toISOString(),
      lastAdaptedAt: now.toISOString(),
      currentStageIndex: 0,
      totalStages: 3,
      estimatedCompletionDate: estCompletion.toISOString(),
      currentFocus: level === 'beginner' ? ['fretboard_basics', 'open_chords'] : ['scales', 'barre_chords'],
      masteryLevels: {
        chords: {},
        scales: {},
        techniques: {},
        theory: {},
        earTraining: {}
      }
    };

    let stages: RoadmapStage[] = [];

    if (level === 'beginner') {
      stages = [
        {
          id: 'stage_1',
          index: 0,
          title: 'Guitar Anatomy & Open Chords',
          description: 'Get familiar with guitar strings, parts, and master the G Major, C Major, and D Major open chords.',
          status: 'active',
          estimatedDays: 30,
          targetSkills: ['G_chord', 'C_chord', 'D_chord', 'rhythm_basics'],
          tasks: [
            {
              id: 'task_1_1',
              stageId: 'stage_1',
              title: 'Tuning & Strings Basics',
              description: 'Learn string numbers, tuning pitches, and verify using the chromatic tuner.',
              type: 'lesson',
              status: 'pending',
              estimatedMinutes: 10,
              xpReward: 100,
              lessonId: 'anatomy_101'
            },
            {
              id: 'task_1_2',
              stageId: 'stage_1',
              title: 'First Chords: G & C Major',
              description: 'Practice placing your fingers to form clean G Major and C Major open chords.',
              type: 'exercise',
              status: 'pending',
              estimatedMinutes: 15,
              xpReward: 150,
              exerciseId: 'chords_g_c'
            },
            {
              id: 'task_1_3',
              stageId: 'stage_1',
              title: 'The G-C Switch Challenge',
              description: 'Set metronome to 60 BPM and switch between G Major and C Major every 4 beats.',
              type: 'practice',
              status: 'pending',
              estimatedMinutes: 15,
              xpReward: 200,
              exerciseId: 'switch_g_c'
            }
          ]
        },
        {
          id: 'stage_2',
          index: 1,
          title: 'Minor Chord Foundations',
          description: 'Introduce A Minor, E Minor, and D Minor chords alongside basic strumming rhythms.',
          status: 'locked',
          estimatedDays: 30,
          targetSkills: ['Am_chord', 'Em_chord', 'Dm_chord', 'strumming_8_beat'],
          tasks: [
            {
              id: 'task_2_1',
              stageId: 'stage_2',
              title: 'Minor Chords Lesson',
              description: 'Understand the difference between Major and Minor intervals and learn shape formations.',
              type: 'theory',
              status: 'pending',
              estimatedMinutes: 12,
              xpReward: 120
            }
          ]
        },
        {
          id: 'stage_3',
          index: 2,
          title: 'First Song Performance',
          description: 'Put your open chords together to play your first complete rhythm song.',
          status: 'locked',
          estimatedDays: 30,
          targetSkills: ['song_performance', 'tempo_consistency'],
          tasks: [
            {
              id: 'task_3_1',
              stageId: 'stage_3',
              title: "Learn 'Knockin on Heavens Door'",
              description: 'Play along with the rhythm track using G, D, Am, and C Major progressions.',
              type: 'song',
              status: 'pending',
              estimatedMinutes: 20,
              xpReward: 300,
              songId: 'heavens_door'
            }
          ]
        }
      ];
    } else {
      // Intermediate / Advanced
      stages = [
        {
          id: 'stage_1',
          index: 0,
          title: 'Pentatonic Navigation',
          description: 'Unlock fretboard navigation using the minor pentatonic scale positions.',
          status: 'active',
          estimatedDays: 30,
          targetSkills: ['minor_pentatonic', 'alternate_picking'],
          tasks: [
            {
              id: 'task_1_1',
              stageId: 'stage_1',
              title: 'Pentatonic Position 1',
              description: 'Learn index-to-pinky layout patterns in key of A minor.',
              type: 'lesson',
              status: 'pending',
              estimatedMinutes: 15,
              xpReward: 150
            }
          ]
        },
        {
          id: 'stage_2',
          index: 1,
          title: 'Barre Chords & Voicings',
          description: 'Eliminate open-string reliance by learning root 6 and root 5 barre chord structures.',
          status: 'locked',
          estimatedDays: 30,
          targetSkills: ['barre_chords', 'fretboard_harmony'],
          tasks: [
            {
              id: 'task_2_1',
              stageId: 'stage_2',
              title: 'Barre Shape Strength',
              description: 'Build index finger pressure and fretting strength using E-shape bar chords.',
              type: 'exercise',
              status: 'pending',
              estimatedMinutes: 20,
              xpReward: 250
            }
          ]
        }
      ];
    }

    return {
      ...baseRoadmap,
      totalStages: stages.length,
      stages
    };
  }
}
