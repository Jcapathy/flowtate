import { getSetting, setSetting, store } from './settings-store';
import type { Snippet, SnippetType } from '../shared/types';

const STORE_KEY = 'snippets';

function loadSnippets(): Snippet[] {
  return (store.get(STORE_KEY) as Snippet[] | undefined) ?? getDefaultSnippets();
}

function saveSnippets(snippets: Snippet[]): void {
  store.set(STORE_KEY, snippets);
}

export function getSnippets(): Snippet[] {
  return loadSnippets();
}

export function setSnippets(snippets: Snippet[]): void {
  saveSnippets(snippets);
}

/**
 * Check raw transcription against snippet triggers.
 * Returns the matched snippet or null.
 */
export function matchSnippet(rawText: string): Snippet | null {
  const snippets = loadSnippets().filter((s) => s.enabled);
  const normalized = rawText.toLowerCase().trim();

  for (const snippet of snippets) {
    const trigger = snippet.trigger.toLowerCase().trim();
    // Exact match or fuzzy containment
    if (normalized === trigger || normalized.includes(trigger)) {
      return snippet;
    }
    // Fuzzy: check if all words in trigger appear in the text
    const triggerWords = trigger.split(/\s+/);
    const textWords = normalized.split(/\s+/);
    const allMatch = triggerWords.every((tw) =>
      textWords.some((w) => w.includes(tw) || levenshtein(w, tw) <= 2),
    );
    if (allMatch && triggerWords.length >= 2) {
      return snippet;
    }
  }

  return null;
}

/** Simple Levenshtein distance for fuzzy matching */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}

function getDefaultSnippets(): Snippet[] {
  return [
    {
      id: 'default-spanish',
      trigger: 'change to spanish output',
      type: 'language-switch',
      enabled: true,
      languages: ['es'],
    },
    {
      id: 'default-french',
      trigger: 'change to french output',
      type: 'language-switch',
      enabled: true,
      languages: ['fr'],
    },
    {
      id: 'default-english',
      trigger: 'back to english',
      type: 'language-switch',
      enabled: true,
      languages: ['en'],
    },
    {
      id: 'default-stop-formatting',
      trigger: 'stop formatting',
      type: 'action',
      enabled: true,
      action: 'disable-formatting',
    },
    {
      id: 'default-enable-formatting',
      trigger: 'enable formatting',
      type: 'action',
      enabled: true,
      action: 'enable-formatting',
    },
  ];
}
