(function () {
  'use strict';

  const languageConfig = window.EuroAgriLanguage;

  if (!languageConfig) {
    console.error('Language configuration failed to load.');
    return;
  }

  const dictionaryCache = new Map();
  let languageRequestId = 0;
  let secondaryList = null;
  let secondaryToggle = null;

  async function fetchDictionary(language) {
    if (dictionaryCache.has(language)) {
      return dictionaryCache.get(language);
    }

    try {
      const response = await fetch(`i18n/${language}.json`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const dictionary = await response.json();
      dictionaryCache.set(language, dictionary);
      return dictionary;
    } catch (error) {
      console.warn(`Could not load i18n/${language}.json`, error);
      dictionaryCache.set(language, {});
      return {};
    }
  }

  async function loadDictionary(language) {
    const english = await fetchDictionary('en');

    if (language === 'en') {
      return english;
    }

    const translated = await fetchDictionary(language);
    return { ...english, ...translated };
  }

  function storeLanguage(language) {
    try {
      localStorage.setItem('lang', language);
    } catch (error) {
      // The URL still preserves the choice if storage is unavailable.
    }
  }

  function updateCurrentUrl(language) {
    try {
      const url = new URL(location.href);
      url.searchParams.set('lang', language);
      history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    } catch (error) {
      // Ignore environments where history replacement is unavailable.
    }
  }

  function syncInternalLinks(language) {
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');

      if (
        !href ||
        href.startsWith('#') ||
        link.hasAttribute('download') ||
        /^(?:mailto:|tel:|javascript:|data:)/i.test(href)
      ) {
        return;
      }

      try {
        const url = new URL(href, location.href);

        if (url.origin !== location.origin || !/\.html$/i.test(url.pathname)) {
          return;
        }

        url.searchParams.set('lang', language);

        const path = href.split(/[?#]/, 1)[0];
        const query = url.searchParams.toString();
        link.setAttribute('href', `${path}?${query}${url.hash}`);
      } catch (error) {
        // Leave malformed or unsupported links unchanged.
      }
    });
  }

  function applyTranslations(dictionary) {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');

      if (key && dictionary[key] != null) {
        element.textContent = dictionary[key];
      }
    });

    document.querySelectorAll('[data-i18n-content]').forEach(element => {
      const key = element.getAttribute('data-i18n-content');

      if (key && dictionary[key] != null) {
        element.setAttribute('content', dictionary[key]);
      }
    });

    const titleKey = document.documentElement.dataset.i18nTitle;

    if (titleKey && dictionary[titleKey] != null) {
      document.title = dictionary[titleKey];
    }
  }

  function createLanguageButton(option, groupName) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    const code = document.createElement('span');
    const name = document.createElement('span');

    item.className = `lang-${groupName}-item`;
    item.setAttribute('role', 'none');

    button.type = 'button';
    button.className = `lang-option lang-${groupName}`;
    button.dataset.lang = option.value;
    button.setAttribute('role', 'menuitem');

    code.className = 'lang-option-code';
    code.textContent = option.value.toUpperCase();

    name.className = 'lang-option-name';
    name.textContent = option.textContent;

    button.append(code, name);
    item.appendChild(button);
    return item;
  }

  function setSecondaryExpanded(expanded) {
    if (!secondaryList || !secondaryToggle) {
      return;
    }

    secondaryList.hidden = !expanded;
    secondaryToggle.setAttribute('aria-expanded', String(expanded));
  }

  function buildLanguageMenu(menu, select) {
    const options = new Map(
      Array.from(select.options).map(option => [option.value, option])
    );

    menu.innerHTML = '';

    languageConfig.primary.forEach(language => {
      const option = options.get(language);

      if (option) {
        menu.appendChild(createLanguageButton(option, 'primary'));
      }
    });

    const secondaryOptions = languageConfig.secondary
      .map(language => options.get(language))
      .filter(Boolean);

    if (!secondaryOptions.length) {
      return;
    }

    const moreItem = document.createElement('li');
    const moreButton = document.createElement('button');
    const moreLabel = document.createElement('span');
    const moreCaret = document.createElement('span');
    const nestedList = document.createElement('ul');
    const nestedListId = `more-languages-${Math.random().toString(36).slice(2, 9)}`;

    moreItem.className = 'lang-more-item';
    moreItem.setAttribute('role', 'none');

    moreButton.type = 'button';
    moreButton.className = 'lang-more-toggle';
    moreButton.setAttribute('role', 'menuitem');
    moreButton.setAttribute('aria-haspopup', 'true');
    moreButton.setAttribute('aria-controls', nestedListId);
    moreButton.setAttribute('aria-expanded', 'false');

    moreLabel.textContent = 'More languages';
    moreCaret.className = 'lang-more-caret';
    moreCaret.setAttribute('aria-hidden', 'true');
    moreCaret.textContent = '▾';

    nestedList.id = nestedListId;
    nestedList.className = 'lang-secondary-list';
    nestedList.setAttribute('role', 'menu');
    nestedList.hidden = true;

    secondaryOptions.forEach(option => {
      nestedList.appendChild(createLanguageButton(option, 'secondary'));
    });

    moreButton.append(moreLabel, moreCaret);
    moreItem.append(moreButton, nestedList);
    menu.appendChild(moreItem);

    secondaryToggle = moreButton;
    secondaryList = nestedList;

    moreButton.addEventListener('click', event => {
      event.stopPropagation();
      setSecondaryExpanded(moreButton.getAttribute('aria-expanded') !== 'true');
    });
  }

  function updateLanguageUi(language, select, button, codeElement, menu) {
    const activeOption = Array.from(select.options)
      .find(option => option.value === language);

    select.value = language;
    codeElement.textContent = language.toUpperCase();

    const languageName = activeOption ? activeOption.textContent : language.toUpperCase();
    button.title = languageName;
    button.setAttribute('aria-label', `Language: ${languageName}`);

    menu.querySelectorAll('button[data-lang]').forEach(optionButton => {
      const isCurrent = optionButton.dataset.lang === language;
      optionButton.classList.toggle('is-current', isCurrent);

      if (isCurrent) {
        optionButton.setAttribute('aria-current', 'true');
      } else {
        optionButton.removeAttribute('aria-current');
      }
    });

    setSecondaryExpanded(languageConfig.secondary.includes(language));
  }

  async function initialize() {
    const select = document.getElementById('langSelect');
    const wrapper = document.querySelector('.lang-flags');

    if (!select || !wrapper) {
      return;
    }

    const button = wrapper.querySelector('.lang-btn');
    const codeElement = wrapper.querySelector('.lang-code');
    const menu = wrapper.querySelector('.lang-menu');

    if (!button || !codeElement || !menu) {
      return;
    }

    function openMenu() {
      wrapper.classList.add('open');
      button.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      wrapper.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    }

    async function setLanguage(requestedLanguage) {
      const requestId = ++languageRequestId;
      const normalized = languageConfig.normalize(requestedLanguage);
      const language = languageConfig.supported.includes(normalized)
        ? normalized
        : 'en';
      const dictionary = await loadDictionary(language);

      if (requestId !== languageRequestId) {
        return;
      }

      languageConfig.applyDocumentLanguage(language);
      applyTranslations(dictionary);
      updateLanguageUi(language, select, button, codeElement, menu);
      storeLanguage(language);
      updateCurrentUrl(language);
      syncInternalLinks(language);

      document.dispatchEvent(new CustomEvent('euroagri:languagechange', {
        detail: { language, dictionary }
      }));
    }

    buildLanguageMenu(menu, select);

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      if (wrapper.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    menu.addEventListener('click', event => {
      const languageButton = event.target.closest('button[data-lang]');

      if (!languageButton) {
        return;
      }

      select.value = languageButton.dataset.lang;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      closeMenu();
    });

    select.addEventListener('change', () => {
      setLanguage(select.value);
    });

    document.addEventListener('click', event => {
      if (!wrapper.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && wrapper.classList.contains('open')) {
        closeMenu();
        button.focus();
      }
    });

    await setLanguage(languageConfig.detect());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
