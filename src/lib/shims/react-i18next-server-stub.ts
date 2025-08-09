// Server-only stub for react-i18next to prevent React context usage on the server bundle
// Exports minimal no-op implementations sufficient for code paths that import these APIs.

type TranslationFunction = (key: any, options?: any) => string;

export function useTranslation(): { t: TranslationFunction; i18n: any } {
  const t: TranslationFunction = (key: any) => (typeof key === 'string' ? key : String(key));
  const i18n = {
    language: 'en',
    changeLanguage: async () => {},
    t,
  };
  return { t, i18n };
}

// Plugin stub. In real usage, this is an i18next plugin; here it's a no-op placeholder.
export const initReactI18next: any = {
  type: '3rdParty',
  init: () => {},
};

// Component stubs return children directly to avoid React context usage
export function Trans(props: any) {
  return props?.children ?? null;
}

export function I18nextProvider(props: any) {
  return props?.children ?? null;
}

export default {};

