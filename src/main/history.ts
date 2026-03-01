import Store from 'electron-store';
import type { HistoryEntry, UsageStats } from '../shared/types';

interface HistoryStore {
  entries: HistoryEntry[];
  nextId: number;
}

const store = new Store<HistoryStore>({
  name: 'flowtate-history',
  defaults: {
    entries: [],
    nextId: 1,
  },
});

export function addEntry(entry: Omit<HistoryEntry, 'id'>): void {
  const entries = store.get('entries');
  const nextId = store.get('nextId');

  entries.unshift({ ...entry, id: nextId });
  store.set('nextId', nextId + 1);

  // Keep only latest 100
  if (entries.length > 100) {
    entries.length = 100;
  }
  store.set('entries', entries);
}

export function getHistory(limit = 100, offset = 0): HistoryEntry[] {
  const entries = store.get('entries');
  return entries.slice(offset, offset + limit);
}

export function getStats(): UsageStats {
  const entries = store.get('entries');

  const totalSessions = entries.length;
  const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0);

  const languageUsage: Record<string, number> = {};
  for (const entry of entries) {
    languageUsage[entry.outputLanguage] = (languageUsage[entry.outputLanguage] || 0) + 1;
  }

  // Rough estimate: average typist is 40 WPM, dictation saves ~60% of that time
  const timeSavedSeconds = Math.round((totalWords / 40) * 60 * 0.6);

  return {
    totalWords,
    totalSessions,
    avgWordsPerSession: totalSessions > 0 ? Math.round(totalWords / totalSessions) : 0,
    languageUsage,
    timeSavedSeconds,
  };
}

export function closeDb(): void {
  // No-op for JSON store
}
