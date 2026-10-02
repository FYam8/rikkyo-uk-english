(function(root){
 'use strict';
 const iso=v=>typeof v==='string'&&Date.parse(v)>0?new Date(v).toISOString():null;
 const time=row=>[row?.gradedAt,row?.startedAt,row?.at,row?.completedAt].map(iso).filter(Boolean).sort().at(-1)||null;
 const fields=id=>({examId:id,year:'20'+id.slice(2,4),session:id.at(-1)});
 const config=()=>root.ENGLISH_SCHOOL_CONFIG.exam;
 const attempts=s=>(s?.attempts||[]).filter(x=>config().examIds.includes(x.examId));
 const reference=a=>Number.isSafeInteger(a?.correctCount)&&Number.isSafeInteger(a?.totalTasks)&&a.totalTasks>0&&a.correctCount>=0&&a.correctCount<=a.totalTasks?{correct:a.correctCount,total:a.totalTasks,referenceAccuracy:a.correctCount/a.totalTasks*100}:{};
 function records(s){
  if(!s)return[];const now=new Date().toISOString(),a=attempts(s),drills=s.drillLog||[],weak=Object.values(s.weak||{}).filter(Boolean),active=s.currentAttempt&&config().examIds.includes(s.currentAttempt.examId)?s.currentAttempt:null;
  const last=[...a,...drills,active].map(time).filter(Boolean).sort().at(-1);
  const out=[{sourceRecordId:'state:summary',eventType:'progress_state',occurredAt:now,payload:{progressVersion:2,total:a.length+drills.length+(active?1:0),kind:'stage-1',completed:false,weaknessCount:weak.filter(x=>x.status!=='mastered').length,masteredCount:weak.filter(x=>x.status==='mastered').length,practiceCount:drills.length,retentionPending:weak.filter(x=>x.status==='pending').length,...(last?{lastLearningAt:last}:{})}}];
  for(const id of config().examIds){const done=a.some(x=>x.examId===id&&x.status==='graded'),started=a.some(x=>x.examId===id)||active?.examId===id,holdout=config().holdoutTrainingExcluded&&config().holdoutExamId===id;out.push({sourceRecordId:'state:exam:'+id,eventType:'exam_state',occurredAt:now,payload:{progressVersion:2,...fields(id),examStatus:done?'done':started?'started':holdout?'holdout':'notstarted',completed:done}});}
  const latest=a.filter(x=>x.status==='graded').sort((a,b)=>String(time(b)||'').localeCompare(String(time(a)||'')))[0],r=reference(latest),at=time(latest);
  out.push({sourceRecordId:'state:latest-exam',eventType:r.total?'exam_completed':'exam_state',occurredAt:at||(latest?'1970-01-01T00:00:00.000Z':now),payload:r.total?{progressVersion:2,...fields(latest.examId),...r,completed:true,...(at?{lastLearningAt:at}:{clockUnknown:true})}:{completed:false}});return out;
 }
 function occurrences(s){if(!s)return[];const out=attempts(s).map((a,i)=>({sourceRecordId:'history:exam:'+String(a.id||a.examId+':'+(a.startedAt||i)),eventType:a.status==='graded'?'exam_completed':'exam_interrupted',occurredAt:time(a)||'1970-01-01T00:00:00.000Z',payload:{progressVersion:2,...fields(a.examId),...(a.status==='graded'?reference(a):{}),completed:a.status==='graded',...(time(a)?{lastLearningAt:time(a)}:{clockUnknown:true})}}));for(const [i,d]of (s.drillLog||[]).entries()){const id=String(d.key||'').split(':')[0];out.push({sourceRecordId:'history:drill:'+String(d.at||'unknown')+':'+String(d.q||i),eventType:'drill_answered',occurredAt:time(d)||'1970-01-01T00:00:00.000Z',payload:{kind:'remediation-drill',correct:d.ok===true?1:0,total:1,completed:true,...(config().examIds.includes(id)?{progressVersion:2,...fields(id)}:{}),...(time(d)?{lastLearningAt:time(d)}:{clockUnknown:true})}});}return out;}
 function baseline(s){const a=attempts(s),years={};for(const x of a){const y=fields(x.examId).year;years[y]=(years[y]||0)+1;}return{baseline:true,eventCount:a.length+(s?.drillLog||[]).length,eventsByYear:years,capturedAt:new Date().toISOString(),progressLabel:'英語の過去問と弱点補強'};}
 root.RIKKYO_ENGLISH_PROGRESS_PROJECTION=Object.freeze({buildStateRecords:records,buildOccurrenceRecords:occurrences,buildBaseline:baseline});
})(typeof window!=='undefined'?window:globalThis);
