(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function attrs(values){return Object.entries(values).filter(([,v])=>v!==undefined&&v!==null&&v!==false).map(([k,v])=>' '+k+'="'+esc(v===true?'':v)+'"').join('')}
function textInput({value='',multiline=false,onInput,...attributes}={}){
  const a={...attributes,oninput:onInput};
  return multiline?'<textarea'+attrs(a)+'>'+esc(value)+'</textarea>':'<input'+attrs({type:'text',...a,value})+'>';
}
function slots({count,values=[],input,className='slot-row'}){return '<div class="'+esc(className)+'">'+Array.from({length:count},(_,i)=>textInput({...input(i),value:values?.[i]??''})).join('')+'</div>'}
function choices({options,selected=[],multiple=false,variant='buttons',className,buttonClass='answer-kana',name,label,disabled=false,onAction}){
  const selectedSet=new Set(selected);
  return '<div'+attrs({class:className||('answer-options '+(multiple?'multi':'single')),role:'group','aria-label':label})+'>'+options.map(o=>{
    const on=selectedSet.has(o.value),labelHtml=o.labelHtml??esc(o.label??o.value),detail=o.detail===undefined?'':'<small>'+esc(o.detail)+'</small>';
    if(variant==='inputs')return '<label><input'+attrs({type:multiple?'checkbox':'radio',name:multiple?undefined:name,value:o.value,checked:on,disabled,onchange:onAction(o.value)})+'>'+labelHtml+detail+'</label>';
    return '<button'+attrs({type:'button',class:buttonClass+' '+(on?'selected ':'')+(o.className||''),'data-kana':o.value,'aria-pressed':on?'true':'false',disabled,onclick:onAction(o.value)})+'>'+labelHtml+detail+(o.suffixHtml||'')+'</button>';
  }).join('')+'</div>';
}
// Immutable state operations; serialization and scoring belong to the adapter.
function selection(values,value,{on,max=Infinity,disabled=false}={}){
  const next=Array.isArray(values)?[...new Set(values)]:[];
  if(disabled)return {values:next,changed:false};
  const i=next.indexOf(value),add=on===undefined?i<0:!!on;
  if(add&&i<0){if(next.length>=max)return {values:next,changed:false,limit:true};next.push(value)}
  else if(!add&&i>=0)next.splice(i,1);else return {values:next,changed:false};
  return {values:next,changed:true};
}
function slot(values,index,value){const next=Array.isArray(values)?values.slice():[];if(Number.isInteger(index)&&index>=0)next[index]=value;return next}
function reorderState(value,tokens,{allowMissing=false}={}){
  const raw=value&&typeof value==='object'&&!Array.isArray(value)?value:{},order=[],seen=new Set();
  for(const i of Array.isArray(raw.order)?raw.order:[]){if((Number.isInteger(i)&&i>=0&&i<tokens.length||allowMissing&&i==='missing')&&!seen.has(i)){order.push(i);seen.add(i)}}
  return {order,missing:String(raw.missing??'')};
}
function reorderSentence(value,tokens,options){const s=reorderState(value,tokens,options);return s.order.map(i=>i==='missing'?s.missing:tokens[i]).filter(v=>v!=='').join(' ')}
function reorderChange(value,tokens,action,{allowMissing=false,disabled=false}={}){
  const s=reorderState(value,tokens,{allowMissing});if(disabled)return {state:s,changed:false};
  if(action.type==='missing'){if(!allowMissing)return {state:s,changed:false};s.missing=String(action.value??'')}
  else if(action.type==='add'){
    const i=action.index;if(!Number.isInteger(i)||i<0||i>=tokens.length||s.order.includes(i))return {state:s,changed:false};s.order.push(i);
  }else if(action.type==='addMissing'){
    if(!allowMissing||s.order.includes('missing'))return {state:s,changed:false};
    if(!s.missing.trim())return {state:s,changed:false,error:'missing-empty'};
    s.order.push('missing');
  }else if(action.type==='undo'){if(!s.order.length)return {state:s,changed:false};s.order.pop()}
  else if(action.type==='clear'){s.order=[]}
  else return {state:s,changed:false};
  return {state:s,changed:true};
}
function reorder({tokens,state,allowMissing=false,disabled=false,handlers,boxId,emptyText='',submitHtml=''}){
  const s=reorderState(state,tokens,{allowMissing}),built=reorderSentence(s,tokens,{allowMissing});
  const bank=tokens.map((t,i)=>'<button'+attrs({type:'button',class:'token '+(s.order.includes(i)?'disabled':''),disabled:disabled||s.order.includes(i),onclick:handlers.add(i)})+'>'+esc(t)+'</button>').join('');
  const missing=allowMissing?'<div class="missing-word-row">'+textInput({value:s.missing,disabled,placeholder:'不足する1語',onInput:handlers.missing})+'<button'+attrs({type:'button',disabled:disabled||s.order.includes('missing'),onclick:handlers.addMissing})+'>不足語を追加</button></div>':'';
  return '<div class="tokens">'+bank+'</div>'+missing+'<div'+attrs({id:boxId,class:'reorder-answer','aria-live':'polite'})+'>'+(built?esc(built):'<span class="muted">'+esc(emptyText)+'</span>')+'</div><div class="row"><button'+attrs({type:'button',disabled,onclick:handlers.undo})+'>1語戻す</button><button'+attrs({type:'button',disabled,onclick:handlers.clear})+'>やり直す</button>'+submitHtml+'</div>';
}
function refreshReorderPreview(element,state,tokens,options){if(element)element.textContent=reorderSentence(state,tokens,options)}
const api=Object.freeze({contractVersion:1,textInput,slots,choices,selection,slot,reorderState,reorderSentence,reorderChange,reorder,refreshReorderPreview});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ENGLISH_UI_ANSWER_WIDGETS=api;
})(typeof globalThis!=='undefined'?globalThis:this);
