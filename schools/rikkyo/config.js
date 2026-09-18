(function(root){
'use strict';
root.ENGLISH_SCHOOL_CONFIG=Object.freeze({
  contractVersion:1,
  schoolId:'rikkyo-uk',
  brand:Object.freeze({
    eyebrow:'RIKKYO UK ENGLISH',
    title:'過去問 × 弱点克服',
    documentTitle:'立教英国学院 英語｜過去問×弱点克服',
    description:'立教英国学院 英語 FY24〜FY26 A/B 過去問対策',
    footer:'FY24〜FY26 A/B。過去問由来とオリジナル練習を区別して表示する。'
  }),
  exam:Object.freeze({
    identityMode:'examId',
    years:Object.freeze([2024,2025,2026]),
    examIds:Object.freeze(['FY24A','FY24B','FY25A','FY25B','FY26A','FY26B']),
    route:Object.freeze(['FY26A','FY24A','FY24B','FY25A','FY25B','FY26B']),
    defaultExamId:'FY26A',
    defaultYear:2026,
    diagnosticExamId:'FY26A',
    holdoutExamId:'FY26B',
    holdoutTrainingExcluded:true,
    goalMode:'stage',
    goalTiers:Object.freeze([1]),
    defaultGoal:1,
    scoring:Object.freeze({enabled:false}),
    dailyTaskTarget:10,
    sourceCompletenessRequired:true
  }),
  storage:Object.freeze({
    key:'rikkyo.uk.english.v1',
    legacyKeys:Object.freeze([]),
    recoveryPrefix:'rikkyo.uk.english.pre-migration',
    importRecoveryPrefix:'rikkyo.uk.english.pre-import',
    schemaVersion:1,
    syncDb:'rikkyo-uk-english-progress-sync',
    syncDbVersion:1
  }),
  progress:Object.freeze({
    enabled:false,
    endpoint:'',
    appId:'rikkyo-english'
  }),
  aiWriting:Object.freeze({
    enabled:false,
    endpoint:'',
    skills:Object.freeze([])
  })
});
})(typeof globalThis!=='undefined'?globalThis:this);
