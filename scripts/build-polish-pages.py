"""Rebuild the two Polish search landing pages after changing their sources.

Run with Python 3 and lxml: python scripts/build-polish-pages.py
The original HTML remains the single source of layout, forms and product data.
"""
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit
import json

from lxml import etree, html

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://euroagritrading.eu/'
PAGES = {
    'products.html': (
        'Katalog nawozów | Euro Agri Trading s.r.o.',
        'Sprawdź zakres dostaw fosforytów, nawozów granulowanych, rozpuszczalnych w wodzie i mikroelementów. Podaj produkt, ilość i miejsce dostawy, aby uzyskać wycenę.',
    ),
    'product-erp.html': (
        'Mielony fosforyt 18–34% P₂O₅ | Euro Agri Trading',
        'Euro Agri Trading s.r.o. przyjmuje zapytania o mielony fosforyt 18–34% P₂O₅. Zapytaj o gatunek 28% P₂O₅, uziarnienie i dostawę luzem do wskazanego portu.',
    ),
}

# The common template has a few labels without dictionary attributes.
LABELS = {
    'Skip to content': 'Przejdź do treści',
    'All products': 'Wszystkie produkty',
    'Privacy Policy': 'Polityka prywatności',
    'Terms of Use': 'Warunki korzystania',
    'Legal Notice': 'Informacje prawne',
    'Euro Agri Trading s.r.o. — All rights reserved.': 'Euro Agri Trading s.r.o. — Wszelkie prawa zastrzeżone.',
    'Registered in Czech Republic': 'Spółka zarejestrowana w Republice Czeskiej',
    'Analytics Cookies': 'Analityczne pliki cookie',
    'We use Google Analytics only to understand website traffic and improve our B2B services. Analytics will run only if you accept.': 'Używamy Google Analytics do analizowania ruchu na stronie i ulepszania usług dla firm. Analityka zostanie włączona po wyrażeniu zgody.',
    'Reject': 'Odrzuć', 'Accept Analytics': 'Zezwól na analitykę',
    'Cookie consent': 'Zgoda na pliki cookie', 'Primary': 'Nawigacja główna',
    'Primary Navigation': 'Nawigacja główna', 'Language': 'Język',
    'Language selector': 'Wybór języka', 'Languages': 'Języki',
    'Browse products': 'Przeglądaj produkty', 'Product categories': 'Kategorie produktów',
    'Product family reference photographs': 'Ilustracje grup produktów',
    'Breadcrumb': 'Ścieżka nawigacji', 'Product sections': 'Sekcje produktu',
    'Euro Agri Trading s.r.o. logo': 'Logo Euro Agri Trading s.r.o.',
    'Illustrative fertilizer material': 'Przykładowy surowiec nawozowy',
    'Illustration of crushed phosphate materials in a bright storage setting': 'Ilustracja rozdrobnionego fosforytu w magazynie',
    'Illustration of compound fertilizer granules in an open woven sack': 'Ilustracja granulowanego nawozu wieloskładnikowego w otwartym worku',
    'Illustration of a gloved hand sampling white urea granules': 'Ilustracja pobierania próbki granulowanego mocznika',
    'Illustration of fine water-soluble fertilizer crystals and a sampling scoop': 'Ilustracja kryształów nawozu rozpuszczalnego w wodzie i łopatki do pobierania próbek',
    'Illustration of a plant leaf being examined in a bright agricultural laboratory': 'Ilustracja badania liścia w laboratorium rolniczym',
}


def polish_name(filename):
    return filename.removesuffix('.html') + '-pl.html'


def polish_link(href):
    url = urlsplit(href)
    if url.netloc or url.scheme or not url.path.endswith('.html'):
        return href
    args = [(k, v) for k, v in parse_qsl(url.query, keep_blank_values=True) if k != 'lang']
    path = url.path
    if path in PAGES:
        path = polish_name(path)
    else:
        args.append(('lang', 'pl'))
    return urlunsplit(('', '', path, urlencode(args), url.fragment))


def render(filename, title, description):
    page = html.document_fromstring((ROOT / filename).read_text(encoding='utf-8'))
    page.set('lang', 'pl')
    page.set('data-static-language', 'pl')
    page_url = urljoin(SITE, polish_name(filename))
    dictionary = json.loads((ROOT / 'i18n/pl.json').read_text())
    dictionary.update(json.loads((ROOT / page.get('data-i18n-page-root') / 'pl.json').read_text()))

    for element in page.xpath('//*[@data-i18n]'):
        # Translation markup on these pages is deliberately attached to leaf elements.
        if len(element):
            raise ValueError(f"Cannot replace nested content for {element.get('data-i18n')}")
        element.text = dictionary[element.get('data-i18n')]
    for name in ('placeholder', 'aria-label', 'alt', 'content'):
        key = 'data-i18n-' + name
        for element in page.xpath(f'//*[@{key}]'):
            element.set(name, dictionary[element.get(key)])

    for text in page.xpath('//body//text()[not(ancestor::script or ancestor::style or ancestor::*[@data-i18n])]'):
        raw = str(text)
        normalized = ' '.join(raw.split())
        replacement = LABELS.get(normalized)
        if normalized.startswith('Registered in Czech Republic |'):
            replacement = normalized.replace('Registered in Czech Republic', LABELS['Registered in Czech Republic'], 1)
        elif normalized.startswith('Applicable regulatory and documentation requirements'):
            replacement = dictionary['footer.legal.framework']
        if replacement:
            setattr(text.getparent(), 'tail' if text.is_tail else 'text', raw.replace(raw.strip(), replacement))
    for key in ('aria-label', 'alt', 'title'):
        for element in page.xpath(f'//*[@{key}]'):
            if element.get(key) in LABELS:
                element.set(key, LABELS[element.get(key)])
    page.xpath('//span[@class="lang-code"]')[0].text = 'PL'
    page.xpath('//select[@id="langSelect"]/option[@value="pl"]')[0].set('selected', 'selected')

    head = page.find('head')
    head.find('title').text = title
    head.xpath('link[@rel="canonical"]')[0].set('href', page_url)
    for key, value in {
            'description': description, 'og:title': title, 'og:url': page_url,
            'og:description': description, 'og:locale': 'pl_PL', 'twitter:title': title,
            'twitter:description': description, 'og:image:alt': 'Euro Agri Trading — pozyskiwanie nawozów',
            'twitter:image:alt': 'Euro Agri Trading — pozyskiwanie nawozów',
    }.items():
        attr = 'property' if key.startswith('og:') else 'name'
        matches = head.xpath(f'meta[@{attr}=$key]', key=key)
        meta = matches[0] if matches else etree.SubElement(head, 'meta', {attr: key})
        meta.set('content', value)
    for element in head.xpath('meta[@name="keywords"]'):
        head.remove(element)
    for element in head.xpath('link[@hreflang]'):
        element.set('href', urljoin(urljoin(SITE, filename), element.get('href')))
    for element in page.xpath('//a[@href]'):
        element.set('href', polish_link(element.get('href')))

    output = ROOT / polish_name(filename)
    markup = html.tostring(page, encoding='unicode', doctype='<!doctype html>')
    output.write_text('\n'.join(line.rstrip() for line in markup.splitlines()) + '\n', encoding='utf-8')


if __name__ == '__main__':
    for filename, metadata in PAGES.items():
        render(filename, *metadata)
