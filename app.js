(()=>{
'use strict';
const C=window.ENGLISH_ENGINE_ADAPTER&&window.ENGLISH_ENGINE_ADAPTER.config;
const P=window.ENGLISH_ENGINE_ADAPTER&&window.ENGLISH_ENGINE_ADAPTER.policy;
const E=window.ENGLISH_ENGINE_CORE;
const U=window.ENGLISH_UI_COMPONENTS;
const TODAY_PRESENTER=window.ENGLISH_UI_TODAY;
const ANSWER_WIDGETS=window.ENGLISH_UI_ANSWER_WIDGETS;
if(!C||!P||!E||!U)throw new Error('Rikkyo adapter/shared engine/UI not loaded');
const KEY=C.storage.key,SCHEMA=C.storage.schemaVersion,TARGET=C.exam.dailyTaskTarget,IMPORT_RECOVERY_PREFIX=C.storage.importRecoveryPrefix,app=document.getElementById('app');
let DATA=null,view='home',selectedExamId=C.exam.defaultExamId,drill=null,renderedDate=E.localDate();

function h(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function sourceText(v){return h(String(v==null?'':v).replace(/\\n/g,'\n'))}
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
  refreshUnfinishedPractice();
}
function refreshUnfinishedPractice(){
  if(!DATA||!drill||drill.answered)return;
  const w=S.weak[drill.key],current=DATA.practice.find(q=>q.id===drill.q?.id);
  // Old broad-pool sessions could attach a different grammar point to this weakness.
  if(w?.skill==='word_order'&&drill.q?.targetId!==w.targetId){
    S.recoveredDrills=S.recoveredDrills||[];S.recoveredDrills.push({...clone(drill),recoveredAt:now(),recoveryReason:'practice-topic-mismatch'});
    w.status='active';w.streak=0;w.confirmStreak=0;w.reservedConfirm=[];
    drill=E.createPracticeSessionState({key:drill.key,weak:w,mode:'train'});nextPractice();return;
  }
  if(current&&current.contentVersion>(drill.q.contentVersion||1)){
    if(current.type==='word_order'&&drill.response){S.recoveredDrills=S.recoveredDrills||[];S.recoveredDrills.push({...clone(drill),recoveredAt:now(),recoveryReason:'practice-content-updated'})}
    if(current.type==='word_order'&&w?.skill==='word_order'){
      w.status='active';w.streak=0;w.confirmStreak=0;w.reservedConfirm=[];
      drill=E.createPracticeSessionState({key:drill.key,weak:w,mode:'train'});nextPractice();return;
    }
    drill.q=clone(current);
    if(current.type==='word_order')drill.response=null;
    save();
  }
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
          prompt:item.prompt,japanese:item.japanese,contentVersion:group.contentVersion,answerSpec:{slots:item.answerSlots},targetId:examId.toLowerCase()+'-guided-'+item.n,
          answerAuthority:group.answerAuthority,verificationStatus:group.verificationStatus,autoGradeAllowed:true
        });
      }else if(group.groupType==='word_order_group'){
        for(const item of group.subItems)out.push({
          id:group.id+'-'+item.n,examId,majorQuestion:3,minorQuestion:item.n,sourcePage:group.sourcePage,
          sourceType:'past_exam',sourceSubset:true,primarySkill:'word_order',scoringType:'word_order',
          prompt:'語句を並べ替えて英文を完成させなさい（不要語1語あり）。',japanese:item.japanese,contentVersion:group.contentVersion,tokens:item.tokens,wordOrderPrefix:item.prefix||'',wordOrderSuffix:item.suffix||'',
          answerSpec:{sentence:item.answerSentence,unused:item.unused,unusedOptions:item.unusedOptions,acceptedSentences:item.acceptedSentences},targetId:examId.toLowerCase()+'-word-order-'+item.n,
          answerAuthority:group.answerAuthority,verificationStatus:group.verificationStatus,autoGradeAllowed:true
        });
      }else if(group.groupType==='error_correction_group'){
        for(const item of group.subItems)out.push({
          id:group.id+'-'+item.n,examId,majorQuestion:4,minorQuestion:item.n,sourcePage:group.sourcePage,
          sourceType:'past_exam',sourceSubset:true,primarySkill:'error_correction_rewrite',scoringType:'multi_slot_text',
          prompt:item.labelledSentence+'\n誤りの記号と、その【 】内の語句を訂正して書きなさい。',japanese:item.japanese,contentVersion:group.contentVersion,answerSpec:{slots:[[item.errorLabel],[item.correction]],correctedSentence:item.correctedSentence},
          errorCorrectionLabels:[...item.labelledSentence.matchAll(/[（(]([ァ-ヺ]+)[）)]/g)].map(m=>m[1]),
          targetId:examId.toLowerCase()+'-error-correction-'+item.n,
          answerAuthority:group.answerAuthority,verificationStatus:group.verificationStatus,autoGradeAllowed:true
        });
      }else if(group.groupType==='paraphrase_group'){
        for(const item of group.subItems)out.push({
          id:group.id+'-'+item.n,examId,majorQuestion:5,minorQuestion:item.n,sourcePage:group.sourcePage,
          sourceType:'past_exam',sourceSubset:true,primarySkill:'paraphrase',scoringType:'multi_slot_text',
          context:'A: '+item.a,prompt:'B: '+item.b,contentVersion:group.contentVersion,answerSpec:{slots:item.answerSlots,acceptedResponses:item.acceptedResponses},targetId:examId.toLowerCase()+'-paraphrase-'+item.n,
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
  return TODAY_PRESENTER.futureConfirmations({rows:futureConfirmations().map(function(x){return {date:x[1].next,label:x[1].examId+' '+x[1].label}}),tomorrow:plusDays(1),target:TARGET})
}
function learningActionsMarkup(action){
  return TODAY_PRESENTER.learningActions({action:Object.assign({},action,{command:action.kind==='resume'?'__RIKKYO_APP__.resumeDrill()':actionCommand(action)}),available:availableLearningActions().map(function(x){return Object.assign({},x,{command:actionCommand(x)})}),routeCommand:"__RIKKYO_APP__.goto('route')"})
}
function qLabel(q){return q.id==='R26-ENG-A-G4'?'大問4':'大問'+q.majorQuestion+' 問'+q.minorQuestion}

function goto(v){if(v==='writing')writingExamId=null;view=v;document.querySelectorAll('nav button').forEach(function(b){b.classList.toggle('active',b.dataset.v===(v==='writingTask'?'writing':v))});render();scrollTo({top:0,behavior:'smooth'})}
window.RIKKYO_WRITING_HUB.mountNav();
document.querySelectorAll('nav button').forEach(function(b){b.onclick=function(){goto(b.dataset.v)}});

function home(){
  const action=todayAction(),plan=ensureDailyPlan(),answered=dailyAnswered(plan),targetReached=dailyTargetReached(plan),active=activeWeak(),mastered=weakEntries().filter(function(x){return x[1].status==='mastered'}).length;
  const todayContent=TODAY_PRESENTER.content({action:action,summary:{answered:answered,target:TARGET,targetReached:targetReached,remaining:dailyTargetRemaining(plan)},goal:{label:'学習範囲',value:'全範囲',note:'公式配点が未確認のため点数目標は設定しません'},actionsHtml:learningActionsMarkup(action),futureHtml:futureConfirmationMarkup()});
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
let examTab='questions',historyExamId='';
function openHistory(id=''){historyExamId=id;examTab='history';goto('exam')}
function setExamTab(tab){examTab=tab==='history'?'history':'questions';historyExamId='';goto('exam')}
function historyRows(){return S.attempts.map((a,i)=>({a,i})).filter(({a})=>!historyExamId||a.examId===historyExamId).sort((x,y)=>(Date.parse(y.a.gradedAt)||0)-(Date.parse(x.a.gradedAt)||0)||y.i-x.i)}
function examHistory(){
  const rows=historyRows();
  return '<section class="card"><div class="row space"><h2>解答履歴'+(historyExamId?' · '+h(historyExamId):'')+'</h2>'+(historyExamId?'<button onclick="__RIKKYO_APP__.openHistory()">すべての履歴</button>':'')+'</div>'+(rows.length?rows.map(({a,i})=>{
    const counts={correct:0,wrong:0,empty:0,unknown:0};resultQuestions(a).forEach(q=>counts[resultStatus(a,q)]++);
    const summary=Object.values(counts).some(Boolean)?'正解 '+counts.correct+' ／ 不正解 '+counts.wrong+' ／ 未回答 '+counts.empty+(counts.unknown?' ／ 要確認 '+counts.unknown:''):'正解 '+(a.correctCount??'不明')+' ／ 全 '+(a.totalTasks??'不明')+'問';
    return '<article class="history-row"><div><h3>'+h(a.examId)+'</h3><p class="muted">'+h(a.gradedAt?new Date(a.gradedAt).toLocaleString():'日時不明')+'</p><p>'+h(summary)+'</p></div><button onclick="__RIKKYO_APP__.openResult('+i+')">答案を見る</button></article>';
  }).join(''):'<p>まだ解答履歴はありません。過去問を提出すると、ここに保存されます。</p><button onclick="__RIKKYO_APP__.setExamTab(\'questions\')">問題を解く</button>')+'</section>';
}
function exam(){return '<div class="exam-tabs" role="group" aria-label="過去問メニュー"><button aria-pressed="'+(examTab==='questions')+'" onclick="__RIKKYO_APP__.setExamTab(\'questions\')">問題を解く</button><button aria-pressed="'+(examTab==='history')+'" onclick="__RIKKYO_APP__.setExamTab(\'history\')">解答履歴</button></div>'+(examTab==='history'?examHistory():examQuestions())}
function examQuestions(){
  const id=selectedExamId,ex=examById(id),paper=paperById(id),qs=qsFor(id),hold=id===C.exam.holdoutExamId,subset=ex?.runtimeMode==='supplied_subset';
  if(S.currentAttempt&&S.currentAttempt.status==='active'&&S.currentAttempt.examId===id)return examAttempt();
  const cards=C.exam.examIds.map(function(x){
    const e=examById(x),count=qsFor(x).length,status=x===C.exam.holdoutExamId?'holdout':e?.runtimeMode==='supplied_subset'?'subset':count?'ready':'audit';
    const label=status==='holdout'?'最終holdout':status==='subset'?'原本subset':count?'問題データあり':'原本範囲監査済み';
    return '<article class="exam-card '+(x===id?'selected':'')+'"><div class="row space"><h3>'+x+'</h3><span class="badge '+(x===C.exam.holdoutExamId?'holdout':'')+'">'+h(P.routeRole(x))+'</span></div><div class="muted">'+e.year+'年度 '+e.schedule+'日程 · '+label+'</div><button onclick="__RIKKYO_APP__.selectExam(\''+x+'\')">表示</button> <button onclick="__RIKKYO_APP__.openHistory(\''+x+'\')">履歴を見る（'+S.attempts.filter(a=>a.examId===x).length+'）</button></article>';
  }).join('');
  let detail='';
  if(hold)detail='<div class="badbox"><b>最終判定用holdout</b><p>問題本文の転記・非公式解答監査は別データとして完了していますが、最終判定前の学習には公開しません。リスニングは音源未入手のため採点対象外です。</p></div>';
  else if(qs.length){
    const runtimeNote=ex.runtimeNotice?'<div class="warnbox"><b>'+(subset?'原本subset':'現在の実施範囲')+'</b><p>'+h(ex.runtimeNotice)+'</p></div>':'';
    detail='<div class="notice"><b>非公式解答</b><p>原本から独立に検討したアプリ解答で、学校公式解答ではありません。</p></div>'+runtimeNote+'<p>学習タスク: <b>'+qs.length+'</b></p><div class="exam-gate"><fieldset><legend>実施方法</legend><label><input type="radio" name="examMode" value="timed" onchange="document.getElementById(\'limitRow\').hidden=false"> 制限時間を設定して通し演習</label><label><input type="radio" name="examMode" value="untimed" onchange="document.getElementById(\'limitRow\').hidden=true"> 時間無制限で通し演習</label><div id="limitRow" hidden><label>確認した制限時間 <input id="timeLimit" type="number" inputmode="numeric" min="10" max="180" placeholder="分"> 分</label><p class="tiny">公式資料で時間を確認して入力してください。アプリは未確認の制限時間を自動設定しません。</p></div></fieldset><button class="primary" onclick="__RIKKYO_APP__.beginAttemptFromGate(\''+id+'\')">この過去問を始める</button></div>';
  }else detail='<div class="warnbox">'+h(sourceCoverageNote(id))+'</div>';
  if(['FY25A','FY25B','FY26A'].includes(id))detail+='<div class="notice"><p>自由英作文は、非公式の学習用AI添削で練習できます。</p><button onclick="__RIKKYO_APP__.openWriting(\''+id+'\')">英作文を練習する</button></div>';
  return '<section class="card hero"><div class="eyebrow">PAST EXAMS</div><h2>過去問</h2></section><section class="exam-list">'+cards+'</section><section class="card"><h2>'+id+' · '+h(P.routeRole(id))+'</h2><p>'+ex.year+'年度 '+ex.schedule+'日程 ／ supplied pages: '+paper.pageCount+'</p>'+detail+'</section>';
}
function selectExam(id){selectedExamId=id;save();render()}
function openExam(id){examTab='questions';selectedExamId=id;view='exam';document.querySelectorAll('nav button').forEach(function(b){b.classList.toggle('active',b.dataset.v==='exam')});save();render();scrollTo({top:0})}
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
  if(!S.currentAttempt||S.currentAttempt.status!=='active'){readingMessages.clear();S.currentAttempt={id:'attempt-'+Date.now(),examId:id,year:ex.year,status:'active',runtimeMode:ex.runtimeMode||'full',mode:mode,limitMinutes:limit,startedAt:now(),startedTimezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'local',overtime:false,responses:{},questionOrder:qsFor(id).map(function(q){return q.id})};}
  save();render()
}
const examSession=window.ENGLISH_UI_EXAM_SESSION.create({
  getState:()=>S,save:save,render:render,
  problemElementIds:({id})=>['problem-'+id],
  onMissingProblem:()=>alert('問題の位置を特定できませんでした。')
});
function timerMarkup(a){return examSession.timerMarkup(a)}
function updateTimer(){return examSession.updateTimer()}
function toggleAnswerSheet(){return examSession.toggleAnswerSheet()}
function toggleAnswerSize(){return examSession.toggleAnswerSize()}
function toggleExamInfo(){return examSession.toggleExamInfo()}
function jumpAnswerMajor(major){return examSession.jumpAnswerMajor(major)}
function jumpToProblem(id){return examSession.jumpToProblem({id:id})}
function response(id){return S.currentAttempt&&S.currentAttempt.responses[id]}
function setResponse(id,v){if(S.currentAttempt){S.currentAttempt.responses[id]=v;save();updateReadingFeedback(id)}}
function setSlot(id,i,v){setResponse(id,ANSWER_WIDGETS.slot(response(id),i,v))}
function toggleMulti(id,v,on){setResponse(id,ANSWER_WIDGETS.selection(response(id),v,{on:on}).values)}
function toggleGroup(id,n,on){const cur=response(id)||{selected:[],corrections:{}};setResponse(id,{selected:ANSWER_WIDGETS.selection(cur.selected,n,{on:on}).values.sort(function(a,b){return a-b}),corrections:Object.assign({},cur.corrections||{})});render()}
function setCorrection(id,n,v){const cur=response(id)||{selected:[],corrections:{}};cur.corrections=Object.assign({},cur.corrections||{});cur.corrections[n]=v;setResponse(id,cur)}
function isWordOrder(q){return q.scoringType==='word_order_missing_word'||q.scoringType==='word_order'}
function wordOrderOptions(q){return {allowMissing:q.scoringType==='word_order_missing_word'}}
function wordOrderState(q,r){return ANSWER_WIDGETS.reorderState(r,q.tokens||[],wordOrderOptions(q))}
function wordOrderSentence(q,r){return [q.wordOrderPrefix,ANSWER_WIDGETS.reorderSentence(r,q.tokens||[],wordOrderOptions(q)),q.wordOrderSuffix].filter(Boolean).join(' ')}
function changeWordOrder(id,action){
  const q=S.currentAttempt&&qsFor(S.currentAttempt.examId).find(x=>x.id===id);if(!q)return;
  const result=ANSWER_WIDGETS.reorderChange(response(id),q.tokens||[],action,wordOrderOptions(q));
  if(result.error==='missing-empty')return alert('不足する1語を入力してください。');
  if(!result.changed)return;setResponse(id,result.state);
  ANSWER_WIDGETS.refreshReorder(document.getElementById('answer-'+id),result.state,q.tokens||[],Object.assign({emptyText:'ここに並べた語句が表示されます'},wordOrderOptions(q)));
}
function setWordOrderMissing(id,v){changeWordOrder(id,{type:'missing',value:v})}
function addWordOrderToken(id,i){changeWordOrder(id,{type:'add',index:i})}
function addWordOrderMissing(id){changeWordOrder(id,{type:'addMissing'})}
function undoWordOrder(id){changeWordOrder(id,{type:'undo'})}
function clearWordOrder(id){changeWordOrder(id,{type:'clear'})}
function answered(q,r){
  if(q.scoringType==='multi_slot_text')return Array.isArray(r)&&r.some(Boolean);
  if(q.scoringType==='select_five_and_rewrite')return !!(r&&r.selected&&r.selected.length);
  if(q.scoringType==='multiple_choice')return Array.isArray(r)&&r.length;
  if(isWordOrder(q)){const s=wordOrderState(q,r),needed=(q.tokens||[]).length+(q.scoringType==='word_order_missing_word'?1:0)-(q.scoringType==='word_order'&&q.answerSpec?.unused?1:0);return s.order.length===needed&&new Set(s.order).size===s.order.length&&(q.scoringType!=='word_order_missing_word'||String(s.missing).trim())}
  return !!String(r==null?'':r).trim()
}
// Normalize only the symbol slot; English correction text keeps the usual grading rules.
function correctionLabel(v){return String(v??'').normalize('NFKC').trim().replace(/^[（(]\s*|\s*[）)]$/g,'').replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60))}
function isLabelledCorrection(q){return q.scoringType==='multi_slot_text'&&q.primarySkill==='error_correction_rewrite'&&q.errorCorrectionLabels?.length>0}
function setErrorLabel(id,label){
  setSlot(id,0,correctionLabel(label));
  // Keep the panel, its scroll position and the correction draft in place.
  const row=document.getElementById('answer-'+id);
  row?.querySelectorAll('.error-label-options input').forEach(input=>input.checked=input.value===correctionLabel(label));
}
function evaluate(q,r){
  if(isLabelledCorrection(q))return Array.isArray(r)&&r.length===2&&q.answerSpec.slots[0].some(v=>correctionLabel(v)===correctionLabel(r[0]))&&q.answerSpec.slots[1].some(v=>norm(v)===norm(r[1]));
  if(q.scoringType==='multi_slot_text')return Array.isArray(r)&&r.length===q.answerSpec.slots.length&&(q.answerSpec.slots.every(function(alts,i){return alts.map(norm).includes(norm(r[i]))})||(q.answerSpec.acceptedResponses||[]).some(a=>a.every((v,i)=>norm(v)===norm(r[i]))));
  if(isWordOrder(q))return [q.answerSpec.sentence,...(q.answerSpec.acceptedSentences||[])].map(norm).includes(norm(wordOrderSentence(q,r)));
  if(q.scoringType==='single_choice')return (q.answerSpec.acceptedChoices||[q.answerSpec.choice]).includes(r);
  if(q.scoringType==='context_text'||q.scoringType==='word_form'){const a=q.answerSpec.accepted||q.answerSpec.text||[q.answerSpec.preferred];return a.filter(Boolean).map(norm).includes(norm(r))}
  if(q.scoringType==='multiple_choice')return sameSet(r||[],q.answerSpec.choices||[]);
  if(q.scoringType==='select_five_and_rewrite'){if(!r||!sameSet((r.selected||[]).map(Number),q.answerSpec.errorNumbers))return false;return q.answerSpec.errorNumbers.every(function(n){return q.answerSpec.corrections[String(n)].some(function(x){return norm(x)===norm(r.corrections&&r.corrections[n])})})}
  if(q.scoringType==='manual_reading')return null;
  return false
}
function displayAnswer(q){const a=q.answerSpec;if(q.scoringType==='multi_slot_text')return [a.slots.map(function(x){return x.join(' / ')}).join(' ｜ '),...(a.acceptedResponses||[]).map(x=>x.join(' ｜ '))].join(' または ');if(q.scoringType==='select_five_and_rewrite')return a.errorNumbers.join(', ');if(q.scoringType==='single_choice')return (a.acceptedChoices||[a.choice]).join(' / ')+(a.note?' — '+a.note:'');if(q.scoringType==='multiple_choice')return a.choices.join('・');return a.sentence||(a.accepted&&a.accepted.join(' / '))||(a.text&&a.text.join(' / '))||a.preferred||''}
function wordOrderInput(q,r){
  return (q.wordOrderPrefix||q.wordOrderSuffix?'<p class="word-order-frame">'+h(q.wordOrderPrefix||'')+' ［並べ替え］ '+h(q.wordOrderSuffix||'')+'</p>':'')+'<div class="input-guide">語句を正しい順にタップしてください。'+(q.scoringType==='word_order_missing_word'?'不足する1語も自分で補います。':'')+'</div>'+ANSWER_WIDGETS.reorder({tokens:q.tokens||[],state:r,allowMissing:wordOrderOptions(q).allowMissing,boxId:'order-'+q.id,emptyText:'ここに並べた語句が表示されます',handlers:{add:i=>"__RIKKYO_APP__.addWordOrderToken('"+q.id+"',"+i+")",missing:"__RIKKYO_APP__.setWordOrderMissing('"+q.id+"',this.value)",addMissing:"__RIKKYO_APP__.addWordOrderMissing('"+q.id+"')",undo:"__RIKKYO_APP__.undoWordOrder('"+q.id+"')",clear:"__RIKKYO_APP__.clearWordOrder('"+q.id+"')"}});
}
const readingIds=new Set(['R25-ENG-A-Q6-4','R26-ENG-A-Q7-1','R26-ENG-A-Q7-2','R26-ENG-A-Q7-3','R26-ENG-A-Q7-4']);
const readingPending=new Map(),readingMessages=new Map(),submittingAttempts=new Set();
function readingTask(id){return readingIds.has(id)?{schoolId:'rikkyo',scope:'exam',taskId:id,skill:'reading_short_answer',maxScore:12,feedbackSchema:'reading-v1'}:null}
function readingFresh(a,id){const x=a?.readingFeedback?.[id];return !!(x&&x.answer===String(a.responses[id]||'').trim()&&window.ENGLISH_WRITING_FEEDBACK.validateAIFeedback(x.feedback,12)&&window.ENGLISH_WRITING_FEEDBACK.validateReadingFeedback(x.feedback,readingTask(id),x.answer))}
function readingFeedbackMarkup(id){const a=S.currentAttempt;if(!a)return '';const x=a.readingFeedback?.[id],pending=readingPending.get(id)?.attempt===a,answer=String(a.responses[id]||'').trim(),stale=x&&!readingFresh(a,id);return '<button type="button" '+(pending?'disabled':'')+' onclick="__RIKKYO_APP__.gradeReading(\''+id+'\')">'+(pending?'AIが確認中…':'AI添削する')+'</button><p class="tiny reading-status" role="status">'+h(readingMessages.get(id)||'採点時にもAIで確認します。')+'</p>'+(stale?'<p class="warnbox">答案を変更したため、前の評価は無効です。再提出してください。</p>':'')+(!stale&&x?window.ENGLISH_WRITING_FEEDBACK.aiFeedbackMarkup(x.feedback,answer):'')}
function updateReadingFeedback(id){const node=document.getElementById('reading-tools-'+id);if(node)node.innerHTML=readingFeedbackMarkup(id)}
function gradeReading(id){const a=S.currentAttempt,task=readingTask(id),originalState=S,answer=String(a?.responses?.[id]||'').trim();if(!a||!task)return Promise.resolve(false);const pending=readingPending.get(id);if(pending?.attempt===a)return pending.promise;if(!answer||answer.length>1200){readingMessages.set(id,!answer?'答えを入力してください。':'AI添削は1200文字以内です。答案は保存されています。');updateReadingFeedback(id);return Promise.resolve(false)}
 const entry={attempt:a,promise:null};readingPending.set(id,entry);readingMessages.set(id,'本文と答案を確認しています…');updateReadingFeedback(id);
 entry.promise=(async()=>{try{const feedback=await window.ENGLISH_WRITING_FEEDBACK.requestWritingFeedback(task,answer,C.aiWriting.endpoint);if(S!==originalState||S.currentAttempt!==a)return false;a.readingFeedback=a.readingFeedback||{};a.readingFeedback[id]={answer,feedback};save();const fresh=readingFresh(a,id);readingMessages.set(id,fresh?'添削を保存しました。修正して再提出できます。':'答案が変更されています。もう一度提出してください。');return fresh}catch(e){if(S===originalState&&S.currentAttempt===a)readingMessages.set(id,e.message+' 答案は保存されています。');return false}finally{if(readingPending.get(id)===entry)readingPending.delete(id);if(S===originalState&&S.currentAttempt===a)updateReadingFeedback(id)}})();return entry.promise;
}
function inputFor(q){
  const r=response(q.id),onInput="__RIKKYO_APP__.setResponse('"+q.id+"',this.value)";
  if(q.scoringType==='manual_reading')return '<div class="notice"><b>AI添削の記述問題</b><p>本文を根拠に自分の言葉で答えてください。AIが内容と言葉を確認し、本文の根拠を示します。非公式の学習用評価です。</p></div>'+ANSWER_WIDGETS.textInput({multiline:true,value:r,placeholder:q.examId==='FY25A'?'日本語で答えを入力':'英語で短く答えを入力',onInput:onInput})+'<div id="reading-tools-'+q.id+'">'+readingFeedbackMarkup(q.id)+'</div>';
  if(isLabelledCorrection(q))return '<fieldset class="error-label-field"><legend>誤りの記号</legend>'+ANSWER_WIDGETS.choices({options:q.errorCorrectionLabels.map(value=>({value,label:value})),selected:[correctionLabel(r?.[0])],variant:'inputs',className:'error-label-options',name:q.id+'-error-label',label:qLabel(q)+'の誤りの記号',onAction:()=>"__RIKKYO_APP__.setErrorLabel('"+q.id+"',this.value)"})+'</fieldset><label class="error-correction-text">訂正後の語句'+ANSWER_WIDGETS.textInput({value:r?.[1],placeholder:'正しい語句を入力',onInput:"__RIKKYO_APP__.setSlot('"+q.id+"',1,this.value)"})+'</label>';
  if(q.scoringType==='multi_slot_text')return ANSWER_WIDGETS.slots({count:q.answerSpec.slots.length,values:r,input:i=>({placeholder:'空所'+(i+1),onInput:"__RIKKYO_APP__.setSlot('"+q.id+"',"+i+",this.value)"})});
  if(q.scoringType==='single_choice'||q.scoringType==='multiple_choice'){
    const multi=q.scoringType==='multiple_choice';return ANSWER_WIDGETS.choices({options:q.options.map(o=>({value:o.id,labelHtml:'<span class=choice-text><b>'+h(o.id)+'</b> '+h(o.text)+'</span>'})),selected:multi?(Array.isArray(r)?r:[]):[r],multiple:multi,variant:'inputs',className:'choice-grid',name:q.id,label:qLabel(q)+'の回答',onAction:v=>multi?"__RIKKYO_APP__.toggleMulti('"+q.id+"','"+v+"',this.checked)":onInput});
  }
  if(q.scoringType==='select_five_and_rewrite'){const cur=r||{selected:[],corrections:{}},s=new Set(cur.selected||[]);return q.subItems.map(function(x){return '<div class="correction-row"><label><input type="checkbox" '+(s.has(x.number)?'checked':'')+' onchange="__RIKKYO_APP__.toggleGroup(\''+q.id+'\','+x.number+',this.checked)"><span class=choice-text>'+x.number+'. '+h(x.text)+'</span></label>'+(s.has(x.number)?ANSWER_WIDGETS.textInput({value:cur.corrections&&cur.corrections[x.number],placeholder:'訂正後の全文',onInput:"__RIKKYO_APP__.setCorrection('"+q.id+"',"+x.number+",this.value)"}):'')+'</div>'}).join('')}
  if(isWordOrder(q))return wordOrderInput(q,r);
  return ANSWER_WIDGETS.textInput({value:r,placeholder:'解答を入力',onInput:onInput});
}
function questionInstruction(q){
  if(q.primarySkill==='paraphrase')return 'AとBがほぼ同じ意味になるように、Bの各空所に適切な英単語を1語ずつ入れなさい。';
  if(q.primarySkill==='guided_completion')return '日本語の意味に合うように、英文の各空所に適切な英単語を1語ずつ入れなさい。';
  if(q.scoringType==='word_order_missing_word')return '日本語の意味に合うように、不足する英単語を1語補い、語句を並べ替えて英文を完成させなさい。';
  return '';
}
function problemQuestionCard(q){
  const instruction=questionInstruction(q);
  return '<article id="problem-'+q.id+'" class="question"><div class="qhead"><h3>'+h(qLabel(q))+'</h3><span class="source-badge">'+q.id+(q.sourceSubset?' · supplied subset':'')+'</span></div>'+(instruction?'<p class="question-instruction">'+h(instruction)+'</p>':'')+(q.japanese?'<div class="jp">'+sourceText(q.japanese)+'</div>':'')+(q.prompt?'<div class="prompt">'+sourceText(q.prompt)+'</div>':'')+(q.wordOrderPrefix||q.wordOrderSuffix?'<p class="word-order-frame">'+h(q.wordOrderPrefix||'')+' ［並べ替え］ '+h(q.wordOrderSuffix||'')+'</p>':'')+(q.tokens?'<div class="token-list source-token-list">'+q.tokens.map(function(t){return '<span class="token">'+sourceText(t)+'</span>'}).join('')+'</div>':'')+'</article>'
}
function sourcePassageText(pass){
  // Source spans use exact substrings from the printed paper. Escape every
  // character before emitting any presentation HTML; never interpret HTML in data.
  const raw=String(pass.text==null?'':pass.text).replace(/\\\\n/g,'\n');
  const marks=Array.isArray(pass.underlinedSpans)?pass.underlinedSpans:[];
  const ranges=[];
  for(const marked of marks){
    const value=typeof marked==='string'?marked:marked.text;
    const index=raw.indexOf(value);
    if(!value||index<0||raw.indexOf(value,index+value.length)!==-1){
      console.warn('Invalid passage underline',pass.passageId,value);
      continue;
    }
    if(ranges.some(r=>index<r.end&&index+value.length>r.start)){
      console.warn('Overlapping passage underline',pass.passageId,value);
      continue;
    }
    ranges.push({start:index,end:index+value.length});
  }
  const starts=new Set(ranges.map(r=>r.start)),ends=new Set(ranges.map(r=>r.end));
  let html='';
  for(let i=0;i<=raw.length;i++){
    if(ends.has(i))html+='</u>';
    if(starts.has(i))html+='<u class="source-underline">';
    if(i===raw.length)break;
    if(raw[i]==='*'&&/[A-Za-z]/.test(raw[i+1]||''))html+='<sup class="source-note-marker" aria-hidden="true">＊</sup>';
    else html+=h(raw[i]);
  }
  return html;
}
function sourcePassageGlossary(pass){
  const glossary=pass&&pass.glossary&&typeof pass.glossary==='object'?Object.entries(pass.glossary):[];
  if(!glossary.length)return '';
  return '<aside class="source-glossary" aria-label="原本の語句注釈"><div class="source-glossary-title">語句の注釈 <small>原本掲載・＊印の語句</small></div><dl class="source-glossary-grid">'+glossary.map(([word,meaning])=>'<div><dt>'+h(word.replace(/_/g,' '))+'</dt><dd>'+h(meaning)+'</dd></div>').join('')+'</dl></aside>';
}
function sourceBlock(title,text,extra,pass){
  return '<section class="source-block"><div class="source-block-title"><b>'+h(title)+'</b>'+(extra?'<span>'+h(extra)+'</span>':'')+'</div><div class="passage">'+(pass?sourcePassageText(pass):sourceText(text))+'</div>'+(pass?sourcePassageGlossary(pass):'')+'</section>'
}
function renderProblemFlow(rows,passes){
  const out=[],shownPassages=new Set();let lastContext=null;
  for(const q of rows){
    if(q.passageId&&!shownPassages.has(q.passageId)){
      const pass=passes.find(function(p){return p.passageId===q.passageId});
      if(pass){out.push(sourceBlock('大問'+q.majorQuestion+' 長文 · '+(pass.title||'本文'),pass.text,pass.sourceAttribution||'',pass));shownPassages.add(q.passageId);lastContext=null}
    }
    if(q.context&&q.context!==lastContext){out.push(sourceBlock('大問'+q.majorQuestion+' 資料',q.context,''));lastContext=q.context}
    if(!q.context)lastContext=null;
    out.push(problemQuestionCard(q))
  }
  return out.join('')
}
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
  const runtimeNotice=ex.runtimeNotice?'<section class="card warnbox"><b>'+(a.runtimeMode==='supplied_subset'?'原本subset':'現在の実施範囲')+'</b><p>'+sourceText(ex.runtimeNotice)+'</p></section>':'';
  const paperHtml=U.paperPage({year:ex.year,label:a.examId+' · '+scope,bodyHtml:renderProblemFlow(rows,passes)});
  const answerHeader='<div class="answer-sheet-head"><div><h3>解答欄</h3><span>'+rows.length+'タスク</span></div><div class="sheet-actions">'+(S.answerSheetOpen?'<button type="button" class="sheet-toggle size-toggle" onclick="__RIKKYO_APP__.toggleAnswerSize()">'+(S.answerSheetExpanded?'標準':'広げる')+'</button>':'')+'<button type="button" class="sheet-toggle" onclick="__RIKKYO_APP__.toggleAnswerSheet()">'+(S.answerSheetOpen?'閉じる':'解答欄を開く')+'</button></div></div>';
  const answerBody='<div class="answer-sheet-body"><div class="answer-help"><b>スマホでは問題を上側、解答欄を下側に同時表示</b><span>「問題へ」を押すと、該当設問へ戻れます。</span></div><div class="answer-jumps">'+answerMajors(rows).map(function(m){return '<button type="button" onclick="__RIKKYO_APP__.jumpAnswerMajor('+m+')">大問'+m+'</button>'}).join('')+'</div>'+rows.map(answerRow).join('')+'<button class="primary grade-button" onclick="__RIKKYO_APP__.submitAttempt()">解答を確認して弱点を登録</button></div>';
  const answerPanel=U.answerPanel({open:S.answerSheetOpen,expanded:S.answerSheetExpanded,headerHtml:answerHeader,bodyHtml:answerBody});
  return attemptBar+'<section class="card notice"><b>アプリ解答は非公式です。</b><br><span class="muted">本文・資料は該当する大問の直前に1回だけ表示します。</span></section>'+runtimeNotice+'<div class="examgrid"><section class="problem-column">'+paperHtml+'</section>'+answerPanel+'</div>'
}
function createWeak(q,r){const key=q.examId+':'+q.id,old=S.weak[key]||{},base=E.buildWrongWeaknessState(old,{year:examById(q.examId).year,id:q.id,label:qLabel(q),category:P.skillName(q.primarySkill),component:'main',skill:q.primarySkill,targetId:q.targetId,focusTag:q.targetId,examFormat:q.scoringType,trap:q.primarySkill,priority:P.resolveQuestionPriority(q),user:String(r==null?'':typeof r==='object'?JSON.stringify(r):r),today:today(),manualComponents:[]});base.examId=q.examId;base.questionId=q.id;delete base.points;S.weak[key]=base}
async function submitAttempt(){
  const a=S.currentAttempt,originalState=S;if(!a||submittingAttempts.has(a))return;const qs=qsFor(a.examId),snapshot=JSON.stringify(a.responses),missing=qs.filter(q=>!answered(q,a.responses[q.id]));if(missing.length&&!confirm(missing.length+'問が未回答です。要復習として確定しますか？'))return;
  submittingAttempts.add(a);const button=document.querySelector('.grade-button');if(button){button.disabled=true;button.textContent='記述答案をAIで確認しています…'}
  try{
    for(const q of qs.filter(q=>q.scoringType==='manual_reading'&&answered(q,a.responses[q.id]))){if(!readingFresh(a,q.id)&&!await gradeReading(q.id))return;if(S!==originalState||S.currentAttempt!==a)return;}
    if(S!==originalState||S.currentAttempt!==a)return;
    if(JSON.stringify(a.responses)!==snapshot){alert('確認中に答案が変更されたため、確定していません。もう一度「解答を確認」を押してください。');return;}
    let correct=0;const results={};qs.forEach(q=>{const r=a.responses[q.id],hasAnswer=answered(q,r),ok=!!(hasAnswer&&(q.scoringType==='manual_reading'?readingFresh(a,q.id)&&a.readingFeedback[q.id].feedback.learningCorrect:evaluate(q,r)===true));results[q.id]=ok;if(ok)correct++;else createWeak(q,r)});
    a.reviewQuestions=clone(qs);a.reviewPassages=clone(DATA.passages.filter(p=>qs.some(q=>q.passageId&&(p.id===q.passageId||p.passageId===q.passageId))));a.status='graded';a.gradedAt=now();a.correctCount=correct;a.totalTasks=qs.length;a.results=results;a.scoreModel='unscored';S.attempts.push(clone(a));S.currentAttempt=null;S.dailyPlan=null;save();if(typeof window.dispatchEvent==='function')window.dispatchEvent(new Event('learning-answer-saved'));openResult(S.attempts.length-1);
  }finally{submittingAttempts.delete(a);if(S===originalState&&S.currentAttempt===a){const b=document.querySelector('.grade-button');if(b){b.disabled=false;b.textContent='解答を確認して弱点を登録'}}}
}

