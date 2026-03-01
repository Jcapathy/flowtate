import OpenAI from 'openai';
import { getSetting } from './settings-store';
import { tmpdir } from 'os';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = getSetting('openaiApiKey');
  if (!client || (client as any).apiKey !== apiKey) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export interface WhisperOptions {
  language?: string;
  prompt?: string; // Personal dictionary words for context
}

export async function transcribe(
  audioBuffer: Buffer,
  options: WhisperOptions = {},
): Promise<string> {
  const openai = getClient();

  // Whisper API expects a file, so write buffer to temp file
  const tempPath = join(tmpdir(), `flowtate-${randomUUID()}.webm`);
  writeFileSync(tempPath, audioBuffer);

  try {
    const file = await import('fs').then((fs) =>
      fs.createReadStream(tempPath),
    );

    const response = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: options.language,
      prompt: options.prompt,
      response_format: 'text',
    });

    return typeof response === 'string' ? response : (response as any).text ?? '';
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
