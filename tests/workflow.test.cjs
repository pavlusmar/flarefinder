// Exercise the Worker entry points and exact migration SQL without a live account.
const {test, before} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {buildSync} = require('esbuild');
const Module = require('node:module');
const root=path.resolve(__dirname,'..');
let worker;
before(()=>{
  const output=buildSync({entryPoints:[path.join(root,'src/index.ts')],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text;
  const m=new Module();
  m._compile(output,'workflow.cjs');
  worker=m.exports.default;
});
function mockD1(sqlite) {
  class Statement {
    constructor(sql,args=[]){this.sql=sql;this.args=args;}
    bind(...args){return new Statement(this.sql,args);}
    run(){return {meta:{changes:sqlite.prepare(this.sql).run(...this.args).changes}};}
    first(){return sqlite.prepare(this.sql).get(...this.args)||null;}
    all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  }
  return {prepare:sql=>new Statement(sql),batch(stmts){
    sqlite.exec('BEGIN');
    try {const result=stmts.map(s=>s.run());sqlite.exec('COMMIT');return result;}
    catch(error){sqlite.exec('ROLLBACK');throw error;}
  }};
}
const evidence=[
  {url:'https://example.test/product',title:'Subscription product',snippet:'Fixture offers a recurring subscription product.'},
  {url:'https://example.test/developer',title:'Developer documentation',snippet:'Fixture provides a documented customer API.'},
  {url:'https://investor.test/portfolio',title:'Investor thesis',snippet:'Fixture provides software to enterprise buyers.'}
];
function draft(n){return {digital_native:'yes',digital_native_reason:'Software [S1]',summary:'Draft '+n+' [S1]',
  customer_perspective:{mission:'',priorities:[{id:'P1',priority:'Serve subscribers',initiative:'customer API',basis:'inferred',evidence:'(S1, S2)',why_it_matters:'Recurring subscriptions [S1]'}]},
  technical_signals:['Customer API (S2)'],growth_signals:[],questions:['What changed?'],ai_signals:[],hiring_signals:[],
  recommended_stakeholders:[],cloudflare_opportunities:[],confidence:'medium'};}
function grade(strategy, gap=[]) {return {
  dimensions:{strategy,execution:15,economics:10,commercial:10,evidence:9,timing:8,limitations:4,discovery:4},
  criticalFailures:[],findings:{missedEvidence:[],unsupportedClaims:[],weakReasoning:[],missingConnections:[],technicalErrors:[],
    overlookedOpportunities:[],downgradeOrRemove:[],requiredRevisions:['Establish the customer-owned workload.'],followUpResearch:gap}};}
function setup(reviews,extra={}){
  const db=new DatabaseSync(':memory:'),messages=[],seen=[],analyses=[],stages=[];
  db.exec('PRAGMA foreign_keys=ON');
  for(const file of fs.readdirSync(path.join(root,'migrations')).sort()){
    if(file.startsWith('0004')){
      db.prepare('INSERT INTO companies(id,name,website,description) VALUES(?,?,?,?)').run('fixture','Fixture','https://example.test','Subscription developer platform');
      db.prepare("INSERT INTO research(company_id,status,researched_at,sources,summary) VALUES('fixture','complete','2025-05-01',?,'Prior report')").run(JSON.stringify(evidence));
    }
    db.exec(fs.readFileSync(path.join(root,'migrations',file),'utf8'));
  }
  const env={DB:mockD1(db),ADMIN_TOKEN:'test',SEARCH_API_KEY:'fake',RESEARCH_QUEUE:{send:async body=>messages.push(body)},
    AI:{run:async(model,input)=>{
      if(model.includes('clef')) return {answers:{digital_native:{value:'yes'}}};
      if(model.includes('qwen')){
        seen.push(JSON.parse(input.messages[1].content));
        const result=reviews.shift();return {response:result==='broken'?'bad json':JSON.stringify(result),usage:{prompt_tokens:30,completion_tokens:20}};
      }
      if(model.includes('8b-instruct'))return {response:JSON.stringify({queries:['partnerships']})};
      const system=input.messages[0].content;
      const payload=JSON.parse(input.messages[1].content);
      if(system.includes("Act as a business and strategy analyst.")){
        assert.equal(payload.capabilities,undefined);
        return {response:JSON.stringify({business_model:[{finding:"Subscriptions",source_ids:["S1"]}],execution_gaps:[],active_initiatives:[{initiative:"Customer API",source_ids:["S2"]}],unknowns:[]})};
      }
      if(system.includes("Decompose every material initiative")){
        assert.ok(payload.prior_ledgers["Business and execution"]);
        return {response:JSON.stringify({workloads:[{initiative:"Customer API",source_ids:["S2"]}],opportunity_candidates:[],rejected_candidates:[],unknowns:[]})};
      }
      if(system.includes("Act as a skeptical commercial strategist.")){
        assert.ok(payload.prior_ledgers["Workload and commercial fit"]);
        return {response:JSON.stringify({prioritized_opportunities:[],rejected_or_deferred:[{product:"CDN",reason:"No cacheable workload established",source_ids:["S2"]}],discovery_plan:[],corrections:[]})};
      }
      analyses.push(payload);
      return {choices:[{message:{content:JSON.stringify(draft(analyses.length))}}],usage:{prompt_tokens:50,completion_tokens:25}};
    }},...extra};
  const api=async(url,method='GET',body,auth=true)=>worker.fetch(new Request('https://worker.test/api/'+url,{
    method,headers:auth?{Authorization:'Bearer test'}:{},...(body?{body:JSON.stringify(body)}:{})}),env,{});
  const deliver=async(body,attempts=1)=>{
    let ack=false,retry=false;
    await worker.queue({messages:[{body,attempts,ack(){ack=true;},retry(){retry=true;}}]},env);
    assert.equal(retry,false,'Unexpected queue retry for '+JSON.stringify(body));assert.equal(ack,true);
  };
  const finish=async()=>{
    while(messages.length){
      assert.ok(stages.length<30,'Bound stage count');
      const msg=messages.shift();stages.push(db.prepare('SELECT stage FROM research').get().stage);
      await deliver(msg);
      // At-least-once delivery must not rerun an advanced or published stage.
      await deliver(msg);
    }
    return (await api('companies/fixture')).json();
  };
  return {db,messages,seen,analyses,stages,env,api,deliver,finish};
}
test('saved evidence is immutable across revisions and different analyst models; best version wins',async()=>{
  const x=setup([grade(15),grade(18),grade(13)],{QUALITY_THRESHOLD:'90',ANALYST_MODELS:'@cf/openai/gpt-oss-20b'});
  assert.equal((await x.api('research/fixture/reanalyze','POST',{},false)).status,401);
  assert.equal((await x.api('research/fixture/versions','GET',undefined,false)).status,401);
  assert.equal((await x.api('research/fixture/reanalyze','POST',{analyst_model:'unconfigured'})).status,400);
  assert.equal((await x.api('research/fixture/reanalyze','POST',{analyst_model:'@cf/openai/gpt-oss-20b'})).status,202);
  assert.equal((await (await x.api('research/fixture/reanalyze','POST')).json()).status,'already_queued');
  const row=await x.finish();
  assert.deepEqual(x.stages,['Load saved evidence','Reference retrieval','Strategic analysis','Independent evaluation','Revision','Independent evaluation','Revision','Independent evaluation','Report selection']);
  assert.equal(row.researched_at,'2025-05-01');
  assert.ok(row.analyzed_at);assert.equal(row.summary,'Draft 2 [S1]');
  assert.equal(row.quality.analyst_model,'@cf/openai/gpt-oss-20b');assert.equal(row.quality.selected_version,2);
  assert.equal(row.quality.status,'warning');assert.equal(row.quality.score,78);
  assert.deepEqual(x.seen.map(s=>s.dossier),[x.seen[0].dossier,x.seen[0].dossier,x.seen[0].dossier]);
  assert.equal(x.seen[0].report.technical_signals[0],'Customer API [S2]');
  assert.equal(x.seen[0].report.customer_perspective.priorities[0].evidence,'[S1] [S2]');
  assert.ok(x.seen[0].references.length);
  assert.match(x.analyses[1].feedback,/customer-owned workload/);
  const hist=(await (await x.api('research/fixture/versions')).json()).runs[0];
  assert.equal(hist.usage.search_calls,0);assert.equal(hist.usage.extract_calls,0);assert.equal(hist.versions.length,3);
  assert.deepEqual(hist.versions[1].report,x.seen[1].report);
  assert.equal(row.quality.warnings.length,1);
  assert.deepEqual(row.cloudflare_opportunities,x.seen[1].report.cloudflare_opportunities);
  assert.equal(x.db.prepare('SELECT summary FROM research_before_analysis_v4').get().summary,'Prior report');
  assert.equal(row.config,undefined);assert.equal(row.dossier,undefined);
});
test('saved-evidence ablation and evaluator outage publish an explicitly unevaluated version',async()=>{
  const x=setup(['broken']);
  await x.api('research/fixture/reanalyze','POST',{use_references:false});
  const row=await x.finish();
  assert.equal(row.status,'complete');assert.equal(row.quality.status,'unevaluated');assert.equal(row.quality.score,null);
  assert.equal(row.quality.revision_count,0);assert.deepEqual(x.seen[0].references,[]);
  assert.equal(row.quality.warnings.length,1);
});
test('fresh run can supplement evidence once and regrade competing versions on the identical dossier',async(t)=>{
  const x=setup([grade(9,['Verify new source material about the customer API.']),grade(12,['Check again.']),grade(20)],{QUALITY_THRESHOLD:'80'});
  let searches=0;
  t.mock.method(global,'fetch',async(url,init)=>{
    const input=JSON.parse(init.body);
    if(url.endsWith('/extract')) return Response.json({results:[]});
    searches++;
    if(input.search_depth==='basic') return Response.json({results:[{url:'https://example.test/additional',title:'Fixture launch',content:'Fixture launched an API.',raw_content:'A dated additional description of the API.'}]});
    return Response.json({results:evidence.map(s=>({...s,title:'Fixture '+s.title,content:'Fixture. '+s.snippet.repeat(3)}))});
  });
  await x.api('research/fixture','POST');
  const row=await x.finish();
  assert.equal(row.quality.status,'passed');
  assert.equal(row.quality.revision_count,1);assert.equal(x.stages.filter(s=>s==='Additional evidence').length,1);
  assert.equal(x.seen[1].dossier.sources.length,x.seen[0].dossier.sources.length+1);
  assert.deepEqual(x.seen[1].dossier,x.seen[2].dossier);
  const hist=(await (await x.api('research/fixture/versions')).json()).runs[0];
  assert.equal(searches,hist.usage.search_calls+hist.usage.follow_up_calls);
  assert.ok(hist.versions[0].usage.initial_evaluation);
  assert.equal(hist.usage.follow_up_calls,1);
});

test('v5 reasoning skills are checkpointed before synthesis, with immutable evidence and zero search calls',async()=>{
  const x=setup([grade(20)],{REASONING_PIPELINE:'v5',REVISION_LIMIT:'0'});
  assert.equal((await x.api('research/fixture/reanalyze','POST')).status,202);
  const row=await x.finish();
  assert.equal(row.status,'complete');
  assert.deepEqual(x.stages,['Load saved evidence','Reference retrieval','Business and execution','Workload and commercial fit','Commercial challenge','Strategic analysis','Independent evaluation','Report selection']);
  assert.deepEqual(Object.keys(x.analyses[0].reasoning_ledgers),['Business and execution','Workload and commercial fit','Commercial challenge']);
  const hist=(await (await x.api('research/fixture/versions')).json()).runs[0];
  assert.equal(hist.usage.search_calls,0);
  assert.equal(hist.usage.extract_calls,0);
  assert.equal(Object.keys(hist.usage.reasoning_usage).length,3);
  assert.deepEqual(x.analyses[0].dossier,x.seen[0].dossier);
  assert.equal(hist.usage.reasoning_ledgers["Commercial challenge"].rejected_or_deferred[0].product,"CDN");
});

test('V6 saved replay retains the published brief and checkpoints the failed evaluation',async()=>{
  const x=setup(['broken'],{REASONING_PIPELINE:'v6',REVISION_LIMIT:'0'});
  await x.api('research/fixture/reanalyze','POST');
  const row=await x.finish();
  assert.equal(row.summary,'Prior report');
  assert.equal(row.status,'complete');
  const run=(await (await x.api('research/fixture/versions')).json()).runs[0];
  assert.equal(run.stage,'Failed');
  assert.equal(run.quality.score,null);
  assert.equal(run.versions.length,1);
  assert.equal(run.usage.search_calls,0);
  assert.deepEqual(Object.keys(x.analyses[0].references[0]).sort(),['methodology','name','why']);
});