function weakMarkup(key,w){
  const stateText=w.status==='pending'?'定着確認 '+w.next:w.status==='mastered'?'克服済み':'練習中 '+(w.streak||0)+'/3';
  const action=w.status!=='mastered'?'<button onclick="__RIKKYO_APP__.startWeak(\''+h(key)+'\')">'+(w.status==='pending'?'定着確認':'類題を解く')+'</button>':U.completionMark('✓ 克服済み');
  const content='<div class="row space"><div><b>'+h(w.examId)+' · '+h(w.label)+'</b><div class="tiny"><span class=skill>'+h(P.skillName(w.skill))+'</span> ／ '+h(stateText)+'</div></div>'+action+'</div>';
  return U.weaknessCard({assigned:false,contentHtml:content});
}
let resultIndex=-1,resultFilter='wrong',resultFocus='';
function resultQuestions(a){return a.reviewQuestions||qsFor(a.examId).filter(q=>Object.prototype.hasOwnProperty.call(a.results||{},q.id))}
function resultStatus(a,q){
  if(!a.responses||!Object.prototype.hasOwnProperty.call(a.responses,q.id))return a.responses?'empty':'unknown';
  if(!answered(q,a.responses[q.id]))return 'empty';
  return a.results?.[q.id]===true?'correct':a.results?.[q.id]===false?'wrong':'unknown';
}
function answerLabel(q,v){const o=(q.options||[]).find(o=>String(o.id)===String(v));return o?o.id+' '+o.text:String(v??'')}
function reviewResponse(q,r){
  if(r==null||r==='')return '未回答';
  if(isWordOrder(q))return wordOrderSentence(q,r);
  if(q.scoringType==='select_five_and_rewrite')return (r.selected||[]).map(n=>n+'. '+(r.corrections?.[n]||'訂正未入力')).join('\n');
  if(Array.isArray(r))return r.map(v=>answerLabel(q,v)||'未回答').join(' ／ ');
  return answerLabel(q,r);
}
function reviewExpected(q){
  const a=q.answerSpec||{};
  if(q.scoringType==='manual_reading')return a.guidance||'下の添削・本文を確認してください。';
  if(q.scoringType==='single_choice')return (a.acceptedChoices||[a.choice]).map(v=>answerLabel(q,v)).join(' ／ ');
  if(q.scoringType==='multiple_choice')return (a.choices||[]).map(v=>answerLabel(q,v)).join('\n');
  if(q.scoringType==='select_five_and_rewrite')return (a.errorNumbers||[]).map(n=>n+'. '+(a.corrections?.[n]||[]).join(' / ')).join('\n');
  return displayAnswer(q)||'下の添削・本文を確認してください。';
}
function reviewParts(q,r){
  if(q.scoringType==='multi_slot_text'){
    const v=Array.isArray(r)?r:[],a=q.answerSpec;
    const accepted=(a.acceptedResponses||[]).find(row=>row.every((x,i)=>norm(x)===norm(v[i])));
    return a.slots.map((alts,i)=>{const ok=!!accepted||alts.some(x=>isLabelledCorrection(q)&&i===0?correctionLabel(x)===correctionLabel(v[i]):norm(x)===norm(v[i]));return '<div class="review-part '+(ok?'good':'bad')+'">'+(ok?'○':'×')+' '+(isLabelledCorrection(q)?(i===0?'記号':'訂正後の語句'):'空所'+(i+1))+'：'+h(v[i]||'未回答')+' → '+h(alts.join(' / '))+'</div>'}).join('');
  }
  if(q.scoringType==='multiple_choice'){
    const v=Array.isArray(r)?r:[],expected=q.answerSpec.choices||[];
    return v.filter(x=>!expected.includes(x)).map(x=>'<p>選び過ぎ：'+h(answerLabel(q,x))+'</p>').join('')+expected.filter(x=>!v.includes(x)).map(x=>'<p>選び漏れ：'+h(answerLabel(q,x))+'</p>').join('');
  }
  if(q.scoringType==='select_five_and_rewrite'){
    const v=r||{},a=q.answerSpec,selected=v.selected||[];
    return (q.subItems||[]).map(item=>{const n=item.number,need=a.errorNumbers.includes(n),picked=selected.map(Number).includes(n),ok=need===picked&&(!need||(a.corrections[String(n)]||[]).some(x=>norm(x)===norm(v.corrections?.[n])));return '<div class="review-part '+(ok?'good':'bad')+'">'+(ok?'○':'×')+' '+n+'：'+h(item.text)+'<br>'+(!need?(picked?'訂正不要の文を選んでいます。':'訂正不要です。'):!picked?'選び漏れです。':'訂正：'+h(v.corrections?.[n]||'未入力'))+'</div>'}).join('');
  }
  return '';
}
const REVIEW_POINTS={"grammar-gerund-enjoy":"enjoy の後ろに動詞を置くときは -ing 形にします。","grammar-whether-if-future":"「〜かどうか」は whether / if。未来のことには will を使います。","grammar-past-participle-modifier":"名詞を後ろから受け身の意味で説明するときは過去分詞を使います。","grammar-counterfactual-if":"現在の事実と違う仮定は If＋過去形、would＋動詞の原形。If I were ... が基本です。","grammar-modal-passive":"助動詞＋be＋過去分詞で、助動詞を含む受け身を作ります。","grammar-passive":"受け身は be動詞＋過去分詞です。時制と主語に合わせて be動詞を選びます。","word-order-past-perfect":"過去のある時点より前の出来事は had＋過去分詞で表します。","word-order-relative-preposition":"関係節を名詞の後ろに置きます。look for の for など、動詞に必要な前置詞も残します。","word-order-future-progressive":"未来のある時点で進行中の動作は will be＋-ing形です。","word-order-interested-in":"be interested in＋名詞／-ing形で「〜に興味がある」を表します。","word-order-participle-modifier":"過去分詞を使うまとまりを名詞の後ろに置き、受け身の意味で説明します。","word-order-duration":"期間の長さは for、開始時点は since で表します。","grammar-error-correction-group":"誤りのある文の選択と、訂正した文の両方を確認します。時制・語順・前置詞・動詞の形に注意してください。","reading-paraphrase-give-up":"give up は「あきらめる・やめる」。何をやめたのかは前後の文から判断します。","reading-remember-gerund":"remember＋-ing形は「以前したことを覚えている」という意味です。","reading-relative-pronoun-person":"人を説明する主格の関係代名詞は who が基本です。","reading-grammar-see-object-ing":"see＋人＋-ing形は「人が動作しているところを見る」です。"};
function reviewReason(q){if(typeof q.explanation==='string'&&q.explanation)return q.explanation;return REVIEW_POINTS[q.targetId]||(q.context||q.passageId?'「問題・本文を見る」で、解答に対応する本文の表現と設問の条件を確認してください。':'正答と設問の条件を照らし合わせて確認してください。詳しい解説は未整備です。')}
function openResult(index,focus){resultIndex=Number(index);resultFilter=focus?'all':'wrong';resultFocus=focus||'';goto('result');if(resultFocus)document.getElementById('review-'+resultFocus)?.scrollIntoView({block:'start'});else window.scrollTo(0,0);}
function setResultFilter(value){resultFilter=value;resultFocus='';render()}
function openWeakResult(key){const w=S.weak[key];if(!w)return;for(let i=S.attempts.length-1;i>=0;i--){if(Object.prototype.hasOwnProperty.call(S.attempts[i].results||{},w.questionId)){openResult(i,w.questionId);return}}alert('この問題の答案履歴が残っていません。');}
function reviewCard(a,q){
  const r=a.responses?.[q.id],status=resultStatus(a,q),labels={correct:'○ 正解',wrong:'× 不正解',empty:'― 未回答',unknown:'要確認'},w=S.weak[q.examId+':'+q.id],exact=pool({targetId:q.targetId}),canPractice=E.familyCount(exact)>=5;
  const feedback=a.readingFeedback?.[q.id],passages=(a.reviewPassages||DATA.passages).filter(p=>q.passageId&&(p.id===q.passageId||p.passageId===q.passageId));
  return '<article class="card answer-review" id="review-'+h(q.id)+'"><div class="row space"><h3>'+h(qLabel(q))+'</h3><span class="review-status">'+labels[status]+'</span></div><p>'+sourceText(q.japanese||'')+'</p><p>'+sourceText(q.prompt||q.instruction||'')+'</p><div class="review-answer-grid"><div><b>あなたの答え</b><pre>'+h(a.responses?reviewResponse(q,r):'この履歴には答案が保存されていません。')+'</pre></div><div><b>正答・解答例（非公式）</b><pre>'+h(reviewExpected(q))+'</pre></div></div>'+(a.responses&&a.reviewQuestions?reviewParts(q,r):'')+'<p>'+h(reviewReason(q))+'</p>'+(feedback?window.ENGLISH_WRITING_FEEDBACK.aiFeedbackMarkup(feedback.feedback,feedback.answer):'')+'<details><summary>問題・本文を見る</summary>'+renderProblemFlow([q],passages)+'</details>'+(w&&status!=='correct'?'<div class="actions">'+(canPractice?'<button onclick="__RIKKYO_APP__.startWeak(\''+h(q.examId+':'+q.id)+'\')">このポイントを練習</button>':'<p class="muted">同じ論点の類題セットは整備中です。まず上の元問題と正答を確認してください。</p>')+'</div>':'')+'</article>';
}
function resultView(){
  const a=S.attempts[resultIndex];if(!a)return '<section class="card">答案履歴が見つかりません。</section>';
  const qs=resultQuestions(a),counts={correct:0,wrong:0,empty:0,unknown:0};qs.forEach(q=>counts[resultStatus(a,q)]++);
  const rows=qs.filter(q=>resultFocus?q.id===resultFocus:resultFilter==='all'||resultFilter==='wrong'&&['wrong','empty','unknown'].includes(resultStatus(a,q)));
  return '<section class="card"><h2>'+h(a.examId)+' 解答結果</h2><p>'+h(a.gradedAt?new Date(a.gradedAt).toLocaleString():'日時不明')+'</p><p>○ 正解 '+counts.correct+'　× 不正解 '+counts.wrong+'　未回答 '+counts.empty+'　要確認 '+counts.unknown+'</p>'+(!a.reviewQuestions?'<p class="muted">過去の答案です。問題・解答例は現在のデータで表示し、当時の判定を保持しています。</p>':'')+'<div class="review-filters"><button aria-pressed="'+(resultFilter==='wrong')+'" onclick="__RIKKYO_APP__.setResultFilter(\'wrong\')">間違い・未回答</button><button aria-pressed="'+(resultFilter==='all')+'" onclick="__RIKKYO_APP__.setResultFilter(\'all\')">全問</button><button onclick="__RIKKYO_APP__.openHistory()">解答履歴へ</button></div></section>'+(rows.map(q=>reviewCard(a,q)).join('')||'<section class="card">この表示に該当する問題はありません。「全問」で答案を確認できます。</section>');
}
function review(){
  return '<section class="card"><h2>間違い対策</h2><p>元の答案を確認してから、同じポイントを練習します。</p><button onclick="__RIKKYO_APP__.openHistory()">解答履歴を見る</button></section><section class="card"><h3>弱点一覧</h3>'+(weakEntries().sort(weakSort).map(([key,w])=>'<div class="card"><b>'+h(w.examId)+' · '+h(w.label)+'</b><p>'+h(P.skillName(w.skill))+' ／ '+(w.status==='mastered'?'克服済み':w.status==='pending'?'翌日の確認待ち':'復習中')+'</p><button onclick="__RIKKYO_APP__.openWeakResult(\''+h(key)+'\')">元問題・解答を見る</button> '+(w.status!=='mastered'&&E.familyCount(pool(w))>=5?'<button onclick="__RIKKYO_APP__.startWeak(\''+h(key)+'\')">このポイントを練習</button>':'')+'</div>').join('')||'<p>まだ弱点はありません。</p>')+'</section>';
}

