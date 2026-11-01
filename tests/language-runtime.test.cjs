const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function element(attributes = {}) {
  return {attributes, textContent: '', setAttribute(k, v) {this.attributes[k] = v;},
    getAttribute(k) {return this.attributes[k] ?? null;}, hasAttribute(k) {return k in this.attributes;}};
}

function setup(language, {stored, browserLanguage = 'en', unavailableStorage = false} = {}) {
  const heading = element({'data-i18n': 'supplier.title'});
  const placeholder = element({'data-i18n-placeholder': 'supplier.placeholder.exact'});
  const link = element({href: 'privacy.html?source=supplier#rights'});
  const download = element({href: 'catalogue.pdf', download: ''});
  let ready;
  const translated = new Promise(resolve => {ready = resolve;});
  const document = {readyState: 'complete', title: '', documentElement: {
    lang: 'ar', dir: 'rtl', dataset: {i18nTitle: 'supplier.meta.title'},
    style: {fontFamily: 'Arabic', removeProperty() {this.fontFamily = '';}}
  }, querySelector: () => null, getElementById: () => null,
  querySelectorAll(selector) {
    return {'[data-i18n]': [heading], '[data-i18n-placeholder]': [placeholder],
      'a[href]': [link, download]}[selector] || [];
  }, dispatchEvent(event) {ready(event.detail);}};
  const context = {window: {}, document, URL, URLSearchParams, console,
    navigator: {language: browserLanguage},
    location: {search: language ? `?lang=${language}` : '', href: 'https://euroagritrading.eu/supplier-application.html', origin: 'https://euroagritrading.eu'},
    localStorage: {getItem() {if (unavailableStorage) throw Error('Unavailable'); return stored;}},
    CustomEvent: class {constructor(type, options) {this.type = type; this.detail = options.detail;}},
    fetch: async path => ({ok: true, json: async () => JSON.parse(fs.readFileSync(path, 'utf8'))})};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/language-init.js', 'utf8'), context);
  return {context, heading, placeholder, link, download, translated};
}

for (const [input, normalized] of [['ru-RU', 'ru'], ['zh-CN', 'zh'], ['zh_Hans', 'zh']]) {
  test(`${input} translates standalone forms and preserves internal navigation`, async () => {
    const run = setup(input);
    vm.runInContext(fs.readFileSync('js/i18n.js', 'utf8'), run.context);
    const event = await run.translated;
    const d = JSON.parse(fs.readFileSync(`i18n/${normalized}.json`, 'utf8'));
    assert.equal(event.language, normalized);
    assert.equal(run.context.document.documentElement.dir, 'ltr');
    assert.equal(run.heading.textContent, d['supplier.title']);
    assert.equal(run.placeholder.attributes.placeholder, d['supplier.placeholder.exact']);
    assert.equal(run.context.document.title, d['supplier.meta.title']);
    assert.equal(run.link.attributes.href, `privacy.html?source=supplier&lang=${normalized}#rights`);
    assert.equal(run.download.attributes.href, 'catalogue.pdf');
  });
}

test('language preference order remains URL, saved choice, browser, English', () => {
  assert.equal(setup('zh', {stored: 'ru'}).context.document.documentElement.lang, 'zh');
  assert.equal(setup(null, {stored: 'ru', browserLanguage: 'zh-CN'}).context.document.documentElement.lang, 'ru');
  assert.equal(setup(null, {browserLanguage: 'zh-CN', unavailableStorage: true}).context.document.documentElement.lang, 'zh');
  assert.equal(setup('unknown', {browserLanguage: 'unknown'}).context.document.documentElement.lang, 'en');
  assert.equal(setup('ar').context.document.documentElement.dir, 'rtl');
});

for (const language of ['ru', 'zh']) {
  for (const [type, prefix, page] of [['buyer-rfq', 'RFQ', 'buyer-rfq-thankyou.html'],
    ['supplier-qualification', 'KYC', 'thankyou.html'], ['commercial-partnership', 'CP', 'commercial-partnership-thankyou.html']]) {
    test(`${language} survives a confirmed ${type} submission`, async () => {
      let destination;
      const context = {window: {}, URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
        document: {documentElement: {lang: language}},
        location: {href: 'https://euroagritrading.eu/index.html', assign(url) {destination = new URL(url);}},
        FormData: class {constructor() {return new URLSearchParams({formType: type, Language: language});}},
        fetch: async () => ({ok: true, type: 'cors', json: async () => ({version: 1, accepted: true, formType: type, submissionId: `EAT-${prefix}-20261101-120000-ABC123`})})};
      vm.runInNewContext(fs.readFileSync('js/form-receipt.js', 'utf8'), context);
      await context.window.EuroAgriSubmitForm({action: 'https://example.test/submit'});
      assert.equal(destination.pathname, `/${page}`);
      assert.equal(destination.searchParams.get('lang'), language);
    });
  }
}
