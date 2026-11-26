// These files are bundled into the Worker. None are fetched at request time.
import ninefin from "../../research-framework/structured-references/9fin.json";
import eleven from "../../research-framework/structured-references/elevenlabs.json";
import fresha from "../../research-framework/structured-references/fresha.json";
import ably from "../../research-framework/structured-references/ably.json";
import mubi from "../../research-framework/structured-references/mubi.json";
import form3 from "../../research-framework/structured-references/form3.json";
import attio from "../../research-framework/structured-references/attio.json";
import oxa from "../../research-framework/structured-references/oxa.json";
import tessl from "../../research-framework/structured-references/tessl.json";
import harmonic from "../../research-framework/structured-references/harmonic-security.json";
import principles from "../../research-framework/methodology.json";

interface CaseStudy {
  name: string; model: string; logic: string; patterns: string[]; opportunities: string[]; limitations: string[];
  evidence: {id:string; title:string; url:string; fact:string}[];
  sections: Record<string,string | {title:string; body:string}>;
}
const library: CaseStudy[] = [ninefin,eleven,fresha,ably,mubi,form3,attio,oxa,tessl,harmonic];
// Researcher-assigned attributes encode business mechanics and who operates the workload.
const caseFacets: Record<string,string[]> = {
  "9fin":["finance","subscription","enterprise","ai","expansion","mature"],
  "ElevenLabs":["ai","metered","realtime","enterprise","expansion","mature"],
  "Fresha":["marketplace","subscription","payments","metered","ai","expansion"],
  "Ably":["realtime","metered","developers","enterprise"],
  "MUBI":["media","subscription","expansion","mature"],
  "Form3":["payments","enterprise","metered","mature","expansion"],
  "Attio":["collaboration","subscription","developers","ai"],
  "Oxa":["embedded","hosted","enterprise","expansion"],
  "Tessl":["developers","metered","ai"],
  "Harmonic Security":["security","enterprise","ai","hosted"],
};
const facetsOf = (name:string) => caseFacets[name.toLowerCase()==="mubi"?"MUBI":name] || [];
function passages(ref:CaseStudy) {
  const sections=Object.entries(ref.sections);
  // Select whole passages. Keeping the counterargument alongside the opportunity matters more than a character limit.
  return Object.fromEntries([1,3,5,7].map(i=>{
    const [key,section]=sections[i];
    return typeof section==="string" ? [key,section] : [section.title,section.body];
  })) as Record<string,string>;
}
const normalizeName = (value:string) => value.toLowerCase().replace(/[^a-z0-9]/g,"").replace(/(limited|ltd|inc|plc)$/,"");
const cues: Record<string,RegExp> = {
  subscription:/annual contract|subscription|per seat|recurring revenue/i,
  metered:/usage.based|per (request|million|minute|transaction)|metered|usage credits/i,
  marketplace:/marketplace|two.sided|booking platform|merchant of record/i,
  finance:/debt market|credit analyst|capital market|institutional investor|financial intelligence/i,
  payments:/payment rail|payment processing|clearing|settlement|payment service|card processing/i,
  developers:/software development kit|\bsdk\b|developer tool|developer platform|open.source library/i,
  realtime:/real.time messag|pub.?sub|websocket|latency.sensitive|voice agent/i,
  media:/film|cinema|streaming video|distribution rights|playback/i,
  embedded:/autonomous vehicle|embedded software|on.vehicle|safety.critical|on.device/i,
  enterprise:/enterprise customer|regulated institution|enterprise contract|enterprise buyer/i,
  ai:/model inference|model routing|model serving|language models?|agent evaluation|generative ai/i,
  security:/data loss prevention|security operations|threat detection|cybersecurity|endpoint security/i,
  hosted:/self.hosted|customer.managed|customer.hosted|on.premises/i,
  expansion:/geographic expansion|new market|international expansion|new region/i,
  mature:/series [c-f]\b|publicly traded|annual report/i,
  collaboration:/relationship management|customer relationship|collaborative|sales workspace/i,
};
const weight = (key:string) => ["finance","payments","embedded","media","security","marketplace","hosted","realtime","collaboration"].includes(key) ? 3 : key === "enterprise" ? 1 : 2;
type CompanyInput = {name:string;description?:string|null;sector?:string|null};
type SourceInput = {title:string;snippet:string};
export function retrieveStrategyReferences(company:CompanyInput, sources:SourceInput[]) {
  const identity = [company.description,company.sector].join(" ");
  const evidence = sources.map(s=>s.title+" "+s.snippet).join("\n");
  const active = Object.keys(cues).filter(k=>cues[k].test(identity+" "+evidence));
  const ranked = library.filter(r=>normalizeName(r.name)!==normalizeName(company.name)).map(ref=>{
    const shared = facetsOf(ref.name).filter(k=>active.includes(k));
    const score = shared.reduce((sum,k)=>sum+weight(k)*(cues[k]?.test(identity)?1.6:1),0) /
      Math.sqrt(Math.max(1,facetsOf(ref.name).length));
    return {ref, shared, score};
  }).sort((a,b)=>b.score-a.score || a.ref.name.localeCompare(b.ref.name));
  const first = ranked.filter(x=>x.score>0).slice(0,2);
  if (!first.length) return [];
  const contrasting = ranked.find(x=>!first.includes(x) && x.score>0 &&
    ["hosted","security","embedded","realtime","marketplace"].some(k=>facetsOf(x.ref.name).includes(k) && !facetsOf(first[0].ref.name).includes(k)));
  const chosen = contrasting ? [...first,contrasting] : first;
  return chosen.map(({ref,shared})=>{
    const namespace = (s:string) => s.replace(/\b(?:S|E)(\d+)\b/gi,(_,n)=>"REF-"+normalizeName(ref.name)+"-"+n);
    return {
      name:ref.name, business_model:ref.model, reasoning:namespace(ref.logic), status:"analogy only",
      why:(contrasting?.ref===ref?"Contrast on ownership or economics; ":"Shared factors: ")+shared.join(", "),
      sections:Object.fromEntries(Object.entries(passages(ref)).map(([key,value])=>[key,namespace(value)])),
      evidence:ref.evidence.map(e=>({id:"REF-"+normalizeName(ref.name)+"-"+e.id.replace(/^[SE]/i,""),title:e.title,fact:namespace(e.fact),url:e.url})),
      limitations:ref.limitations.map(namespace),
      methodology:principles.filter(p=>p.examples.includes(ref.name)).map(p=>({principle:p.principle,conditions:p.conditions,exception:p.exception,discovery:p.discovery}))
    };
  });
}
