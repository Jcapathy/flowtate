import { clipboard } from 'electron';
import { keyboard, Key } from '@nut-tree-fork/nut-js';

/**
 * Write text to clipboard and simulate Ctrl+V to paste into the active app.
 */
export async function pasteText(text: string): Promise<void> {
  // Save current clipboard content so we can restore it
  const previousClipboard = clipboard.readText();

  clipboard.writeText(text);

  // Small delay to ensure clipboard is set before pasting
  await new Promise((r) => setTimeout(r, 50));

  // Simulate Ctrl+V
  await keyboard.pressKey(Key.LeftControl, Key.V);
  await keyboard.releaseKey(Key.LeftControl, Key.V);

  // Restore previous clipboard after a delay
  setTimeout(() => {
    clipboard.writeText(previousClipboard);
  }, 500);
}

/**
 * Capture the currently selected text by simulating Ctrl+C.
 */
export async function captureSelection(): Promise<string> {
  // Save current clipboard
  const previousClipboard = clipboard.readText();

  // Simulate Ctrl+C to copy selection
  await keyboard.pressKey(Key.LeftControl, Key.C);
  await keyboard.releaseKey(Key.LeftControl, Key.C);

  // Wait for clipboard to update
  await new Promise((r) => setTimeout(r, 100));

  const selectedText = clipboard.readText();

  // Restore previous clipboard
  clipboard.writeText(previousClipboard);

  return selectedText;
}
