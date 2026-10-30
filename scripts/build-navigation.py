"""Build all shared navigation disclosures from existing page sections."""
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

def section_panel(targets):
    return '<ul class="nav-section-list">'+''.join(f'<li><a href="{html.escape(target, quote=True)}">{label(key)}</a></li>' for target,key in targets)+'</ul>'

SECTIONS = [
    ('nav.home', 'home', [('index.html#home','nav.home'), ('index.html#commercial-paths','home.routes.title'), ('index.html#farm-procurement','farm.title')]),
    ('nav.suppliers', 'suppliers', [('supplier-network.html#supplier-home','nav.suppliers'), ('supplier-network.html#supply-range','sup.secondary.title'), ('supplier-network.html#supply-origins','sup.origin.title'), ('supplier-network.html#supplier-review','sup.verify.title'), ('supplier-network.html#product-registration','sup.register.title')]),
    ('nav.logistics', 'logistics', [('index.html#logistics','log.title'), ('index.html#road-freight','log.road.h'), ('index.html#sea-freight','log.maritime.h'), ('index.html#delivery-coordination','log.delivery.h')]),
    ('nav.how', 'how', [('index.html#how-we-work','how.title'), ('index.html#trade-checks','how.step3'), ('index.html#payment-note','payment.title')]),
    ('nav.about', 'about', [('index.html#about','about.title'), ('index.html#company-profile','catalogue.publications.profile'), ('index.html#product-catalogue','catalogue.publications.catalogue')]),
    ('cp.nav', 'partnerships', [('commercial-partnerships.html','cp.nav'), ('commercial-partnerships.html#partnership-process','how.title'), ('commercial-partnerships.html#partnership-terms','sup.trade.card1.title'), ('commercial-partnerships.html#apply','cp.hero.cta')]),
    ('nav.contact', 'contact', [('index.html#contact','contact.details'), ('index.html#contactFormBox','rfq.title'), ('index.html#farm-procurement','farm.title')]),
]

def build():
    count = 0
    for path in ROOT.glob('*.html'):
        source = path.read_text()
        if 'navbar-nav' not in source: continue
        # Rebuilding is safe: remove only the generated panel following its trigger.
        source = re.sub(r'<!-- shared-dropdown:([a-z-]+):start -->[\s\S]*?<!-- shared-dropdown:\1:end -->', lambda m: '', source)
        menus = [('nav.products','products',product_panel()),('nav.coa','documents',documents_panel())]
        menus += [(key,kind,section_panel(targets)) for key,kind,targets in SECTIONS]
        for key,kind,panel in menus:
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
            source=source.replace('</body>','<script src="js/site-navigation.js?v=20261031.1" defer></script>\n</body>')
        else:
            source=re.sub(r'js/site-navigation\.js\?v=[^"\s>]+','js/site-navigation.js?v=20261031.1',source)
        path.write_text(source)
        count+=1
    print(f'Built nine section menus on {count} pages ({len(PRODUCTS)} products)')

if __name__ == '__main__': build()
