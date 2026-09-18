(function(root){
'use strict';
root.ENGLISH_SCHOOL_UI=Object.freeze({
  contractVersion:1,
  brand:Object.freeze({
    eyebrow:'RIKKYO UK ENGLISH',
    heading:'過去問 × 弱点克服'
  }),
  views:Object.freeze([
    Object.freeze({id:'home',label:'今日やること'}),
    Object.freeze({id:'route',label:'学習ルート'}),
    Object.freeze({id:'exam',label:'過去問'}),
    Object.freeze({id:'review',label:'間違い対策'}),
    Object.freeze({id:'drill',label:'克服ドリル'}),
    Object.freeze({id:'stats',label:'進捗'}),
    Object.freeze({id:'guide',label:'使い方'})
  ]),
  footer:'FY24〜FY26 A/B。過去問由来とオリジナル練習を区別し、非公式解答はその旨を明示します。',
  features:Object.freeze({
    scoreDisplay:false,
    listeningScore:false,
    aiWriting:false,
    paperViewer:true,
    backupImport:true
  })
});
})(typeof globalThis!=='undefined'?globalThis:this);
