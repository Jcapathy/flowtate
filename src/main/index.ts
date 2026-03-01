import { config } from 'dotenv';
import { join as pathJoin } from 'path';

// Load .env from project root (works both in dev and packaged)
config({ path: pathJoin(__dirname, '../../.env') });

import {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  screen,
} from 'electron';
import { join } from 'path';
import { registerHotkeys, unregisterHotkeys, setHotkeyCallbacks, setRecordingState } from './hotkeys';
import { initAudio, startCapture, stopCapture, clearCapture } from './audio';
import { transcribe } from './whisper';
import { formatText, executeCommand } from './claude';
import { pasteText, captureSelection } from './clipboard';
import { getActiveWindow } from './window-detector';
import { matchSnippet, getSnippets, setSnippets as saveSnippets } from './snippets';
import { getDictionary, setDictionary as saveDictionary, buildWhisperPrompt } from './dictionary';
import { getTranslationConfig, setOutputLanguages } from './translation';
import { addEntry, getHistory, getStats, closeDb } from './history';
import { getSettings, setSettings } from './settings-store';
import { createTray, updateTrayMenu, destroyTray } from './tray';
import { IPC } from '../shared/types';
import type { DictationState } from '../shared/types';

// ─── Window references ───
let overlayWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let historyWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

// ─── Helper: Broadcast state to overlay ───
function broadcastState(state: DictationState): void {
  overlayWindow?.webContents.send(IPC.DICTATION_STATE, state);
}

function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

// ─── Create Windows ───

function createOverlayWindow(): BrowserWindow {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width: 200,
    height: 80,
    x: screenW - 220,
    y: screenH - 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setIgnoreMouseEvents(true, { forward: true });

  if (isDev) {
    win.loadURL('http://localhost:5173/src/renderer/overlay/index.html');
  } else {
    win.loadFile(join(__dirname, '../renderer/src/renderer/overlay/index.html'));
  }

  return win;
}

function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }

  const win = new BrowserWindow({
    width: 700,
    height: 550,
    title: 'Flowtate Settings',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173/src/renderer/settings/index.html');
  } else {
    win.loadFile(join(__dirname, '../renderer/src/renderer/settings/index.html'));
  }

  win.on('closed', () => {
    settingsWindow = null;
  });

  settingsWindow = win;
  return win;
}

