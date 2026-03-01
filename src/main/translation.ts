import { getSettings, setSettings } from './settings-store';
import type { TranslationConfig } from '../shared/types';

export function getTranslationConfig(): TranslationConfig {
  return getSettings().translation;
}

export function setOutputLanguages(languages: string[]): TranslationConfig {
  const current = getTranslationConfig();
  const updated: TranslationConfig = {
    ...current,
    enabled: languages.length > 0 && !(languages.length === 1 && languages[0] === current.inputLanguage),
    outputLanguages: languages,
  };
  setSettings({ translation: updated });
  return updated;
}

export function isTranslationNeeded(): boolean {
  const config = getTranslationConfig();
  if (!config.enabled) return false;
  if (config.outputLanguages.length === 0) return false;
  if (config.outputLanguages.length === 1 && config.outputLanguages[0] === config.inputLanguage) return false;
  return true;
}
