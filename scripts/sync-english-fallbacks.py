"""Align static English text with the dictionaries used by the language loader.

Only leaf text and translated meta content are changed; nested markup is kept.
Run after editing dictionaries or rebuilding the navigation/product pages.
"""
from pathlib import Path
import html
import json
import re

ROOT = Path(__file__).resolve().parent.parent
BASE = json.loads((ROOT / 'i18n/en.json').read_text())

def sync(path):
    source = path.read_text()
    dictionary = dict(BASE)
    page_root = re.search(r'data-i18n-page-root="([^"]+)"', source)
    if page_root:
        dictionary.update(json.loads((ROOT / page_root[1] / 'en.json').read_text()))
    def leaf(match):
        key = match['key']
        if key not in dictionary:
            return match[0]
        return match['open'] + html.escape(dictionary[key], quote=False) + match['close']
    source = re.sub(r'(?P<open><(?P<tag>[a-z][a-z0-9]*)\b[^>]*\bdata-i18n="(?P<key>[^"]+)"[^>]*>)[^<]*(?P<close></(?P=tag)>)', leaf, source)
    def meta(match):
        tag = match[0]
        key = re.search(r'data-i18n-content="([^"]+)"', tag)[1]
        if key not in dictionary:
            return tag
        return re.sub(r'(?<![-\w])content="[^"]*"', lambda _: 'content="'+html.escape(dictionary[key], quote=True)+'"', tag)
    source = re.sub(r'<meta\b[^>]*data-i18n-content="[^"]+"[^>]*>', meta, source)
    path.write_text(source)

if __name__ == '__main__':
    paths=list(ROOT.glob('*.html'))
    for path in paths:
        sync(path)
    print(f'Aligned English fallbacks on {len(paths)} pages')
