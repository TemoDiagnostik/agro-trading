"""Build the shared product and documentation disclosures from the public range."""
from pathlib import Path
import html
import json
import re

ROOT = Path(__file__).resolve().parent.parent
EN = json.loads((ROOT / 'i18n/en.json').read_text())
PRODUCTS = json.loads((ROOT / 'product-range.json').read_text())

def label(key):
    return f'<span data-i18n="{key}">{html.escape(EN[key])}</span>'

def product_panel():
    groups = []
    for family in dict.fromkeys(p['family'] for p in PRODUCTS):
        links = []
        for p in [p for p in PRODUCTS if p['family'] == family]:
            grade = f'<small dir="ltr">{html.escape(p["grade"])}</small>' if re.search(r'\d', p['grade']) else ''
            links.append(f'<li><a href="product-{p["id"]}.html" data-nav-product="{p["id"]}">{label("catalogue.product."+p["id"]+".name")}{grade}</a></li>')
        groups.append(f'<section class="nav-product-group"><a class="nav-family-link" href="products.html#{family}">{label("catalogue.family."+family)}</a><ul class="nav-product-list">'+''.join(links)+'</ul></section>')
    return '<a class="nav-overview-link" href="products.html">'+label('catalogue.filter.all')+'</a><div class="nav-product-groups">'+''.join(groups)+'</div>'

def documents_panel():
    targets = [('', 'cert.title'), ('document-types', 'nav.docs.types'), ('shipment-documents', 'cert.request'),
               ('factory-review', 'nav.docs.factory'), ('phosphate-origins', 'nav.docs.origins'), ('technical-guidance', 'nav.docs.guidance')]
    return '<ul class="nav-document-list">'+''.join(f'<li><a href="specifications.html{("#"+target) if target else ""}">{label(key)}</a></li>' for target,key in targets)+'</ul>'

def build():
    count = 0
    for path in ROOT.glob('*.html'):
        source = path.read_text()
        if 'navbar-nav' not in source: continue
        # Rebuilding is safe: remove only the generated panel following its trigger.
        source = re.sub(r'<!-- shared-dropdown:(products|documents):start -->[\s\S]*?<!-- shared-dropdown:\1:end -->', lambda m: '', source)
        for key,kind,panel in [('nav.products','products',product_panel()),('nav.coa','documents',documents_panel())]:
            pattern = r'<li(?:\s[^>]*)?>\s*(<a\b[^>]*data-i18n="'+re.escape(key)+r'"[^>]*>[\s\S]*?</a>)\s*</li>'
            def replace(match):
                trigger=match[1]
                trigger=re.sub(r'\s(?:aria-controls|aria-expanded)="[^"]*"','',trigger)
                if 'class="' in trigger:
                    trigger=re.sub(r'class="([^"]*)"', lambda m: 'class="'+' '.join(['nav-dropdown-trigger']+[c for c in m[1].split() if c != 'nav-dropdown-trigger'])+'"',trigger,count=1)
                else: trigger=trigger.replace('<a ','<a class="nav-dropdown-trigger" ',1)
                trigger=trigger.replace('<a ',f'<a aria-controls="{kind}-dropdown" aria-expanded="false" ',1)
                return f'<li class="nav-dropdown" data-nav-dropdown="{kind}">{trigger}<!-- shared-dropdown:{kind}:start --><div class="nav-dropdown-panel nav-{kind}-panel" id="{kind}-dropdown" hidden>{panel}</div><!-- shared-dropdown:{kind}:end --></li>'
            source,changed=re.subn(pattern,replace,source,count=1)
            if changed != 1: raise ValueError(f'Missing {key} trigger in {path.name}')
        if 'js/site-navigation.js' not in source:
            source=source.replace('</body>','<script src="js/site-navigation.js?v=20261030.2" defer></script>\n</body>')
        path.write_text(source)
        count+=1
    print(f'Built product/document menus on {count} pages ({len(PRODUCTS)} products)')

if __name__ == '__main__': build()
