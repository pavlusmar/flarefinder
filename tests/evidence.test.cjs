// Run with: npm install && node --test tests/evidence.test.cjs
// Pure offline regression tests. No Cloudflare API, Tavily, database or network calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8');
const compiled = ts.transpileModule(source + '\nexports.__test = { validateOpportunityEvidence, evidenceGrounded, citedSourceText, scorePursuitWithClef, recoverEvidenceBackedOpportunities, finalizeEvidenceReport, normalizeReport, searchWeb, route };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
});
const sandbox = { exports: {}, console, URL, Response, Request, Headers, TextEncoder, TextDecoder, AbortSignal };
vm.runInNewContext(compiled.outputText, sandbox, { filename: 'index.transpiled.cjs' });
const { validateOpportunityEvidence, evidenceGrounded, scorePursuitWithClef, recoverEvidenceBackedOpportunities, finalizeEvidenceReport, normalizeReport, searchWeb, route } = sandbox.exports.__test;
const sourceItem = snippet => ({ title: 'Company engineering announcement', snippet, url: 'https://example.com/company' });
const opportunity = (pillar, product_fit) => ({
  pillar, product_fit, confidence: 'medium',
  evidence: '[S1]', signal: 'Company initiative [S1]',
  hypothesis: 'Explore this documented initiative',
  implication: 'Could create a relevant technical discussion',
  limitations: 'Existing providers and architecture unknown',
  stakeholder: 'Platform engineering lead',
  discovery_question: 'What requirements are driving this initiative?',
  outreach: 'I saw your initiative [S1] and would welcome a conversation.'
});
const report = (opportunities=[], ai=[]) => ({ cloudflare_opportunities: opportunities, ai_signals: ai, questions: [], customer_perspective: { priorities: [] }, digital_native: 'yes', summary: '', growth_signals: [], technical_signals: [], hiring_signals: [] });
const ai = (theme, signal='strong') => ({ theme, signal, evidence:'[S1]', hypothesis:'Validate relevance', confidence:'high' });

test('accepts a sourced Build AI Gateway opportunity, without asserting a purchase', () => {
  const r=report([opportunity('Build','AI Gateway')]);
  validateOpportunityEvidence(r,[sourceItem('Engineering team hiring for AI gateway and model routing')]);
  assert.equal(r.cloudflare_opportunities.length,1);
});
test('rejects unsupported Connect pitch based on generic AI hiring', () => {
  const r=report([opportunity('Connect','Cloudflare CDN')]);
  validateOpportunityEvidence(r,[sourceItem('Hiring a senior AI platform engineer to build agents')]);
  assert.equal(r.cloudflare_opportunities.length,0);
});
test('rejects a Protect pitch based only on generic agent work', () => {
  const r=report([opportunity('Protect','API Shield')]);
  validateOpportunityEvidence(r,[sourceItem('Hiring to build autonomous agents')]);
  assert.equal(r.cloudflare_opportunities.length,0);
});
test('rejects invented source indices', () => {
  const r=report([{...opportunity('Build','AI Gateway'),evidence:'[S99]',signal:'Company initiative [S99]'}]);
  validateOpportunityEvidence(r,[sourceItem('AI gateway engineering')]);
  assert.equal(r.cloudflare_opportunities.length,0);
});
test('does not treat generic AI marketing as verified AI security', () => {
  const r=report([],[ai('Secure AI Applications & Agents')]);
  validateOpportunityEvidence(r,[sourceItem('New AI assistant product launch')]);
  assert.equal(r.ai_signals[0].signal,'insufficient');
});
test('preserves explicit AI inference cost evidence', () => {
  const r=report([],[ai('AI Cost & Inference Economics')]);
  validateOpportunityEvidence(r,[sourceItem('Engineering roadmap prioritises inference cost optimization')]);
  assert.equal(r.ai_signals[0].signal,'strong');
});
test('downgrades model routing without two named providers', () => {
  const r=report([],[ai('Multi-Model Operations')]);
  validateOpportunityEvidence(r,[sourceItem('Building an AI gateway for model routing')]);
  assert.equal(r.ai_signals[0].signal,'possible');
});
test('preserves multi-provider evidence when two families are named', () => {
  const r=report([],[ai('Multi-Model Operations')]);
  validateOpportunityEvidence(r,[sourceItem('Platform integrates OpenAI GPT-4 and Anthropic Claude with model routing')]);
  assert.equal(r.ai_signals[0].signal,'strong');
});
test('invalid citations cannot pass the opportunity filter', () => {
  const r=report([opportunity('Build','AI Gateway')]);
  r.cloudflare_opportunities[0].signal='Company initiative [S500]';
  evidenceGrounded(r,[sourceItem('AI gateway engineering')]);
  assert.equal(r.cloudflare_opportunities.length,0);
});

