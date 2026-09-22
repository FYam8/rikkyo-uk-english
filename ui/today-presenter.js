(function(root){
'use strict';
const components=typeof module!=='undefined'&&module.exports?require('./components.js'):root.ENGLISH_UI_COMPONENTS;
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
// Pure presentation: adapters supply Engine results and trusted commands. No reads or writes to app state.
function primary(action){return '<div class="resume-action"><button class="primary" onclick="'+esc(action.command)+'">'+esc(action.label)+'</button><span>'+esc(action.note)+'</span></div>'}
function learningActions({action={},available=[],routeCommand='',labels={}}={}){
 const text={queued:'この1問の完了後',alternatives:'ほかにできること',route:'学習ルートを見る',...labels};
 const route='<button onclick="'+esc(routeCommand)+'">'+esc(text.route)+'</button>';
 if(action.kind==='resume')return primary(action)+(available.length?'<div class="queued-actions"><b>'+esc(text.queued)+'</b>'+available.slice(0,3).map(x=>'<span>'+esc(x.label)+'：'+esc(x.note)+'</span>').join('')+'</div>':'');
 if(action.complete)return '<div class="row">'+components.completionMark('✓ '+(action.label??''))+route+'</div>';
 const alternatives=available.slice(1,4);
 return '<div class="learning-actions">'+primary(action)+(alternatives.length?'<div class="alternative-actions"><b>'+esc(text.alternatives)+'</b>'+alternatives.map(x=>'<button onclick="'+esc(x.command)+'">'+esc(x.label)+'</button>').join('')+'</div>':'')+route+'</div>';
}
function futureConfirmations({rows=[],tomorrow,target=10,labels={}}={}){
 if(!rows.length)return '';
 const text={tomorrow:'明日の定着確認予定（現時点）',future:'今後の定着確認予定（現時点）',...labels};
 const shown=rows.slice(0,3),extra=rows.length-shown.length;
 return '<div class="future-confirmations"><b>'+esc(rows.every(x=>x.date===tomorrow)?text.tomorrow:text.future)+'</b>'+shown.map(x=>'<div><span>'+esc(x.date)+'</span><span>'+esc(x.label)+'</span></div>').join('')+(extra?'<small>'+esc(labels.extra?labels.extra(extra,target):'ほか'+extra+'件。予定日になったものから優先し、目安'+target+'問の後も続けられます。')+'</small>':'')+'</div>';
}
function content({action={},summary={},goal={},goalControlsHtml='',goalEstimateHtml='',actionsHtml='',futureHtml='',labels={}}={}){
 const {answered=0,target=10,remaining=0,targetReached=false}=summary,extra=Math.max(0,answered-target);
 const text={heading:'今日やること',complete:'AVAILABLE WORK COMPLETE',reached:'TARGET ACHIEVED · KEEP GOING',standard:'TODAY · STANDARD '+target+' QUESTIONS',answered:'今日の克服ドリル',target:'標準目安',after:'目安達成後',before:'目安まで',...labels};
 return '<div class="today-head"><div><div class="eyebrow">'+esc(action.complete?text.complete:targetReached?text.reached:text.standard)+'</div><h2>'+esc(text.heading)+'</h2><p>'+esc(action.note)+'</p></div><div class="goal-block"><span>'+esc(goal.label)+'</span><strong>'+esc(goal.value)+'</strong><small>'+esc(goal.note)+'</small></div></div>'+String(goalControlsHtml||'')+
 '<div class="daily-summary"><article><b>'+esc(answered)+'問</b><small>'+esc(text.answered)+'</small></article><article><b>'+esc(target)+'問</b><small>'+esc(text.target)+'</small></article><article><b>'+esc(targetReached?extra+'問':'あと'+remaining+'問')+'</b><small>'+esc(targetReached?text.after:text.before)+'</small></article></div>'+String(goalEstimateHtml||'')+String(actionsHtml||'')+String(futureHtml||'');
}
const api=Object.freeze({contractVersion:1,learningActions,futureConfirmations,content});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ENGLISH_UI_TODAY=api;
})(typeof globalThis!=='undefined'?globalThis:this);
