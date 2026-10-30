"""Build product detail pages from the public range and reviewed bilingual text."""
from pathlib import Path
import json,re,html
ROOT=Path(__file__).resolve().parent.parent
def read(p):return (ROOT/p).read_text()
def write(p,t): (ROOT/p).parent.mkdir(parents=True,exist_ok=True);(ROOT/p).write_text("\n".join(line.rstrip() for line in t.splitlines())+"\n")
E={
'reference':'Listed grade', 'specs':'Technical specification', 'parameter':'Parameter','confirmation':'Product-specific confirmation',
'uses':'Applications & suitability','packing':'Packing & delivery','documents':'Documents & market requirements',
'quote':'Request a quotation','image':'Illustrative product-family image; not a supplier sample or shipment photograph.',
'basis':'Listed grades identify the sourcing range, not guaranteed nutrient minima. N-P-K expresses nitrogen (N), phosphate as P₂O₅ and potassium as K₂O. Guaranteed values, analytical basis and methods are confirmed in the agreed supplier specification.',
'packingText':'Tell us your preferred packing and handling requirements. Available bag weights, big bags or bulk options, marking, minimum order quantity and delivery timing are confirmed with the selected supply source before quotation.',
'docsText':'The document set is agreed for the product and destination: technical data sheet (TDS), safety data sheet (SDS) where applicable, and certificate of analysis (COA) for the actual shipment. Representative analyses are identified as such. Inspection by an independent provider may be coordinated when agreed.',
'complianceText':'Applicable EU and destination-market requirements are assessed for the selected product and supply route. REACH status, CE marking or any other compliance claim is supported by the relevant product documents before it is made.',
'ctaText':'Send the quantity, destination, preferred packing and delivery window. The product and grade will be carried into your enquiry.',
'grade':'Grade & declaration','gradeText':'Confirm the exact product identity, nutrient minima and test methods in the supplier TDS. The shipment COA reports results against the agreed limits.',
'phosphorus':'Phosphorus fractions','phosphorusText':'State total, available and water-soluble P₂O₅ separately, including extraction method and reporting basis. These values are not interchangeable.',
'nitrogen':'Nitrogen','nitrogenText':'Confirm total nitrogen and the relevant forms; distinguish nitrate, ammoniacal and urea nitrogen where applicable.',
'potassium':'Potassium','potassiumText':'Confirm the declared K₂O equivalent and its water-soluble fraction. K₂O and elemental potassium are different reporting bases.',
'physical':'Physical properties','physicalText':'Confirm moisture, particle-size distribution and product form. For granules, agree strength and fines limits where needed.',
'metals':'Cadmium & other impurities','metalsText':'Agree limits and test methods for the destination. Distinguish mg/kg of product from mg/kg of P₂O₅, and state the moisture basis.',
'soluble':'Solubility & insolubles','solubleText':'Confirm water solubility, insoluble matter and purity where relevant. State temperature, solution concentration and units for measured properties.',
'chloride':'Chloride','chlorideText':'Request a product-specific chloride limit and analysis when relevant to the application; no absolute chloride-free guarantee is assumed.',
'biuret':'Biuret','biuretText':'Confirm the biuret limit for the intended use in the selected urea specification.',
'acidity':'Acidity & solution pH','acidityText':'Confirm free acidity and solution pH with test concentration and temperature; suitability depends on the intended formulation and equipment.',
'magnesium':'Magnesium & hydration','magnesiumText':'Confirm magnesium as Mg or MgO with the reporting basis explicitly stated. Verify the hexahydrate identity and its nitrogen declaration.',
'trace':'Trace elements','traceText':'Declare each included element, concentration and chemical form. Confirm total, water-soluble and chelated fractions where relevant.',
'chelate':'Chelating agent','chelateText':'Confirm chelating agent, chelated fraction and stability range. For Fe-EDDHA, specify the ortho-ortho isomer fraction; do not infer it from total Fe alone.',
'composition':'Composition','compositionText':'Confirm the complete formulation, ingredient forms and nutrient declaration in the manufacturer specification.',
'identity':'Technical identity','identityText':'The commercial grade is retained. The full technical name and composition must be confirmed by the selected manufacturer before an offer is finalized.',
'use.phosphates':'Phosphate raw materials for fertilizer manufacture and formulation. Direct soil application is assessed only where product reactivity, soil conditions and destination rules support it.',
'use.processed':'Phosphate nutrition and fertilizer blending, matched to the declared nutrient fractions, crop programme and product form. Application method and dose require appropriate agronomic advice.',
'use.nitrogen':'Nitrogen nutrition and compatible fertilizer programmes. Product form, biuret level and handling requirements are matched to the intended use.',
'use.water-soluble':'Fertigation and other soluble-nutrition programmes where the selected product is suitable. Water quality, solution concentration, mixing compatibility and application method must be checked for the intended use.',
'use.micronutrients':'Targeted micronutrient supply or formulation, based on the actual chemical form and concentration. Product selection and application rate depend on the crop, water and soil conditions.'}
A={
'reference':'الدرجة المدرجة','specs':'المواصفات الفنية','parameter':'البند','confirmation':'التأكيد الخاص بالمنتج',
'uses':'الاستخدامات والملاءمة','packing':'التعبئة والتسليم','documents':'المستندات ومتطلبات السوق','quote':'طلب عرض سعر',
'image':'صورة توضيحية لفئة المنتج؛ ليست عينة من مورد أو صورة لشحنة.',
'basis':'الدرجات المدرجة تعرّف نطاق التوريد ولا تمثل حدودًا دنيا مضمونة. تعبر N-P-K عن النيتروجين N والفوسفات كمكافئ P₂O₅ والبوتاسيوم كمكافئ K₂O. تُؤكد القيم المضمونة وأسس التحليل وطرقه في مواصفة المورد المتفق عليها.',
'packingText':'اذكر التعبئة المفضلة ومتطلبات المناولة. تُؤكد أوزان الأكياس وخيارات الأكياس الكبيرة أو الصب والعلامات والحد الأدنى للطلب وموعد التسليم مع مصدر التوريد المحدد قبل العرض.',
'docsText':'تُحدد المستندات بحسب المنتج والوجهة: ورقة المواصفات الفنية ونشرة بيانات السلامة عند انطباقها وشهادة تحليل الشحنة الفعلية. تُميز التحاليل التمثيلية بوضوح. يمكن تنسيق فحص مستقل عند الاتفاق.',
'complianceText':'تُراجع المتطلبات الأوروبية ومتطلبات بلد الوجهة بحسب المنتج ومسار التوريد. يُستند إلى مستندات المنتج لإثبات حالة REACH أو علامة CE أو أي ادعاء امتثال قبل تقديمه.',
'ctaText':'أرسل الكمية والوجهة والتعبئة المفضلة وموعد التسليم. سيُضاف المنتج والدرجة إلى نموذج استفسارك.',
'grade':'الدرجة وإعلان العناصر','gradeText':'تُؤكد هوية المنتج وحدود العناصر وطرق القياس في مواصفة المورد. تعرض شهادة تحليل الشحنة النتائج مقارنة بالحدود المتفق عليها.',
'phosphorus':'صور الفوسفور','phosphorusText':'تُذكر نسب P₂O₅ الكلي والمتاح والذائب في الماء منفصلة، مع طريقة الاستخلاص وأساس التقرير. لا يجوز اعتبار هذه القيم متكافئة.',
'nitrogen':'النيتروجين','nitrogenText':'تُؤكد نسبة النيتروجين الكلي وصوره؛ مع التمييز بين النتراتي والأمونيومي واليوريا عند انطباقها.',
'potassium':'البوتاسيوم','potassiumText':'يُؤكد مكافئ K₂O المعلن والجزء الذائب في الماء. مكافئ أكسيد البوتاسيوم والبوتاسيوم العنصري أساسان مختلفان للتقرير.',
'physical':'الخصائص الفيزيائية','physicalText':'تُؤكد الرطوبة وتوزيع حجم الجسيمات وشكل المنتج. تُحدد متانة الحبيبات وحدود الناعم عند الحاجة.',
'metals':'الكادميوم والشوائب الأخرى','metalsText':'تُحدد الحدود وطرق القياس وفق الوجهة. يُميّز بين ملغم/كغم من المنتج وملغم/كغم من P₂O₅ مع توضيح أساس الرطوبة.',
'soluble':'الذوبان والمواد غير الذائبة','solubleText':'يُؤكد الذوبان في الماء والمواد غير الذائبة والنقاوة عند الحاجة، مع تحديد الحرارة وتركيز المحلول ووحدات القياس.',
'chloride':'الكلوريد','chlorideText':'يُطلب حد الكلوريد وتحليله للمنتج المحدد إذا كان مؤثرًا في الاستخدام، دون افتراض ضمان مطلق للخلو منه.',
'biuret':'البيوريت','biuretText':'يُؤكد حد البيوريت المناسب للاستخدام في مواصفة اليوريا المحددة.',
'acidity':'الحموضة والأس الهيدروجيني','acidityText':'تُؤكد الحموضة الحرة والأس الهيدروجيني مع تركيز المحلول وحرارة القياس؛ وتتوقف الملاءمة على التركيبة والمعدات المستخدمة.',
'magnesium':'المغنيسيوم وماء التبلور','magnesiumText':'تُحدد نسبة المغنيسيوم كعنصر Mg أو مكافئ MgO بوضوح. تُراجع هوية الشكل سداسي الماء ونسبة النيتروجين.',
'trace':'العناصر الصغرى','traceText':'يُعلن كل عنصر وتركيزه وصورته الكيميائية، مع تحديد الأجزاء الكلية والذائبة والمخلّبة عند انطباقها.',
'chelate':'عامل التخليب','chelateText':'يُؤكد عامل التخليب والجزء المخلّب ونطاق الثبات. للحديد EDDHA تُحدد نسبة متماكب أورثو-أورثو، ولا تُستنتج من نسبة الحديد الكلية.',
'composition':'التركيب','compositionText':'تُؤكد التركيبة الكاملة وصور المكونات وإعلان العناصر في مواصفة المصنع.',
'identity':'الهوية الفنية','identityText':'تُحفظ الدرجة التجارية الحالية. يجب تأكيد الاسم الفني الكامل والتركيب من المصنع المحدد قبل إتمام العرض.',
'use.phosphates':'خامات فوسفات لصناعة الأسمدة والتركيبات. يُدرس الاستخدام المباشر في التربة فقط عندما تدعمه تفاعلية المنتج وظروف التربة ومتطلبات الوجهة.',
'use.processed':'تغذية فوسفاتية وخلط أسمدة بحسب صور العناصر المعلنة والبرنامج الزراعي وشكل المنتج. تحتاج طريقة التطبيق والجرعة إلى إرشاد زراعي مناسب.',
'use.nitrogen':'تغذية نيتروجينية وبرامج تسميد متوافقة. يُختار شكل المنتج وحد البيوريت ومتطلبات المناولة بحسب الاستخدام.',
'use.water-soluble':'برامج التسميد عبر الري والتغذية الذائبة عندما يلائمها المنتج المحدد. تُراجع جودة المياه وتركيز المحلول والتوافق عند الخلط وطريقة التطبيق.',
'use.micronutrients':'توفير عناصر صغرى أو إعداد تركيبات بحسب الصورة الكيميائية والتركيز الفعلي. يتوقف اختيار المنتج والجرعة على المحصول والمياه والتربة.'}
for lang,d in [('en',E),('ar',A)]:write('i18n/product-details/'+lang+'.json',json.dumps({**{'detail.'+k:v for k,v in d.items()},'cp.nav':json.loads(read('i18n/commercial-partnerships/'+lang+'.json'))['cp.nav']},ensure_ascii=False,indent=2)+'\n')
# Other language selectors keep existing navigation and product translations;
# shared new technical paragraphs use the reviewed English fallback.
for p in (ROOT/'i18n').glob('*.json'):
 if p.stem not in ['en','ar']:write('i18n/product-details/'+p.name,json.dumps({'cp.nav':json.loads(read('i18n/commercial-partnerships/'+p.name))['cp.nav']},ensure_ascii=False)+'\n')
