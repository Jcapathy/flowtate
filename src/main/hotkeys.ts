import { globalShortcut, BrowserWindow } from 'electron';
import { getSetting } from './settings-store';
import { IPC } from '../shared/types';
import type { DictationMode } from '../shared/types';

let isRecording = false;
let dictationMode: DictationMode = 'toggle';

type HotkeyCallback = () => void;

let onDictationStart: HotkeyCallback = () => {};
let onDictationStop: HotkeyCallback = () => {};
let onCommandStart: HotkeyCallback = () => {};
let onCancel: HotkeyCallback = () => {};

export function setHotkeyCallbacks(callbacks: {
  onDictationStart: HotkeyCallback;
  onDictationStop: HotkeyCallback;
  onCommandStart: HotkeyCallback;
  onCancel: HotkeyCallback;
}) {
  onDictationStart = callbacks.onDictationStart;
  onDictationStop = callbacks.onDictationStop;
  onCommandStart = callbacks.onCommandStart;
  onCancel = callbacks.onCancel;
}

function electronAccelerator(hotkey: string): string {
  // Settings store format: "Ctrl+Space" — already Electron-compatible
  return hotkey;
}

export function registerHotkeys(): void {
  unregisterHotkeys();
  dictationMode = getSetting('dictationMode');

  const dictationKey = electronAccelerator(getSetting('dictationHotkey'));
  const commandKey = electronAccelerator(getSetting('commandHotkey'));
  const cancelKey = electronAccelerator(getSetting('cancelHotkey'));

  // Dictation hotkey
  globalShortcut.register(dictationKey, () => {
    if (dictationMode === 'toggle') {
      if (isRecording) {
        isRecording = false;
        onDictationStop();
      } else {
        isRecording = true;
        onDictationStart();
      }
    } else {
      // PTT mode — press starts, we handle release via keyup listener
      if (!isRecording) {
        isRecording = true;
        onDictationStart();
      }
    }
  });

  // Command mode hotkey
  globalShortcut.register(commandKey, () => {
    onCommandStart();
  });

  // Cancel hotkey
  globalShortcut.register(cancelKey, () => {
    if (isRecording) {
      isRecording = false;
      onCancel();
    }
  });
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll();
  isRecording = false;
}

export function setRecordingState(recording: boolean): void {
  isRecording = recording;
}
