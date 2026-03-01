import Store from 'electron-store';
import { FlowtateSettings, DEFAULT_SETTINGS } from '../shared/types';

const store = new Store<FlowtateSettings>({
  name: 'flowtate-settings',
  defaults: DEFAULT_SETTINGS,
});

export function getSettings(): FlowtateSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...store.store,
  };
}

export function setSettings(partial: Partial<FlowtateSettings>): FlowtateSettings {
  const current = getSettings();
  const updated = { ...current, ...partial };
  store.store = updated;
  return updated;
}

export function getSetting<K extends keyof FlowtateSettings>(
  key: K,
): FlowtateSettings[K] {
  return store.get(key, DEFAULT_SETTINGS[key]);
}

export function setSetting<K extends keyof FlowtateSettings>(
  key: K,
  value: FlowtateSettings[K],
): void {
  store.set(key, value);
}

export { store };
