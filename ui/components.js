(function(root){
'use strict';
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function metricCard(value,label,{muted=true}={}){
  return '<div class=card><div class=metric>'+esc(value)+'</div><div'+(muted?' class=muted':'')+'>'+esc(label)+'</div></div>';
}
function progressBar(value,max){
  const n=Number(value)||0,m=Number(max)||0,pct=m>0?Math.min(100,Math.max(0,n/m*100)):0;
  return '<div class=progress><span style="width:'+pct+'%"></span></div>';
}
function completionMark(text){
  return '<span class=completion-mark>'+esc(text)+'</span>';
}
function routeStepCard({index,title,role,status,description,protectedCard=false,recommendationsHtml='',detailHtml='',actionHtml=''}={}){
  return '<article class="card route-step '+(protectedCard?'protected':'')+'"><div class=route-number>'+esc(index)+'</div><div class=route-main><div class="row space"><div><h3>'+esc(title)+'</h3><b>'+esc(role)+'</b></div><span class="status-pill">'+esc(status)+'</span></div><p>'+esc(description)+'</p>'+String(recommendationsHtml||'')+String(detailHtml||'')+String(actionHtml||'')+'</div></article>';
}
function todayCard({complete=false,contentHtml=''}={}){
  return '<section class="card hero today-card '+(complete?'today-complete':'')+'">'+String(contentHtml||'')+'</section>';
}
function weaknessCard({assigned=false,contentHtml=''}={}){
  return '<section class="card wrong '+(assigned?'today-assigned':'')+'">'+String(contentHtml||'')+'</section>';
}
function drillCard({contentHtml=''}={}){
  return '<section class="card drill-card">'+String(contentHtml||'')+'</section>';
}
function attemptBar({compact=false,summaryHtml='',timerHtml='',actionsHtml=''}={}){
  return '<section class="attempt-bar '+(compact?'attempt-compact':'')+'">'+String(summaryHtml||'')+String(timerHtml||'')+String(actionsHtml||'')+'</section>';
}
function answerPanel({open=true,expanded=false,headerHtml='',bodyHtml=''}={}){
  return '<aside id=answerPanel class="card answerpanel '+(open?'sheet-open':'sheet-collapsed')+' '+(expanded?'sheet-expanded':'')+'">'+String(headerHtml||'')+String(bodyHtml||'')+'</aside>';
}
function paperPage({year,label,bodyHtml=''}={}){
  return '<article class=paper-page><div class=page-label><b>'+esc(year)+'年度</b><span>'+esc(label)+'</span></div><div class=paper-text>'+String(bodyHtml||'')+'</div></article>';
}
function backupPanel({title='学習データのバックアップ',description='',exportOnclick='exportData()',importOnchange='importData(this)',mergeLabel='現在データへ統合',replaceLabel='現在データと置換',fileLabel='バックアップを選ぶ'}={}){
  return '<section class=backup-box><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p><div class=row><button onclick="'+esc(exportOnclick)+'">バックアップを書き出す</button><label>復元方法 <select id=importMode><option value=merge>'+esc(mergeLabel)+'</option><option value=replace>'+esc(replaceLabel)+'</option></select></label><label class=file-button>'+esc(fileLabel)+'<input type=file accept="application/json,.json" onchange="'+esc(importOnchange)+'"></label></div></section>';
}
const api=Object.freeze({metricCard,progressBar,completionMark,routeStepCard,todayCard,weaknessCard,drillCard,attemptBar,answerPanel,paperPage,backupPanel});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ENGLISH_UI_COMPONENTS=api;
})(typeof globalThis!=='undefined'?globalThis:this);
