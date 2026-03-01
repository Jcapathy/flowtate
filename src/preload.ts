import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './shared/types';
import type {
  FlowtateSettings,
  DictationState,
  DictationResult,
  Snippet,
  DictionaryEntry,
  HistoryEntry,
  UsageStats,
} from './shared/types';

const api = {
  // ─── Dictation ───
  startRecording: () => ipcRenderer.send(IPC.START_RECORDING),
  stopRecording: () => ipcRenderer.send(IPC.STOP_RECORDING),
  sendAudioData: (buffer: ArrayBuffer) =>
    ipcRenderer.send(IPC.AUDIO_DATA, buffer),
  onDictationResult: (cb: (result: DictationResult) => void) => {
    const handler = (_: Electron.IpcRendererEvent, result: DictationResult) => cb(result);
    ipcRenderer.on(IPC.DICTATION_RESULT, handler);
    return () => ipcRenderer.removeListener(IPC.DICTATION_RESULT, handler);
  },
  onDictationState: (cb: (state: DictationState) => void) => {
    const handler = (_: Electron.IpcRendererEvent, state: DictationState) => cb(state);
    ipcRenderer.on(IPC.DICTATION_STATE, handler);
    return () => ipcRenderer.removeListener(IPC.DICTATION_STATE, handler);
  },
  onDictationError: (cb: (error: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, error: string) => cb(error);
    ipcRenderer.on(IPC.DICTATION_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC.DICTATION_ERROR, handler);
  },

  // ─── Command Mode ───
  startCommand: () => ipcRenderer.send(IPC.START_COMMAND),
  onCommandResult: (cb: (result: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, result: string) => cb(result);
    ipcRenderer.on(IPC.COMMAND_RESULT, handler);
    return () => ipcRenderer.removeListener(IPC.COMMAND_RESULT, handler);
  },

  // ─── Settings ───
  getSettings: (): Promise<FlowtateSettings> =>
    ipcRenderer.invoke(IPC.GET_SETTINGS),
  setSettings: (settings: Partial<FlowtateSettings>): Promise<void> =>
    ipcRenderer.invoke(IPC.SET_SETTINGS, settings),
  onSettingsChanged: (cb: (settings: FlowtateSettings) => void) => {
    const handler = (_: Electron.IpcRendererEvent, settings: FlowtateSettings) => cb(settings);
    ipcRenderer.on(IPC.SETTINGS_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC.SETTINGS_CHANGED, handler);
  },

  // ─── History ───
  getHistory: (limit?: number, offset?: number): Promise<HistoryEntry[]> =>
    ipcRenderer.invoke(IPC.GET_HISTORY, limit, offset),
  getStats: (): Promise<UsageStats> => ipcRenderer.invoke(IPC.GET_STATS),

  // ─── Snippets ───
  getSnippets: (): Promise<Snippet[]> => ipcRenderer.invoke(IPC.GET_SNIPPETS),
  setSnippets: (snippets: Snippet[]): Promise<void> =>
    ipcRenderer.invoke(IPC.SET_SNIPPETS, snippets),

  // ─── Dictionary ───
  getDictionary: (): Promise<DictionaryEntry[]> =>
    ipcRenderer.invoke(IPC.GET_DICTIONARY),
  setDictionary: (entries: DictionaryEntry[]): Promise<void> =>
    ipcRenderer.invoke(IPC.SET_DICTIONARY, entries),

  // ─── Translation ───
  setOutputLanguage: (languages: string[]): Promise<void> =>
    ipcRenderer.invoke(IPC.SET_OUTPUT_LANGUAGE, languages),
  getOutputLanguage: (): Promise<string[]> =>
    ipcRenderer.invoke(IPC.GET_OUTPUT_LANGUAGE),

  // ─── Audio Devices ───
  getAudioDevices: (): Promise<MediaDeviceInfo[]> =>
    ipcRenderer.invoke(IPC.GET_AUDIO_DEVICES),
};

export type FlowtateAPI = typeof api;

contextBridge.exposeInMainWorld('flowtate', api);
