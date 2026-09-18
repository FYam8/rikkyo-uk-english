(function(root){
'use strict';
const UI_CONTRACT_VERSION=1;
const VIEW_IDS=Object.freeze(['home','route','exam','review','drill','stats','guide']);
function nonEmpty(v){return typeof v==='string'&&v.trim().length>0}
function unique(v){return new Set(v).size===v.length}
function validateSchoolUi(ui){
  const errors=[];
  if(!ui||typeof ui!=='object'||Array.isArray(ui))return {ok:false,errors:['ui config must be an object']};
  if(ui.contractVersion!==UI_CONTRACT_VERSION)errors.push('ui.contractVersion must be '+UI_CONTRACT_VERSION);
  const views=Array.isArray(ui.views)?ui.views:[];
  if(views.length!==VIEW_IDS.length)errors.push('ui.views must contain exactly '+VIEW_IDS.length+' views');
  const ids=views.map(v=>v&&v.id);
  if(!unique(ids))errors.push('ui.views ids must be unique');
  if(JSON.stringify(ids)!==JSON.stringify(VIEW_IDS))errors.push('ui.views order must match shared English shell');
  for(const view of views){
    if(!view||!nonEmpty(view.id)||!nonEmpty(view.label))errors.push('each ui.views entry needs id and label');
  }
  if(!nonEmpty(ui.brand?.eyebrow))errors.push('ui.brand.eyebrow is required');
  if(!nonEmpty(ui.brand?.heading))errors.push('ui.brand.heading is required');
  if(!nonEmpty(ui.footer))errors.push('ui.footer is required');
  const features=ui.features||{};
  for(const key of ['scoreDisplay','listeningScore','aiWriting','paperViewer','backupImport']){
    if(typeof features[key]!=='boolean')errors.push('ui.features.'+key+' must be boolean');
  }
  return {ok:errors.length===0,errors};
}
const api=Object.freeze({version:UI_CONTRACT_VERSION,viewIds:VIEW_IDS,validateSchoolUi});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ENGLISH_UI_CONTRACT=api;
})(typeof globalThis!=='undefined'?globalThis:this);
