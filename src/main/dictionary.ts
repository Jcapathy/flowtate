import { store } from './settings-store';
import type { DictionaryEntry } from '../shared/types';

const STORE_KEY = 'dictionary';

export function getDictionary(): DictionaryEntry[] {
  return (store.get(STORE_KEY) as DictionaryEntry[] | undefined) ?? [];
}

export function setDictionary(entries: DictionaryEntry[]): void {
  store.set(STORE_KEY, entries);
}

export function addWord(word: string, category: string = 'general'): void {
  const entries = getDictionary();
  if (!entries.some((e) => e.word.toLowerCase() === word.toLowerCase())) {
    entries.push({ word, category });
    setDictionary(entries);
  }
}

export function removeWord(word: string): void {
  const entries = getDictionary().filter(
    (e) => e.word.toLowerCase() !== word.toLowerCase(),
  );
  setDictionary(entries);
}

/**
 * Build a Whisper prompt string from dictionary entries.
 * Whisper uses this as context to improve recognition of custom words.
 */
export function buildWhisperPrompt(): string {
  const entries = getDictionary();
  if (entries.length === 0) return '';
  return entries.map((e) => e.word).join(', ');
}
