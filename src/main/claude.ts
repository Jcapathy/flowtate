import Anthropic from '@anthropic-ai/sdk';
import { getSetting } from './settings-store';
import type { TranslationConfig, FormattingProfile } from '../shared/types';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = getSetting('anthropicApiKey');
  if (!client || (client as any).apiKey !== apiKey) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

// ─── Formatting Profiles ───

const DEFAULT_PROFILES: Record<string, Partial<FormattingProfile>> = {
  casual: {
    formality: 'casual',
    sentenceLength: 'short',
    useBullets: false,
    preserveGreetings: false,
  },
  formal: {
    formality: 'formal',
    sentenceLength: 'medium',
    useBullets: false,
    preserveGreetings: true,
  },
  code: {
    formality: 'balanced',
    sentenceLength: 'medium',
    useBullets: false,
    preserveGreetings: false,
    customInstructions: 'Format as code comments. Preserve all technical terms exactly.',
  },
  balanced: {
    formality: 'balanced',
    sentenceLength: 'medium',
    useBullets: false,
    preserveGreetings: false,
  },
};

// ─── App → Profile Mapping ───

const APP_PROFILE_MAP: Record<string, string> = {
  slack: 'casual',
  discord: 'casual',
  whatsapp: 'casual',
  telegram: 'casual',
  'microsoft teams': 'casual',
  gmail: 'formal',
  outlook: 'formal',
  thunderbird: 'formal',
  'vs code': 'code',
  'visual studio code': 'code',
  cursor: 'code',
  'intellij': 'code',
  word: 'formal',
  'google docs': 'formal',
  notepad: 'balanced',
};

function getProfileForApp(appName: string): Partial<FormattingProfile> {
  const lower = appName.toLowerCase();
  for (const [key, profileName] of Object.entries(APP_PROFILE_MAP)) {
    if (lower.includes(key)) {
      return DEFAULT_PROFILES[profileName] ?? DEFAULT_PROFILES.balanced;
    }
  }
  return DEFAULT_PROFILES.balanced;
}

function buildFormattingPrompt(
  profile: Partial<FormattingProfile>,
  translation: TranslationConfig,
): string {
  const parts: string[] = [];

  parts.push('You are a voice dictation text formatter. Clean up the raw speech transcription below.');
  parts.push('Rules:');
  parts.push('- Remove filler words (um, uh, like, you know, so, basically)');
  parts.push('- Fix grammar, spelling, punctuation, and capitalization');
  parts.push('- Do NOT add information that was not spoken');
  parts.push('- Output ONLY the formatted text, nothing else');

  if (profile.formality === 'casual') {
    parts.push('- Keep it casual and conversational. Short sentences.');
  } else if (profile.formality === 'formal') {
    parts.push('- Use formal, professional language. Proper sentence structure.');
  }

  if (profile.preserveGreetings) {
    parts.push('- Preserve greetings and closings (Hello, Best regards, etc.)');
  }

  if (profile.customInstructions) {
    parts.push(`- ${profile.customInstructions}`);
  }

  // Translation instructions
  if (translation.enabled && translation.outputLanguages.length > 0) {
    const langs = translation.outputLanguages;
    if (langs.length === 1 && langs[0] !== translation.inputLanguage) {
      parts.push(`- Translate the output into ${langs[0]}. Produce natural, fluent text (not word-for-word).`);
    } else if (langs.length > 1) {
      parts.push(`- Output the text in multiple languages: ${langs.join(', ')}.`);
      switch (translation.multiLangFormat) {
        case 'stacked':
          parts.push('- Put each language on its own line, labeled with the language name.');
          break;
        case 'side-by-side':
          parts.push('- Put translations side-by-side separated by " | ".');
          break;
        case 'parenthetical':
          parts.push('- Put the primary language first, then translations in parentheses.');
          break;
      }
    }
  }

  return parts.join('\n');
}

// ─── Public API ───

export async function formatText(
  rawText: string,
  activeApp: string,
  translation: TranslationConfig,
): Promise<string> {
  const anthropic = getClient();
  const profile = getProfileForApp(activeApp);
  const systemPrompt = buildFormattingPrompt(profile, translation);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: rawText }],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function executeCommand(
  selectedText: string,
  voiceCommand: string,
): Promise<string> {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 2048,
    system: [
      'You are a text editing assistant. The user has selected some text and given a voice command describing how to modify it.',
      'Apply the command to the selected text and output ONLY the modified text. Do not add explanations.',
    ].join('\n'),
    messages: [
      {
        role: 'user',
        content: `Selected text:\n"""\n${selectedText}\n"""\n\nCommand: ${voiceCommand}`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}