function pool(w){return DATA.practice.filter(q=>!q.retired&&q.targetId===w.targetId)}
function lastUse(id){let n=-1;S.drillLog.forEach(function(x,i){if(x.q===id)n=i});return n}
function rank(w,items,confirm){
  const ranked=E.rankPracticeQuestions(items,{weak:w,lastId:w.lastDrillId,confirm:!!confirm,lastUse:lastUse});
  // The school adapter chooses scaffolding depth; shared scheduling stays unchanged.
  if(w.skill==='word_order'&&!confirm){const level=w.streak?2:1;ranked.sort((a,b)=>Math.abs(a.level-level)-Math.abs(b.level-level))}
  return ranked;
}
function reserve(w,p){const confirmationPool=w.skill==='word_order'?p.filter(q=>q.level===3):p;w.reservedConfirm=E.reserveConfirmationIds({currentReserved:w.reservedConfirm,pool:confirmationPool,rankChoices:function(x){return rank(w,x,true)},limit:2})}
function startWeak(key){
  const w=S.weak[key];if(!w)return;if(drill&&drill.key!==key&&!drill.answered)return alert('別のドリルが途中です。');
  const p=pool(w);reserve(w,p);const d=E.practiceSessionStartDecision({weak:w,key:key,currentDrill:drill,familyTotal:E.familyCount(p),today:today(),minFamilies:5});if(d.kind==='too-early')return alert('定着確認は '+d.date+' 以降です。');if(d.kind==='insufficient-families')return openWeakResult(key);
  drill=E.createPracticeSessionState({key:key,weak:w,mode:w.status==='pending'?'confirm':'train'});nextPractice();view='drill';save();render()
}
function nextPractice(){const w=S.weak[drill.key],p=pool(w);reserve(w,p);const r=E.selectNextPracticeQuestion({pool:p,reservedIds:w.reservedConfirm,usedIds:drill.used,mode:drill.mode,streak:w.streak,rankChoices:function(items,c){return rank(w,items,c)}});if(!r.question){drill.error='出題できません';return}E.applyPracticeQuestionState(drill,w,r.question,{usedIds:r.usedIds,choiceOrder:[]});drill.response=null;drill.feedback=null;save()}
function setPractice(v){if(!drill||drill.answered)return;drill.response=v;save()}
function practiceOrderOptions(q){return {allowMissing:!!q.missingWord}}
function practiceResponse(q,r){return q.type==='word_order'&&r&&typeof r==='object'?ANSWER_WIDGETS.reorderSentence(r,q.tokens,practiceOrderOptions(q)):String(r??'')}
function practiceComplete(q,r){
  if(q.type!=='word_order'||!r||typeof r!=='object')return !!String(r??'').trim();
  const s=ANSWER_WIDGETS.reorderState(r,q.tokens,practiceOrderOptions(q));
  return s.order.length===q.tokens.length+(q.missingWord?1:0)&&(!q.missingWord||!!s.missing.trim());
}
function changePracticeOrder(action){
  if(!drill||drill.answered||drill.q.type!=='word_order')return;
  const q=drill.q,result=ANSWER_WIDGETS.reorderChange(drill.response,q.tokens,action,practiceOrderOptions(q));
  if(!result.changed)return;
  drill.response=result.state;save();
  ANSWER_WIDGETS.refreshReorder(document.getElementById('practice-order'),result.state,q.tokens,{...practiceOrderOptions(q),emptyText:'語句をタップして並べてください'});
  const submit=document.getElementById('practice-submit');if(submit)submit.disabled=!practiceComplete(q,result.state);
}
function practiceCorrect(q,r){if(q.type==='choice')return r===q.answer;if(q.type==='word_order')return practiceComplete(q,r)&&(q.accepted||[q.answer]).map(norm).includes(norm(practiceResponse(q,r)));return (q.accepted||[q.answerText]).map(norm).includes(norm(r))}
function practiceInput(q){
  if(q.type==='choice')return ANSWER_WIDGETS.choices({options:q.options.map(o=>({value:o.id,labelHtml:'<span class=choice-text><b>'+h(o.id)+'</b> '+h(o.text)+'</span>'})),selected:[drill.response],variant:'inputs',className:'choice-grid',name:'practice',onAction:()=>"__RIKKYO_APP__.setPractice(this.value)"});
  if(q.type==='word_order')return '<div id="practice-order">'+ANSWER_WIDGETS.reorder({tokens:q.tokens,state:drill.response,...practiceOrderOptions(q),boxId:'practice-order-answer',emptyText:'語句をタップして並べてください',handlers:{add:i=>"__RIKKYO_APP__.changePracticeOrder({type:'add',index:"+i+"})",missing:"__RIKKYO_APP__.changePracticeOrder({type:'missing',value:this.value})",addMissing:"__RIKKYO_APP__.changePracticeOrder({type:'addMissing'})",undo:"__RIKKYO_APP__.changePracticeOrder({type:'undo'})",clear:"__RIKKYO_APP__.changePracticeOrder({type:'clear'})"}})+'</div>';
  return ANSWER_WIDGETS.textInput({value:drill.response,placeholder:'解答を入力',onInput:'__RIKKYO_APP__.setPractice(this.value)'});
}
function finishPractice(){if(!drill||drill.answered)return;const q=drill.q,w=S.weak[drill.key];if(!practiceComplete(q,drill.response))return alert(q.type==='word_order'?'語句をすべて並べ、不足語がある場合は追加してください。':'解答を入力してください。');let ok=practiceCorrect(q,drill.response),gradingMode='registered_answer';if(!ok&&q.skill==='reading_short_answer'){gradingMode='self_review';ok=confirm('短答の自己確認（学校公式の採点ではありません）\n\n登録例と一致しませんでした。文で答えたり別の表現を使ったりしても、内容が合えば正答になります。\n\n解答例：'+q.answerText+'\n根拠：'+q.explanation+'\nあなたの答え：'+drill.response+'\n\n本文の根拠と設問の条件を満たしていますか？')}drill.answered=true;const t=E.advanceRemediationMastery(w,drill,ok,{today:today(),nextDay:plusDays(1),nowIso:now(),trainTarget:3,confirmTarget:2});if(t.needsConfirmationReserve)reserve(w,pool(w));drill.feedback={ok:ok,answer:q.type==='choice'?q.answer:q.answer||q.answerText,explanation:q.explanation+(gradingMode==='self_review'?'（今回の判定は自己確認です。）':'')};S.drillLog.push({answerText:practiceResponse(q,drill.response),expectedText:String(q.answerText??q.answer??''),sourceQuestionId:w.questionId||w.targetId,key:drill.key,skill:w.skill,targetId:w.targetId,q:q.id,contentVersion:q.contentVersion,gradingMode:gradingMode,ok:ok,at:now(),mode:drill.mode});bumpDaily();save();if(typeof window.dispatchEvent==='function')window.dispatchEvent(new Event('learning-answer-saved'));render()}
function continuePractice(){const w=S.weak[drill.key];if(w.status==='mastered'||(w.status==='pending'&&drill.mode==='train')){drill=null;save();return goto('home')}nextPractice();render()}
function resumeDrill(){view='drill';render()}
function drillView(){
  if(!drill){const rows=activeWeak().filter(eligible).sort(weakSort);return '<section class="card hero"><h2>克服ドリル</h2></section><section class="card">'+(rows.map(function(x){return weakMarkup(x[0],x[1])}).join('')||'<p class="muted">今日取り組める弱点はありません。</p>')+'</section>'}
  const w=S.weak[drill.key],q=drill.q,target=drill.mode==='confirm'?2:3,streak=drill.mode==='confirm'?(w.confirmStreak||0):(w.streak||0);
  const content='<div class="row space drill-head"><div><div class=drill-mode>'+(drill.mode==='confirm'?'翌日の定着チェック':'類題反復')+'</div><h2>'+h(P.skillName(w.skill))+' 克服ドリル</h2></div><span class=streak-label>'+streak+'/'+target+' 連続正解</span></div>'+U.progressBar(streak,target)+'<p class=drill-origin>元の弱点：'+h(w.examId)+' · '+h(w.label)+'</p>'+(q.context?'<div class="practice-context">'+h(q.context)+'</div>':'')+(q.type==='word_order'?'<p class=practice-stage>'+h(q.missingWord?'本番形式 · 不足語1語':'基礎 · 語順を確認')+'</p>':'')+(q.japanese?'<div class=jp>'+h(q.japanese)+'</div>':'')+'<h3 class=drill-prompt>'+h(q.prompt)+'</h3>'+(!drill.answered?practiceInput(q)+'<button id="practice-submit" class="primary" '+(q.type==='word_order'&&!practiceComplete(q,drill.response)?'disabled ':'')+'onclick="__RIKKYO_APP__.finishPractice()">答えを確認</button>':'<div class="feedback '+(drill.feedback.ok?'good':'bad')+'"><b>'+(drill.feedback.ok?'✓ 正解':'✕ もう一度')+'</b><p>答え：'+h(drill.feedback.answer)+'</p><p>'+h(drill.feedback.explanation)+'</p></div><button class="primary" onclick="__RIKKYO_APP__.continuePractice()">次へ</button>');
  return U.drillCard({contentHtml:content});
}
function stats(){
  const m=weakEntries().filter(function(x){return x[1].status==='mastered'}).length;
  return '<section class="card hero"><h2>進捗</h2><p>公式得点ではなく学習履歴です。</p></section><section class="grid three">'+U.metricCard(S.attempts.length,'過去問')+U.metricCard(weakEntries().length,'弱点')+U.metricCard(m,'克服済み')+'</section>';
}
function guide(){
  const backup=U.backupPanel({description:'立教英語専用JSONです。復元前の状態は端末内に3世代まで退避します。',exportOnclick:'__RIKKYO_APP__.exportData()',importOnchange:'__RIKKYO_APP__.importData(this)'});
  return '<section class="card hero"><h2>使い方</h2><p>過去問→弱点→類題→翌日確認の順です。</p></section><section class="card warnbox"><b>非公式解答</b><p>学校公式解答・配点は未確認です。点数換算はしません。</p></section><section class="card badbox"><b>FY26B holdout</b><p>最終判定前は学習に使用しません。</p></section>'+'<section class="card"><h2>英作文の練習</h2><p>FY25A/B・FY26Aの自由英作文を、非公式の学習用AI添削で見直します。</p><button onclick="__RIKKYO_APP__.openWriting(\'FY26A\')">FY26Aの英作文</button></section>'+finalWritingGate()+backup;
}
function finalWritingGate(){if(writingUnlocked())return '<section class="card"><p>FY26Bの最終試験完了記録があります。</p><button onclick="__RIKKYO_APP__.openWriting(\'FY26B\')">試験後の自由英作文を添削する</button></section>';if(!C.exam.route.filter(id=>id!=='FY26B').every(completed))return '<section class="card"><p>FY26Bは最終試験完了後に添削できます。先に他の年度の学習を完了してください。</p></section>';return '<section class="card"><h2>最終試験後の添削</h2><p>FY26Bを印刷した原本で解き終えた場合にだけ、完了を記録してください。この記録は入試得点・正誤判定には反映しません。</p><label><input id="finalPaperComplete" type="checkbox">原本でFY26Bの最終試験を最後まで解き終えました</label><button onclick="__RIKKYO_APP__.recordFinalPaperExam()">紙での最終試験完了を記録</button></section>'}
let writingExamId=null;
let writingHoldoutTask=null;
const writingPending=new Set();
function writingUnlocked(){return completed('FY26B')||S.finalPaperExam?.examId==='FY26B'&&S.finalPaperExam?.completed===true}
function writingDraft(id=writingExamId){if(id==='FY26A')return window.RIKKYO_WRITING_PRACTICE.normalize(S.writingPractice);return window.RIKKYO_WRITING_PRACTICE.normalize(S.writingDrafts?.[id])}
function storeWriting(x){if(writingExamId==='FY26A')S.writingPractice=x;else{S.writingDrafts=S.writingDrafts||{};S.writingDrafts[writingExamId]=x}save()}
async function openWriting(id){if(![...Object.keys(window.RIKKYO_WRITING_TASKS),'FY26B'].includes(id))return;if(id==='FY26B'&&!writingUnlocked())return;writingExamId=id;if(id==='FY26B'&&!writingHoldoutTask){const r=await fetch('data/writing-holdout-task.json',{cache:'no-store'});if(!r.ok)return;writingHoldoutTask=await r.json()}goto('writingTask')}
function writingTask(){const t=writingExamId==='FY26B'?(writingUnlocked()?writingHoldoutTask:null):window.RIKKYO_WRITING_TASKS[writingExamId];return t?{...t,finalExamCompleted:writingExamId==='FY26B'?writingUnlocked():undefined}:null}
function writingView(){if(!writingExamId)return window.RIKKYO_WRITING_HUB.catalog(writingDraft,h);const t=writingTask();if(!t)return '<section class="card">最終試験完了後に添削できます。</section>';if(window.RIKKYO_WRITING_HUB.get(writingExamId))return window.RIKKYO_WRITING_HUB.render(writingDraft(),t.prompt,h,t,writingPending.has(writingExamId));return '<button onclick="__RIKKYO_APP__.goto(\'writing\')">← 英作文の一覧</button>'+window.RIKKYO_WRITING_PRACTICE.render(writingDraft(),t.prompt,h,t,writingPending.has(writingExamId))}
function saveWritingText(text){const x=writingDraft();x.text=text.slice(0,10000);x.checks={};x.updatedAt=now();try{storeWriting(x)}catch(e){document.getElementById('writingStatus').textContent='端末への保存に失敗しました。画面を閉じずにバックアップを書き出してください。';}document.getElementById('writingCount').textContent=window.RIKKYO_WRITING_PRACTICE.count(x.text);document.querySelectorAll('#app fieldset input[type=checkbox]').forEach(input=>input.checked=false);updateWritingFeedback()}
function saveWritingCheck(key,checked){if(!window.RIKKYO_WRITING_PRACTICE.checks.some(x=>x[0]===key))return;const x=writingDraft();x.checks[key]=checked;x.updatedAt=now();storeWriting(x)}
function updateWritingFeedback(){const panel=document.getElementById('writingFeedback');if(panel)panel.innerHTML=window.RIKKYO_WRITING_PRACTICE.feedback(writingDraft(),h,writingTask());}
async function gradeWriting(){
 const task=writingTask(),id=writingExamId,originalState=S,x=writingDraft(),answer=x.text.trim();if(!task||writingPending.has(id))return;
 const status=document.getElementById('writingStatus');if(!/[A-Za-z]/.test(answer)){status.textContent='英文を入力してください。';return}if(answer.length>1200){status.textContent='AI添削は1200文字以内です。答案は保存されています。';return}
 const submittedAt=now();writingPending.add(id);document.getElementById('writingGrade').disabled=true;status.textContent='答案を確認しています…';
 try{
  const data=await window.ENGLISH_WRITING_FEEDBACK.requestWritingFeedback(task,answer,C.aiWriting.endpoint);if(S!==originalState)return;
  const current=id==='FY26A'?S.writingPractice:S.writingDrafts?.[id];if(!current)return;
  current.history=Array.isArray(current.history)?current.history:[];
  current.history.push({id:crypto.randomUUID(),exerciseKey:id,mode:'full_story',answer,feedback:clone(data),submittedAt,generatedAt:data.generatedAt||now(),guide:window.RIKKYO_WRITING_HUB.snapshot(id)});
  let stored=true;try{save()}catch(e){stored=false;}
  if(view==='writingTask'&&writingExamId===id){updateWritingFeedback();document.getElementById('writingStatus').textContent=!stored?'添削を取得しましたが、端末への保存に失敗しました。画面を閉じずにバックアップを書き出してください。':current.text.trim()===answer?'添削を保存しました。修正して再提出できます。':'答案が変更されています。もう一度提出してください。';}
 }catch(e){if(view==='writingTask'&&writingExamId===id)document.getElementById('writingStatus').textContent=e.message+' 答案は入力欄に残っています。';}
 finally{writingPending.delete(id);if(view==='writingTask'&&writingExamId===id)document.getElementById('writingGrade').disabled=false;}
}