const mockCompany = {id:'9fin',name:'9fin',description:'Debt intelligence software',sector:'Fintech',website:'https://9fin.com',employees:null,funding_usd:null,growth_score:null,last_funding_date:null,growth_prediction:null};
function mockScoring(answers) {
  return { AI: { run: async () => ({answers}) } };
}
const scoreKeys=['digital_native_fit','commercial_scale','momentum','product_relevance','research_quality','validated_need','solution_evidence','timing','stakeholders'];
test('scoring: generic AI hiring cannot create verified buyer need or stakeholder access', async () => {
  const answers=Object.fromEntries(scoreKeys.map(key=>[key,{value:'4'}]));
  const r=report([opportunity('Build','AI Gateway')]);
  r.cloudflare_opportunities[0].confidence='high';
  const score=await scorePursuitWithClef(mockScoring(answers),mockCompany,r,[sourceItem('Hiring AI platform engineer to work on model routing')]);
  assert.equal(score.status,'scored');
  assert.equal(score.readiness.dimensions.find(x=>x.key==='validated_need').score,1);
  assert.equal(score.readiness.dimensions.find(x=>x.key==='stakeholders').score,0);
});
test('scoring: a documented RFP and explicit need can preserve scored readiness', async () => {
  const answers=Object.fromEntries(scoreKeys.map(key=>[key,{value:'3'}]));
  const r=report([opportunity('Build','AI Gateway')]);
  r.cloudflare_opportunities[0].confidence='high';
  const score=await scorePursuitWithClef(mockScoring(answers),mockCompany,r,[sourceItem('We need an AI gateway. RFP issued for vendor selection underway.')]);
  assert.equal(score.status,'scored');
  assert.equal(score.readiness.dimensions.find(x=>x.key==='validated_need').score,3);
  assert.equal(score.readiness.dimensions.find(x=>x.key==='stakeholders').score,3);
});

const ninefinSources = [
  sourceItem("Our service-to-service authentication previously relied on network separation. To move more data between our systems and become an API-first company, we needed to fix these constraints. Our architecture grew, so we introduced a token service minting short-lived JWTs validated at the load balancer."),
  sourceItem("Building ABF outside the monolith: a service boundary for financial data. Additive event contracts, domain routing, idempotent consumers and API surface validated in staging. Production measurement is the next phase after cutover."),
  sourceItem("Senior AI Platform Engineer: our AI Engineering team is building the next generation of AI capabilities. Design and evolve the core AI platform enabling Generative AI and Agentic AI. Join at the beginning of the platform's journey and define reusable infrastructure.")
];

ninefinSources[0].title='Building scalable authentication and authorisation at 9fin';
ninefinSources[1].title='Building ABF outside the monolith: a service boundary for financial data';
ninefinSources[2].title='Senior AI Platform Engineer at 9fin';
test('9fin: primary engineering evidence outranks funding press coverage regardless of source order', () => {
  const funding=sourceItem("9fin AI-powered platform raises funding to build AI infrastructure and accelerate product development");
  funding.title="PYMNTS | 9fin Raises $50 Million for AI-Powered Analytics Platform";
  const sources=[funding,...ninefinSources];
  const r=report();
  r.ai_signals=[ai('Build & Scale AI Applications','insufficient')];
  recoverEvidenceBackedOpportunities(r,sources);
  evidenceGrounded(r,sources);
  validateOpportunityEvidence(r,sources);
  assert.equal(r.cloudflare_opportunities[0].evidence,'[S4]');
  assert.ok(r.cloudflare_opportunities.every(o=>o.evidence!=='[S1]'));
  assert.equal(r.ai_signals[0].signal,'strong');
  assert.equal(r.ai_signals[0].evidence,'[S4]');
});
test('generic marketing and funding mentioning platform infrastructure cannot generate AI Gateway', () => {
  const sources=[
    {title:'9fin raises $170m to build AI platform',snippet:'Funding will accelerate AI platform building and infrastructure investment',url:'https://news.example.com/raise'},
    {title:'AI-powered debt analytics platform',snippet:'Our company is building generative AI products and designing new infrastructure for the future',url:'https://9fin.com/'}
  ];
  const r=report();
  recoverEvidenceBackedOpportunities(r,sources);
  assert.equal(r.cloudflare_opportunities.length,0);
});
test('API Shield is not recommended for JWT mention without a specific architecture initiative', () => {
  const r=report();
  recoverEvidenceBackedOpportunities(r,[{title:'Building scalable authentication at 9fin',snippet:'JWT is a common token format for API authentication.',url:'https://9fin.com/blog'}]);
  assert.equal(r.cloudflare_opportunities.length,0);
});

