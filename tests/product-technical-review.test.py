"""Regression checks for the public technical declaration and RFQ hand-off."""
import html
import json
from pathlib import Path
import re
import unittest
from urllib.parse import parse_qs, urlsplit

ROOT=Path(__file__).resolve().parents[1]


class ProductTechnicalReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.products=json.loads((ROOT/'product-range.json').read_text())
        cls.review=json.loads((ROOT/'product-technical-review.json').read_text())

    def test_no_product_lost_and_every_product_has_bilingual_identity(self):
        self.assertEqual(len(self.products),32)
        self.assertEqual({p['id'] for p in self.products},set(self.review))
        for p in self.products:
            for lang in ['en','ar']:
                d=json.loads((ROOT/f'i18n/product-details/{lang}.json').read_text())
                identity=d['detail.identity.'+p['id']]
                self.assertEqual(identity.replace('\u2066','').replace('\u2069',''),self.review[p['id']][lang])
            page=(ROOT/f'product-{p["id"]}.html').read_text()
            self.assertIn('data-i18n="detail.identity.'+p['id']+'"',page)

    def test_arabic_scientific_notation_keeps_left_to_right_order(self):
        d=json.loads((ROOT/'i18n/product-details/ar.json').read_text())
        for product,token in [('mkp','0-52-34'),('map','10-46-0'),('dap','(NH₄)₂HPO₄'),('dolomite','CaMg(CO₃)₂')]:
            self.assertIn('\u2066'+token+'\u2069',d['detail.identity.'+product])

    def test_agreed_grades_remain_separate(self):
        grades={p['id']:p['grade'] for p in self.products}
        self.assertEqual({k:grades[k] for k in ['ssp','ssp19','gsp','dsp','map','mkp']},
                         {'ssp':'17% P₂O₅','ssp19':'19% P₂O₅','gsp':'20% P₂O₅','dsp':'36% P₂O₅','map':'10-46-0','mkp':'0-52-34'})
        self.assertNotIn('20% P₂O₅',[p['grade'] for p in self.products if 'GSSP' in p['name']])

    def test_declared_formulas_include_hydration_and_correct_salts(self):
        formulas={'dap':'(NH₄)₂HPO₄','mkp':'KH₂PO₄','up':'CO(NH₂)₂ · H₃PO₄','urea':'CO(NH₂)₂',
                  'nop':'KNO₃','magnesium':'Mg(NO₃)₂ · 6H₂O','dolomite':'CaMg(CO₃)₂',
                  'calcium-carbonate':'CaCO₃','phosphoric-acid':'H₃PO₄','potassium-chloride':'KCl'}
        for product,formula in formulas.items():
            page=(ROOT/f'product-{product}.html').read_text()
            self.assertIn(f'<p class="detail-chem" dir="ltr">{formula}</p>',page)
        self.assertNotIn('class="detail-chem"',(ROOT/'product-map.html').read_text())

    def test_rfq_links_preserve_actual_grade_and_stable_form_category(self):
        home=(ROOT/'index.html').read_text()
        select=re.search(r'<select id="rfqProduct"[\s\S]*?</select>',home)[0]
        options={html.unescape(v) for v in re.findall(r'<option value="([^"]+)"',select)}
        for p in self.products:
            q=parse_qs(urlsplit(p['url']).query)
            self.assertIn(q['rfqCategory'][0],options,p['id'])
            self.assertEqual(q['rfqProduct'][0],p['name'])
            if 'rfqGrade' in q:self.assertEqual(q['rfqGrade'][0],p['grade'])
            page=(ROOT/f'product-{p["id"]}.html').read_text()
            self.assertIn(html.escape(p['url']),page)
        self.assertIn('js/form-receipt.js?v=20261031.1',home)

    def test_element_percent_is_not_chelator_percent_in_any_language(self):
        for file in (ROOT/'i18n').glob('*.json'):
            d=json.loads(file.read_text())
            self.assertEqual(d['catalogue.product.iron.grade'],'6% Fe · EDDHA')
            self.assertEqual(d['catalogue.product.zinc.grade'],'15% Zn · EDTA')
            self.assertEqual(d['cat.nop.text'],d['catalogue.product.nop.desc'])
            self.assertNotRegex(d['lowcad.title'],r'31.?32')

    def test_pdfs_have_actual_text_and_corrected_chemical_claims(self):
        import fitz
        cat=fitz.open(ROOT/'downloads/Euro_Agri_Trading_Product_Sourcing_Catalogue_2026.pdf')
        self.assertEqual(len(cat),22)
        text='\n'.join(page.get_text() for page in cat)
        self.assertNotIn('Chloride-free',text)
        self.assertNotIn('Monoammonium phosphate. Granular',text)
        self.assertNotIn(' / ERP',text)
        self.assertIn('Dolomite | CaMg(CO3)2',text)
        self.assertIn('Potassium chloride | KCl | MOP',text)
        self.assertIn('Six product families',text)
        self.assertNotIn(chr(65533),text)
        self.assertIn('Granular ammonium phosphates',cat[8].get_text())
        profile=fitz.open(ROOT/'downloads/Euro_Agri_Trading_Company_Profile_2026.pdf')
        self.assertIn('Granular ammonium phosphates',profile[4].get_text())


if __name__=='__main__':unittest.main()
