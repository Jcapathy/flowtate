import type { FlowtateAPI } from '../../preload';
import type { DictationState } from '../../shared/types';

declare global {
  interface Window {
    flowtate: FlowtateAPI;
  }
}

const overlay = document.getElementById('overlay')!;
const label = overlay.querySelector('.label')!;
const langBadge = document.getElementById('lang-badge')!;

// ─── Audio Recording in Renderer ───
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

async function startRecording(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const buffer = await blob.arrayBuffer();
      window.flowtate.sendAudioData(buffer);

      // Stop all tracks
      stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.start(250); // Collect in 250ms chunks
  } catch (err) {
    console.error('Failed to start recording:', err);
  }
}

function stopRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder = null;
  }
}

// ─── State Handling ───

function updateState(state: DictationState): void {
  overlay.className = `overlay ${state}`;

  switch (state) {
    case 'idle':
      label.textContent = 'Ready';
      break;
    case 'recording':
      label.textContent = 'Listening...';
      break;
    case 'processing':
      label.textContent = 'Processing...';
      break;
  }
}

// ─── IPC Listeners ───

window.flowtate.onDictationState((state) => {
  updateState(state);
});

// The main process tells us when to start/stop mic capture
const { ipcRenderer } = require('electron') as typeof import('electron');

ipcRenderer.on('dictation:start-recording', () => {
  startRecording();
});

ipcRenderer.on('dictation:stop-recording', () => {
  stopRecording();
});

// Update language badge
async function updateLanguageBadge(): Promise<void> {
  const langs = await window.flowtate.getOutputLanguage();
  langBadge.textContent = langs.join('/').toUpperCase() || 'EN';
}

window.flowtate.onSettingsChanged(() => {
  updateLanguageBadge();
});

updateLanguageBadge();