test('9fin: evidence produces Protect and Build discovery hypotheses, not empty report', () => {
  const r=report();
  recoverEvidenceBackedOpportunities(r,ninefinSources);
  evidenceGrounded(r,ninefinSources);
  validateOpportunityEvidence(r,ninefinSources);
  assert.ok(r.cloudflare_opportunities.some(x=>x.pillar==='Protect' && x.evidence==='[S1]'));
  assert.ok(r.cloudflare_opportunities.some(x=>x.pillar==='Build' && x.evidence==='[S3]'));
  assert.ok(r.cloudflare_opportunities.some(x=>x.pillar==='Build' && x.evidence==='[S2]'));
  assert.ok(r.questions.length>=2);
});
test('generic funding and AI marketing alone produce no Cloudflare opportunities', () => {
  const r=report();
  recoverEvidenceBackedOpportunities(r,[sourceItem("Series C funding to accelerate AI capabilities and US expansion"),sourceItem("We are an AI-powered analytics platform")]);
  assert.equal(r.cloudflare_opportunities.length,0);
});
test('existing accepted opportunity is not duplicated by recovery', () => {
  const r=report([{...opportunity('Build','AI Gateway'),evidence:'[S3]',signal:'Company initiative [S3]'}]);
  recoverEvidenceBackedOpportunities(r,ninefinSources);
  assert.equal(r.cloudflare_opportunities.filter(x=>x.evidence==='[S3]' && x.pillar==='Build').length,1);
});

test('end-to-end offline: generated JSON -> normalization -> validated sourced 9fin brief', () => {
  const sources=[
    {title:'PYMNTS | 9fin Raises $50 Million for AI-Powered Analytics Platform',snippet:'Funding to build AI platform infrastructure and accelerate AI technology.',url:'https://pymnts.com/9fin'},
    ...ninefinSources
  ];
  const raw={
    summary:'9fin builds debt intelligence software',
    digital_native:'yes',
    customer_perspective:{mission:'Debt intelligence',priorities:[],business_tension:''},
    growth_signals:['Series C investment [S1]'],technical_signals:[],
    cloudflare_opportunities:[],
    ai_signals:[{theme:'Build & Scale AI Applications',signal:'insufficient',evidence:'',hypothesis:'',confidence:'low'}],
    hiring_signals:[],questions:[],confidence:'medium'
  };
  const r=normalizeReport(raw);
  finalizeEvidenceReport(r,sources);
  assert.equal(r.cloudflare_opportunities.length,3);
  assert.equal(r.cloudflare_opportunities[0].evidence,'[S4]');
  assert.ok(r.cloudflare_opportunities.some(o=>o.pillar==='Protect'&&o.evidence==='[S2]'));
  assert.ok(r.cloudflare_opportunities.some(o=>o.pillar==='Build'&&o.evidence==='[S3]'));
  assert.ok(r.cloudflare_opportunities.every(o=>o.evidence!=='[S1]'));
  assert.equal(r.ai_signals.find(x=>x.theme==='Build & Scale AI Applications').signal,'strong');
  assert.equal(r.questions[0],r.cloudflare_opportunities[0].discovery_question);
});
test('end-to-end offline: no technical primary evidence produces no pitches', () => {
  const sources=[{title:'9fin raises $170M Series C to accelerate AI platform',snippet:'The company builds AI-powered debt analytics and plans to expand AI infrastructure.',url:'https://news.example.com/9fin'}];
  const r=report();
  r.ai_signals=[ai('Build & Scale AI Applications','insufficient')];
  finalizeEvidenceReport(r,sources);
  assert.equal(r.cloudflare_opportunities.length,0);
  assert.equal(r.ai_signals[0].signal,'insufficient');
});