function createHistoryWindow(): BrowserWindow {
  if (historyWindow && !historyWindow.isDestroyed()) {
    historyWindow.focus();
    return historyWindow;
  }

  const win = new BrowserWindow({
    width: 600,
    height: 500,
    title: 'Flowtate History',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173/src/renderer/history/index.html');
  } else {
    win.loadFile(join(__dirname, '../renderer/src/renderer/history/index.html'));
  }

  win.on('closed', () => {
    historyWindow = null;
  });

  historyWindow = win;
  return win;
}

// ─── Dictation Pipeline ───

async function handleDictationStop(): Promise<void> {
  broadcastState('processing');

  const audioBuffer = stopCapture();
  if (!audioBuffer || audioBuffer.length === 0) {
    broadcastState('idle');
    return;
  }

  try {
    // 1. Transcribe with Whisper
    const whisperPrompt = buildWhisperPrompt();
    const settings = getSettings();
    const rawText = await transcribe(audioBuffer, {
      language: settings.translation.inputLanguage,
      prompt: whisperPrompt || undefined,
    });

    if (!rawText.trim()) {
      broadcastState('idle');
      return;
    }

    // 2. Check for snippet triggers
    const snippet = matchSnippet(rawText);
    if (snippet) {
      if (snippet.type === 'language-switch' && snippet.languages) {
        setOutputLanguages(snippet.languages);
        showNotification('Language Switched', `Output: ${snippet.languages.join(', ')}`);
        broadcastState('idle');
        return;
      }
      if (snippet.type === 'text-expansion' && snippet.text) {
        await pasteText(snippet.text);
        broadcastState('idle');
        return;
      }
      if (snippet.type === 'action' && snippet.action) {
        handleSnippetAction(snippet.action);
        broadcastState('idle');
        return;
      }
    }

    // 3. Format with Claude (if enabled)
    let outputText = rawText;
    if (settings.aiFormattingEnabled) {
      const activeWin = await getActiveWindow();
      const translation = getTranslationConfig();
      outputText = await formatText(rawText, activeWin.processName, translation);
    }

    // 4. Paste into active app
    await pasteText(outputText);

    // 5. Save to history
    const activeWin = await getActiveWindow();
    addEntry({
      rawText,
      formattedText: outputText,
      timestamp: Date.now(),
      sourceApp: activeWin.processName,
      outputLanguage: settings.translation.outputLanguages.join(', ') || 'en',
      wordCount: outputText.split(/\s+/).length,
    });

    broadcastState('idle');
  } catch (error: any) {
    console.error('Dictation error:', error);
    showNotification('Dictation Error', error.message ?? 'Unknown error');
    overlayWindow?.webContents.send(IPC.DICTATION_ERROR, error.message ?? 'Unknown error');
    broadcastState('idle');
  }
}

async function handleCommandStart(): Promise<void> {
  try {
    // 1. Capture the current selection
    const selectedText = await captureSelection();
    if (!selectedText.trim()) {
      showNotification('Command Mode', 'No text selected');
      return;
    }

    // 2. Start recording the voice command
    broadcastState('recording');
    startCapture();

    // The user will press the hotkey again to stop — handled by toggle logic
    // For command mode, we use a flag to know we're in command mode
    commandModeSelectedText = selectedText;
    isCommandMode = true;
  } catch (error: any) {
    console.error('Command mode error:', error);
    showNotification('Command Error', error.message ?? 'Unknown error');
  }
}

let commandModeSelectedText = '';
let isCommandMode = false;

async function handleCommandStop(): Promise<void> {
  broadcastState('processing');

  const audioBuffer = stopCapture();
  if (!audioBuffer || audioBuffer.length === 0) {
    broadcastState('idle');
    isCommandMode = false;
    return;
  }

  try {
    const rawCommand = await transcribe(audioBuffer);
    const result = await executeCommand(commandModeSelectedText, rawCommand);
    await pasteText(result);
    broadcastState('idle');
  } catch (error: any) {
    console.error('Command execution error:', error);
    showNotification('Command Error', error.message ?? 'Unknown error');
    broadcastState('idle');
  } finally {
    isCommandMode = false;
    commandModeSelectedText = '';
  }
}

function handleSnippetAction(action: string): void {
  const settings = getSettings();
  switch (action) {
    case 'disable-formatting':
      setSettings({ aiFormattingEnabled: false });
      showNotification('Formatting', 'AI formatting disabled');
      break;
    case 'enable-formatting':
      setSettings({ aiFormattingEnabled: true });
      showNotification('Formatting', 'AI formatting enabled');
      break;
  }
}

// ─── IPC Handlers ───

function setupIPC(): void {
  // Settings
  ipcMain.handle(IPC.GET_SETTINGS, () => getSettings());
  ipcMain.handle(IPC.SET_SETTINGS, (_e, partial) => {
    const updated = setSettings(partial);
    // Re-register hotkeys if changed
    registerHotkeys();
    overlayWindow?.webContents.send(IPC.SETTINGS_CHANGED, updated);
    settingsWindow?.webContents.send(IPC.SETTINGS_CHANGED, updated);
    return updated;
  });

  // History
  ipcMain.handle(IPC.GET_HISTORY, (_e, limit, offset) => getHistory(limit, offset));
  ipcMain.handle(IPC.GET_STATS, () => getStats());

  // Snippets
  ipcMain.handle(IPC.GET_SNIPPETS, () => getSnippets());
  ipcMain.handle(IPC.SET_SNIPPETS, (_e, snippets) => saveSnippets(snippets));

  // Dictionary
  ipcMain.handle(IPC.GET_DICTIONARY, () => getDictionary());
  ipcMain.handle(IPC.SET_DICTIONARY, (_e, entries) => saveDictionary(entries));

  // Translation
  ipcMain.handle(IPC.SET_OUTPUT_LANGUAGE, (_e, languages) => setOutputLanguages(languages));
  ipcMain.handle(IPC.GET_OUTPUT_LANGUAGE, () => getTranslationConfig().outputLanguages);

  // Manual dictation control from renderer
  ipcMain.on(IPC.START_RECORDING, () => {
    startCapture();
    broadcastState('recording');
  });
  ipcMain.on(IPC.STOP_RECORDING, () => {
    if (isCommandMode) {
      handleCommandStop();
    } else {
      handleDictationStop();
    }
  });
}

// ─── App Lifecycle ───

app.whenReady().then(() => {
  overlayWindow = createOverlayWindow();
  initAudio(overlayWindow);
  setupIPC();

  // Set up hotkey callbacks
  setHotkeyCallbacks({
    onDictationStart: () => {
      startCapture();
      broadcastState('recording');
    },
    onDictationStop: () => {
      if (isCommandMode) {
        handleCommandStop();
      } else {
        handleDictationStop();
      }
    },
    onCommandStart: () => {
      handleCommandStart();
    },
    onCancel: () => {
      clearCapture();
      isCommandMode = false;
      commandModeSelectedText = '';
      broadcastState('idle');
    },
  });

  registerHotkeys();

  createTray({
    onToggleDictation: () => {
      // Toggle via tray
      startCapture();
      broadcastState('recording');
    },
    onOpenSettings: () => createSettingsWindow(),
    onOpenHistory: () => createHistoryWindow(),
    onQuit: () => app.quit(),
  });
});

app.on('will-quit', () => {
  unregisterHotkeys();
  destroyTray();
  closeDb();
});

app.on('window-all-closed', () => {
  // Don't quit — Flowtate runs in the tray
});
