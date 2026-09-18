(function(root){
'use strict';
// NON-DEPLOYABLE TEMPLATE. Do not copy Waseda A/B/C strategy into Rikkyo by default.
root.ENGLISH_SCHOOL_POLICY=Object.freeze({
  resolveQuestionPriority(question){return question?.priority||'UNCLASSIFIED'},
  isPriorityInGoal(){throw new Error('Rikkyo goal policy is not configured yet')},
  priorityOrder(priority){return ({A:0,B:1,C:2,UNCLASSIFIED:3})[priority]??4},
  routeRole(year){return `FY${String(year).slice(-2)}`},
  goalLabel(goal){return goal==null?'目標未設定':`${goal}点`},
  goalAdvice(){return 'Rikkyo scoring/goal policy audit pending'},
  skillName(skill){return String(skill||'')}
});
})(typeof globalThis!=='undefined'?globalThis:this);