function recordFinalPaperExam(){if(!C.exam.route.filter(id=>id!=='FY26B').every(completed))return;if(!document.getElementById('finalPaperComplete')?.checked)return;S.finalPaperExam={examId:'FY26B',completed:true,completedAt:now(),mode:'paper',learnerAttested:true};save();render()}

function exportData(){const p={format:'rikkyo-uk-english-backup',version:1,appId:'rikkyo-uk-english',exportedAt:now(),state:clone(S)},b=new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='rikkyo-uk-english-'+today()+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(u)},1000)}
function recoveryKeys(){const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf(IMPORT_RECOVERY_PREFIX+'.')===0)keys.push(k)}return keys.sort()}
function saveImportRecovery(){const suffix=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2)),key=IMPORT_RECOVERY_PREFIX+'.'+Date.now()+'.'+suffix;localStorage.setItem(key,JSON.stringify(S));const keys=recoveryKeys();while(keys.length>3)localStorage.removeItem(keys.shift());return key}
function validateBackup(payload){if(!payload||payload.format!=='rikkyo-uk-english-backup'||payload.appId!=='rikkyo-uk-english'||payload.version!==1||!payload.state||typeof payload.state!=='object')throw new Error('立教英語の有効なバックアップではありません。');return payload}
function importPayload(payload,mode){
  validateBackup(payload);saveImportRecovery();const incoming=normalizeState(payload.state);
  if(mode==='replace')S=incoming;
  else {const localWriting=S.writingPractice,localDrafts=S.writingDrafts,localFinal=S.finalPaperExam;S=normalizeState(E.mergeImportedLearningState(S,incoming,{schemaVersion:SCHEMA,todayValue:today(),nowIso:now}));S.writingPractice=window.RIKKYO_WRITING_PRACTICE.merge(localWriting,incoming.writingPractice);S.writingDrafts={};for(const id of new Set([...Object.keys(incoming.writingDrafts||{}),...Object.keys(localDrafts||{})]))S.writingDrafts[id]=window.RIKKYO_WRITING_PRACTICE.merge(localDrafts?.[id],incoming.writingDrafts?.[id]);S.finalPaperExam=localFinal||incoming.finalPaperExam;}
  drill=S.currentDrill;selectedExamId=C.exam.examIds.includes(S.selectedExamId)?S.selectedExamId:C.exam.defaultExamId;refreshUnfinishedPractice();save();render();return clone(S)
}
async function importData(input){
  const file=input&&input.files&&input.files[0];if(!file)return;
  try{const payload=JSON.parse(await file.text()),mode=(document.getElementById('importMode')||{}).value||'merge';if(!confirm(mode==='replace'?'現在の立教英語データをバックアップで置換しますか？':'現在の立教英語データへバックアップを統合しますか？'))return;importPayload(payload,mode);alert('バックアップを復元しました。')}
  catch(e){alert('復元できませんでした: '+e.message)}
  finally{input.value=''}
}
function applyDay(){const cur=today(),d=E.decideDayRollover({renderedDate:renderedDate,currentDate:cur,isDrillView:view==='drill',hasDrill:!!drill,drillAnswered:!!(drill&&drill.answered)});if(d.kind==='same'||d.kind==='defer')return false;E.applyDailyRolloverState(S,cur);renderedDate=cur;save();return true}
window.addEventListener('focus',function(){if(applyDay())render()});

