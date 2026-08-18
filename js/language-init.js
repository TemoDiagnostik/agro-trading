(function () {
  'use strict';

  const PRIMARY_LANGUAGES = Object.freeze([
    'en', 'de', 'cs', 'pl', 'fr', 'es', 'it', 'ar'
  ]);

  const SECONDARY_LANGUAGES = Object.freeze([
    'nl', 'ro', 'el', 'pt', 'bg', 'hu', 'da',
    'sv', 'fi', 'sk', 'sl', 'hr', 'sr', 'tr'
  ]);

  const SUPPORTED_LANGUAGES = Object.freeze([
    ...PRIMARY_LANGUAGES,
    ...SECONDARY_LANGUAGES
  ]);

  const RTL_LANGUAGES = new Set(['ar']);

  function normalizeLanguage(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace('_', '-')
      .split('-')[0];
  }

  function getStoredLanguage() {
    try {
      return localStorage.getItem('lang');
    } catch (error) {
      return null;
    }
  }

  function detectLanguage() {
    const candidates = [
      new URLSearchParams(location.search).get('lang'),
      getStoredLanguage(),
      (navigator.languages && navigator.languages[0]) || navigator.language,
      'en'
    ];

    for (const candidate of candidates) {
      const language = normalizeLanguage(candidate);

      if (SUPPORTED_LANGUAGES.includes(language)) {
        return language;
      }
    }

    return 'en';
  }

  function applyDocumentLanguage(language) {
    const normalized = SUPPORTED_LANGUAGES.includes(normalizeLanguage(language))
      ? normalizeLanguage(language)
      : 'en';

    document.documentElement.lang = normalized;
    document.documentElement.dir = RTL_LANGUAGES.has(normalized) ? 'rtl' : 'ltr';

    if (RTL_LANGUAGES.has(normalized)) {
      document.documentElement.style.fontFamily =
        "'Tajawal', 'Noto Sans Arabic', system-ui, sans-serif";
    } else {
      document.documentElement.style.removeProperty('font-family');
    }

    return normalized;
  }

  window.EuroAgriLanguage = Object.freeze({
    primary: PRIMARY_LANGUAGES,
    secondary: SECONDARY_LANGUAGES,
    supported: SUPPORTED_LANGUAGES,
    normalize: normalizeLanguage,
    detect: detectLanguage,
    applyDocumentLanguage
  });

  applyDocumentLanguage(detectLanguage());
})();
