import type { User, CoachPersonalityId } from '@guitarmind/core';

type Listener<T> = (state: T) => void;

export class Store<T> {
  private state: T;
  private listeners: Set<Listener<T>> = new Set();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): T {
    return this.state;
  }

  setState(partial: Partial<T>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener(this.state));
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
}

// ==========================================
// 1. App Store State
// ==========================================
export interface AppState {
  currentUser: User | null;
  isAuthenticated: boolean;
  theme: 'dark' | 'light' | 'system';
  currentPage: string; // hash-based route: '#home', '#tuner', '#coach', '#settings', etc.
  isLoading: boolean;
}

export const appStore = new Store<AppState>({
  currentUser: null,
  isAuthenticated: false,
  theme: 'dark',
  currentPage: '#auth',
  isLoading: false,
});

// ==========================================
// 2. Onboarding Store State
// ==========================================
export interface OnboardingState {
  currentStep: number;
  profile: {
    name: string;
    age: number;
    country: string;
  };
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  musicalBackground: {
    hasPlayedBefore: boolean;
    canReadTabs: boolean;
    canReadSheetMusic: boolean;
    knowsBasicChords: boolean;
  };
  goals: string[];
  genres: string[];
  practiceMinutesPerDay: number;
  learningGoal: string;
  guitar: {
    ownsGuitar: boolean;
    type?: 'acoustic' | 'electric' | 'classical' | 'bass';
    brand?: string;
    model?: string;
  };
  coach: CoachPersonalityId;
  aiConfig: {
    provider: 'gemini' | 'openai' | 'claude' | 'groq' | 'nvidia';
    apiKey: string;
    validated: boolean;
  };
  isSubmitting: boolean;
}

export const onboardingStore = new Store<OnboardingState>({
  currentStep: 0,
  profile: { name: '', age: 25, country: 'US' },
  skillLevel: 'beginner',
  musicalBackground: {
    hasPlayedBefore: false,
    canReadTabs: false,
    canReadSheetMusic: false,
    knowsBasicChords: false,
  },
  goals: [],
  genres: [],
  practiceMinutesPerDay: 30,
  learningGoal: 'play_first_song',
  guitar: { ownsGuitar: false },
  coach: 'maya',
  aiConfig: { provider: 'groq', apiKey: '', validated: false },
  isSubmitting: false,
});

// ==========================================
// 3. Dashboard Store State
// ==========================================
export interface DashboardState {
  streak: number;
  xp: number;
  level: number;
  chordsCount: number;
  songsCount: number;
  weeklyPracticeMinutes: number[]; // Mon-Sun minutes
  recentAchievements: string[];
  activeTaskTitle: string;
  activeTaskProgress: number; // percentage
}

export const dashboardStore = new Store<DashboardState>({
  streak: 0,
  xp: 0,
  level: 1,
  chordsCount: 0,
  songsCount: 0,
  weeklyPracticeMinutes: [0, 0, 0, 0, 0, 0, 0],
  recentAchievements: [],
  activeTaskTitle: 'Get started with guitar basics',
  activeTaskProgress: 0,
});

// No local storage persistence. All data is persisted in Supabase.

