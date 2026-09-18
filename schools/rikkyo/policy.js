(function(root){
'use strict';
const ROLE=Object.freeze({
  FY26A:'初回診断',
  FY24A:'弱点補強・実戦確認',
  FY24B:'弱点補強・実戦確認',
  FY25A:'弱点補強・実戦確認',
  FY25B:'弱点補強・実戦確認',
  FY26B:'最終判定'
});
const SKILL_NAME=Object.freeze({
  listening:'リスニング',
  listening_mc:'リスニング選択',
  listening_short_answer:'リスニング短答',
  grammar:'文法・語彙',
  guided_completion:'文法・語彙補充',
  word_order:'語順整序',
  error_correction:'誤文訂正',
  error_correction_rewrite:'誤文訂正',
  paraphrase:'言い換え',
  reading:'読解',
  long_reading:'長文読解',
  short_text_multiple_choice:'実用短文読解',
  reading_short_answer:'読解短答',
  writing:'英作文',
  picture_story_writing:'絵描写英作文',
  open_writing:'英作文'
});
root.ENGLISH_SCHOOL_POLICY=Object.freeze({
  resolveQuestionPriority(question){return question?.priority||'CORE'},
  isPriorityInGoal(){return true},
  priorityOrder(priority){return ({CORE:0,HIGH:0,NORMAL:1,LOW:2,UNCLASSIFIED:3})[priority]??3},
  routeRole(examId){return ROLE[examId]||'過去問演習'},
  goalLabel(){return '全範囲'},
  goalAdvice(){return '公式配点が確認できないため点数換算は行わず、全範囲の弱点克服と未見問題での定着確認を進めます。'},
  skillName(skill){return SKILL_NAME[skill]||String(skill||'その他')}
});
})(typeof globalThis!=='undefined'?globalThis:this);