test('search selection retains a specific 9fin AI engineering role among abundant general news', async () => {
  let calls=0;
  sandbox.fetch=async (_url, opts)=>{
    const q=JSON.parse(opts.body).query;
    calls++;
    const results=Array.from({length:8},(_,i)=>({
      title:'9fin announces market intelligence product expansion '+calls+'-'+i,
      url:'https://news'+i+'.example.com/9fin/'+calls+'/'+i,
      content:'9fin expands its debt intelligence platform, customer coverage and AI analytics product with a new announcement about markets and customers.'
    }));
    if(q.includes('careers engineering')) results[0]={
      title:'Senior AI Platform Engineer at 9fin',
      url:'https://flexa.careers/jobs/9fin-senior-ai-platform-engineer',
      content:'9fin AI Engineering is building a shared AI platform. The engineer will design reusable infrastructure for generative AI and agentic AI applications.'
    };
    if(calls===1) results[1]={
      title:'9fin official platform',
      url:'https://9fin.com/platform',
      content:'9fin is a software platform for global debt markets offering analytics and financial intelligence to customers and firms.'
    };
    return {ok:true,json:async()=>({results})};
  };
  const sources=await searchWeb({SEARCH_API_KEY:'mock'},mockCompany);
  assert.equal(calls,6);
  assert.ok(sources.some(x=>x.title==='Senior AI Platform Engineer at 9fin'));
  assert.ok(sources.length<=16);
});

test('GET stored research replays evidence pipeline without Tavily, Workers AI or D1 writes', async () => {
  const sources=ninefinSources;
  const row={
    status:'complete', digital_native:'yes', digital_native_reason:'',summary:'9fin debt intelligence',
    growth_signals:'[]',technical_signals:'[]',cloudflare_opportunities:'[]',
    ai_signals:JSON.stringify([{theme:'Build & Scale AI Applications',signal:'insufficient',evidence:'',hypothesis:'',confidence:'low'}]),
    questions:'[]',confidence:'medium',sources:JSON.stringify(sources)
  };
  let writes=0;
  const env={
    DB:{prepare:(sql)=>{if(!/^\s*SELECT/i.test(sql))writes++;return {bind:()=>({first:async()=>row})};}},
    AI:{run:async()=>{throw Error('Unexpected AI call');}},
    SEARCH_API_KEY:'no-network'
  };
  sandbox.fetch=async()=>{throw Error('Unexpected Tavily call');};
  const response=await route(new Request('https://flarefinder.example/api/companies/9fin'),env,{});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.cloudflare_opportunities.length,3);
  assert.equal(data.cloudflare_opportunities[0].evidence,'[S3]');
  assert.equal(data.ai_signals[0].signal,'strong');
  assert.equal(writes,0);
  assert.equal(data.brief_recomputed,true);
});

test('brief UI displays a sourced business-to-technical-to-Cloudflare reasoning chain', () => {
  const ui=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
  assert.ok(ui.includes('Commercial reasoning · strongest sourced hypothesis'));
  for (const label of ['Business priority','Technical initiative','Potential consequence','Cloudflare hypothesis','What could rule it out','How to qualify']) {
    assert.ok(ui.includes('label:"'+label+'"'),label);
  }
  assert.ok(ui.includes('Saved Clef score predates this evidence re-analysis'));
  assert.ok(!ui.includes('opportunities.find(o => o.confidence !== "low" && /\\[S\\d+\\]/.test(o.evidence || ""))?.hypothesis'));
});

test('compact account brief shows only three primary sections; detailed reasoning is collapsed',()=>{
  const ui=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
  assert.ok(ui.includes('<summary>Supporting commercial reasoning</summary>'));
  assert.ok(ui.includes('<summary>Discovery questions</summary>'));
  assert.ok(ui.includes('Company priorities &amp; strategic direction'));
  assert.ok(ui.includes('<h3>Cloudflare opportunities</h3>'));
  assert.ok(ui.includes('<h3>AI opportunity signals</h3>'));
  assert.ok(!ui.includes('<h3>Other business signals</h3>'));
  assert.ok(ui.includes('Six-month AI agent delivery milestone'));
  assert.ok(ui.includes('Planned engineering work, not a confirmed vendor evaluation.'));
});
