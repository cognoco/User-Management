import { describe, it, expect } from 'vitest';
import { initializeI18n } from '../index';
import { getMessageTemplate, formatMessage, formatErrorMessage } from '../messages';

describe('i18n message helpers', () => {
  it('extracts template by locale', () => {
    const instance = initializeI18n({
      resources: { fr: { userManagement: { errors: { sample: 'Erreur' } } } },
      defaultLanguage: 'fr',
    });
    expect(getMessageTemplate('errors.sample', 'fr')).toBe('Erreur');
    expect(instance.t('errors.sample')).toBe('Erreur');
  });

  it('formats messages with variables', () => {
    initializeI18n({
      resources: { en: { userManagement: { errors: { greet: 'Hi {{name}}' } } } },
      defaultLanguage: 'en',
    });
    expect(formatMessage('errors.greet', { name: 'Bob' }, 'en')).toBe('Hi Bob');
    expect(formatErrorMessage('greet', { name: 'Bob' }, 'en')).toBe('Hi Bob');
  });
});