def t(k,tag='span',attrs=''):return f'<{tag} data-i18n="detail.{k}" {attrs}>{html.escape(E[k])}</{tag}>'
def product(p,field,tag='span',attrs=''):return f'<{tag} data-i18n="catalogue.product.{p["id"]}.{field}" {attrs}>{html.escape(p[field])}</{tag}>'
base=read('products.html');head=base[:base.index('<body')];header=re.search(r'<header>[\s\S]*?</header>',base)[0]
footer=base[base.index('<div class="footer-legal">'):];footer=re.sub(r'<script src="js/catalogue-products[^>]*></script>','',footer)
params={
'erp':['grade','phosphorus','physical','metals'], 'grp':['grade','phosphorus','physical','metals'], 'grp-s':['composition','phosphorus','physical','metals'], 'low-cadmium':['grade','phosphorus','metals','physical'],
'ssp':['grade','phosphorus','physical','metals'],'ssp19':['grade','phosphorus','physical','metals'],'gsp':['identity','grade','phosphorus','physical','metals'],'dsp':['identity','grade','phosphorus','physical','metals'],
'tsp':['grade','phosphorus','physical','metals'],'dap':['grade','nitrogen','phosphorus','physical','metals'],'map':['grade','nitrogen','phosphorus','physical','metals'],
'urea':['grade','nitrogen','biuret','physical'],'mkp':['grade','phosphorus','potassium','soluble','chloride'], 'up':['grade','nitrogen','phosphorus','soluble','acidity'],
'nop':['grade','nitrogen','potassium','soluble','chloride'],'magnesium':['grade','magnesium','nitrogen','soluble'],
'iron':['grade','trace','chelate','soluble'],'zinc':['grade','trace','chelate','soluble']}
images={'phosphates':'phosphate-materials-natural.webp','processed':'compound-fertilizer-natural.webp','nitrogen':'urea-granules-natural.webp','water-soluble':'water-soluble-natural.webp','micronutrients':'plant-nutrition-natural.webp'}
formula={'mkp':'KH₂PO₄','up':'CO(NH₂)₂ · H₃PO₄','dap':'(NH₄)₂HPO₄','urea':'CO(NH₂)₂','nop':'KNO₃','magnesium':'Mg(NO₃)₂ · 6H₂O'}
cards=json.loads(read('product-range.json'))
for p in cards:
 id=p['id'];family=p['family'];path='product-'+id+'.html';url=html.escape(p['url']);name=html.escape(p['name'])
 h=re.sub(r'<title>.*?</title>','<title>'+name+' | Euro Agri Trading</title>',head,flags=re.S)
 h=re.sub(r'data-i18n-title="[^"]*"','',h);h=re.sub(r'data-i18n-page-root="[^"]*"','data-i18n-page-root="i18n/product-details/"',h)
 if 'data-i18n-page-root' not in h:h=h.replace('<html ','<html data-i18n-page-root="i18n/product-details/" ')
 h=re.sub(r'<link rel="canonical"[^>]+>','<link rel="canonical" href="https://euroagritrading.eu/'+path+'">',h)
 h=re.sub(r'<meta name="description"[^>]+>','<meta name="description" content="'+html.escape(p['name']+' '+p['grade']+'. Product details, specification requirements and quotation requests from Euro Agri Trading.')+'">',h)
 h=re.sub(r'<meta property="og:(title|url|description)"[^>]+>','',h)
 h=re.sub(r'<link rel="alternate"[^>]+>','',h)
 ps=params.get(id,['grade','composition','nitrogen','phosphorus','potassium','trace','soluble'] if id.startswith('npk') else ['grade','composition','trace','soluble'])
 rows=''.join('<tr>'+t(k,'td')+t(k+'Text','td')+'</tr>' for k in ps)
 chem=f'<p class="detail-chem" dir="ltr">{formula[id]}</p>' if id in formula else ''
 content=f'''<body class="product-detail-page"><a class="skip-link" href="#main-content">Skip to content</a>{header}<main id="main-content">
<section class="detail-hero"><div class="container"><nav class="detail-crumb" aria-label="Breadcrumb"><a href="products.html" data-i18n="nav.products">Products</a><span>/</span><a href="products.html#{family}" data-i18n="catalogue.family.{family}">{family}</a></nav>
<div class="detail-hero-grid"><div><span class="eyebrow" data-i18n="catalogue.family.{family}">{family}</span>{product(p,'name','h1')}{chem}{product(p,'desc','p')}<a class="btn btn-primary" href="{url}">{t('quote')}</a></div><div class="detail-grade">{t('reference')}{product(p,'grade','strong','dir="ltr"')}</div></div></div></section>
<figure class="detail-image"><img src="img/catalogue/{images[family]}" width="1536" height="1024" alt="Illustrative fertilizer material" decoding="async">{t('image','figcaption')}</figure>
<div class="container detail-body">{t('basis','p','class="detail-summary"')}<nav class="detail-nav" aria-label="Product sections"><a href="#specification">{t('specs')}</a><a href="#applications">{t('uses')}</a><a href="#packing">{t('packing')}</a><a href="#documents">{t('documents')}</a></nav>
<section id="specification">{t('specs','h2')}<table class="detail-specs"><thead><tr>{t('parameter','th','scope="col"')}{t('confirmation','th','scope="col"')}</tr></thead><tbody>{rows}</tbody></table></section>
<div class="detail-columns"><section class="detail-panel" id="applications">{t('uses','h2')}{t('use.'+family,'p')}</section><section class="detail-panel" id="packing">{t('packing','h2')}{t('packingText','p')}</section></div>
<section class="detail-documents" id="documents">{t('documents','h2')}{t('docsText','p')}{t('complianceText','p')}</section><section class="detail-cta">{t('ctaText','p')}<a class="btn btn-primary" href="{url}">{t('quote')}</a></section></div></main>{footer}'''
 write(path,h+content)
s=read('sitemap.xml');s=re.sub(r'\s*<url>\s*<loc>https://euroagritrading.eu/product-[\s\S]*?</url>','',s)
s=s.replace('</urlset>',''.join('<url><loc>https://euroagritrading.eu/product-'+p['id']+'.html</loc></url>\n' for p in cards)+'</urlset>');write('sitemap.xml',s)
print('Built',len(cards),'product pages')
