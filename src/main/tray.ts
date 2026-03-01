import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import { join } from 'path';
import { getTranslationConfig } from './translation';

let tray: Tray | null = null;

interface TrayCallbacks {
  onToggleDictation: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onQuit: () => void;
}

export function createTray(callbacks: TrayCallbacks): Tray {
  // Use a simple 16x16 icon — will be replaced with proper icon later
  const iconPath = join(__dirname, '../../assets/icon.png');
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    // Fallback: create an empty icon
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Flowtate — AI Voice Dictation');

  updateTrayMenu(callbacks);
  return tray;
}

export function updateTrayMenu(callbacks: TrayCallbacks): void {
  if (!tray) return;

  const translation = getTranslationConfig();
  const langLabel = translation.enabled
    ? `Output: ${translation.outputLanguages.join(', ')}`
    : 'Output: Same as input';

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Start Dictation', click: callbacks.onToggleDictation },
    { type: 'separator' },
    { label: langLabel, enabled: false },
    { type: 'separator' },
    { label: 'Settings', click: callbacks.onOpenSettings },
    { label: 'History', click: callbacks.onOpenHistory },
    { type: 'separator' },
    { label: 'Quit Flowtate', click: callbacks.onQuit },
  ]);

  tray.setContextMenu(contextMenu);
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
