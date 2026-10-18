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

 function answers(s){
  const api=root.__RIKKYO_APP__,data=api?.data?.();if(!s||!data||!root.SHARED_ANSWER_RECORD)return[];
  const {answerRecord,text}=root.SHARED_ANSWER_RECORD,questions=new Map(data.questions.map(q=>[q.id,q]));
  const out=[];
  const display=(q,r)=>{if(r===undefined)return undefined;const opts=q?.options||[];if(typeof r==='string'){const o=opts.find(o=>o.id===r);return o?r+' : '+o.text:r;}return text(r,1400);};
  const expected=q=>{if(!q)return undefined;const spec=q.answerSpec;if(spec?.choice)return (spec.acceptedChoices||[spec.choice]).map(c=>display(q,c)).join(' / ');if(spec?.slots)return spec.slots.map(x=>Array.isArray(x)?x.join(' / '):x).join(' | ');return text(q.answerText??spec??q.answer,1400);};
  for(const a of attempts(s).filter(a=>a.status==='graded'))for(const [id,ok]of Object.entries(a.results||{})){
   const q=questions.get(id),r=a.responses?.[id],feedback=a.readingFeedback?.[id]?.feedback;
   const record=answerRecord(a.id+':'+id,time(a),{questionId:id,examId:a.examId,questionLabel:q?'大問'+q.majorQuestion+' / '+q.minorQuestion:id,questionText:q?.prompt,answerText:display(q,r),expectedText:expected(q),outcome:r===undefined||r===''?'unanswered':ok?'correct':'wrong',gradingMethod:q?.scoringType==='manual_reading'?'AI採点':'登録解答による採点',mistakeReason:feedback?text(feedback,700):undefined,mode:a.mode,contentVersion:q?.contentVersion});if(record)out.push(record);
  }
  for(const [i,d]of(s.drillLog||[]).entries()){
   const q=data.practice.find(q=>q.id===d.q);const r=answerRecord(String(d.at||i)+':'+d.q,time(d),{questionId:d.q,examId:String(d.key||'').split(':')[0],sourceQuestionId:d.sourceQuestionId,questionText:q?.prompt,answerText:d.answerText,expectedText:d.expectedText??(q?text(q.answerText??q.answer,1400):undefined),outcome:d.ok?'correct':'wrong',gradingMethod:d.gradingMode==='self_review'?'自己確認':'登録解答による採点',mistakeReason:q?.explanation,mode:d.mode});if(r)out.push(r);
  }
  for(const [examId,draft]of Object.entries({...s.writingDrafts,...(s.writingPractice?{FY26A:s.writingPractice}:{})}))for(const [i,h]of(draft?.history||[]).entries()){
   const f=h.feedback||{},r=answerRecord('writing:'+examId+':'+(h.generatedAt||i),h.generatedAt,{questionId:examId+'-writing',examId,questionLabel:'自由英作文',answerText:h.answer,expectedText:f.modelAnswer??f.correctedAnswer,outcome:typeof f.learningCorrect==='boolean'?(f.learningCorrect?'correct':'wrong'):'ungraded',gradingMethod:'AI添削',mistakeReason:text(f,700),mode:'writing'});if(r)out.push(r);
  }
  return out;
 }
 root.RIKKYO_ENGLISH_PROGRESS_PROJECTION=Object.freeze({buildAnswerRecords:answers,buildStateRecords:records,buildOccurrenceRecords:occurrences,buildBaseline:baseline});
})(typeof window!=='undefined'?window:globalThis);
