(function(root){
'use strict';

// Shared English engine helpers extracted under consumer parity guards.
function localDate(d=new Date()){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function plusDays(n,base=new Date()){
  const d=new Date(base.getTime());d.setDate(d.getDate()+Number(n));return localDate(d);
}
function normalizeDrillState(value){
  if(!value||typeof value!=='object')return null;
  const q=value.q||null,
    expected=q?.options?q.options.map((_,i)=>i):[],
    candidate=Array.isArray(value.choiceOrder)?value.choiceOrder:[],
    choiceOrder=candidate.length===expected.length&&new Set(candidate).size===expected.length&&candidate.every(i=>expected.includes(i))?candidate:expected,
    order=Array.isArray(value.order)?value.order:[];
  let orderIndices=Array.isArray(value.orderIndices)?value.orderIndices.filter(i=>Number.isInteger(i)):[];
  if(!orderIndices.length&&order.length&&Array.isArray(value.shuffled)){
    const used=new Set();
    orderIndices=order.map(token=>{
      const index=value.shuffled.findIndex((x,i)=>x===token&&!used.has(i));
      if(index>=0)used.add(index);
      return index;
    }).filter(i=>i>=0);
  }
  return {...value,
    used:Array.isArray(value.used)?value.used:[],
    selectedMany:Array.isArray(value.selectedMany)?value.selectedMany:[],
    order,orderIndices,
    textInputs:Array.isArray(value.textInputs)?value.textInputs:[],
    selfParts:Array.isArray(value.selfParts)?value.selfParts:[],
    selfChecks:Array.isArray(value.selfChecks)?value.selfChecks:[],
    choiceOrder,
    textDraft:value.textDraft||'',
    selfText:value.selfText||''
  };
}
function wordCount(s){return String(s||'').trim()?String(s).trim().split(/\s+/).length:0}
function familyCount(items){return new Set((items||[]).map(x=>x.familyId)).size}
function ensureFamilyIds(items){
  if(!Array.isArray(items))return items;
  items.forEach((q,i)=>{if(!q.familyId)q.familyId=String(q.id||`${q.skill||'skill'}:${q.targetId||'target'}:${i}`)});
  return items;
}
function migrateLearningState(state,{goalTiers,defaultGoal,resolveWeakMeta,validDrillIdsForTarget}={}){
  if(!state||typeof state!=='object')throw new TypeError('state must be an object');
  const tiers=Array.isArray(goalTiers)?goalTiers.map(Number).filter(Number.isFinite):[];
  const fallbackGoal=Number(defaultGoal);
  if(!tiers.length||!Number.isFinite(fallbackGoal)||!tiers.includes(fallbackGoal))throw new TypeError('valid goalTiers/defaultGoal are required');
  if(typeof resolveWeakMeta!=='function')throw new TypeError('resolveWeakMeta must be a function');
  if(typeof validDrillIdsForTarget!=='function')throw new TypeError('validDrillIdsForTarget must be a function');
  state.goal=tiers.includes(Number(state.goal))?Number(state.goal):fallbackGoal;
  state.currentDrill=state.currentDrill&&typeof state.currentDrill==='object'?state.currentDrill:null;
  for(const w of Object.values(state.weak||{})){
    const meta=resolveWeakMeta(w);
    if(meta&&typeof meta==='object')Object.assign(w,meta);
    const ids=validDrillIdsForTarget(w.targetId);
    const valid=new Set(Array.isArray(ids)?ids:ids?Array.from(ids):[]);
    w.reservedConfirm=[...new Set(Array.isArray(w.reservedConfirm)?w.reservedConfirm:[])].filter(id=>valid.has(id)).slice(0,2);
  }
  return state;
}
function advanceRemediationMastery(weak,drill,correct,{today,nextDay,nowIso,trainTarget=3,confirmTarget=2}={}){
  if(!weak||typeof weak!=='object')throw new TypeError('weak must be an object');
  if(!drill||typeof drill!=='object')throw new TypeError('drill must be an object');
  const result={needsConfirmationReserve:false,completedTraining:false,mastered:false};
  if(drill.mode==='train'){
    if(correct)weak.streak=(weak.streak||0)+1;else weak.streak=0;
    if(weak.streak>=trainTarget){
      weak.status='pending';weak.next=nextDay;weak.confirmStreak=0;result.completedTraining=true;
    }
  }else{
    if(correct)weak.confirmStreak=(weak.confirmStreak||0)+1;
    else{
      weak.confirmStreak=0;weak.status='active';weak.streak=0;weak.next=today;weak.reservedConfirm=[];
      drill.mode='train';drill.used=[];drill.failedConfirmation=true;result.needsConfirmationReserve=true;
    }
    if(weak.confirmStreak>=confirmTarget){
      weak.status='mastered';weak.masteredAt=nowIso;weak.last='correct';result.mastered=true;
    }
  }
  return result;
}

function isRemediationEligible(weak,todayValue){
  if(!weak||typeof weak!=='object')return false;
  return weak.status==='active'||(weak.status==='pending'&&(!weak.next||weak.next<=todayValue));
}
function compareRemediationEntries(a,b,priorityOrder){
  if(typeof priorityOrder!=='function')throw new TypeError('priorityOrder must be a function');
  const aw=a?.[1]||{},bw=b?.[1]||{};
  const aDue=aw.status==='pending'?0:1,bDue=bw.status==='pending'?0:1;
  if(aDue!==bDue)return aDue-bDue;
  const priority=Number(priorityOrder(aw))-Number(priorityOrder(bw));
  if(priority)return priority;
  const next=String(aw.next||'').localeCompare(String(bw.next||''));
  if(next)return next;
  const assigned=String(aw.lastAssignedDate||'').localeCompare(String(bw.lastAssignedDate||''));
  if(assigned)return assigned;
  return String(a?.[0]||'').localeCompare(String(b?.[0]||''));
}
function remediationDailyProgressCount(state,todayValue){
  return state?.dailyProgress?.date===todayValue?Math.max(0,Number(state.dailyProgress.answeredCount)||0):0;
}
function remediationDailyAnsweredCount(state,plan,todayValue){
  return Math.max(remediationDailyProgressCount(state,todayValue),plan?.date===todayValue?Number(plan.answeredCount)||0:0);
}
function remediationDailyTargetRemaining(answered,target){
  return Math.max(0,Number(target)-Number(answered));
}
function remediationDailyTargetReached(answered,target){
  return Number(answered)>=Number(target);
}

function buildRemediationDailyPlan({entries,goal,today,answeredCount,routeYear,nowIso,isInGoal,isEligible,compareEntries}={}){
  if(!Array.isArray(entries))throw new TypeError('entries must be an array');
  if(typeof isInGoal!=='function')throw new TypeError('isInGoal must be a function');
  if(typeof isEligible!=='function')throw new TypeError('isEligible must be a function');
  if(typeof compareEntries!=='function')throw new TypeError('compareEntries must be a function');
  const all=entries.filter(([,w])=>isInGoal(w));
  const candidates=all.filter(entry=>isEligible(entry)).sort(compareEntries);
  if(candidates.length){
    const assignedKeys=candidates.map(([key])=>key);
    return {plan:{date:today,goal,kind:'weak',weakKeys:[...assignedKeys],answeredCount:Number(answeredCount)||0,createdAt:nowIso},assignedKeys};
  }
  if(all.length)return {plan:{date:today,goal,kind:'waiting',weakKeys:[],createdAt:nowIso},assignedKeys:[]};
  if(routeYear)return {plan:{date:today,goal,kind:'route',weakKeys:[],routeYear,createdAt:nowIso},assignedKeys:[]};
  return {plan:{date:today,goal,kind:'complete',weakKeys:[],createdAt:nowIso},assignedKeys:[]};
}

function selectDailyLearningActionDescriptors({entries,currentAttempt,routeYear,isInGoal,isEligible,compareEntries}={}){
  if(!Array.isArray(entries))throw new TypeError('entries must be an array');
  if(typeof isInGoal!=='function')throw new TypeError('isInGoal must be a function');
  if(typeof isEligible!=='function')throw new TypeError('isEligible must be a function');
  if(typeof compareEntries!=='function')throw new TypeError('compareEntries must be a function');
  const rows=entries.filter(entry=>isInGoal(entry[1])&&isEligible(entry)).sort(compareEntries);
  const due=rows.filter(([,w])=>w.status==='pending');
  const progressed=rows.filter(([,w])=>w.status==='active'&&(w.streak||0)>0);
  const other=rows.filter(([,w])=>w.status==='active'&&!(w.streak||0));
  const actions=[];
  if(due[0])actions.push({kind:'weak',stage:'confirm',key:due[0][0]});
  if(progressed[0])actions.push({kind:'weak',stage:'continue',key:progressed[0][0]});
  if(currentAttempt?.status==='active')actions.push({kind:'attempt',year:currentAttempt.year});
  if(other[0])actions.push({kind:'weak',stage:'new',key:other[0][0]});
  if(routeYear&&!actions.some(x=>x.kind==='attempt'&&x.year===routeYear))actions.push({kind:'route',year:routeYear});
  const outside=entries.filter(isEligible).filter(([,w])=>!isInGoal(w)).sort(compareEntries)[0];
  if(outside)actions.push({kind:'upgrade',key:outside[0],priority:outside[1].priority});
  return actions;
}

function selectPracticePool(bank,weak,{minFamilies=5}={}){
  if(!Array.isArray(bank))throw new TypeError('bank must be an array');
  if(!weak||typeof weak!=='object')throw new TypeError('weak must be an object');
  const active=bank.filter(x=>x&&!x.retired);
  const exact=active.filter(x=>x.targetId===weak.targetId);
  if(familyCount(exact)>=Number(minFamilies||5))return exact;
  const broad=active.filter(x=>x.skill===weak.skill);
  return broad.length?broad:exact;
}
function reserveConfirmationIds({currentReserved,pool,rankChoices,limit=2}={}){
  if(!Array.isArray(pool))throw new TypeError('pool must be an array');
  if(typeof rankChoices!=='function')throw new TypeError('rankChoices must be a function');
  const max=Math.max(0,Number(limit)||0),byId=new Map(pool.map(x=>[x.id,x])),reserved=[];
  for(const id of [...new Set(Array.isArray(currentReserved)?currentReserved:[])]){
    const q=byId.get(id);
    if(q&&!reserved.some(x=>byId.get(x)?.familyId===q.familyId))reserved.push(id);
    if(reserved.length===max)break;
  }
  if(reserved.length<max){
    const families=new Set(reserved.map(id=>byId.get(id)?.familyId));
    const eligible=pool.filter(x=>!reserved.includes(x.id)&&!families.has(x.familyId));
    const choices=[...(rankChoices(eligible)||[])];
    while(reserved.length<max&&choices.length){
      const q=choices.shift();
      if(!q||families.has(q.familyId))continue;
      families.add(q.familyId);reserved.push(q.id);
    }
  }
  return reserved;
}
function selectNextPracticeQuestion({pool,reservedIds,usedIds,mode,streak,rankChoices}={}){
  if(!Array.isArray(pool))throw new TypeError('pool must be an array');
  if(typeof rankChoices!=='function')throw new TypeError('rankChoices must be a function');
  const reserved=Array.isArray(reservedIds)?reservedIds:[],initialUsed=Array.isArray(usedIds)?usedIds:[];
  const reservedFamilies=new Set(pool.filter(x=>reserved.includes(x.id)).map(x=>x.familyId));
  let nextUsed=[...initialUsed];
  let candidates=mode==='confirm'
    ?pool.filter(x=>reserved.includes(x.id)&&!nextUsed.includes(x.id))
    :pool.filter(x=>!reservedFamilies.has(x.familyId)&&!nextUsed.includes(x.id));
  let resetUsed=false;
  if(!candidates.length){
    resetUsed=true;nextUsed=[];
    candidates=mode==='confirm'?pool.filter(x=>reserved.includes(x.id)):pool.filter(x=>!reserved.includes(x.id));
  }
  if(mode==='train'){
    const max=(Number(streak)||0)>=2?3:2;
    const leveled=candidates.filter(x=>Number(x.level)<=max);
    if(leveled.length)candidates=leveled;
  }
  candidates=[...(rankChoices(candidates,mode==='confirm')||[])];
  const question=candidates[0]||null;
  if(question)nextUsed.push(question.id);
  return {question,usedIds:nextUsed,resetUsed};
}

function rankPracticeQuestions(items,{weak,lastId,confirm=false,lastUse}={}){
  if(!Array.isArray(items))throw new TypeError('items must be an array');
  if(!weak||typeof weak!=='object')throw new TypeError('weak must be an object');
  if(typeof lastUse!=='function')throw new TypeError('lastUse must be a function');
  return [...items].sort((a,b)=>{
    const rank=q=>(q.focusTag===weak.focusTag?-30:0)+(confirm&&q.level===3?-20:0)+(q.examFormat===weak.examFormat?-6:0);
    return rank(a)-rank(b)||(a.id===lastId?1:b.id===lastId?-1:0)||Number(lastUse(a.id))-Number(lastUse(b.id))||String(a.id).localeCompare(String(b.id));
  });
}
function practiceSessionStartDecision({weak,key,currentDrill,familyTotal,today,minFamilies=5}={}){
  if(!weak||typeof weak!=='object')return {kind:'missing'};
  if(currentDrill?.key===key&&currentDrill.q&&!currentDrill.q.retired)return {kind:'resume'};
  if(currentDrill?.key&&currentDrill.key!==key)return {kind:'blocked-other'};
  if(Number(familyTotal)<Number(minFamilies))return {kind:'insufficient-families',familyTotal:Number(familyTotal)||0,minFamilies:Number(minFamilies)};
  if(weak.status==='pending'&&weak.next>today)return {kind:'too-early',date:weak.next};
  return {kind:'start',mode:weak.status==='pending'?'confirm':'train'};
}

function createPracticeSessionState({key,weak,mode}={}){
  if(!weak||typeof weak!=='object')throw new TypeError('weak must be an object');
  return {
    key,skill:weak.skill,targetId:weak.targetId,focusTag:weak.focusTag,mode,
    used:[],q:null,error:null,answered:false,selected:null,selectedMany:[],
    order:[],orderIndices:[],textInputs:[],selfText:'',selfParts:[],selfChecks:[]
  };
}
function applyPracticeQuestionState(drill,weak,question,{usedIds,choiceOrder}={}){
  if(!drill||typeof drill!=='object')throw new TypeError('drill must be an object');
  if(!weak||typeof weak!=='object')throw new TypeError('weak must be an object');
  if(!question||typeof question!=='object')throw new TypeError('question must be an object');
  drill.error=null;drill.q=question;drill.used=Array.isArray(usedIds)?[...usedIds]:[...(drill.used||[]),question.id];
  weak.lastDrillId=question.id;
  weak.seenDrills=[...new Set([...(weak.seenDrills||[]),question.id])];
  drill.answered=false;drill.selected=null;drill.selectedMany=[];drill.order=[];drill.orderIndices=[];drill.textInputs=[];
  drill.selfText='';drill.selfParts=[];drill.selfChecks=[];drill.selfcheck=false;drill.aiFeedback=null;drill.aiFeedbackStale=false;
  drill.choiceOrder=Array.isArray(choiceOrder)?[...choiceOrder]:[];
  return drill;
}

function isExamAttemptComparable(attempt){
  return !!(attempt?.exposure==='first'&&attempt?.mode==='timed'&&!attempt?.interrupted&&!attempt?.overtime);
}
function interruptExamAttempt(attempt){
  if(!attempt||typeof attempt!=='object')return attempt;
  attempt.interrupted=true;attempt.mode='untimed';return attempt;
}
function scoreObjectiveQuestion(question,answer,{normalize,matchAnswer}={}){
  if(!question||typeof question!=='object')throw new TypeError('question must be an object');
  if(typeof normalize!=='function')throw new TypeError('normalize must be a function');
  if(question.type==='multi'){
    const chosen=new Set(normalize(answer).split(',').filter(Boolean));
    const correct=normalize(question.answer).split(',').filter(Boolean);
    const unit=Number(question.points)/correct.length;
    return correct.reduce((sum,x)=>sum+(chosen.has(x)?unit:0),0);
  }
  if(typeof matchAnswer!=='function')throw new TypeError('matchAnswer must be a function');
  return matchAnswer(question,answer)?Number(question.points):0;
}
function buildWrongWeaknessState(oldState={},{
  year,id,label,category,component='main',skill,targetId,focusTag,examFormat,trap,priority,points,user,today,manualComponents=[]
}={}){
  const old=oldState&&typeof oldState==='object'?oldState:{};
  return {
    ...old,year:Number(year),id,label,category,component,skill,targetId,focusTag,examFormat,trap,priority,points,user,
    last:'wrong',status:'active',streak:0,confirmStreak:0,next:today,wrongCount:(old.wrongCount||0)+1,
    reservedConfirm:[],seenDrills:old.seenDrills||[],
    manualComponents:manualComponents.length?[...new Set(manualComponents)]:old.manualComponents||[]
  };
}
function markWeaknessesActuallyCorrect(rows,{year,id,user}={}){
  const values=Array.isArray(rows)?rows:Array.from(rows||[]);
  for(const weak of values.filter(w=>w&&w.year===Number(year)&&w.id===id)){
    weak.user=user;weak.last='correct';weak.actualCorrect=(weak.actualCorrect||0)+1;
  }
  return values;
}

function decideDayRollover({renderedDate,currentDate,isDrillView=false,hasDrill=false,drillAnswered=false}={}){
  if(renderedDate===currentDate)return {kind:'same',notice:false};
  if(isDrillView&&hasDrill&&!drillAnswered)return {kind:'defer',notice:false};
  return {kind:'apply',notice:!!(isDrillView&&hasDrill)};
}
function applyDailyRolloverState(state,currentDate){
  if(!state||typeof state!=='object')throw new TypeError('state must be an object');
  if(state.dailyPlan?.date!==currentDate)state.dailyPlan=null;
  if(state.dailyProgress?.date!==currentDate)state.dailyProgress=null;
  return state;
}

function mergeImportedWeakState(a={},b={}){
  if(a.status==='mastered'&&b.status!=='mastered')return a;
  if(b.status==='mastered'&&a.status!=='mastered')return b;
  const ap=(a.confirmStreak||0)*10+(a.streak||0),bp=(b.confirmStreak||0)*10+(b.streak||0);
  return bp>=ap?{...a,...b}:{...b,...a};
}
function mergeImportedAnswerMaps(current={},incoming={}){
  const out={...incoming};
  Object.entries(current).forEach(([key,value])=>{if(String(value??'').trim()||!String(out[key]??'').trim())out[key]=value});
  return out;
}
function mergeImportedManualMaps(current={},incoming={}){
  const out={...incoming};
  Object.entries(current).forEach(([key,value])=>{
    const other=out[key]||{},currentHas=value?.score!==''&&value?.score!==undefined,incomingHas=other?.score!==''&&other?.score!==undefined;
    out[key]={...(currentHas||!incomingHas?other:value),...(currentHas||!incomingHas?value:other),components:[...new Set([...(other.components||[]),...(value?.components||[])])]};
  });
  return out;
}
function mergeImportedExposure(a={},b={}){
  const rank={first:0,unknown:1,partial:2,done:3},out={...a};
  Object.entries(b).forEach(([year,value])=>{if(out[year]===undefined||rank[value]>=rank[out[year]])out[year]=value});
  return out;
}
function dedupeImportedRows(rows,keyFn){
  if(!Array.isArray(rows))throw new TypeError('rows must be an array');
  if(typeof keyFn!=='function')throw new TypeError('keyFn must be a function');
  const map=new Map();rows.forEach(row=>map.set(keyFn(row),row));return [...map.values()];
}
function mergeImportedDailyProgress(a,b,todayValue){
  if(a?.date===todayValue||b?.date===todayValue)return {date:todayValue,answeredCount:Math.max(a?.date===todayValue?Number(a.answeredCount)||0:0,b?.date===todayValue?Number(b.answeredCount)||0:0)};
  return a||b||null;
}

function mergeImportedLearningState(current,incoming,{schemaVersion,todayValue,nowIso}={}){
  const stamp=typeof nowIso==='function'?nowIso:()=>String(nowIso||new Date().toISOString());
  const attemptMap=new Map([...(incoming?.attempts||[]),...(current?.attempts||[])].map(x=>[x.id,x]));
  const weak={...(current?.weak||{})};
  Object.entries(incoming?.weak||{}).forEach(([key,value])=>weak[key]=mergeImportedWeakState(weak[key],value));
  let currentAttempt=current?.currentAttempt||null;
  let recoveredDrills=[...(current?.recoveredDrills||[]),...(incoming?.recoveredDrills||[])];
  if(currentAttempt&&incoming?.currentAttempt&&currentAttempt.id!==incoming.currentAttempt.id){
    const archived={...incoming.currentAttempt,status:'interrupted',interrupted:true,endedAt:stamp(),recoveredFromImport:true};
    attemptMap.set(archived.id,archived);
  }else if(!currentAttempt)currentAttempt=incoming?.currentAttempt||null;
  let currentDrill=current?.currentDrill||null;
  if(currentDrill&&incoming?.currentDrill&&(currentDrill.key!==incoming.currentDrill.key||currentDrill.q?.id!==incoming.currentDrill.q?.id)){
    recoveredDrills.push({...incoming.currentDrill,recoveredAt:stamp()});
  }else if(!currentDrill)currentDrill=incoming?.currentDrill||null;
  return {
    ...(incoming||{}),...(current||{}),
    answers:mergeImportedAnswerMaps(current?.answers,incoming?.answers),
    manual:mergeImportedManualMaps(current?.manual,incoming?.manual),
    weak,
    cause:{...(incoming?.cause||{}),...(current?.cause||{})},
    exposure:mergeImportedExposure(incoming?.exposure,current?.exposure),
    attempts:[...attemptMap.values()],
    history:dedupeImportedRows([...(incoming?.history||[]),...(current?.history||[])],x=>x.attemptId||`${x.year}:${x.at}:${x.score}`),
    drillLog:dedupeImportedRows([...(incoming?.drillLog||[]),...(current?.drillLog||[])],x=>`${x.key}:${x.q}:${x.at}:${x.ok}`),
    currentAttempt,currentDrill,
    recoveredDrills:dedupeImportedRows(recoveredDrills,x=>`${x.key}:${x.q?.id}:${x.recoveredAt||'saved'}`),
    dailyPlan:null,
    dailyProgress:mergeImportedDailyProgress(current?.dailyProgress,incoming?.dailyProgress,todayValue),
    schemaVersion
  };
}

const api=Object.freeze({localDate,plusDays,normalizeDrillState,wordCount,familyCount,ensureFamilyIds,migrateLearningState,advanceRemediationMastery,isRemediationEligible,compareRemediationEntries,remediationDailyProgressCount,remediationDailyAnsweredCount,remediationDailyTargetRemaining,remediationDailyTargetReached,buildRemediationDailyPlan,selectDailyLearningActionDescriptors,selectPracticePool,reserveConfirmationIds,selectNextPracticeQuestion,rankPracticeQuestions,practiceSessionStartDecision,createPracticeSessionState,applyPracticeQuestionState,isExamAttemptComparable,interruptExamAttempt,scoreObjectiveQuestion,buildWrongWeaknessState,markWeaknessesActuallyCorrect,decideDayRollover,applyDailyRolloverState,mergeImportedWeakState,mergeImportedAnswerMaps,mergeImportedManualMaps,mergeImportedExposure,dedupeImportedRows,mergeImportedDailyProgress,mergeImportedLearningState});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ENGLISH_ENGINE_CORE=api;
})(typeof globalThis!=='undefined'?globalThis:this);
