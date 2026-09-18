(function(root){
'use strict';
const CONTRACT_VERSION=1;
const REQUIRED_TOP_LEVEL=['contractVersion','schoolId','brand','exam','storage','progress'];
const REQUIRED_POLICY_FUNCTIONS=['resolveQuestionPriority','isPriorityInGoal','priorityOrder','routeRole','goalLabel','goalAdvice','skillName'];
function nonEmpty(value){return typeof value==='string'&&value.trim().length>0}
function positiveInteger(value){return Number.isInteger(value)&&value>0}
function finiteNumber(value){return typeof value==='number'&&Number.isFinite(value)}
function unique(values){return new Set(values).size===values.length}
function validateConfig(config){
  const errors=[];
  if(!config||typeof config!=='object'||Array.isArray(config))return{ok:false,errors:['config must be an object']};
  for(const key of REQUIRED_TOP_LEVEL)if(!(key in config))errors.push(`missing ${key}`);
  if(config.contractVersion!==CONTRACT_VERSION)errors.push(`contractVersion must be ${CONTRACT_VERSION}`);
  if(!nonEmpty(config.schoolId))errors.push('schoolId must be a non-empty string');
  else if(!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(config.schoolId))errors.push('schoolId must be a stable lowercase slug');
  if(!nonEmpty(config.brand?.title))errors.push('brand.title is required');

  const years=Array.isArray(config.exam?.years)?config.exam.years:[];
  const route=Array.isArray(config.exam?.route)?config.exam.route:[];
  const goalTiers=Array.isArray(config.exam?.goalTiers)?config.exam.goalTiers:[];
  if(!years.length)errors.push('exam.years must be a non-empty array');
  else if(!unique(years))errors.push('exam.years must not contain duplicates');
  if(!route.length)errors.push('exam.route must be a non-empty array');
  else{
    if(!unique(route))errors.push('exam.route must not contain duplicates');
    for(const year of route)if(!years.includes(year))errors.push(`exam.route contains unknown year ${String(year)}`);
  }
  if(!goalTiers.length)errors.push('exam.goalTiers must be a non-empty array');
  else{
    if(!goalTiers.every(finiteNumber))errors.push('exam.goalTiers must contain finite numbers');
    if(!unique(goalTiers))errors.push('exam.goalTiers must not contain duplicates');
  }
  if(goalTiers.length&&!goalTiers.includes(config.exam?.defaultGoal))errors.push('exam.defaultGoal must exist in exam.goalTiers');
  if(years.length&&!years.includes(config.exam?.defaultYear))errors.push('exam.defaultYear must exist in exam.years');
  if(!finiteNumber(config.exam?.writtenMaxScore)||config.exam.writtenMaxScore<=0)errors.push('exam.writtenMaxScore must be a positive number');
  if(!finiteNumber(config.exam?.listeningMaxScore)||config.exam.listeningMaxScore<0)errors.push('exam.listeningMaxScore must be a non-negative number');
  if(!finiteNumber(config.exam?.totalMaxScore)||config.exam.totalMaxScore<=0)errors.push('exam.totalMaxScore must be a positive number');
  if(finiteNumber(config.exam?.writtenMaxScore)&&finiteNumber(config.exam?.listeningMaxScore)&&finiteNumber(config.exam?.totalMaxScore)&&config.exam.totalMaxScore!==config.exam.writtenMaxScore+config.exam.listeningMaxScore)errors.push('exam.totalMaxScore must equal writtenMaxScore + listeningMaxScore');
  if(goalTiers.some(x=>finiteNumber(x)&&finiteNumber(config.exam?.totalMaxScore)&&x>config.exam.totalMaxScore))errors.push('exam.goalTiers must not exceed exam.totalMaxScore');
  if(!positiveInteger(config.exam?.dailyTaskTarget))errors.push('exam.dailyTaskTarget must be a positive integer');

  const storage=config.storage||{};
  const legacyKeys=Array.isArray(storage.legacyKeys)?storage.legacyKeys:[];
  if(!nonEmpty(storage.key))errors.push('storage.key is required');
  if(!Array.isArray(storage.legacyKeys)||!legacyKeys.every(nonEmpty))errors.push('storage.legacyKeys must be an array of non-empty strings');
  else{
    if(!unique(legacyKeys))errors.push('storage.legacyKeys must not contain duplicates');
    if(legacyKeys.includes(storage.key))errors.push('storage.key must not also appear in storage.legacyKeys');
  }
  if(!nonEmpty(storage.recoveryPrefix))errors.push('storage.recoveryPrefix is required');
  if(!nonEmpty(storage.importRecoveryPrefix))errors.push('storage.importRecoveryPrefix is required');
  if(nonEmpty(storage.recoveryPrefix)&&nonEmpty(storage.importRecoveryPrefix)&&storage.recoveryPrefix===storage.importRecoveryPrefix)errors.push('recovery prefixes must be distinct');
  if(!positiveInteger(storage.schemaVersion))errors.push('storage.schemaVersion must be a positive integer');
  if(!nonEmpty(storage.syncDb))errors.push('storage.syncDb is required');
  if(!positiveInteger(storage.syncDbVersion))errors.push('storage.syncDbVersion must be a positive integer');

  if(typeof config.progress?.enabled!=='boolean')errors.push('progress.enabled must be a boolean');
  if(config.progress?.enabled){
    if(!nonEmpty(config.progress.endpoint))errors.push('progress.endpoint is required when progress is enabled');
    else if(!/^https:\/\/[^\s]+$/.test(config.progress.endpoint))errors.push('progress.endpoint must be an https URL');
    if(!nonEmpty(config.progress.appId))errors.push('progress.appId is required when progress is enabled');
  }

  if(config.aiWriting!==undefined){
    const ai=config.aiWriting;
    if(!ai||typeof ai!=='object'||Array.isArray(ai))errors.push('aiWriting must be an object when provided');
    else{
      if(typeof ai.enabled!=='boolean')errors.push('aiWriting.enabled must be a boolean');
      const skills=Array.isArray(ai.skills)?ai.skills:[];
      if(!Array.isArray(ai.skills)||!skills.every(nonEmpty))errors.push('aiWriting.skills must be an array of non-empty strings');
      else if(!unique(skills))errors.push('aiWriting.skills must not contain duplicates');
      if(ai.enabled){
        if(!nonEmpty(ai.endpoint))errors.push('aiWriting.endpoint is required when AI writing is enabled');
        else if(!/^https:\/\/[^\s]+$/.test(ai.endpoint))errors.push('aiWriting.endpoint must be an https URL');
        if(!skills.length)errors.push('aiWriting.skills must be non-empty when AI writing is enabled');
      }
    }
  }
  return{ok:errors.length===0,errors};
}
function validatePolicy(policy){
  const errors=[];
  if(!policy||typeof policy!=='object'||Array.isArray(policy))return{ok:false,errors:['policy must be an object']};
  for(const name of REQUIRED_POLICY_FUNCTIONS)if(typeof policy[name]!=='function')errors.push(`policy.${name} must be a function`);
  return{ok:errors.length===0,errors};
}
const api=Object.freeze({version:CONTRACT_VERSION,validateSchoolConfig:validateConfig,validateSchoolPolicy:validatePolicy});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ENGLISH_ENGINE_CONTRACT=api;
})(typeof globalThis!=='undefined'?globalThis:this);
