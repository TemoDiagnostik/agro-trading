const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const source = readFileSync(resolve(__dirname, '../../js/form-confirmation.js'), 'utf8');
const origin = 'https://euroagritrading.eu';

function harness(path = '/index.html', embedded = false) {
  const listeners = new Map(), timers = new Map(), frames = [], navigations = [], messages = [];
  let posts = 0, id = 0;
  const window = {
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: (type) => listeners.delete(type),
    setTimeout: fn => { timers.set(++id, fn); return id; }
  };
  window.parent = window;
  window.top = embedded ? { postMessage: (data, target) => messages.push({ data, target }) } : window;
  const url = new URL(path, origin);
  const context = { window, URL, URLSearchParams, Set, WeakMap, Event,
    location: { origin, pathname: url.pathname, search: url.search, href: url.href, assign: url => navigations.push(url) },
    crypto: { randomUUID: () => 'frame-' + ++id },
    clearTimeout: id => timers.delete(id),
    HTMLFormElement: { prototype: { submit() { posts++; } } },
    document: {
      documentElement: { lang: 'ar' },
      body: { append: frame => frames.push(frame) },
      createElement: () => ({ contentWindow: { parent: window }, setAttribute() {}, remove() {} })
    }
  };
  vm.runInNewContext(source, context);
  const form = type => ({
    elements: { namedItem: name => ({ value: name === 'formType' ? type : 'ar' }) },
    getAttribute: () => null, removeAttribute() {}, setAttribute() {}, dispatchEvent() {}
  });
  return { window, frames, navigations, messages, timers, form, posts: () => posts,
    receive: event => listeners.get('message')?.(event),
    restore: () => listeners.get('pageshow')?.({ persisted: true }) };
}

function receipt(h, type = 'buyer-rfq', prefix = 'RFQ') {
  return { origin, source: { parent: { parent: h.frames[0].contentWindow } },
    data: { type: 'euroagri:submission-confirmed', formType: type, submission: `EAT-${prefix}-20261031-123456-ABC123` } };
}

for (const [type, prefix, page] of [
  ['buyer-rfq', 'RFQ', 'buyer-rfq-thankyou.html'],
  ['supplier-qualification', 'KYC', 'thankyou.html'],
  ['commercial-partnership', 'CP', 'commercial-partnership-thankyou.html']
]) {
  test(`${type}: only its receipt completes one native POST and retains language/reference`, () => {
    const h = harness(), form = h.form(type);
    h.window.EuroAgriSubmission.submit(form, () => {});
    h.window.EuroAgriSubmission.submit(form, () => {});
    assert.equal(h.posts(), 1);
    assert.equal(h.frames[0].hidden, true);
    assert.equal(form.target, h.frames[0].name);
    assert.equal(h.navigations.length, 0);
    const response = receipt(h, type, prefix);
    h.receive(response);
    h.receive(response);
    assert.equal(h.navigations.length, 1);
    const url = new URL(h.navigations[0]);
    assert.equal(url.origin, origin);
    assert.equal(url.pathname, '/' + page);
    assert.equal(url.searchParams.get('submission'), response.data.submission);
    assert.equal(url.searchParams.get('lang'), 'ar');
    assert.equal(h.timers.size, 0);
  });
}

test('untrusted origins, unrelated windows, wrong form and malformed references cannot show success', () => {
  const h = harness();
  h.window.EuroAgriSubmission.submit(h.form('buyer-rfq'), () => {});
  const good = receipt(h);
  h.receive({ ...good, origin: 'https://untrusted.example' });
  h.receive({ ...good, origin: 'null' });
  h.receive({ ...good, source: { parent: h.window } });
  h.receive({ ...good, data: { ...good.data, formType: 'supplier-qualification' } });
  h.receive({ ...good, data: { ...good.data, submission: '' } });
  h.receive({ ...good, data: { ...good.data, submission: 'EAT-CP-20261031-123456-ABC123' } });
  h.receive({ ...good, data: null });
  assert.equal(h.navigations.length, 0);
  h.receive(good);
  assert.equal(h.navigations.length, 1);
});

test('timeout never reports success or sends again; a late valid receipt still works', () => {
  const h = harness(), form = h.form('buyer-rfq');
  let unconfirmed = 0;
  h.window.EuroAgriSubmission.submit(form, () => unconfirmed++);
  [...h.timers.values()][0]();
  assert.equal(unconfirmed, 1);
  assert.equal(h.navigations.length, 0);
  h.window.EuroAgriSubmission.submit(form, () => {});
  assert.equal(h.posts(), 1);
  h.receive(receipt(h));
  assert.equal(h.navigations.length, 1);
});

test('returning with Back clears the old receiver before a new submission', () => {
  const h = harness(), form = h.form('buyer-rfq');
  h.window.EuroAgriSubmission.submit(form, () => {});
  const old = receipt(h);
  h.restore();
  h.window.EuroAgriSubmission.submit(form, () => {});
  h.receive(old);
  assert.equal(h.navigations.length, 0);
  assert.equal(h.posts(), 2);
});

test('only an embedded receipt with a valid reference signals its parent; no wildcard target', () => {
  const url = '/commercial-partnership-thankyou.html?submission=EAT-CP-20261031-123456-ABC123';
  assert.equal(harness(url).messages.length, 0);
  assert.equal(harness('/commercial-partnership-thankyou.html?submission=bad', true).messages.length, 0);
  const h = harness(url, true);
  assert.ok(h.messages.length > 0);
  assert.ok(h.messages.every(message => message.target.startsWith('https://')));
  assert.equal(h.messages[0].data.formType, 'commercial-partnership');
});
