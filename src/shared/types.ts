// ─── Dictation ───

export type DictationMode = 'ptt' | 'toggle';
export type DictationState = 'idle' | 'recording' | 'processing';

export interface DictationResult {
  id: string;
  rawText: string;
  formattedText: string;
  timestamp: number;
  sourceApp: string;
  outputLanguage: string;
  durationMs: number;
}

// ─── Translation ───

export type MultiLangFormat = 'stacked' | 'side-by-side' | 'parenthetical';

export interface TranslationConfig {
  enabled: boolean;
  inputLanguage: string;
  outputLanguages: string[];
  multiLangFormat: MultiLangFormat;
}

// ─── Snippets ───

export type SnippetType = 'text-expansion' | 'language-switch' | 'action';

export interface Snippet {
  id: string;
  trigger: string;
  type: SnippetType;
  enabled: boolean;
  /** For text-expansion: the text to insert */
  text?: string;
  /** For language-switch: the target language(s) */
  languages?: string[];
  /** For action: the action ID to execute */
  action?: string;
}

// ─── Dictionary ───

export interface DictionaryEntry {
  word: string;
  category: string;
}

// ─── Per-App Formatting ───

export interface FormattingProfile {
  id: string;
  name: string;
  formality: 'casual' | 'balanced' | 'formal';
  sentenceLength: 'short' | 'medium' | 'long';
  useBullets: boolean;
  preserveGreetings: boolean;
  customInstructions?: string;
}

export interface AppStyleMapping {
  processName: string;
  profileId: string;
}

// ─── History ───

export interface HistoryEntry {
  id: number;
  rawText: string;
  formattedText: string;
  timestamp: number;
  sourceApp: string;
  outputLanguage: string;
  wordCount: number;
}

export interface UsageStats {
  totalWords: number;
  totalSessions: number;
  avgWordsPerSession: number;
  languageUsage: Record<string, number>;
  timeSavedSeconds: number;
}

// ─── Settings ───

export interface FlowtateSettings {
  // General
  startOnLogin: boolean;
  showInTaskbar: boolean;
  theme: 'light' | 'dark' | 'system';

  // Hotkeys
  dictationHotkey: string;
  commandHotkey: string;
  cancelHotkey: string;
  dictationMode: DictationMode;

  // Audio
  inputDeviceId: string;
  audioSensitivity: number;

  // Formatting
  aiFormattingEnabled: boolean;
  removeFillersEnabled: boolean;
  grammarCorrectionEnabled: boolean;

  // Translation
  translation: TranslationConfig;

  // API Keys
  openaiApiKey: string;
  anthropicApiKey: string;
}

export const DEFAULT_SETTINGS: FlowtateSettings = {
  startOnLogin: false,
  showInTaskbar: true,
  theme: 'system',

  dictationHotkey: 'Ctrl+Space',
  commandHotkey: 'Ctrl+Alt+Space',
  cancelHotkey: 'Escape',
  dictationMode: 'toggle',

  inputDeviceId: 'default',
  audioSensitivity: 50,

  aiFormattingEnabled: true,
  removeFillersEnabled: true,
  grammarCorrectionEnabled: true,

  translation: {
    enabled: false,
    inputLanguage: 'en',
    outputLanguages: ['en'],
    multiLangFormat: 'stacked',
  },

  openaiApiKey: '',
  anthropicApiKey: '',
};

// ─── IPC Channels ───

export const IPC = {
  // Dictation
  START_RECORDING: 'dictation:start-recording',
  STOP_RECORDING: 'dictation:stop-recording',
  AUDIO_DATA: 'dictation:audio-data',
  DICTATION_RESULT: 'dictation:result',
  DICTATION_STATE: 'dictation:state-change',
  DICTATION_ERROR: 'dictation:error',

  // Command mode
  START_COMMAND: 'command:start',
  COMMAND_RESULT: 'command:result',

  // Settings
  GET_SETTINGS: 'settings:get',
  SET_SETTINGS: 'settings:set',
  SETTINGS_CHANGED: 'settings:changed',

  // History
  GET_HISTORY: 'history:get',
  GET_STATS: 'history:stats',

  // Snippets
  GET_SNIPPETS: 'snippets:get',
  SET_SNIPPETS: 'snippets:set',

  // Dictionary
  GET_DICTIONARY: 'dictionary:get',
  SET_DICTIONARY: 'dictionary:set',

  // Translation
  SET_OUTPUT_LANGUAGE: 'translation:set-language',
  GET_OUTPUT_LANGUAGE: 'translation:get-language',

  // Audio devices
  GET_AUDIO_DEVICES: 'audio:get-devices',
} as const;
