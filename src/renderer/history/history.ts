import type { FlowtateAPI } from '../../preload';
import type { HistoryEntry } from '../../shared/types';

declare global {
  interface Window {
    flowtate: FlowtateAPI;
  }
}

const api = window.flowtate;
let allEntries: HistoryEntry[] = [];

async function loadHistory(): Promise<void> {
  allEntries = await api.getHistory();
  renderList(allEntries);
}

async function loadStats(): Promise<void> {
  const stats = await api.getStats();
  document.getElementById('totalWords')!.textContent = `${stats.totalWords} words`;
  document.getElementById('totalSessions')!.textContent = `${stats.totalSessions} sessions`;
  document.getElementById('avgWords')!.textContent = `${stats.avgWordsPerSession} avg`;
  const mins = Math.round(stats.timeSavedSeconds / 60);
  document.getElementById('timeSaved')!.textContent = `${mins}m saved`;
}

function renderList(entries: HistoryEntry[]): void {
  const list = document.getElementById('historyList')!;
  list.innerHTML = '';

  for (const entry of entries) {
    const li = document.createElement('li');
    const date = new Date(entry.timestamp);
    const timeStr = date.toLocaleString();

    li.innerHTML = `
      <div class="meta">${timeStr} &middot; ${entry.sourceApp} &middot; ${entry.outputLanguage}</div>
      <div class="text">${escapeHtml(entry.formattedText)}</div>
      <div class="raw">${escapeHtml(entry.rawText)}</div>
    `;

    li.addEventListener('click', () => {
      navigator.clipboard.writeText(entry.formattedText);
    });

    list.appendChild(li);
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Search
document.getElementById('search')?.addEventListener('input', (e) => {
  const query = (e.target as HTMLInputElement).value.toLowerCase();
  if (!query) {
    renderList(allEntries);
    return;
  }
  const filtered = allEntries.filter(
    (entry) =>
      entry.formattedText.toLowerCase().includes(query) ||
      entry.rawText.toLowerCase().includes(query) ||
      entry.sourceApp.toLowerCase().includes(query),
  );
  renderList(filtered);
});

// Init
loadHistory();
loadStats();
