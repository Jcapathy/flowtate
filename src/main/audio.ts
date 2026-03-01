import { BrowserWindow, ipcMain } from 'electron';
import { IPC } from '../shared/types';

let audioChunks: Buffer[] = [];
let overlayWindow: BrowserWindow | null = null;

export function initAudio(overlay: BrowserWindow): void {
  overlayWindow = overlay;

  ipcMain.on(IPC.AUDIO_DATA, (_event, buffer: ArrayBuffer) => {
    audioChunks.push(Buffer.from(buffer));
  });
}

export function startCapture(): void {
  audioChunks = [];
  // Tell the overlay renderer to start recording from the mic
  overlayWindow?.webContents.send(IPC.START_RECORDING);
}

export function stopCapture(): Buffer | null {
  // Tell the overlay renderer to stop recording
  overlayWindow?.webContents.send(IPC.STOP_RECORDING);

  if (audioChunks.length === 0) return null;

  const combined = Buffer.concat(audioChunks);
  audioChunks = [];
  return combined;
}

export function clearCapture(): void {
  audioChunks = [];
  overlayWindow?.webContents.send(IPC.STOP_RECORDING);
}
