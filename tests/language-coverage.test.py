"""Check that Russian and Chinese never fall back to English on translated pages."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = ('ru', 'zh')


def dictionary(relative):
    return json.loads((ROOT / relative).read_text())


class TranslationCoverage(unittest.TestCase):
    def test_every_page_key_has_a_translation(self):
        for page in ROOT.glob('*.html'):
            source = page.read_text()
            page_root = re.search(r'data-i18n-page-root="([^"]+)"', source)
            keys = set(re.findall(
                r'data-i18n(?:-content|-alt|-aria-label|-title|-placeholder)?="([^"]+)"', source))
            for language in LANGUAGES:
                with self.subTest(page=page.name, language=language):
                    translated = dictionary(f'i18n/{language}.json')
                    if page_root:
                        translated.update(dictionary(f'{page_root[1]}{language}.json'))
                    self.assertFalse(keys - translated.keys())
                    self.assertTrue(all(translated[key].strip() for key in keys))

    def test_complete_page_dictionaries_and_interpolation(self):
        for folder in ('commercial-partnerships', 'privacy', 'product-details'):
            english = dictionary(f'i18n/{folder}/en.json')
            for language in LANGUAGES:
                translated = dictionary(f'i18n/{folder}/{language}.json')
                self.assertEqual(set(english), set(translated))
                for key in english:
                    self.assertEqual(re.findall(r'\{\w+\}', english[key]),
                                     re.findall(r'\{\w+\}', translated[key]), key)

    def test_dynamic_form_messages_and_receipts(self):
        base_keys = ['lang.moreLanguages', 'lang.languageLabel', 'catalogue.filter.count',
                     'rfq.validation.required', 'rfq.sending', 'rfq.success', 'rfq.error',
                     'rfq.confirmation.reference', 'rfq.confirmation.retain',
                     'supplier.selectProduct', 'supplier.submit', 'supplier.submitting',
                     'supplier.sending', 'supplier.error', 'confirmation.unavailable',
                     'confirmation.cpTitle', 'confirmation.supplierTitle',
                     'cp.form.challengeLabel']
        for language in LANGUAGES:
            translated = dictionary(f'i18n/{language}.json')
            self.assertTrue(all(translated.get(key) for key in base_keys))

    def test_grades_and_chemical_identifiers_are_preserved(self):
        english = dictionary('i18n/en.json')
        identities = {'map': ['10-46-0', 'NH₄H₂PO₄', '(NH₄)₂HPO₄', '12-61-0'],
                      'mkp': ['0-52-34', 'KH₂PO₄', '52%', '34%'],
                      'magnesium': ['Mg(NO₃)₂·6H₂O', 'MgO'],
                      'iron': ['6%', 'EDDHA'], 'zinc': ['15%', 'EDTA']}
        for language in LANGUAGES:
            translated = dictionary(f'i18n/{language}.json')
            details = dictionary(f'i18n/product-details/{language}.json')
            for key, value in english.items():
                if key.startswith('catalogue.product.') and key.endswith('.grade') and re.search(r'\d', value):
                    self.assertEqual(value, translated[key], key)
            for product, values in identities.items():
                for value in values:
                    self.assertIn(value, details[f'detail.identity.{product}'])
            # Catch accidental cross-language fragments during translation editing.
            if language == 'ru':
                for d in (translated, details):
                    for key, value in d.items():
                        self.assertIsNone(re.search(r'[\u4e00-\u9fff]', value), key)

    def test_selectors_offer_both_languages(self):
        for page in ROOT.glob('*.html'):
            selector = re.search(r'<select[^>]*id="langSelect"[^>]*>(.*?)</select>', page.read_text(), re.S)
            if selector:
                for language in LANGUAGES:
                    self.assertEqual(selector[1].count(f'value="{language}"'), 1, page.name)


if __name__ == '__main__':
    unittest.main()
