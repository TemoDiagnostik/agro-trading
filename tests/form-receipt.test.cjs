const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('js/form-receipt.js', 'utf8');
function setup(type, response) {
  let destination, request;
  const context = {window:{}, FormData: class {constructor(){return new URLSearchParams([['formType',type],['Language','ar'],['products','A'],['products','B']]);}},
    URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
    document:{documentElement:{lang:'en'}},location:{href:'https://euroagritrading.eu/index.html',assign(value){destination=value;}},
    fetch:async(url, options)=>{request=options;return response;}};
  vm.runInNewContext(source,context);
  return {submit:()=>context.window.EuroAgriSubmitForm({action:'https://script.google.com/exec'}),get destination(){return destination;},get request(){return request;}};
}
for(const [type,prefix,page] of [['buyer-rfq','RFQ','buyer-rfq-thankyou.html'],['supplier-qualification','KYC','thankyou.html'],['commercial-partnership','CP','commercial-partnership-thankyou.html']]) {
 test(type+' navigates only after a matching server receipt',async()=>{
  const run=setup(type,{ok:true,type:'cors',json:async()=>({version:1,accepted:true,formType:type,submissionId:`EAT-${prefix}-20261031-170000-ABC123`})});
  await run.submit();assert.ok(run.destination.startsWith('https://euroagritrading.eu/'+page+'?'));assert.ok(run.destination.endsWith('&lang=ar'));
  assert.deepEqual(run.request.body.getAll('products'),['A','B']);assert.equal(run.request.body.get('responseFormat'),'json');assert.equal(run.request.mode,'cors');assert.equal(run.request.credentials,'omit');
 });
}
for(const [label,response] of [
 ['opaque',{ok:true,type:'opaque'}],['HTTP failure',{ok:false}],
 ['invalid JSON',{ok:true,json:async()=>{throw Error('invalid');}}],
 ...[{version:1,accepted:false},{version:1,accepted:true,formType:'supplier-qualification',submissionId:'EAT-KYC-20261031-170000-ABC123'},{version:1,accepted:true,formType:'buyer-rfq',submissionId:'javascript:alert(1)'}].map(x=>['invalid receipt '+JSON.stringify(x),{ok:true,json:async()=>x}])]) {
 test(label+' never navigates',async()=>{const run=setup('buyer-rfq',response);await assert.rejects(run.submit());assert.equal(run.destination,undefined);});
}
