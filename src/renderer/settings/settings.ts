import type { FlowtateAPI } from '../../preload';
import type { FlowtateSettings, Snippet, DictionaryEntry } from '../../shared/types';

declare global {
  interface Window {
    flowtate: FlowtateAPI;
  }
}

const api = window.flowtate;

// ─── Tab Navigation ───

document.querySelectorAll<HTMLElement>('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
  });
});

// ─── Load Settings ───

async function loadSettings(): Promise<void> {
  const s = await api.getSettings();

  // General
  (document.getElementById('startOnLogin') as HTMLInputElement).checked = s.startOnLogin;
  (document.getElementById('showInTaskbar') as HTMLInputElement).checked = s.showInTaskbar;
  (document.getElementById('theme') as HTMLSelectElement).value = s.theme;

  // Hotkeys
  (document.getElementById('dictationHotkey') as HTMLInputElement).value = s.dictationHotkey;
  (document.getElementById('commandHotkey') as HTMLInputElement).value = s.commandHotkey;
  (document.getElementById('cancelHotkey') as HTMLInputElement).value = s.cancelHotkey;
  (document.getElementById('dictationMode') as HTMLSelectElement).value = s.dictationMode;

  // Language
  (document.getElementById('translationEnabled') as HTMLInputElement).checked = s.translation.enabled;
  (document.getElementById('inputLanguage') as HTMLSelectElement).value = s.translation.inputLanguage;
  (document.getElementById('outputLanguages') as HTMLInputElement).value = s.translation.outputLanguages.join(', ');
  (document.getElementById('multiLangFormat') as HTMLSelectElement).value = s.translation.multiLangFormat;

  // Audio
  (document.getElementById('audioSensitivity') as HTMLInputElement).value = String(s.audioSensitivity);

  // Formatting
  (document.getElementById('aiFormattingEnabled') as HTMLInputElement).checked = s.aiFormattingEnabled;
  (document.getElementById('removeFillersEnabled') as HTMLInputElement).checked = s.removeFillersEnabled;
  (document.getElementById('grammarCorrectionEnabled') as HTMLInputElement).checked = s.grammarCorrectionEnabled;

  // API Keys
  (document.getElementById('openaiApiKey') as HTMLInputElement).value = s.openaiApiKey;
  (document.getElementById('anthropicApiKey') as HTMLInputElement).value = s.anthropicApiKey;
}

// ─── Auto-save on change ───

function bindCheckbox(id: string, key: keyof FlowtateSettings): void {
  document.getElementById(id)?.addEventListener('change', (e) => {
    api.setSettings({ [key]: (e.target as HTMLInputElement).checked } as any);
  });
}

function bindSelect(id: string, key: keyof FlowtateSettings): void {
  document.getElementById(id)?.addEventListener('change', (e) => {
    api.setSettings({ [key]: (e.target as HTMLSelectElement).value } as any);
  });
}

bindCheckbox('startOnLogin', 'startOnLogin');
bindCheckbox('showInTaskbar', 'showInTaskbar');
bindSelect('theme', 'theme');
bindSelect('dictationMode', 'dictationMode');
bindCheckbox('aiFormattingEnabled', 'aiFormattingEnabled');
bindCheckbox('removeFillersEnabled', 'removeFillersEnabled');
bindCheckbox('grammarCorrectionEnabled', 'grammarCorrectionEnabled');

// Translation settings
document.getElementById('translationEnabled')?.addEventListener('change', async (e) => {
  const current = await api.getSettings();
  api.setSettings({
    translation: { ...current.translation, enabled: (e.target as HTMLInputElement).checked },
  });
});

document.getElementById('inputLanguage')?.addEventListener('change', async (e) => {
  const current = await api.getSettings();
  api.setSettings({
    translation: { ...current.translation, inputLanguage: (e.target as HTMLSelectElement).value },
  });
});

document.getElementById('outputLanguages')?.addEventListener('change', async (e) => {
  const current = await api.getSettings();
  const langs = (e.target as HTMLInputElement).value.split(',').map((l) => l.trim()).filter(Boolean);
  api.setSettings({
    translation: { ...current.translation, outputLanguages: langs },
  });
});

document.getElementById('multiLangFormat')?.addEventListener('change', async (e) => {
  const current = await api.getSettings();
  api.setSettings({
    translation: { ...current.translation, multiLangFormat: (e.target as HTMLSelectElement).value as any },
  });
});

