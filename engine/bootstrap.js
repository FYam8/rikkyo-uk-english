(function(root){
'use strict';
const contract=root.ENGLISH_ENGINE_CONTRACT;
const config=root.ENGLISH_SCHOOL_CONFIG;
const policy=root.ENGLISH_SCHOOL_POLICY;
if(!contract)throw new Error('Shared English engine contract must load before bootstrap');
if(!config)throw new Error('English school config must load before bootstrap');
if(!policy)throw new Error('English school policy must load before bootstrap');
const configResult=contract.validateSchoolConfig(config);
const policyResult=contract.validateSchoolPolicy(policy);
const errors=[...configResult.errors,...policyResult.errors];
if(errors.length)throw new Error(`Invalid English school adapter: ${errors.join('; ')}`);
root.ENGLISH_ENGINE_ADAPTER=Object.freeze({
  contractVersion:contract.version,
  config,
  policy
});
})(typeof globalThis!=='undefined'?globalThis:this);