function render(){examSession.stop();if(!DATA)return;const f={home:home,route:route,exam:exam,review:review,drill:drillView,result:resultView,stats:stats,guide:guide,writing:writingView,writingTask:writingView}[view];app.innerHTML=f();examSession.start(view);window.__RIKKYO_APP_READY__=true}
window.__RIKKYO_APP__={openHistory,setExamTab,openResult,setResultFilter,openWeakResult,gradeReading,openWriting,gradeWriting,recordFinalPaperExam,saveWritingText:saveWritingText,saveWritingCheck:saveWritingCheck,goto:goto,selectExam:selectExam,openExam:openExam,beginAttemptFromGate:beginAttemptFromGate,beginAttempt:beginAttempt,setWordOrderMissing:setWordOrderMissing,addWordOrderToken:addWordOrderToken,addWordOrderMissing:addWordOrderMissing,undoWordOrder:undoWordOrder,clearWordOrder:clearWordOrder,toggleAnswerSheet:toggleAnswerSheet,toggleAnswerSize:toggleAnswerSize,toggleExamInfo:toggleExamInfo,jumpAnswerMajor:jumpAnswerMajor,jumpToProblem:jumpToProblem,setResponse:setResponse,setSlot:setSlot,setErrorLabel:setErrorLabel,toggleMulti:toggleMulti,toggleGroup:toggleGroup,setCorrection:setCorrection,submitAttempt:submitAttempt,startWeak:startWeak,resumeDrill:resumeDrill,setPractice:setPractice,changePracticeOrder:changePracticeOrder,finishPractice:finishPractice,continuePractice:continuePractice,exportData:exportData,importData:importData,importPayload:importPayload,getState:function(){return clone(S)},recoveryKeys:recoveryKeys,resetForTest:function(){localStorage.removeItem(KEY);recoveryKeys().forEach(function(k){localStorage.removeItem(k)});S=fresh();drill=null;selectedExamId=C.exam.defaultExamId;save();render()},data:function(){return DATA}};
loadData().then(function(){render()}).catch(function(e){console.error(e);app.innerHTML='<section class="card badbox"><h2>読み込みエラー</h2><p>'+h(e.message)+'</p></section>'});
})();