// Sensitivity
document.getElementById('audioSensitivity')?.addEventListener('input', (e) => {
  api.setSettings({ audioSensitivity: Number((e.target as HTMLInputElement).value) });
});

// API Keys
document.getElementById('saveApiKeys')?.addEventListener('click', () => {
  const openai = (document.getElementById('openaiApiKey') as HTMLInputElement).value;
  const anthropic = (document.getElementById('anthropicApiKey') as HTMLInputElement).value;
  api.setSettings({ openaiApiKey: openai, anthropicApiKey: anthropic });
});

// ─── Hotkey Capture ───

['dictationHotkey', 'commandHotkey', 'cancelHotkey'].forEach((id) => {
  const input = document.getElementById(id) as HTMLInputElement;
  input?.addEventListener('keydown', (e) => {
    e.preventDefault();
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      parts.push(e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key);
    }
    if (parts.length > 0) {
      const combo = parts.join('+');
      input.value = combo;
      api.setSettings({ [id]: combo } as any);
    }
  });
});

// ─── Dictionary UI ───

async function loadDictionary(): Promise<void> {
  const entries = await api.getDictionary();
  const list = document.getElementById('dictList')!;
  list.innerHTML = '';
  for (const entry of entries) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${entry.word} <em>(${entry.category})</em></span>
      <button class="remove-btn">&times;</button>`;
    li.querySelector('.remove-btn')?.addEventListener('click', async () => {
      const updated = entries.filter((e) => e.word !== entry.word);
      await api.setDictionary(updated);
      loadDictionary();
    });
    list.appendChild(li);
  }
}

document.getElementById('dictAddBtn')?.addEventListener('click', async () => {
  const word = (document.getElementById('dictWord') as HTMLInputElement).value.trim();
  const category = (document.getElementById('dictCategory') as HTMLInputElement).value.trim() || 'general';
  if (!word) return;
  const entries = await api.getDictionary();
  entries.push({ word, category });
  await api.setDictionary(entries);
  (document.getElementById('dictWord') as HTMLInputElement).value = '';
  loadDictionary();
});

// ─── Snippets UI ───

async function loadSnippets(): Promise<void> {
  const snippets = await api.getSnippets();
  const list = document.getElementById('snippetList')!;
  list.innerHTML = '';
  for (const snippet of snippets) {
    const li = document.createElement('li');
    const valueDisplay =
      snippet.type === 'text-expansion'
        ? snippet.text
        : snippet.type === 'language-switch'
          ? snippet.languages?.join(', ')
          : snippet.action;
    li.innerHTML = `<span>"${snippet.trigger}" &rarr; ${valueDisplay} <em>(${snippet.type})</em></span>
      <button class="remove-btn">&times;</button>`;
    li.querySelector('.remove-btn')?.addEventListener('click', async () => {
      const updated = snippets.filter((s) => s.id !== snippet.id);
      await api.setSnippets(updated);
      loadSnippets();
    });
    list.appendChild(li);
  }
}

document.getElementById('snippetAddBtn')?.addEventListener('click', async () => {
  const trigger = (document.getElementById('snippetTrigger') as HTMLInputElement).value.trim();
  const type = (document.getElementById('snippetType') as HTMLSelectElement).value as any;
  const value = (document.getElementById('snippetValue') as HTMLInputElement).value.trim();
  if (!trigger || !value) return;

  const snippets = await api.getSnippets();
  const newSnippet: Snippet = {
    id: `custom-${Date.now()}`,
    trigger,
    type,
    enabled: true,
  };

  if (type === 'text-expansion') newSnippet.text = value;
  else if (type === 'language-switch') newSnippet.languages = value.split(',').map((l) => l.trim());
  else newSnippet.action = value;

  snippets.push(newSnippet);
  await api.setSnippets(snippets);
  (document.getElementById('snippetTrigger') as HTMLInputElement).value = '';
  (document.getElementById('snippetValue') as HTMLInputElement).value = '';
  loadSnippets();
});

// ─── Audio Devices ───

async function loadAudioDevices(): Promise<void> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === 'audioinput');
    const select = document.getElementById('inputDevice') as HTMLSelectElement;
    select.innerHTML = '';
    for (const device of audioInputs) {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Microphone ${select.options.length + 1}`;
      select.appendChild(option);
    }
  } catch {
    // No permissions yet
  }
}

// ─── Init ───

loadSettings();
loadDictionary();
loadSnippets();
loadAudioDevices();
