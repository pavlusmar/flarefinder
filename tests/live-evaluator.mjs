// Optional paid endpoint experiment. Run only against the supplied public fixtures.
// node tests/live-evaluator.mjs --live > /tmp/evaluation-results.json
import { readFileSync } from 'node:fs';
import { evaluateReport, DEFAULT_EVALUATOR } from '../src/evaluation/engine.ts';
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!process.argv.includes('--live') || !account || !token) {
  console.error('Live run requires --live, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI permission).');
  process.exit(2);
}
if (!/^[a-f\d]{32}$/i.test(account)) throw Error('Invalid Cloudflare account ID format.');
const load=name=>JSON.parse(readFileSync(new URL('fixtures/'+name,import.meta.url)));
const flawed=load('flawed-reports.json');
const fixtures=load('held-out-dossiers.json');
const evaluator=process.env.EVALUATOR_MODEL || DEFAULT_EVALUATOR;
const methodology=JSON.parse(readFileSync(new URL('../research-framework/methodology.json',import.meta.url)));
const results=[];
for (const item of flawed) {
  const dossier=fixtures.find(x=>x.company===item.company);
  let usage=null; const started=Date.now();
  const evaluation=await evaluateReport({
    analystModel:'offline-authored-flawed-fixture',evaluatorModel:evaluator,
    dossier,methodology,references:[],report:item.report,
    invoke:async(model,system,user)=>{
      const url='https://api.cloudflare.com/client/v4/accounts/'+account+'/ai/v1/chat/completions';
      const response=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
        body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content:user}],
          max_completion_tokens:4000,reasoning_effort:'low',response_format:{type:'json_object'}}),
        signal:AbortSignal.timeout(90000)});
      if (!response.ok) throw Error('Evaluator request failed with HTTP '+response.status);
      const payload=await response.json();
      usage=payload.usage??null;
      return payload.choices?.[0]?.message?.content;
    }
  });
  results.push({company:item.company,runtimeMs:Date.now()-started,usage,evaluation,
    expectedCritical:item.expectedCritical,expectedFeedback:item.expectedFeedback});
  if(evaluation.status==='unavailable') break;
}
console.log(JSON.stringify(results,null,2));
if (results.length!==flawed.length || results.some(r=>r.evaluation.status!=='evaluated' || r.evaluation.criticalFailures.length===0)) process.exitCode=1;
