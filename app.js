(()=>{
'use strict';
const C=window.ENGLISH_ENGINE_ADAPTER&&window.ENGLISH_ENGINE_ADAPTER.config;
const P=window.ENGLISH_ENGINE_ADAPTER&&window.ENGLISH_ENGINE_ADAPTER.policy;
const E=window.ENGLISH_ENGINE_CORE;
const U=window.ENGLISH_UI_COMPONENTS;
if(!C||!P||!E||!U)throw new Error('Rikkyo adapter/shared engine/UI not loaded');
const KEY=C.storage.key,SCHEMA=C.storage.schemaVersion,TARGET=C.exam.dailyTaskTarget,IMPORT_RECOVERY_PREFIX=C.storage.importRecoveryPrefix,app=document.getElementById('app');
let DATA=null,view='home',selectedExamId=C.exam.defaultExamId,drill=null,renderedDate=E.localDate(),timerHandle=null;

function h(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function clone(v){return JSON.parse(JSON.stringify(v))}
function today(){return E.localDate()}
function plusDays(n){return E.plusDays(n)}
function now(){return new Date().toISOString()}
function norm(v){return String(v==null?'':v).trim().toLowerCase().replace(/[’]/g,"'").replace(/[，]/g,',').replace(/[。.!?！？]+$/g,'').replace(/\s+/g,' ')}
function sameSet(a,b){return Array.from(new Set(a)).sort().join('|')===Array.from(new Set(b)).sort().join('|')}
function fresh(){return {schemaVersion:SCHEMA,goal:C.exam.defaultGoal,selectedExamId:C.exam.defaultExamId,attempts:[],currentAttempt:null,weak:{},drillLog:[],currentDrill:null,dailyPlan:null,dailyProgress:null,theme:'light',answerSheetOpen:true,answerSheetExpanded:false,examInfoCompact:false}}
function normalizeState(raw){
  const s=raw&&typeof raw==='object'?Object.assign(fresh(),raw):fresh();
  s.schemaVersion=SCHEMA;s.goal=C.exam.goalTiers.includes(Number(s.goal))?Number(s.goal):C.exam.defaultGoal;
  s.attempts=Array.isArray(s.attempts)?s.attempts:[];s.weak=s.weak&&typeof s.weak==='object'?s.weak:{};s.drillLog=Array.isArray(s.drillLog)?s.drillLog:[];
  s.currentAttempt=s.currentAttempt&&typeof s.currentAttempt==='object'?s.currentAttempt:null;s.currentDrill=E.normalizeDrillState(s.currentDrill);
  s.answerSheetOpen=s.answerSheetOpen!==false;s.answerSheetExpanded=!!s.answerSheetExpanded;s.examInfoCompact=!!s.examInfoCompact;
  E.applyDailyRolloverState(s,today());return s
}
function load(){try{return normalizeState(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(e){return fresh()}}
let S=load();drill=S.currentDrill;selectedExamId=S.selectedExamId||C.exam.defaultExamId;
function save(){S.currentDrill=drill?clone(drill):null;S.selectedExamId=selectedExamId;localStorage.setItem(KEY,JSON.stringify(S))}
function setTheme(t){S.theme=t==='dark'?'dark':'light';document.documentElement.classList.toggle('dark',S.theme==='dark');save()}
setTheme(S.theme);document.getElementById('dark').onclick=function(){setTheme(S.theme==='dark'?'light':'dark')};

async function loadData(){
  const names=['exams','papers','sections','questions','passages','practice','source-coverage','supplied-source-questions','supplied-reading-runtime','supplied-source-passages','fy26a-late-runtime'];
  const vals=await Promise.all(names.map(function(n){return fetch('data/'+n+'.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(n+'.json '+r.status);return r.json()})}));
  const suppliedRuntime=flattenSuppliedRuntime(vals[7]),readingRuntime=Array.isArray(vals[8].records)?vals[8].records:[],fy26Late=Array.isArray(vals[10].records)?vals[10].records:[];
  const suppliedPassages=Array.isArray(vals[9].passages)?vals[9].passages:[];
  DATA={exams:vals[0].exams,papers:vals[1].papers,sections:vals[2].papers,questions:[...vals[3].records,...suppliedRuntime,...readingRuntime,...fy26Late],questionsMeta:vals[3],passages:[...vals[4].passages,...suppliedPassages],practice:vals[5].items,sourceCoverage:vals[6],suppliedSource:vals[7],readingRuntime:vals[8],fy26Late:vals[10]};
}
function flattenSuppliedRuntime(source){
  const out=[];if(!source||!source.exams)return out;
  for(const [examId,records] of Object.entries(source.exams)){
    for(const group of records){
      if(![2,3,4,5].includes(Number(group.majorQuestion)))continue;
      if(group.groupType==='guided_completion_group'){
        for(const item of group.subItems)out.push({
          id:group.id+'-'+item.n,examId,majorQuestion:2,minorQuestion:item.n,sourcePage:group.sourcePage,
          sourceType:'past_exam',sourceSubset:true,primarySkill:'guided_completion',scoringType:'multi_slot_text',
          prompt:item.prompt,answerSpec:{slots:item.answerSlots},targetId:examId.toLowerCase()+'-guided-'+item.n,
          answerAuthority:group.answerAuthority,verificationStatus:group.verificationStatus,autoGradeAllowed:true
        });
      }else if(group.groupType==='word_order_group'){
        for(const item of group.subItems)out.push({
          id:group.id+'-'+item.n,examId,majorQuestion:3,minorQuestion:item.n,sourcePage:group.sourcePage,
          sourceType:'past_exam',sourceSubset:true,primarySkill:'word_order',scoringType:'word_order',
          prompt:'語句を並べ替えて英文を完成させなさい（不要語1語あり）。',tokens:item.tokens,
          answerSpec:{sentence:item.answerSentence,unused:item.unused},targetId:examId.toLowerCase()+'-word-order-'+item.n,
          answerAuthority:group.answerAuthority,verificationStatus:group.verificationStatus,autoGradeAllowed:true
        });
      }else if(group.groupType==='error_correction_group'){
        for(const item of group.subItems)out.push({
          id:group.id+'-'+item.n,examId,majorQuestion:4,minorQuestion:item.n,sourcePage:group.sourcePage,
          sourceType:'past_exam',sourceSubset:true,primarySkill:'error_correction_rewrite',scoringType:'multi_slot_text',
          prompt:item.sentence+'\n誤りの記号と訂正後の語句を書きなさい。',answerSpec:{slots:[[item.errorLabel],[item.correction]],correctedSentence:item.correctedSentence},
          targetId:examId.toLowerCase()+'-error-correction-'+item.n,
          answerAuthority:group.answerAuthority,verificationStatus:group.verificationStatus,autoGradeAllowed:true
        });
      }else if(group.groupType==='paraphrase_group'){
        for(const item of group.subItems)out.push({
          id:group.id+'-'+item.n,examId,majorQuestion:5,minorQuestion:item.n,sourcePage:group.sourcePage,
          sourceType:'past_exam',sourceSubset:true,primarySkill:'paraphrase',scoringType:'multi_slot_text',
          context:'A: '+item.a,prompt:'B: '+item.b,answerSpec:{slots:item.answerSlots},targetId:examId.toLowerCase()+'-paraphrase-'+item.n,
          answerAuthority:group.answerAuthority,verificationStatus:group.verificationStatus,autoGradeAllowed:true
        });
      }
    }
  }
  return out;
}
function examById(id){return DATA.exams.find(function(x){return x.examId===id})}
function paperById(id){return DATA.papers.find(function(x){return x.paperId===id})}
function sourceCoverageFor(id){return DATA.sourceCoverage?.suppliedWrittenCoverage?.[id]||null}
function sourceCoverageNote(id){
  const c=sourceCoverageFor(id);if(!c)return '';
  const missing=(c.sourceMissing||[]).join(' ／ ');
  const asset=(c.runtimeAssetGap||[]).join(' ／ ');
  if(qsFor(id).length)return '現在アプリで解答可能な問題データがあります。'+(missing?' 原本上の未提供: '+missing:'');
  return '原本で確認できる範囲は転記・監査済みです。'+(missing?' 未提供: '+missing+'。':'')+(asset?' 追加整備: '+asset+'。':'')+' 不足部分は推測で補完しません。';
}
function qsFor(id){return DATA.questions.filter(function(x){return x.examId===id})}
function completed(id){return S.attempts.some(function(x){return x.examId===id&&x.status==='graded'})}
function weakEntries(){return Object.entries(S.weak)}
function activeWeak(){return weakEntries().filter(function(x){return x[1]&&x[1].status!=='mastered'})}
function eligible(x){return E.isRemediationEligible(x[1],today())}
function weakSort(a,b){return E.compareRemediationEntries(a,b,function(w){return P.priorityOrder(w.priority)})}
function dailyProgressCount(){return E.remediationDailyProgressCount(S,today())}
function dailyPlanValid(){return S.dailyPlan&&S.dailyPlan.date===today()&&Number(S.dailyPlan.goal)===Number(S.goal)}
function dailyAnswered(plan=ensureDailyPlan()){return E.remediationDailyAnsweredCount(S,plan,today())}
function dailyTargetRemaining(plan=ensureDailyPlan()){return E.remediationDailyTargetRemaining(dailyAnswered(plan),TARGET)}
function dailyTargetReached(plan=ensureDailyPlan()){return E.remediationDailyTargetReached(dailyAnswered(plan),TARGET)}
function nextExam(){return C.exam.route.find(function(id){const ex=examById(id);return ex?.runtimeEnabled!==false&&id!==C.exam.holdoutExamId&&!completed(id)&&qsFor(id).length})||null}
function ensureDailyPlan(){
  if(dailyPlanValid())return S.dailyPlan;
  const planToday=today(),result=E.buildRemediationDailyPlan({
    entries:activeWeak(),goal:S.goal,today:planToday,answeredCount:dailyProgressCount(),routeYear:nextExam(),nowIso:now(),
    isInGoal:function(){return true},isEligible:eligible,compareEntries:weakSort
  });
  for(const key of result.assignedKeys||[]){const w=S.weak[key];if(w)w.lastAssignedDate=planToday}
  S.dailyPlan=result.plan;save();return S.dailyPlan
}
function bumpDaily(){const n=dailyProgressCount()+1;S.dailyProgress={date:today(),answeredCount:n};if(S.dailyPlan&&S.dailyPlan.date===today())S.dailyPlan.answeredCount=n}
function planBacklog(plan=ensureDailyPlan()){if(!dailyTargetReached(plan))return 0;return activeWeak().filter(eligible).length}
function nextPendingDate(){return activeWeak().map(function(x){const w=x[1];return w.status==='pending'&&w.next>today()?w.next:null}).filter(Boolean).sort()[0]||null}
function futureConfirmations(){return activeWeak().filter(function(x){const w=x[1];return w.status==='pending'&&w.next>today()}).sort(function(a,b){return (a[1].next||'').localeCompare(b[1].next||'')||weakSort(a,b)})}
function completeTodayNote(plan){
  const backlog=planBacklog(plan),next=nextPendingDate();
  if(dailyTargetReached(plan)&&backlog)return '今日の目安'+TARGET+'問を達成しました。取り組める弱点があと'+backlog+'件あります。';
  if(next)return '現在取り組める弱点は完了しました。次の定着チェックは '+next+' です。';
  if(nextExam())return '現在取り組める弱点は完了しました。次の過去問へ進めます。';
  return dailyTargetReached(plan)?'今日の目安'+TARGET+'問を達成しました。現在実施できる学習はすべて完了です。':'現在実施できる学習はすべて完了です。'
}
function availableLearningActions(){
  const entries=activeWeak(),byKey=Object.fromEntries(entries),current=S.currentAttempt?Object.assign({},S.currentAttempt,{year:S.currentAttempt.examId}):null;
  return E.selectDailyLearningActionDescriptors({
    entries:entries,currentAttempt:current,routeYear:nextExam(),isInGoal:function(){return true},isEligible:eligible,compareEntries:weakSort
  }).map(function(action){
    if(action.kind==='weak'){
      const w=byKey[action.key];if(!w)return null;
      if(action.stage==='confirm')return {kind:'weak',key:action.key,label:'今日の定着チェックへ',note:w.examId+' '+w.label+'（'+(w.confirmStreak||0)+'/2）'};
      if(action.stage==='continue')return {kind:'weak',key:action.key,label:'この弱点を続ける',note:w.examId+' '+w.label+'（'+(w.streak||0)+'/3）'};
      return {kind:'weak',key:action.key,label:'次の弱点へ',note:w.examId+' '+w.label+' · '+P.skillName(w.skill)};
    }
    if(action.kind==='attempt')return {kind:'attempt',examId:action.year,label:action.year+' の続きへ',note:'解答途中の過去問があります。'};
    if(action.kind==='route')return {kind:'route',examId:action.year,label:action.year+' を開く',note:P.routeRole(action.year)+'。問題を開くだけでは採点されません。'};
    return null
  }).filter(Boolean)
}
function actionCommand(a){
  if(!a)return "__RIKKYO_APP__.goto('home')";
  if(a.kind==='weak')return "__RIKKYO_APP__.startWeak('"+String(a.key).replace(/'/g,"\\'")+"')";
  if(a.examId)return "__RIKKYO_APP__.openExam('"+String(a.examId).replace(/'/g,"\\'")+"')";
  return "__RIKKYO_APP__.goto('home')"
}
function todayAction(){
  if(drill&&S.weak[drill.key]&&!drill.answered&&S.weak[drill.key].status!=='mastered')return {kind:'resume',label:'途中の1問を再開',note:S.weak[drill.key].examId+' '+S.weak[drill.key].label+' の途中から再開します。'};
  const action=availableLearningActions()[0];if(action)return action;
  const plan=ensureDailyPlan();return {complete:true,label:'現在できる学習は完了',note:completeTodayNote(plan)}
}
function futureConfirmationMarkup(){
  const rows=futureConfirmations();if(!rows.length)return '';
  const shown=rows.slice(0,3),extra=rows.length-shown.length,label=rows.every(function(x){return x[1].next===plusDays(1)})?'明日の定着確認予定（現時点）':'今後の定着確認予定（現時点）';
  return '<div class="future-confirmations"><b>'+label+'</b>'+shown.map(function(x){return '<div><span>'+h(x[1].next)+'</span><span>'+h(x[1].examId+' '+x[1].label)+'</span></div>'}).join('')+(extra?'<small>ほか'+extra+'件。予定日になったものから優先し、目安'+TARGET+'問の後も続けられます。</small>':'')+'</div>'
}
function learningActionsMarkup(action){
  const available=availableLearningActions();
  if(action.kind==='resume')return '<div class="resume-action"><button class="primary" onclick="__RIKKYO_APP__.resumeDrill()">'+h(action.label)+'</button><span>'+h(action.note)+'</span></div>'+(available.length?'<div class="queued-actions"><b>この1問の完了後</b>'+available.slice(0,3).map(function(x){return '<span>'+h(x.label)+'：'+h(x.note)+'</span>'}).join('')+'</div>':'');
  if(action.complete)return '<div class="row">'+U.completionMark('✓ '+action.label)+'<button onclick="__RIKKYO_APP__.goto(\'route\')">学習ルートを見る</button></div>';
  return '<div class="learning-actions"><div class="resume-action"><button class="primary" onclick="'+actionCommand(action)+'">'+h(action.label)+'</button><span>'+h(action.note)+'</span></div>'+(available.slice(1,4).length?'<div class="alternative-actions"><b>ほかにできること</b>'+available.slice(1,4).map(function(x){return '<button onclick="'+actionCommand(x)+'">'+h(x.label)+'</button>'}).join('')+'</div>':'')+'<button onclick="__RIKKYO_APP__.goto(\'route\')">学習ルートを見る</button></div>'
}
function qLabel(q){return q.id==='R26-ENG-A-G4'?'大問4':'大問'+q.majorQuestion+' 問'+q.minorQuestion}

function goto(v){view=v;document.querySelectorAll('nav button').forEach(function(b){b.classList.toggle('active',b.dataset.v===v)});render();scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('nav button').forEach(function(b){b.onclick=function(){goto(b.dataset.v)}});

function home(){
  const action=todayAction(),plan=ensureDailyPlan(),answered=dailyAnswered(plan),targetReached=dailyTargetReached(plan),extra=Math.max(0,answered-TARGET),active=activeWeak(),mastered=weakEntries().filter(function(x){return x[1].status==='mastered'}).length;
  const todayContent='<div class="today-head"><div><div class="eyebrow">'+(action.complete?'AVAILABLE WORK COMPLETE':targetReached?'TARGET ACHIEVED · KEEP GOING':'TODAY · STANDARD '+TARGET+' QUESTIONS')+'</div><h2>今日やること</h2><p>'+h(action.note)+'</p></div><div class="goal-block"><span>学習範囲</span><strong>全範囲</strong><small>公式配点が未確認のため点数目標は設定しません</small></div></div>'+
    '<div class="daily-summary"><article><b>'+answered+'問</b><small>今日の克服ドリル</small></article><article><b>'+TARGET+'問</b><small>標準目安</small></article><article><b>'+(targetReached?extra+'問':'あと'+dailyTargetRemaining(plan)+'問')+'</b><small>'+(targetReached?'目安達成後':'目安まで')+'</small></article></div>'+
    learningActionsMarkup(action)+futureConfirmationMarkup();
  return U.todayCard({complete:action.complete,contentHtml:todayContent})+
    '<section class="grid three">'+U.metricCard(S.attempts.length,'過去問')+U.metricCard(active.length,'未克服')+U.metricCard(mastered,'克服済み')+'</section>'+
    '<section class="card"><div class="row space"><div><div class="eyebrow">CURRENT STATUS</div><h3>現在の到達状況</h3></div><b>未克服 '+active.length+' ／ 克服済み '+mastered+'</b></div><p>'+h(P.goalAdvice())+'</p></section>'+
    '<section class="card"><h3>克服ルール</h3><div class="grid three"><div class="bluebox"><b>① ピンポイント類題</b><p>元の誤答と同じ論点を3問連続正解するまで反復。</p></div><div class="warnbox"><b>② 翌日チェック</b><p>3連続正解しても消さず、翌日に2問確認。</p></div><div class="okbox"><b>③ 克服</b><p>翌日の確認も2連続正解で初めて「克服済み」。</p></div></div></section>'
}
function route(){
  return '<section class="card hero"><div class="eyebrow">LEARNING ROUTE</div><h2>学習ルート</h2><p>A/Bを別examIdで管理します。</p></section><section class="route-list">'+C.exam.route.map(function(id,i){
    const ex=examById(id),hold=id===C.exam.holdoutExamId,has=qsFor(id).length>0;
    const description=ex.year+'年度 '+ex.schedule+'日程 · '+(hold?'最終判定前は学習に使用しません。':has?'問題データ利用可能':sourceCoverageNote(id));
    const actionHtml=has&&!hold?'<button onclick="__RIKKYO_APP__.openExam(\''+id+'\')">過去問を開く</button>':'';
    return U.routeStepCard({index:i+1,title:id,role:P.routeRole(id),status:hold?'初見温存中':has?'利用可能':'整備中',description:description,protectedCard:hold,actionHtml:actionHtml});
  }).join('')+'</section>';
}
function exam(){
  const id=selectedExamId,ex=examById(id),paper=paperById(id),qs=qsFor(id),hold=id===C.exam.holdoutExamId,subset=ex?.runtimeMode==='supplied_subset';
  if(S.currentAttempt&&S.currentAttempt.status==='active'&&S.currentAttempt.examId===id)return examAttempt();
  const cards=C.exam.examIds.map(function(x){
    const e=examById(x),count=qsFor(x).length,status=x===C.exam.holdoutExamId?'holdout':e?.runtimeMode==='supplied_subset'?'subset':count?'ready':'audit';
    const label=status==='holdout'?'最終holdout':status==='subset'?'原本subset':count?'問題データあり':'原本範囲監査済み';
    return '<article class="exam-card '+(x===id?'selected':'')+'"><div class="row space"><h3>'+x+'</h3><span class="badge '+(x===C.exam.holdoutExamId?'holdout':'')+'">'+h(P.routeRole(x))+'</span></div><div class="muted">'+e.year+'年度 '+e.schedule+'日程 · '+label+'</div><button onclick="__RIKKYO_APP__.selectExam(\''+x+'\')">表示</button></article>';
  }).join('');
  let detail='';
  if(hold)detail='<div class="badbox"><b>最終判定用holdout</b><p>問題本文の転記・非公式解答監査は別データとして完了していますが、最終判定前の学習には公開しません。リスニングは音源未入手のため採点対象外です。</p></div>';
  else if(qs.length){
    const runtimeNote=ex.runtimeNotice?'<div class="warnbox"><b>'+(subset?'原本subset':'現在の実施範囲')+'</b><p>'+h(ex.runtimeNotice)+'</p></div>':'';
    detail='<div class="notice"><b>非公式解答</b><p>原本から独立に検討したアプリ解答で、学校公式解答ではありません。</p></div>'+runtimeNote+'<p>学習タスク: <b>'+qs.length+'</b></p><div class="exam-gate"><fieldset><legend>実施方法</legend><label><input type="radio" name="examMode" value="timed" onchange="document.getElementById(\'limitRow\').hidden=false"> 制限時間を設定して通し演習</label><label><input type="radio" name="examMode" value="untimed" onchange="document.getElementById(\'limitRow\').hidden=true"> 時間無制限で通し演習</label><div id="limitRow" hidden><label>確認した制限時間 <input id="timeLimit" type="number" inputmode="numeric" min="10" max="180" placeholder="分"> 分</label><p class="tiny">公式資料で時間を確認して入力してください。アプリは未確認の制限時間を自動設定しません。</p></div></fieldset><button class="primary" onclick="__RIKKYO_APP__.beginAttemptFromGate(\''+id+'\')">この過去問を始める</button></div>';
  }else detail='<div class="warnbox">'+h(sourceCoverageNote(id))+'</div>';
  return '<section class="card hero"><div class="eyebrow">PAST EXAMS</div><h2>過去問</h2></section><section class="exam-list">'+cards+'</section><section class="card"><h2>'+id+' · '+h(P.routeRole(id))+'</h2><p>'+ex.year+'年度 '+ex.schedule+'日程 ／ supplied pages: '+paper.pageCount+'</p>'+detail+'</section>';
}
function selectExam(id){selectedExamId=id;save();render()}
function openExam(id){selectedExamId=id;view='exam';document.querySelectorAll('nav button').forEach(function(b){b.classList.toggle('active',b.dataset.v==='exam')});save();render();scrollTo({top:0})}
function beginAttemptFromGate(id){
  const mode=document.querySelector('input[name="examMode"]:checked')?.value;if(!mode)return alert('実施方法を選んでください。');
  const limit=mode==='timed'?Number(document.getElementById('timeLimit')?.value):null;
  if(mode==='timed'&&(!Number.isFinite(limit)||limit<10||limit>180))return alert('確認した制限時間を10〜180分で入力してください。');
  beginAttempt(id,{mode:mode,limitMinutes:limit})
}
function beginAttempt(id,options){
  const ex=examById(id),opts=options&&typeof options==='object'?options:{},mode=opts.mode==='timed'?'timed':'untimed',limit=mode==='timed'?Number(opts.limitMinutes):null;
  if(id===C.exam.holdoutExamId||ex?.runtimeEnabled===false)return alert('この試験は現在の学習用には開放していません。');
  if(!qsFor(id).length)return alert('問題データ整備中です。');
  if(mode==='timed'&&(!Number.isFinite(limit)||limit<10||limit>180))return alert('制限時間は10〜180分で指定してください。');
  if(S.currentAttempt&&S.currentAttempt.status==='active'&&S.currentAttempt.examId!==id)return alert(S.currentAttempt.examId+' が途中です。');
  if(!S.currentAttempt||S.currentAttempt.status!=='active')S.currentAttempt={id:'attempt-'+Date.now(),examId:id,year:ex.year,status:'active',runtimeMode:ex.runtimeMode||'full',mode:mode,limitMinutes:limit,startedAt:now(),startedTimezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'local',overtime:false,responses:{},questionOrder:qsFor(id).map(function(q){return q.id})};
  save();render()
}
function elapsedSeconds(a){return Math.max(0,Math.floor((Date.now()-new Date(a.startedAt).getTime())/1000))}
function timerMarkup(a){
  if(a.mode!=='timed')return '<span class="timer practice">時間無制限</span>';
  const total=a.limitMinutes*60,remain=total-elapsedSeconds(a);if(remain<=0&&!a.overtime){a.overtime=true;save()}
  const abs=Math.abs(remain),mm=String(Math.floor(abs/60)).padStart(2,'0'),ss=String(abs%60).padStart(2,'0');
  return '<span id="examTimer" class="timer '+(remain<=0?'over':'')+'">'+(remain<=0?'時間超過 ':'残り ')+mm+':'+ss+'</span>'
}
function updateTimer(){
  const a=S.currentAttempt,el=document.getElementById('examTimer');if(!el||!a||a.mode!=='timed')return;
  const total=a.limitMinutes*60,remain=total-elapsedSeconds(a);if(remain<=0&&!a.overtime){a.overtime=true;save()}
  const abs=Math.abs(remain),mm=String(Math.floor(abs/60)).padStart(2,'0'),ss=String(abs%60).padStart(2,'0');
  el.textContent=(remain<=0?'時間超過 ':'残り ')+mm+':'+ss;el.classList.toggle('over',remain<=0)
}
function toggleAnswerSheet(){S.answerSheetOpen=!S.answerSheetOpen;save();render()}
function toggleAnswerSize(){S.answerSheetExpanded=!S.answerSheetExpanded;save();render()}
function toggleExamInfo(){S.examInfoCompact=!S.examInfoCompact;save();render()}
function jumpAnswerMajor(major){
  const panel=document.querySelector('.answer-sheet-body'),actual=[...document.querySelectorAll('#answerPanel .q[data-major="'+major+'"]')][0];if(!panel||!actual)return;
  panel.scrollTo({top:Math.max(0,actual.offsetTop-95),behavior:'smooth'});actual.classList.add('focus-flash');setTimeout(function(){actual.classList.remove('focus-flash')},1200)
}
function jumpToProblem(id){
  const target=document.getElementById('problem-'+id);if(!target)return alert('問題の位置を特定できませんでした。');
  target.scrollIntoView({behavior:'smooth',block:'start'});target.classList.add('focus-flash');setTimeout(function(){target.classList.remove('focus-flash')},1400)
}
function response(id){return S.currentAttempt&&S.currentAttempt.responses[id]}
function setResponse(id,v){if(S.currentAttempt){S.currentAttempt.responses[id]=v;save()}}
function setSlot(id,i,v){const cur=response(id),a=Array.isArray(cur)?cur.slice():[];a[i]=v;setResponse(id,a)}
function toggleMulti(id,v,on){const set=new Set(Array.isArray(response(id))?response(id):[]);on?set.add(v):set.delete(v);setResponse(id,Array.from(set))}
function toggleGroup(id,n,on){const cur=response(id)||{selected:[],corrections:{}},set=new Set(cur.selected||[]);on?set.add(n):set.delete(n);setResponse(id,{selected:Array.from(set).sort(function(a,b){return a-b}),corrections:Object.assign({},cur.corrections||{})});render()}
function setCorrection(id,n,v){const cur=response(id)||{selected:[],corrections:{}};cur.corrections=Object.assign({},cur.corrections||{});cur.corrections[n]=v;setResponse(id,cur)}
function answered(q,r){if(q.scoringType==='multi_slot_text')return Array.isArray(r)&&r.some(Boolean);if(q.scoringType==='select_five_and_rewrite')return !!(r&&r.selected&&r.selected.length);if(q.scoringType==='multiple_choice')return Array.isArray(r)&&r.length;return !!String(r==null?'':r).trim()}
function evaluate(q,r){
  if(q.scoringType==='multi_slot_text')return Array.isArray(r)&&q.answerSpec.slots.every(function(alts,i){return alts.map(norm).includes(norm(r[i]))});
  if(q.scoringType==='word_order_missing_word'||q.scoringType==='word_order')return norm(r)===norm(q.answerSpec.sentence);
  if(q.scoringType==='single_choice')return r===q.answerSpec.choice;
  if(q.scoringType==='context_text'||q.scoringType==='word_form'){const a=q.answerSpec.accepted||q.answerSpec.text||[q.answerSpec.preferred];return a.filter(Boolean).map(norm).includes(norm(r))}
  if(q.scoringType==='multiple_choice')return sameSet(r||[],q.answerSpec.choices||[]);
  if(q.scoringType==='select_five_and_rewrite'){if(!r||!sameSet((r.selected||[]).map(Number),q.answerSpec.errorNumbers))return false;return q.answerSpec.errorNumbers.every(function(n){return q.answerSpec.corrections[String(n)].some(function(x){return norm(x)===norm(r.corrections&&r.corrections[n])})})}
  if(q.scoringType==='manual_reading')return null;
  return false
}
function displayAnswer(q){const a=q.answerSpec;if(q.scoringType==='multi_slot_text')return a.slots.map(function(x){return x.join(' / ')}).join(' ｜ ');if(q.scoringType==='select_five_and_rewrite')return a.errorNumbers.join(', ');if(q.scoringType==='single_choice')return a.choice;if(q.scoringType==='multiple_choice')return a.choices.join('・');return a.sentence||(a.accepted&&a.accepted.join(' / '))||(a.text&&a.text.join(' / '))||a.preferred||''}
function inputFor(q){
  const r=response(q.id);
  if(q.scoringType==='manual_reading')return '<div class="warnbox"><b>自己採点の記述問題</b><p>本文を根拠に自分の言葉で答えてください。採点時に確認ポイントを表示します。</p></div><textarea placeholder="答えを入力" oninput="__RIKKYO_APP__.setResponse(\''+q.id+'\',this.value)">'+h(r)+'</textarea>';
  if(q.scoringType==='multi_slot_text')return '<div class="slot-row">'+q.answerSpec.slots.map(function(_,i){return '<input type="text" value="'+h(r&&r[i])+'" placeholder="空所'+(i+1)+'" oninput="__RIKKYO_APP__.setSlot(\''+q.id+'\','+i+',this.value)">'}).join('')+'</div>';
  if(q.scoringType==='single_choice')return '<div class="choice-grid">'+q.options.map(function(o){return '<label><input type="radio" name="'+q.id+'" value="'+o.id+'" '+(r===o.id?'checked':'')+' onchange="__RIKKYO_APP__.setResponse(\''+q.id+'\',this.value)"><b>'+o.id+'</b> '+h(o.text)+'</label>'}).join('')+'</div>';
  if(q.scoringType==='multiple_choice'){const s=new Set(Array.isArray(r)?r:[]);return '<div class="choice-grid">'+q.options.map(function(o){return '<label><input type="checkbox" '+(s.has(o.id)?'checked':'')+' onchange="__RIKKYO_APP__.toggleMulti(\''+q.id+'\',\''+o.id+'\',this.checked)"><b>'+o.id+'</b> '+h(o.text)+'</label>'}).join('')+'</div>'}
  if(q.scoringType==='select_five_and_rewrite'){const cur=r||{selected:[],corrections:{}},s=new Set(cur.selected||[]);return q.subItems.map(function(x){return '<div class="correction-row"><label><input type="checkbox" '+(s.has(x.number)?'checked':'')+' onchange="__RIKKYO_APP__.toggleGroup(\''+q.id+'\','+x.number+',this.checked)">'+x.number+'. '+h(x.text)+'</label>'+(s.has(x.number)?'<input type="text" value="'+h(cur.corrections&&cur.corrections[x.number])+'" placeholder="訂正後の全文" oninput="__RIKKYO_APP__.setCorrection(\''+q.id+'\','+x.number+',this.value)">':'')+'</div>'}).join('')}
  return '<input type="text" value="'+h(r)+'" placeholder="解答を入力" oninput="__RIKKYO_APP__.setResponse(\''+q.id+'\',this.value)">'+(q.tokens?'<div class="token-list">'+q.tokens.map(function(t){return '<span class="token">'+h(t)+'</span>'}).join('')+'</div>':'')
}
function problemQuestionCard(q){return '<article id="problem-'+q.id+'" class="question"><div class="qhead"><h3>'+h(qLabel(q))+'</h3><span class="source-badge">'+q.id+(q.sourceSubset?' · supplied subset':'')+'</span></div>'+(q.japanese?'<div class="jp">'+h(q.japanese)+'</div>':'')+(q.context?'<div class="practice-context">'+h(q.context)+'</div>':'')+(q.prompt?'<div class="prompt">'+h(q.prompt)+'</div>':'')+(q.tokens?'<div class="token-list">'+q.tokens.map(function(t){return '<span class="token">'+h(t)+'</span>'}).join('')+'</div>':'')+'</article>'}
function answerMajors(rows){return [...new Set(rows.map(function(q){return q.majorQuestion}).filter(Boolean))]}
function answerRow(q){
  return '<div id="answer-'+q.id+'" data-major="'+q.majorQuestion+'" class="q"><div class="row space"><b>'+h(qLabel(q))+'</b><button type="button" onclick="__RIKKYO_APP__.jumpToProblem(\''+q.id+'\')">問題へ ↑</button></div><div class="q-meta"><span class="tiny muted">'+h(P.skillName(q.primarySkill))+(q.sourceSubset?' ／ supplied subset':'')+'</span></div>'+inputFor(q)+'</div>'
}
function examAttempt(){
  const a=S.currentAttempt,ex=examById(a.examId),passes=DATA.passages.filter(function(p){return p.examId===a.examId}),rows=qsFor(a.examId);
  const majors=Array.isArray(ex.runtimeMajors)?ex.runtimeMajors:[],scope=a.runtimeMode==='supplied_subset'?(majors.length?'原本Q'+majors[0]+'-Q'+majors[majors.length-1]+' subset':'原本subset'):'過去問学習中';
  const summary='<div class="attempt-summary"><b>'+h(a.examId)+' <span class="attempt-role">'+h(P.routeRole(a.examId))+'</span></b><span class="attempt-detail">'+h(scope)+' ／ '+(a.mode==='timed'?'制限時間あり':'時間無制限')+' ／ 点数換算なし</span></div>';
  const actions='<div class="attempt-actions"><button onclick="__RIKKYO_APP__.goto(\'home\')">保存して戻る</button><button class="attempt-toggle" onclick="__RIKKYO_APP__.toggleExamInfo()">'+(S.examInfoCompact?'開く':'小さくする')+'</button></div>';
  const attemptBar=U.attemptBar({compact:S.examInfoCompact,summaryHtml:summary,timerHtml:timerMarkup(a),actionsHtml:actions});
  const runtimeNotice=ex.runtimeNotice?'<section class="card warnbox"><b>'+(a.runtimeMode==='supplied_subset'?'原本subset':'現在の実施範囲')+'</b><p>'+h(ex.runtimeNotice)+'</p></section>':'';
  const passageHtml=passes.map(function(pass){return '<details class="card" open><summary><b>'+h(pass.title||'長文')+'</b></summary><div class="passage">'+h(pass.text)+'</div></details>'}).join('');
  const paperHtml=U.paperPage({year:ex.year,label:a.examId+' · '+scope,bodyHtml:passageHtml+rows.map(problemQuestionCard).join('')});
  const answerHeader='<div class="answer-sheet-head"><div><h3>解答欄</h3><span>'+rows.length+'タスク</span></div><div class="sheet-actions">'+(S.answerSheetOpen?'<button type="button" class="sheet-toggle size-toggle" onclick="__RIKKYO_APP__.toggleAnswerSize()">'+(S.answerSheetExpanded?'標準':'広げる')+'</button>':'')+'<button type="button" class="sheet-toggle" onclick="__RIKKYO_APP__.toggleAnswerSheet()">'+(S.answerSheetOpen?'閉じる':'解答欄を開く')+'</button></div></div>';
  const answerBody='<div class="answer-sheet-body"><div class="answer-help"><b>スマホでは問題を上側、解答欄を下側に同時表示</b><span>「問題へ」を押すと、該当設問へ戻れます。</span></div><div class="answer-jumps">'+answerMajors(rows).map(function(m){return '<button type="button" onclick="__RIKKYO_APP__.jumpAnswerMajor('+m+')">大問'+m+'</button>'}).join('')+'</div>'+rows.map(answerRow).join('')+'<button class="primary grade-button" onclick="__RIKKYO_APP__.submitAttempt()">解答を確認して弱点を登録</button></div>';
  const answerPanel=U.answerPanel({open:S.answerSheetOpen,expanded:S.answerSheetExpanded,headerHtml:answerHeader,bodyHtml:answerBody});
  return attemptBar+'<section class="card notice"><b>アプリ解答は非公式です。</b><br><span class="muted">問題と解答欄を分離し、早稲田英語と同じShared UIで操作します。</span></section>'+runtimeNotice+'<div class="examgrid"><section class="problem-column">'+paperHtml+'</section>'+answerPanel+'</div>'
}
function createWeak(q,r){const key=q.examId+':'+q.id,old=S.weak[key]||{},base=E.buildWrongWeaknessState(old,{year:examById(q.examId).year,id:q.id,label:qLabel(q),category:P.skillName(q.primarySkill),component:'main',skill:q.primarySkill,targetId:q.targetId,focusTag:q.targetId,examFormat:q.scoringType,trap:q.primarySkill,priority:P.resolveQuestionPriority(q),user:String(r==null?'':typeof r==='object'?JSON.stringify(r):r),today:today(),manualComponents:[]});base.examId=q.examId;base.questionId=q.id;delete base.points;S.weak[key]=base}
function submitAttempt(){
  const a=S.currentAttempt,qs=qsFor(a.examId),missing=qs.filter(function(q){return !answered(q,a.responses[q.id])});if(missing.length&&!confirm(missing.length+'問が未回答です。要復習として確定しますか？'))return;
  let correct=0;const results={};qs.forEach(function(q){
    const r=a.responses[q.id],hasAnswer=answered(q,r);let ok=false;
    if(q.scoringType==='manual_reading'&&hasAnswer){
      const guidance=q.answerSpec?.guidance||'本文の根拠と設問条件を満たしているか確認してください。';
      ok=confirm('自己採点（学校公式解答ではありません）\n\n確認ポイント：\n'+guidance+'\n\nあなたの答えはこの内容を満たしていますか？');
    }else ok=hasAnswer&&evaluate(q,r)===true;
    results[q.id]=ok;if(ok)correct++;else createWeak(q,r);
  });
  a.status='graded';a.gradedAt=now();a.correctCount=correct;a.totalTasks=qs.length;a.results=results;a.scoreModel='unscored';S.attempts.push(clone(a));S.currentAttempt=null;S.dailyPlan=null;save();goto('review')
}

function weakMarkup(key,w){
  const stateText=w.status==='pending'?'定着確認 '+w.next:w.status==='mastered'?'克服済み':'練習中 '+(w.streak||0)+'/3';
  const action=w.status!=='mastered'?'<button onclick="__RIKKYO_APP__.startWeak(\''+h(key)+'\')">'+(w.status==='pending'?'定着確認':'類題を解く')+'</button>':U.completionMark('✓ 克服済み');
  const content='<div class="row space"><div><b>'+h(w.examId)+' · '+h(w.label)+'</b><div class="tiny"><span class=skill>'+h(P.skillName(w.skill))+'</span> ／ '+h(stateText)+'</div></div>'+action+'</div>';
  return U.weaknessCard({assigned:false,contentHtml:content});
}
function review(){const rows=weakEntries().sort(weakSort);return '<section class="card hero"><div class="eyebrow">REVIEW</div><h2>間違い対策</h2><p>誤答分野を類題3問連続→翌日2問で確認します。</p></section><section class="card"><h3>弱点一覧</h3>'+(rows.length?rows.map(function(x){return weakMarkup(x[0],x[1])}).join(''):'<p class="muted">まだ弱点はありません。</p>')+'</section><section class="card"><h3>過去問履歴</h3>'+([...S.attempts].reverse().map(function(a){return '<div class="row space"><span><b>'+a.examId+'</b> · '+a.correctCount+'/'+a.totalTasks+'タスク</span></div>'}).join('')||'<p class="muted">記録なし</p>')+'</section>'}

function pool(w){return E.selectPracticePool(DATA.practice,w,{minFamilies:5})}
function lastUse(id){let n=-1;S.drillLog.forEach(function(x,i){if(x.q===id)n=i});return n}
function rank(w,items,confirm){return E.rankPracticeQuestions(items,{weak:w,lastId:w.lastDrillId,confirm:!!confirm,lastUse:lastUse})}
function reserve(w,p){w.reservedConfirm=E.reserveConfirmationIds({currentReserved:w.reservedConfirm,pool:p,rankChoices:function(x){return rank(w,x,true)},limit:2})}
function startWeak(key){
  const w=S.weak[key];if(!w)return;if(drill&&drill.key!==key&&!drill.answered)return alert('別のドリルが途中です。');
  const p=pool(w);reserve(w,p);const d=E.practiceSessionStartDecision({weak:w,key:key,currentDrill:drill,familyTotal:E.familyCount(p),today:today(),minFamilies:5});if(d.kind==='too-early')return alert('定着確認は '+d.date+' 以降です。');if(d.kind==='insufficient-families')return alert('類題を整備中です。');
  drill=E.createPracticeSessionState({key:key,weak:w,mode:w.status==='pending'?'confirm':'train'});nextPractice();view='drill';save();render()
}
function nextPractice(){const w=S.weak[drill.key],p=pool(w);reserve(w,p);const r=E.selectNextPracticeQuestion({pool:p,reservedIds:w.reservedConfirm,usedIds:drill.used,mode:drill.mode,streak:w.streak,rankChoices:function(items,c){return rank(w,items,c)}});if(!r.question){drill.error='出題できません';return}E.applyPracticeQuestionState(drill,w,r.question,{usedIds:r.usedIds,choiceOrder:[]});drill.response=null;drill.feedback=null;save()}
function setPractice(v){drill.response=v;save()}
function practiceCorrect(q,r){if(q.type==='choice')return r===q.answer;if(q.type==='word_order')return norm(r)===norm(q.answer);return (q.accepted||[q.answerText]).map(norm).includes(norm(r))}
function practiceInput(q){if(q.type==='choice')return '<div class="choice-grid">'+q.options.map(function(o){return '<label><input type="radio" name="practice" value="'+o.id+'" '+(drill.response===o.id?'checked':'')+' onchange="__RIKKYO_APP__.setPractice(this.value)"><b>'+o.id+'</b> '+h(o.text)+'</label>'}).join('')+'</div>';return '<input type="text" value="'+h(drill.response)+'" placeholder="解答を入力" oninput="__RIKKYO_APP__.setPractice(this.value)">'+(q.tokens?'<div class="token-list">'+q.tokens.map(function(t){return '<span class="token">'+h(t)+'</span>'}).join('')+'</div>':'')}
function finishPractice(){if(!drill||drill.answered)return;if(!String(drill.response||'').trim())return alert('解答を入力してください。');const q=drill.q,w=S.weak[drill.key],ok=practiceCorrect(q,drill.response);drill.answered=true;const t=E.advanceRemediationMastery(w,drill,ok,{today:today(),nextDay:plusDays(1),nowIso:now(),trainTarget:3,confirmTarget:2});if(t.needsConfirmationReserve)reserve(w,pool(w));drill.feedback={ok:ok,answer:q.type==='choice'?q.answer:q.answer||q.answerText,explanation:q.explanation};S.drillLog.push({key:drill.key,skill:w.skill,targetId:w.targetId,q:q.id,ok:ok,at:now(),mode:drill.mode});bumpDaily();save();render()}
function continuePractice(){const w=S.weak[drill.key];if(w.status==='mastered'||(w.status==='pending'&&drill.mode==='train')){drill=null;save();return goto('home')}nextPractice();render()}
function resumeDrill(){view='drill';render()}
function drillView(){
  if(!drill){const rows=activeWeak().filter(eligible).sort(weakSort);return '<section class="card hero"><h2>克服ドリル</h2></section><section class="card">'+(rows.map(function(x){return weakMarkup(x[0],x[1])}).join('')||'<p class="muted">今日取り組める弱点はありません。</p>')+'</section>'}
  const w=S.weak[drill.key],q=drill.q,target=drill.mode==='confirm'?2:3,streak=drill.mode==='confirm'?(w.confirmStreak||0):(w.streak||0);
  const content='<div class="row space drill-head"><div><div class=drill-mode>'+(drill.mode==='confirm'?'翌日の定着チェック':'類題反復')+'</div><h2>'+h(P.skillName(w.skill))+' 克服ドリル</h2></div><span class=streak-label>'+streak+'/'+target+' 連続正解</span></div>'+U.progressBar(streak,target)+'<p class=drill-origin>元の弱点：'+h(w.examId)+' · '+h(w.label)+'</p>'+(q.context?'<div class="practice-context">'+h(q.context)+'</div>':'')+'<h3 class=drill-prompt>'+h(q.prompt)+'</h3>'+(!drill.answered?practiceInput(q)+'<button class="primary" onclick="__RIKKYO_APP__.finishPractice()">答えを確認</button>':'<div class="feedback '+(drill.feedback.ok?'good':'bad')+'"><b>'+(drill.feedback.ok?'✓ 正解':'✕ もう一度')+'</b><p>答え：'+h(drill.feedback.answer)+'</p><p>'+h(drill.feedback.explanation)+'</p></div><button class="primary" onclick="__RIKKYO_APP__.continuePractice()">次へ</button>');
  return U.drillCard({contentHtml:content});
}
function stats(){
  const m=weakEntries().filter(function(x){return x[1].status==='mastered'}).length;
  return '<section class="card hero"><h2>進捗</h2><p>公式得点ではなく学習履歴です。</p></section><section class="grid three">'+U.metricCard(S.attempts.length,'過去問')+U.metricCard(weakEntries().length,'弱点')+U.metricCard(m,'克服済み')+'</section>';
}
function guide(){
  const backup=U.backupPanel({description:'立教英語専用JSONです。復元前の状態は端末内に3世代まで退避します。',exportOnclick:'__RIKKYO_APP__.exportData()',importOnchange:'__RIKKYO_APP__.importData(this)'});
  return '<section class="card hero"><h2>使い方</h2><p>過去問→弱点→類題→翌日確認の順です。</p></section><section class="card warnbox"><b>非公式解答</b><p>学校公式解答・配点は未確認です。点数換算はしません。</p></section><section class="card badbox"><b>FY26B holdout</b><p>最終判定前は学習に使用しません。</p></section>'+backup;
}
function exportData(){const p={format:'rikkyo-uk-english-backup',version:1,appId:'rikkyo-uk-english',exportedAt:now(),state:clone(S)},b=new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='rikkyo-uk-english-'+today()+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(u)},1000)}
function recoveryKeys(){const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf(IMPORT_RECOVERY_PREFIX+'.')===0)keys.push(k)}return keys.sort()}
function saveImportRecovery(){const suffix=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2)),key=IMPORT_RECOVERY_PREFIX+'.'+Date.now()+'.'+suffix;localStorage.setItem(key,JSON.stringify(S));const keys=recoveryKeys();while(keys.length>3)localStorage.removeItem(keys.shift());return key}
function validateBackup(payload){if(!payload||payload.format!=='rikkyo-uk-english-backup'||payload.appId!=='rikkyo-uk-english'||payload.version!==1||!payload.state||typeof payload.state!=='object')throw new Error('立教英語の有効なバックアップではありません。');return payload}
function importPayload(payload,mode){
  validateBackup(payload);saveImportRecovery();const incoming=normalizeState(payload.state);
  if(mode==='replace')S=incoming;
  else S=normalizeState(E.mergeImportedLearningState(S,incoming,{schemaVersion:SCHEMA,todayValue:today(),nowIso:now}));
  drill=S.currentDrill;selectedExamId=C.exam.examIds.includes(S.selectedExamId)?S.selectedExamId:C.exam.defaultExamId;save();render();return clone(S)
}
async function importData(input){
  const file=input&&input.files&&input.files[0];if(!file)return;
  try{const payload=JSON.parse(await file.text()),mode=(document.getElementById('importMode')||{}).value||'merge';if(!confirm(mode==='replace'?'現在の立教英語データをバックアップで置換しますか？':'現在の立教英語データへバックアップを統合しますか？'))return;importPayload(payload,mode);alert('バックアップを復元しました。')}
  catch(e){alert('復元できませんでした: '+e.message)}
  finally{input.value=''}
}
function applyDay(){const cur=today(),d=E.decideDayRollover({renderedDate:renderedDate,currentDate:cur,isDrillView:view==='drill',hasDrill:!!drill,drillAnswered:!!(drill&&drill.answered)});if(d.kind==='same'||d.kind==='defer')return false;E.applyDailyRolloverState(S,cur);renderedDate=cur;save();return true}
window.addEventListener('focus',function(){if(applyDay())render()});

function render(){if(timerHandle){clearInterval(timerHandle);timerHandle=null}if(!DATA)return;const f={home:home,route:route,exam:exam,review:review,drill:drillView,stats:stats,guide:guide}[view];app.innerHTML=f();if(view==='exam'&&S.currentAttempt?.status==='active'&&S.currentAttempt.mode==='timed')timerHandle=setInterval(updateTimer,1000);window.__RIKKYO_APP_READY__=true}
window.__RIKKYO_APP__={goto:goto,selectExam:selectExam,openExam:openExam,beginAttemptFromGate:beginAttemptFromGate,beginAttempt:beginAttempt,toggleAnswerSheet:toggleAnswerSheet,toggleAnswerSize:toggleAnswerSize,toggleExamInfo:toggleExamInfo,jumpAnswerMajor:jumpAnswerMajor,jumpToProblem:jumpToProblem,setResponse:setResponse,setSlot:setSlot,toggleMulti:toggleMulti,toggleGroup:toggleGroup,setCorrection:setCorrection,submitAttempt:submitAttempt,startWeak:startWeak,resumeDrill:resumeDrill,setPractice:setPractice,finishPractice:finishPractice,continuePractice:continuePractice,exportData:exportData,importData:importData,importPayload:importPayload,getState:function(){return clone(S)},recoveryKeys:recoveryKeys,resetForTest:function(){localStorage.removeItem(KEY);recoveryKeys().forEach(function(k){localStorage.removeItem(k)});S=fresh();drill=null;selectedExamId=C.exam.defaultExamId;save();render()},data:function(){return DATA}};
loadData().then(function(){render()}).catch(function(e){console.error(e);app.innerHTML='<section class="card badbox"><h2>読み込みエラー</h2><p>'+h(e.message)+'</p></section>'});
})();