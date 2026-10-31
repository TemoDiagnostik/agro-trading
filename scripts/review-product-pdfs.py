"""Apply the 2026-10-31 technical copy review without redesigning the PDFs.

Uses full Base-35-compatible fonts for new text (original fonts are subsetted).
Re-running skips changes already applied.
This is a publication copy correction, never an alteration of supplier records.
"""
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parent.parent
GREEN = (0.043, 0.220, 0.169)
CREAM = (0.980, 0.965, 0.925)
GOLD = (0.714, 0.533, 0.153)
INK = (0.094, 0.239, 0.192)


def font_for(doc, wanted):
    filenames={'Carlito-Regular':'NimbusSans-Regular.otf',
               'Carlito-Bold':'NimbusSans-Bold.otf',
               'Carlito-Italic':'NimbusSans-Italic.otf',
               'Caladea-Bold':'NimbusRoman-Bold.otf'}
    filename=filenames.get(wanted,wanted+'.otf')
    return (Path('/usr/share/fonts/opentype/urw-base35')/filename).read_bytes()


def replace(doc, page_index, old, new, width=None, size=None):
    page = doc[page_index]
    spans = [s for b in page.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans']]
    span = next((s for s in spans if s['text'] == old), None)
    if not span:
        assert new in page.get_text(), (page_index, old)
        return
    fontname = span['font'].split('+')[-1]
    if fontname == 'Helvetica':
        font = 'helv'
    else:
        font = 'Review' + fontname.replace('-', '')
    rect = fitz.Rect(span['bbox'])
    # Remove text only, preserving the original background and vector design.
    text_band=fitz.Rect(rect.x0, span['origin'][1]-span['size']*.65, rect.x1, span['origin'][1])
    page.add_redact_annot(text_band, fill=False)
    page.apply_redactions(images=0, graphics=0)
    if font != 'helv':
        page.insert_font(fontname=font, fontbuffer=font_for(doc, fontname))
    color = tuple(((span['color'] >> shift) & 255) / 255 for shift in (16, 8, 0))
    fontsize = size or span['size']
    end = rect.x0 + (width or rect.width)
    fontobj = fitz.Font(fontname='helv') if font == 'helv' else fitz.Font(fontbuffer=font_for(doc, fontname))
    assert fontobj.text_length(new, fontsize=fontsize) <= end - rect.x0 + 0.1, (new, end - rect.x0)
    page.insert_text(span['origin'], new, fontsize=fontsize, fontname=font, color=color)


def save(doc, path):
    temporary = path.with_suffix('.reviewed.pdf')
    doc.save(temporary, garbage=4, deflate=True)
    doc.close()
    temporary.replace(path)


catalogue = ROOT / 'downloads/Euro_Agri_Trading_Product_Sourcing_Catalogue_2026.pdf'
doc = fitz.open(catalogue)
replace(doc, 8, 'Monoammonium phosphate. Granular nitrogen and phosphorus fertilizer.',
        'Granular ammonium phosphates; composition confirmed per source.', width=320, size=9.3)
replace(doc, 11, ' Chloride-free P and K for sensitive crops',
        ' Chloride limit per product specification', width=229, size=9.1)
replace(doc, 2, 'confirmation. Supplier technical data sheets (TDS) and shipment certificates of analysis (COA) define the agreed',
        'confirmation. The agreed specification defines limits and test methods; the shipment COA records the', width=466, size=9.2)
replace(doc, 2, 'limits and test methods.', 'analytical results for an identified lot.', width=466, size=9.2)
replace(doc, 5, 'Selected processed phosphate grades from the company sourcing range.',
        'GSSP: single superphosphate; DSP: double superphosphate.', width=320, size=9.6)
replace(doc, 5, 'Nutrient basis is declared per supplier specification.',
        'GSP is retained as a supplier-specific commercial designation.', width=320, size=9.6)

# ERP was previously attached to a multi-origin range without an expansion.
for page_index in range(len(doc)):
    page = doc[page_index]
    spans = [s for b in page.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans']]
    for span in spans:
        if ' / ERP' in span['text']:
            available=375 if page_index==1 else max(span['bbox'][2]-span['bbox'][0], 150)
            replace(doc,page_index,span['text'],span['text'].replace(' / ERP',''),width=available)

# The overview previously listed five families and omitted the new raw-material range.
replace(doc, 1, 'Five product families, sourced through selected supplier and manufacturing channels.',
        'Six product families; final specifications and availability confirmed per enquiry.', width=510, size=10)
if len(doc) == 21:
    regular = font_for(doc, 'Carlito-Regular')
    bold = font_for(doc, 'Carlito-Bold')
    display = font_for(doc, 'Caladea-Bold')
    overview = doc[1]
    overview.insert_font(fontname='ReviewRegular', fontbuffer=regular)
    overview.insert_font(fontname='ReviewBold', fontbuffer=bold)
    overview.draw_line((42.52, 701), (552.75, 701), color=GOLD, width=.5)
    overview.insert_text((42.52, 719), '06  Raw materials & fertilizer additives', fontname='ReviewBold', fontsize=13, color=GREEN)
    overview.insert_text((524, 719), 'p. 21', fontname='ReviewRegular', fontsize=9, color=GOLD)
    overview.insert_text((42.52, 737), 'Dolomite / calcium carbonate / phosphoric acid / potassium chloride (MOP)', fontname='ReviewRegular', fontsize=9, color=INK)
    overview.insert_text((42.52, 750), 'Fertilizer additives and anti-caking agents. Specifications assessed per enquiry.', fontname='ReviewRegular', fontsize=9, color=INK)
    # Add one matching technical page before image credits; existing product page numbers stay stable.
    page = doc.new_page(pno=20, width=595.2756, height=841.8898)
    for name, data in [('ReviewRegular', regular), ('ReviewBold', bold), ('ReviewDisplay', display)]:
        page.insert_font(fontname=name, fontbuffer=data)
    page.draw_rect(page.rect, color=None, fill=CREAM)
    page.draw_rect(fitz.Rect(0, 0, 596, 170), color=None, fill=GREEN)
    page.draw_rect(fitz.Rect(0, 166, 596, 170), color=None, fill=GOLD)
    page.draw_oval(fitz.Rect(516,15,553,52),color=GOLD,fill=(1,1,1),width=1)
    page.insert_image(fitz.Rect(518, 17, 551, 50), filename=str(ROOT/'logo.png'))
    page.insert_text((42.52, 31), 'EURO AGRI TRADING s.r.o.', fontname='ReviewBold', fontsize=8.5, color=(.86,.74,.43))
    page.insert_text((42.52, 76), 'RAW MATERIALS / TECHNICAL REVIEW', fontname='ReviewBold', fontsize=8, color=(1,1,1))
    page.insert_text((42.52, 111), 'Raw materials & additives', fontname='ReviewDisplay', fontsize=25, color=(1,1,1))
    page.insert_text((42.52, 139), 'Material identity, intended use and specification confirmed per enquiry.', fontname='ReviewRegular', fontsize=10, color=(.92,.9,.8))
    rows = [
        ('Dolomite | CaMg(CO3)2', 'Natural calcium-magnesium carbonate mineral. Confirm mineral composition, Ca/Mg reporting basis, fineness and, for agricultural liming, neutralising value and reactivity. An oxide-basis analysis does not establish calcined material.'),
        ('Calcium carbonate | CaCO3', 'Identify ground or precipitated material and intended use. Confirm CaCO3 assay, particle size, impurities and relevant agricultural or industrial requirements. CaCO3, Ca and CaO are different reporting bases.'),
        ('Phosphoric acid | H3PO4', 'Declare concentration as mass percent H3PO4 or P2O5 equivalent, with the basis explicit. Confirm acid grade, impurities, density and test temperature, compatible packaging and product-specific safety documentation.'),
        ('Potassium chloride | KCl | MOP', 'Muriate of potash is potassium chloride. K2O equivalent is not KCl purity. Confirm nutrient grade, physical form and impurities; this material inherently contains chloride and differs from NOP and SOP.'),
        ('Fertilizer additives & anti-caking agents', 'Identify composition, carrier and the fertilizer to be treated. Agree application conditions, compatibility and measurable performance under defined trials. No universal dosage or performance guarantee applies.')
    ]
    y=199
    for title, body in rows:
        page.insert_text((42.52,y), title, fontname='ReviewBold', fontsize=12, color=GREEN)
        space=page.insert_textbox(fitz.Rect(42.52,y+10,552.75,y+68),body,fontname='ReviewRegular',fontsize=10.5,lineheight=1.25,color=INK)
        assert space >= 0, title
        page.draw_line((42.52,y+72),(552.75,y+72),color=(.83,.78,.64),width=.5)
        y+=101
    page.insert_textbox(fitz.Rect(42.52,715,552.75,776), 'Listings describe the enquiry scope, not confirmed stock or an approved supplier for every item. The agreed TDS sets limits and methods; the COA reports results for an identified sample or lot. Source documents and destination requirements must support the proposed use.',fontname='ReviewRegular',fontsize=9.5,lineheight=1.2,color=INK)
    page.draw_line((42.52,805),(552.75,805),color=GOLD,width=.5)
    page.insert_text((42.52,818),'euroagritrading.eu',fontname='ReviewRegular',fontsize=7,color=INK)
    page.insert_text((248,818),'PRODUCT & SOURCING / 2026',fontname='ReviewRegular',fontsize=7,color=INK)
    page.insert_text((539,819),'21',fontname='ReviewBold',fontsize=12,color=GOLD)
    replace(doc,21,'21','22',width=20)
    # Avoid claiming the old quick matrix covers products added on the new page.
    page=doc[2]
    page.insert_font(fontname='ReviewRegular',fontbuffer=regular)
    page.insert_text((62.36,585),'Raw materials and fertilizer additives: see page 21.',fontname='ReviewRegular',fontsize=9.2,color=GREEN)
    replace(doc,2,'Listed grades, physical form and packing for every product in the range. Detailed specifications follow on',
            'Core fertilizer grades, physical form and packing. Raw materials and additives are listed on page 21.',width=510,size=10)
if 'Raw materials and additives are listed on page 21;' in doc[2].get_text():
    replace(doc,2,'Core fertilizer grades, physical form and packing. Raw materials and additives are listed on page 21;',
            'Core fertilizer grades, physical form and packing. Raw materials and additives are listed on page 21.',width=510,size=10)
replace(doc,2,'each product page.','See individual product pages for specification requirements.',width=510,size=10)
save(doc,catalogue)

profile=ROOT/'downloads/Euro_Agri_Trading_Company_Profile_2026.pdf'
doc=fitz.open(profile)
replace(doc,3,'ROCK PHOSPHATE / ERP','ROCK PHOSPHATE',width=200)
replace(doc,4,'Monoammonium phosphate. Final specification per shipment.',
        'Granular ammonium phosphates. Final composition per supplier.',width=490,size=11)
save(doc,profile)
print('Corrected catalogue and company profile technical copy')
