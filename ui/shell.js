(function(root){
'use strict';
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function headerMarkup(ui){
  return '<header><div><div class="eyebrow">'+esc(ui.brand.eyebrow)+'</div><h1>'+esc(ui.brand.heading)+'</h1></div><button id="dark">◐</button></header>';
}
function navMarkup(ui,active='home'){
  return '<nav>'+ui.views.map(v=>'<button data-v="'+esc(v.id)+'"'+(v.id===active?' class="active"':'')+'>'+esc(v.label)+'</button>').join('')+'</nav>';
}
function footerMarkup(ui){return '<footer>'+esc(ui.footer)+'</footer>'}
function mount(ui,{headerHost='shared-ui-header',navHost='shared-ui-nav',footerHost='shared-ui-footer'}={}){
  const contract=root.ENGLISH_UI_CONTRACT;
  if(contract){
    const result=contract.validateSchoolUi(ui);
    if(!result.ok)throw new Error('Invalid English school UI: '+result.errors.join('; '));
  }
  if(typeof document==='undefined')throw new Error('Shared UI mount requires document');
  const header=document.getElementById(headerHost),nav=document.getElementById(navHost),footer=document.getElementById(footerHost);
  if(!header||!nav||!footer)throw new Error('Shared UI mount hosts are missing');
  header.outerHTML=headerMarkup(ui);
  nav.outerHTML=navMarkup(ui,'home');
  footer.outerHTML=footerMarkup(ui);
  return true;
}
const api=Object.freeze({headerMarkup,navMarkup,footerMarkup,mount});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ENGLISH_UI_SHELL=api;
})(typeof globalThis!=='undefined'?globalThis:this);
