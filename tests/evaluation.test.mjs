import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateReport, needsRevision, runReviewCycle, selectBestVersion, rubric} from '../src/evaluation/engine.ts';

const max = Object.fromEntries(Object.entries(rubric).map(([key,[weight]])=>[key,weight]));
const blank = Object.fromEntries(['missedEvidence','unsupportedClaims','weakReasoning','missingConnections','technicalErrors','overlookedOpportunities','downgradeOrRemove','requiredRevisions','followUpResearch'].map(k=>[k,[]]));
const input = {analystModel:'A',evaluatorModel:'B',dossier:[{id:'S1',fact:'Toy vendor ships an offline SDK.'}],methodology:{rule:'Establish workload ownership.'},references:[],report:{decision:'Pass on hosted infrastructure.'}};
const output = (dimensions=max,criticalFailures=[],findings=blank)=> JSON.stringify({dimensions,criticalFailures,findings});
const review = (raw,extra={})=>evaluateReport({...input,invoke:async()=>raw,...extra});

test('reviewer receives original evidence, references and exact displayed object; score recomputed',async()=>{
  const result=await review('',{invoke:async(model,system,user)=>{
    assert.equal(model,'B'); assert.match(system,/critical failures/i);
    for (const key of ['dossier','methodology','references','report']) assert.deepEqual(JSON.parse(user)[key],input[key]);
    return JSON.stringify({...JSON.parse(output()),score:-100,passed:false});
  }});
  assert.equal(result.score,100); assert.equal(result.passed,true);
});
test('quality threshold, critical errors and unresolved integrity issues govern validity',async()=>{
  const dims={...max,strategy:5};
  assert.equal((await review(output(dims))).passed,true);
  assert.equal((await review(output(dims),{threshold:86})).passed,false);
  for(const x of [await review(output(max,['Invented stakeholder'])),await review(output(),{validationIssues:['Nonexistent S99']})]) {
    assert.equal(x.score,100); assert.equal(x.passed,false); assert.equal(needsRevision(x,0),true);
  }
});
test('invalid, absent or non-independent evaluation is unavailable, never passed',async()=>{
  const outputs=['oops',output({...max,strategy:21}),output({...max,evidence:'10'}),output(max,[],{}),output(max,[''])];
  for(const raw of outputs) assert.equal((await review(raw)).status,'unavailable');
  const same=await review(output(),{evaluatorModel:' a ',invoke:async()=>{assert.fail('same model invoked')}});
  assert.equal(same.score,null); assert.equal(same.passed,false);
  const outage=await review('',{invoke:async()=>{throw Error('private body')}});
  assert.equal(needsRevision(outage,0),false); assert.doesNotMatch(JSON.stringify(outage),/private body/);
});
test('two revisions consume supplied feedback and retain highest clean version even if final score is higher',async()=>{
  let calls=0; const findings={...blank,requiredRevisions:['Identify who owns the hosted workload using S1.']};
  const versions=[output({...max,strategy:0},[],findings),output({...max,strategy:4},[],findings),output(max,['Invented architecture'])];
  const run=await runReviewCycle('initial',async()=>review(versions[calls++]),async(report,feedback)=>{
    assert.match(feedback,/owns the hosted workload/); return report+' revised';
  });
  assert.equal(calls,3); assert.deepEqual(run.versions.map(v=>v.evaluation.score),[80,84,100]);
  assert.equal(run.selected,run.versions[1]); assert.equal(run.selected.evaluation.passed,false);
});
test('one valid revision passes and stops; zero revisions and ties preserve first candidate',async()=>{
  let count=0; const run=await runReviewCycle('v1',async()=>review(output(count++===0?{...max,strategy:0}:max)),async()=>'v2');
  assert.equal(count,2); assert.equal(run.selected.report,'v2');
  const only=await runReviewCycle('v1',async()=>review(output({...max,strategy:0})),async()=>assert.fail(),0);
  assert.equal(only.versions.length,1);
  assert.equal(selectBestVersion([run.selected,{...run.selected,report:'tie'}]),run.selected);
});
test('a failed evaluator preserves known integrity defects and cannot promote a damaged draft',async()=>{
  const clean={report:'usable',evaluation:await review(output({...max,strategy:0}))};
  const broken={report:'broken',evaluation:await review('invalid',{validationIssues:['Unknown source S99']})};
  assert.equal(broken.evaluation.status,'unavailable');
  assert.deepEqual(broken.evaluation.criticalFailures,['Unknown source S99']);
  assert.equal(selectBestVersion([broken,clean]),clean);
});
