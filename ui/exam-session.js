(function(root){
'use strict';
// Contract 1: owns presentation only. Persistence and timeout policy belong to adapters.
function create(options){
  const o=options,doc=o.document||root.document;
  let interval=null;
  function remaining(a){return a.limitMinutes*60-Math.max(0,Math.floor(((o.now||Date.now)()-new Date(a.startedAt).getTime())/1000))}
  function label(n){const abs=Math.abs(n);return (n<=0?'時間超過 ':'残り ')+String(Math.floor(abs/60)).padStart(2,'0')+':'+String(abs%60).padStart(2,'0')}
  function expire(a,n){if(n<=0&&!a.overtime){a.overtime=true;o.save();return true}return false}
  function timerMarkup(a){
    if(a.mode!=='timed')return '<span class="timer practice">時間無制限</span>';
    const n=remaining(a);expire(a,n);
    return '<span id="examTimer" class="timer '+(n<=0?'over':'')+'">'+label(n)+'</span>';
  }
  function updateTimer(){
    const a=o.getState().currentAttempt,el=doc.getElementById('examTimer');
    if(!el||!a||a.status!=='active'||a.mode!=='timed')return;
    const n=remaining(a),changed=expire(a,n);
    el.textContent=label(n);el.classList.toggle('over',n<=0);
    // A school may redraw to enforce its existing objective-answer lock.
    if(changed&&o.onTimeout)o.onTimeout(a);
  }
  function stop(){if(interval!==null){root.clearInterval(interval);interval=null}}
  function start(view){stop();const a=o.getState().currentAttempt;if(view==='exam'&&a?.status==='active'&&a.mode==='timed')interval=root.setInterval(updateTimer,1000)}
  function toggle(key){const s=o.getState();s[key]=!s[key];o.save();o.render()}
  function flash(el,ms){el.classList.add('focus-flash');root.setTimeout(()=>el.classList.remove('focus-flash'),ms)}
  function jumpAnswerMajor(major){
    const panel=doc.querySelector('.answer-sheet-body');
    const target=Array.from(doc.querySelectorAll('#answerPanel .q[data-major]')).find(el=>el.getAttribute('data-major')===String(major));
    if(!panel||!target)return;
    panel.scrollTo({top:Math.max(0,target.offsetTop-95),behavior:'smooth'});flash(target,1200);
  }
  function jumpToProblem(identity){
    const ids=o.problemElementIds(identity),target=ids.map(id=>doc.getElementById(id)).find(Boolean);
    if(!target){if(o.onMissingProblem)o.onMissingProblem(identity);return}
    target.scrollIntoView({behavior:'smooth',block:'start'});flash(target,1400);
  }
  return Object.freeze({timerMarkup,updateTimer,start,stop,jumpAnswerMajor,jumpToProblem,
    toggleAnswerSheet:()=>toggle('answerSheetOpen'),toggleAnswerSize:()=>toggle('answerSheetExpanded'),toggleExamInfo:()=>toggle('examInfoCompact')});
}
const api=Object.freeze({contractVersion:1,create});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ENGLISH_UI_EXAM_SESSION=api;
})(typeof globalThis!=='undefined'?globalThis:this);
