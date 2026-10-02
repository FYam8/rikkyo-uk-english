(function(root){
 'use strict';
 const c=root.ENGLISH_SCHOOL_CONFIG,projection=root.RIKKYO_ENGLISH_PROGRESS_PROJECTION;
 if(!c?.progress.enabled||!projection||!root.SHARED_PROGRESS_TRANSPORT)return;
 if(location.origin!=='https://fyam8.github.io'&&!Object.hasOwn(root,'__RIKKYO_UK_ENGLISH_PROGRESS_API__'))return;
 function loadState(){try{return JSON.parse(localStorage.getItem(c.storage.key)||'null')}catch{return null}}
 const transport=root.SHARED_PROGRESS_TRANSPORT.createTransport({schoolId:c.schoolId,appId:c.progress.appId,dbName:c.storage.syncDb,dbVersion:c.storage.syncDbVersion,endpoint:()=>root.__RIKKYO_UK_ENGLISH_PROGRESS_API__||c.progress.endpoint,legacyDatabases:[{name:'rikkyo-uk-kokugo-progress-sync',schoolId:c.schoolId,appIds:['rikkyo-uk-kokugo']}],loadState,...projection,occurrenceSignature:s=>JSON.stringify(projection.buildOccurrenceRecords(s))});
 async function report(){const s=await transport.status();let el=document.getElementById('cloud-migration-notice');if(s.migrationBlocked){if(!el){el=document.createElement('aside');el.id='cloud-migration-notice';el.setAttribute('role','status');el.className='card';document.body.prepend(el);}el.textContent='Cloud同期を保留しています。以前の登録の接続先、または共有先の登録との競合を確認してください。既存の登録と学習履歴は保持しており、学習は続けられます。';}else el?.remove();return s;}
 root.__RIKKYO_ENGLISH_PROGRESS__={sync:async()=>{await transport.sync();return report()},status:transport.status};transport.start();setTimeout(()=>void report().catch(()=>{}),2000);root.addEventListener('online',()=>void report().catch(()=>{}));
})(window);
