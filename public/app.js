
const $ = id => document.getElementById(id);

let companies = [];
let token = sessionStorage.getItem("flarefinder-admin") || "";
let currentCompanyId = null;
let detailRequestId = 0;
let refreshBusy = false;
const activeResearchRequests = new Set();
const selectedCompanies = new Set();

const esc = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const validLink = s => {
  try {
    const u = new URL(s);
    return ["https:", "http:"].includes(u.protocol)
      ? u.href
      : null;
  } catch {
    return null;
  }
};

const money = n =>
  n == null ? "—" :
  n >= 1e9 ? "$" + (n / 1e9).toFixed(1) + "B" :
  n >= 1e6 ? "$" + (n / 1e6).toFixed(1) + "M" :
  "$" + Math.round(n).toLocaleString();

const aiSignal = value => {
  const signals = list(value);
  if (!signals.length) return "unresearched";
  if (signals.some(s => s.signal === "strong")) return "strong";
  if (signals.some(s => s.signal === "possible")) return "possible";
  return "insufficient";
};

const pill = s =>
  `<span class="pill ${esc(s || "pending")}">${esc(s || "pending")}</span>`;

const notice = s => {
  $("notice").textContent = s;
};

async function api(path, opts = {}) {
  const headers = {
    "content-type": "application/json",
    ...(token ? { authorization: "Bearer " + token } : {}),
    ...opts.headers
  };

  const response = await fetch(path, {
    ...opts,
    headers,
    cache: "no-store"
  });

  const data = await response.json();

  if (!response.ok) {
    throw Error(data.error || "Request failed");
  }

  return data;
}

// --------------------------------------------------
// COMPANY LIST
// --------------------------------------------------

async function load() {
  try {
    companies = await api("/api/companies");
    render();
  } catch (e) {
    notice(e.message);
  }
}

function pursuitFor(c) {
  try {
    const raw = c.pursuit_score ?? list(c.sources)[0]?.pursuit_score;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  }
  catch { return null; }
}
function engagementFor(c) {
  const sources = list(c.sources);
  const opportunities = list(c.cloudflare_opportunities).filter(o => /\[S\d+\]/.test(o.evidence || ""));
  const text = sources.map(x => (x.title || "") + " " + (x.snippet || "")).join("\n");
  const active = sources.some(x => /\b(engineer|engineering|jobs|careers)\b/i.test(x.title || "") && /\b(genai platform|ai platform engineer|developer portal|ci\/cd|model routing|shared ai platform)\b/i.test((x.title || "")+" "+(x.snippet || "")));
  const timed = /\b(six months|6 months|currently hiring|open positions|we are looking for|we're looking for)\b/i.test(text);
  const stakeholder = sources.some(x => /\b(cto|vp of engineering|vp engineering|engineering lead|head of ai)\b/i.test(x.title || ""));
  const dimensions = [
    {label:"Active technical initiative",weight:35,score:active?3:opportunities.length?1:0},
    {label:"Relevant workload / solution hypothesis",weight:30,score:Math.min(3,new Set(opportunities.map(o=>o.pillar)).size+ (opportunities.length>1?1:0))},
    {label:"Timing / engagement trigger",weight:25,score:active&&timed?3:active?2:0},
    {label:"Identifiable stakeholder",weight:10,score:stakeholder?3:0}
  ];
  return {total:Math.round(dimensions.reduce((sum,d)=>sum+d.score*d.weight/4,0)),dimensions};
}
function igniteQuadrant(potential,readiness) {
  if (potential == null || readiness == null) return "Unassessed";
  return potential>=60 ? (readiness>=60?"Pursue":"Develop") : (readiness>=60?"Activate":"Nurture");
}
function priorityFor(c) {
  const p = pursuitFor(c);
  const baseScore = c.status === "complete" && p?.status === "scored" ? (p.account?.total ?? p.total) : null;
  const tas = tasTableValue(c);
  // Illustrative planning bands, not official Cloudflare thresholds.
  const tasScore = tas == null ? null : tas < 10000 ? 20 : tas < 25000 ? 40 : tas < 50000 ? 60 : tas < 100000 ? 80 : 100;
  const tasWeight = tasRevenueScenario(c).budgetProxy ? 0.05 : 0.15;
  const score = baseScore == null ? null : tasScore == null ? baseScore : Math.round(baseScore * (1-tasWeight) + tasScore * tasWeight);
  const opportunities = list(c.cloudflare_opportunities);
  const ai = list(c.ai_signals);
  const strong = ai.filter(x => x.signal === "strong" && /\[S\d+\]/.test(x.evidence || "") && !["AI Cost & Inference Economics", "Multi-Model Operations"].includes(x.theme));
  const sourced = opportunities.filter(x => /\[S\d+\]/.test(x.evidence || ""));
  const qualified = c.digital_native === "yes";
  const quality = c.confidence === "low" ? "Low confidence" : c.confidence === "high" ? "High confidence" : "Medium confidence";
  let tier = "Unassessed";
  if (score !== null) {
    tier = !qualified ? "T4 · Validate fit" : score >= 75 && c.confidence !== "low" && (sourced.length || strong.length) ? "T1 · Prioritize" : score >= 55 ? "T2 · Qualify" : "T3 · Investigate";
  }
  const potentialTier = tier;
  const engagement = engagementFor(c);
  tier = qualified ? igniteQuadrant(score, engagement.total) : "Unassessed";
  const datedFunding = c.last_funding_date && /^20\d\d/.test(c.last_funding_date) ? "Funding " + c.last_funding_date : "";
  const leading = sourced.sort((a,b) => ({high:3,medium:2,low:1}[b.confidence]||0)-({high:3,medium:2,low:1}[a.confidence]||0))[0];
  const signal = strong[0];
  const reason = score === null ? "Research required before prioritization" :
    [datedFunding, leading ? leading.pillar + ": " + leading.hypothesis : "", signal ? signal.theme + ": " + signal.hypothesis : ""].filter(Boolean).join(" · ").slice(0, 190) ||
    "No sufficiently sourced workload trigger; validate fit";
  return {score,baseScore,tas,tasScore,tasWeight,tier,potentialTier,engagement,reason,quality,pillar:leading?.pillar || "Unverified",ai:signal?.theme || "Not established"};
}
function rankedTerritory() {
  const result = companies.map(c => ({...c, priority:priorityFor(c)}));
  result.sort((a,b) => (b.priority.score ?? -1)-(a.priority.score ?? -1) || a.name.localeCompare(b.name));
  let rank=0;
  for (const c of result) if(c.priority.score !== null) c.rank=++rank;
  return result;
}

function updateSelectionLabel() {
  $("batchBtn").textContent = "▶ Research selected (" + selectedCompanies.size + ")";
}
function visibleResearchCandidates() {
  const q = $("search").value.toLowerCase();
  const native = $("nativeFilter").value;
  const status = $("statusFilter").value;
  const tier = $("tierFilter")?.value || "";
  return rankedTerritory().filter(c =>
    (c.name + " " + (c.sector || "") + " " + (c.description || "")).toLowerCase().includes(q) &&
    (!native || c.digital_native === native) &&
    (!status || (c.status || "pending") === status) &&
    (!tier || c.priority.tier.startsWith(tier)) &&
    !["running","pending","complete"].includes(c.status)
  );
}
function render() {
  const q = $("search").value.toLowerCase();
  const native = $("nativeFilter").value;
  const status = $("statusFilter").value;
  const tier = $("tierFilter")?.value || "";
  const ranked = rankedTerritory();
  const items = ranked.filter(c =>
    (c.name + " " + (c.sector || "") + " " + (c.description || "")).toLowerCase().includes(q) &&
    (!native || c.digital_native === native) &&
    (!status || (c.status || "pending") === status) &&
    (!tier || c.priority.tier.startsWith(tier))
  );
  $("total").textContent = companies.length;
  $("done").textContent = companies.filter(c => c.status === "complete").length;
  $("native").textContent = companies.filter(c => c.digital_native === "yes").length;
  $("pending").textContent = companies.filter(c => c.status !== "complete").length;
  $("rows").innerHTML = items.length ? items.map(c => `
    <tr>
      <td><input type="checkbox" class="select-company" data-select-id="${esc(c.id)}" ${selectedCompanies.has(c.id) ? "checked" : ""} ${c.status === "running" ? "disabled" : ""} aria-label="Select ${esc(c.name)}"></td>
      <td class="score">${c.rank ?? "—"}</td>
      <td><div class="company-name">${esc(c.name)}</div><div class="description">${esc(c.sector || c.description || "No description")}</div></td>
      <td><strong>${esc(c.priority.tier)}</strong><div class="description" title="${esc(c.priority.reason)}">${esc(c.priority.reason)}</div><div class="meta">${esc(c.priority.quality)}</div></td>
      <td class="score" title="${esc(c.priority.baseScore == null ? "Unassessed" : "Base attractiveness: "+c.priority.baseScore+"; "+(c.priority.tasScore == null ? "TAS unknown, no adjustment" : Math.round((1-c.priority.tasWeight)*100)+"% base + "+Math.round(c.priority.tasWeight*100)+"% illustrative TAS band: "+c.priority.tasScore))}">${c.priority.score ?? "—"}</td>\n      <td class="score" title="Illustrative annual overall TAS, not verified spend">${formatTas(tasTableValue(c))}</td>
      <td>${esc(c.priority.pillar)}</td>
      <td>${esc(c.priority.ai)}</td>
      <td>${pill(c.status || "pending")}</td>
      <td><button class="link-btn" data-id="${esc(c.id)}">View signals →</button></td>
    </tr>`).join("") : '<tr><td class="empty" colspan="10">No matching companies.</td></tr>';
  document.querySelectorAll("[data-id]").forEach(b => b.onclick = () => detail(b.dataset.id));
  document.querySelectorAll("[data-select-id]").forEach(b => b.onchange = () => { if (b.checked) selectedCompanies.add(b.dataset.selectId); else selectedCompanies.delete(b.dataset.selectId); updateSelectionLabel(); });
}

// Curated, verified Cloudflare customer stories. These are peer proof points,
// never evidence that the prospect has the same needs.
const CASE_STUDIES = [
  { name: "Tightknit", url: "https://www.cloudflare.com/case-studies/tightknit/", pillar: "Build", themes: ["Build & Scale AI Applications"], products: "Workers, KV, Queues, Workflows", outcome: "Built and scaled its application with Cloudflare's developer platform." },
  { name: "TrueLayer", url: "https://www.cloudflare.com/case-studies/truelayer/", pillar: "Protect", themes: ["Secure AI Applications & Agents"], products: "DNS, Access, Zero Trust", outcome: "Secured access to internal applications and simplified infrastructure management." },
  { name: "Applied Systems", url: "https://www.cloudflare.com/en-gb/case-studies/applied-systems/", pillar: "Protect", themes: ["Secure AI Applications & Agents"], products: "Zero Trust, WAF", outcome: "Unified security controls and improved granular access to internal applications." }
];

function accountPriority(company, opportunities, signals, hiring = []) {
  if (company.status !== "complete") return { tier: "Not assessed", reason: "Research pending or unavailable" };
  const digital = company.digital_native === "yes";
  const high = opportunities.filter(o => o.confidence === "high").length;
  const medium = opportunities.filter(o => o.confidence === "medium").length;
  const strongAi = signals.some(s => s.signal === "strong");
  // Hiring is a modest prioritization boost, never proof of an active buying cycle.
  const hiringBoost = hiring.some(h => h.confidence === 'high' || h.confidence === 'medium') ? 1 : 0;
  const evidence = high * 3 + medium * 2 + (strongAi ? 2 : 0) + hiringBoost;
  if (digital && evidence >= 5) return { tier: "T1 · Prioritize", reason: "Digital-native fit and multiple evidence-backed product opportunities" };
  if (digital && evidence >= 2) return { tier: "T2 · Qualify", reason: "Digital-native fit with at least one plausible evidence-backed opportunity" };
  if (digital) return { tier: "T3 · Investigate", reason: "Digital-native fit, but limited validated technical opportunity evidence" };
  return { tier: "T4 · Validate fit", reason: "Digital-native qualification is negative or uncertain" };
}

function relevantCaseStudies(opportunities, signals) {
  const pillars = new Set(opportunities.filter(o => o.hypothesis && o.evidence && o.evidence !== "No specific evidence identified.").map(o => o.pillar));
  const themes = new Set(signals.filter(s => ["strong", "possible"].includes(s.signal)).map(s => s.theme));
  return CASE_STUDIES.map(story => {
    const reasons = [];
    if (pillars.has(story.pillar)) reasons.push(story.pillar + " opportunity");
    if (story.themes.some(t => themes.has(t))) reasons.push("related AI commercial theme");
    return { ...story, reasons };
  }).filter(story => story.reasons.length).slice(0, 3);
}


function tasIndustryBaseline(sector) {
  const s = String(sector || "").toLowerCase();
  if (/bank|financ|fintech|insur/.test(s)) return {pct:5.5, label:"Financial services"};
  if (/retail|commerce|marketplace/.test(s)) return {pct:5, label:"Retail / commerce"};
  if (/manufactur|industrial/.test(s)) return {pct:2, label:"Manufacturing"};
  if (/health|medical/.test(s)) return {pct:4.1, label:"Healthcare"};
  if (/consult|it service/.test(s)) return {pct:10.5, label:"IT services"};
  return {pct:8.6, label:"Software / technology proxy"};
}
function tasRevenueScenario(c) {
  // Prefer an explicitly labelled, company-specific annual revenue figure in
  // retrieved sources. Never mistake funding, valuation or transaction volume for revenue.
  const sources = list(c.sources);
  const candidates = [];
  for (let i=0;i<sources.length;i++) {
    const source = sources[i];
    const snippet = String(source.snippet || "");
    const title = String(source.title || "");
    // Company-profile feeds sometimes express USD revenue as "Annual revenue: 76.00M USD".
    // Only trust that syntax on a page clearly about the account itself; syndicated
    // news pages frequently include unrelated companies' financial figures.
    const accountName = String(c.name || "").toLowerCase().trim();
    if (accountName && title.toLowerCase().includes(accountName) &&
        !/\b(?:news|jobs|careers|competitors|partnership)\b/i.test(title)) {
      const profileRevenue = snippet.match(/\bannual revenue\s*:\s*(?:USD\s*)?\$?\s*([\d,.]+)\s*(billion|million|bn|m)\s*(?:USD|US dollars?)\b/i);
      if (profileRevenue) {
        const amount = Number(profileRevenue[1].replace(/,/g,"")) * (/billion|bn/i.test(profileRevenue[2])?1000:1);
        if (amount>0 && amount<100000) candidates.push({millions:amount,ref:"[S"+(i+1)+"]",title,url:source.url||""});
      }
    }
    const lines = (title+" "+snippet).split(/(?<=[.!?])\s+|\n/);
    for (const line of lines) {
      const matches = [...line.matchAll(/(?:annual revenue|annual turnover|revenue (?:was|of|reached|is)|turnover (?:was|of|reached|is))[^$£€\d]{0,35}([$£€])\s*([\d,.]+)\s*(billion|million|bn|m)\b/gi)];
      for (const match of matches) {
        const amount = Number(match[2].replace(/,/g,"")) * (/billion|bn/i.test(match[3])?1000:1);
        if (!(amount>0 && amount<100000)) continue;
        const currency = match[1];
        if (currency !== "$") continue; // no silent FX assumptions
        candidates.push({millions:amount,ref:"[S"+(i+1)+"]",title,url:source.url||""});
      }
    }
  }
  if (candidates.length) {
    const x = candidates[0];
    return {millions:x.millions,note:"Source-reported annual revenue "+x.ref+" ("+x.title+"). Verify original financial statements and reporting period before using for forecasts.",kind:"Source-reported revenue (unverified)"};
  }
  // Explicit low-confidence planning proxy, not reported revenue or actual IT spend.
  const raw = String(c.employees || "").replace(/,/g,"").trim();
  const match = raw.match(/^(\d+)(?:\s*[-–—]\s*(\d+))?\s*\+?$/);
  if (match) {
    const lo = Number(match[1]), hi = match[2] ? Number(match[2]) : lo;
    if (lo > 0 && hi >= lo && hi <= 1000000) {
      const headcount = (lo + hi) / 2;
      return {millions:headcount * 10000 / 1e6, budgetProxy:true, kind:"Headcount-based technology budget scenario (low confidence)",note:"No sourced USD annual revenue. Uses employee count "+raw+" and an illustrative $10,000 annual technology budget per employee. Not reported revenue, actual spend or a Cloudflare benchmark. Replace with a better budget estimate when available."};
    }
  }
  return {millions:null,note:"No sufficiently explicit USD annual revenue or usable employee count. Enter a sourced revenue figure manually.",kind:"Revenue not verified"};
}
function tasTableValue(c) {
  const scenario = tasRevenueScenario(c);
  if (scenario.millions == null || !Number.isFinite(scenario.millions) || scenario.millions <= 0) return null;
  const baseline = tasIndustryBaseline(c.sector);
  return scenario.millions * 1e6 * (scenario.budgetProxy ? 1 : baseline.pct / 100) * 0.03;
}
function formatTas(value) {
  return value == null ? "—" : value >= 1e6 ? "$" + (value / 1e6).toFixed(2) + "m" : "$" + Math.round(value / 1000).toLocaleString() + "k";
}
function tasSection(c) {
  const baseline = tasIndustryBaseline(c.sector);
  const scenario = tasRevenueScenario(c);
  return `<section class="brief-tas"><h3>Commercial potential · Annual TAS — ${formatTas(tasTableValue(c))} (scenario)</h3>
    <p class="meta">Calculated scenarios, not verified Cloudflare spend or sales forecasts. AI TAS is a subset of overall TAS; do not add the two.</p>
    <div class="brief-signal">
      <div id="tasResult" class="info">Calculating overall and AI TAS…</div>
      <p class="meta"><strong>${esc(scenario.kind)}</strong> · ${esc(scenario.note)}</p>
      <label>${scenario.budgetProxy ? "Estimated technology budget (USD millions)" : "Annual revenue (USD millions)"}
        <input id="tasRevenue" type="number" min="0" step="0.01" placeholder="Unknown — enter sourced revenue" style="width:100%;margin-top:5px" ${scenario.millions != null ? 'value="'+scenario.millions.toFixed(2)+'"' : ''}>
      </label>
      <label>Technology spend % <input id="tasIT" type="number" min="0" max="100" step="0.1" value="${scenario.budgetProxy ? 100 : baseline.pct}" ${scenario.budgetProxy ? "disabled" : ""} style="width:85px"></label>
      <label>Overall Cloudflare-addressable low % <input id="tasLow" type="number" min="0" max="100" step="0.1" value="1" style="width:75px"></label>
      <label>Overall Cloudflare-addressable high % <input id="tasHigh" type="number" min="0" max="100" step="0.1" value="5" style="width:75px"></label>
      <label>AI share of technology spend % <input id="tasAIShare" type="number" min="0" max="100" step="0.1" value="15" style="width:75px"></label>
      <label>AI Cloudflare-addressable low % <input id="tasAILow" type="number" min="0" max="100" step="0.1" value="2" style="width:75px"></label>
      <label>AI Cloudflare-addressable high % <input id="tasAIHigh" type="number" min="0" max="100" step="0.1" value="10" style="width:75px"></label>
      <details><summary class="meta">Method, assumptions and limitations</summary>
        <p class="meta">Technology budget = annual revenue × technology spend %. Overall TAS = technology budget × 1–5% addressable share. AI budget = technology budget × 15% AI allocation. AI TAS = AI budget × 2–10% addressable share. Displayed central estimates are arithmetic midpoints of each range, not forecasts. AI TAS is already part of overall TAS and must not be added to it. All percentages are editable, illustrative planning assumptions; no validated AI budget, pricing, spend or official Cloudflare sizing methodology is implied. Funding is never treated as revenue. Revenue is only prefilled from source-reported USD revenue. If unavailable, a clearly labelled headcount-based technology budget scenario is used where possible; in that mode the budget is entered directly and the technology percentage is fixed at 100%. This proxy receives only 5% ranking weight, versus 15% for revenue-based scenarios. Manual edits are local calculator scenarios, not saved ranking inputs.</p>
      </details>
    </div>
  </section>`;
}
function wireTas() {
  const ids = ["tasRevenue","tasIT","tasLow","tasHigh","tasAIShare","tasAILow","tasAIHigh"];
  const inputs = ids.map(id => $(id));
  if (inputs.some(x => !x)) return;
  const update = () => {
    const vals = inputs.map(x => x.value.trim() === "" ? NaN : Number(x.value));
    const [revenue,it,low,high,aiShare,aiLow,aiHigh] = vals;
    const out = $("tasResult");
    if (!vals.every(Number.isFinite) || revenue <= 0 ||
        [it,low,high,aiShare,aiLow,aiHigh].some(x => x < 0 || x > 100) ||
        high < low || aiHigh < aiLow) {
      out.textContent = !Number.isFinite(revenue) || revenue <= 0 ? "TAS unavailable: enter a positive revenue or technology budget estimate above." : "Check percentage assumptions (0–100%; high must be ≥ low).";
      return;
    }
    const tech = revenue * 1e6 * it / 100;
    const overallMin = tech * low / 100;
    const overallMax = tech * high / 100;
    const aiBudget = tech * aiShare / 100;
    const aiMin = aiBudget * aiLow / 100;
    const aiMax = aiBudget * aiHigh / 100;
    const fmt = n => "$" + Math.round(n).toLocaleString("en-US");
    const midpoint = (a,b) => fmt((a+b)/2);
    out.innerHTML =
      '<strong>Overall Cloudflare TAS: ' + midpoint(overallMin,overallMax) + '/yr</strong>' +
      '<div class="meta">Range: ' + fmt(overallMin) + '–' + fmt(overallMax) + '/yr</div>' +
      '<strong>AI TAS (subset): ' + midpoint(aiMin,aiMax) + '/yr</strong>' +
      '<div class="meta">Range: ' + fmt(aiMin) + '–' + fmt(aiMax) + '/yr</div>' +
      '<div class="meta">Assumed technology spend: ' + fmt(tech) + '/yr · AI budget: ' + fmt(aiBudget) + '/yr</div>' +
      (aiMax > overallMax ? '<div class="meta">Warning: AI high scenario exceeds overall high scenario; review addressable-share assumptions.</div>' : '');
  };
  inputs.forEach(x => x.addEventListener("input", update));
  update();
}

// --------------------------------------------------
// RESEARCH DISPLAY
// --------------------------------------------------

function list(value) {
  let items = [];

  try {
    items = typeof value === "string"
      ? JSON.parse(value)
      : value || [];
  } catch {
    items = [];
  }

  return Array.isArray(items) ? items : [];
}

function listHtml(value) {
  const items = list(value);

  return items.length
    ? "<ul>" +
      items.map(x => `<li>${esc(x)}</li>`).join("") +
      "</ul>"
    : "<p>No verified evidence found.</p>";
}

function researchButtonText(status) {
  switch (status) {
    case "complete":
      return "↻ Refresh research";
    case "running":
      return "⏳ Research running";
    case "pending":
      return "▶ Prioritize research";
    case "failed":
      return "↻ Retry research";
    default:
      return "▶ Research company";
  }
}

async function detail(id, silent = false) {
  const requestId = ++detailRequestId;

  try {
    const c = await api(
      "/api/companies/" + encodeURIComponent(id)
    );

    if (requestId !== detailRequestId) return;

    currentCompanyId = id;
    $("detailName").textContent = c.name;
    $("overlay").classList.remove("hidden");

    // Present independently reviewed, source-matched evidence through the SAME
    // standard account fields, never as a separate featured/verified panel.
    // The review is scoped to existing citations; other accounts use the same UI.
    if (/^polyai$/i.test(c.name.trim())) {
      const src = list(c.sources);
      const findRef = (pattern, officialOnly = false) => {
        const i = src.findIndex(x => pattern.test((x.title || "") + " " + (x.snippet || "")) &&
          (!officialOnly || /(?:^|\.)poly\.ai$|prnewswire\.com/i.test((() => { try { return new URL(x.url).hostname; } catch { return ""; } })())));
        return i >= 0 ? "[S" + (i + 1) + "]" : "";
      };
      const round = findRef(/raised \$86 million in Series D|raised \$86 million in a Series D|raised \$86 million in Series D funding|raises \$86M/i, true);
      const expansion = findRef(/Toronto technology hub|Toronto tech hub/i);
      const customers = findRef(/200 enterprise customers|200\+ enterprise customers|2,000 live deployments|thousands of live deployments/i);
      const platform = findRef(/agent development kit|open APIs|developer|public enterprise dialog platform/i, true);
      const engineering = findRef(/grow PolyAI.s engineering organisation|engineering organisation from tens to hundreds/i);
      const runtime = findRef(/runtime, inference, and data platforms|runtime, inference or data platforms/i);
      const raw = list(c.growth_signals);
      const growth = raw.filter(x => !/Reported financing round|Publicly reported customer or deployment scale|Engineering leadership recruitment/i.test(x));
      if (round) growth.unshift("Dec 2025: $86M Series D to invest in Agent Studio and go-to-market expansion " + round);
      if (expansion) growth.push("Toronto technology hub and international engineering expansion " + expansion);
      if (customers) growth.push("Enterprise adoption: 200+ customers or thousands of live deployments (reported) " + customers);
      if (engineering) growth.push("VP Engineering recruitment to scale engineering organisation " + engineering);
      c.growth_signals = [...new Set(growth)].slice(0, 8);
      const perspective = src[0]?.customer_perspective || {};
      const newPriorities = [];
      if (round) newPriorities.push({priority:"Expand Agent Studio and enterprise go-to-market",basis:"stated",why_it_matters:"Series D proceeds are directed toward product development and commercial expansion.",evidence:round});
      if (platform) newPriorities.push({priority:"Grow enterprise developer and integration capabilities",basis:"inferred",why_it_matters:"Developer tooling and APIs suggest an opportunity to qualify adoption and integration priorities, not a confirmed infrastructure gap.",evidence:platform});
      if (engineering) newPriorities.push({priority:"Scale engineering execution while balancing reliability and delivery speed",basis:"inferred",why_it_matters:"Engineering leadership hiring signals organisational scale-up; architecture and technical debt are not confirmed customer problems.",evidence:engineering});
      if (newPriorities.length) {
        src[0].customer_perspective = {...perspective, priorities:newPriorities, business_tension:"Potential trade-off: developer-platform growth versus integration, governance and engineering complexity (to validate)."};
      }
      const opportunities = list(c.cloudflare_opportunities);
      if (platform && !opportunities.some(o => /developer-facing API/i.test(o.signal || ""))) {
        opportunities.unshift({
          pillar:"Build",signal:"Public developer tooling and APIs are part of PolyAI's platform " + platform,
          implication:"A growing external builder audience may increase demands on developer onboarding and API delivery.",
          hypothesis:"Qualify whether API delivery, developer experience or supporting edge workloads are active priorities as the platform expands.",
          product_fit:"Workers for discrete API/edge workloads; API security if an actual requirement emerges; validate with an SE.",
          limitations:"No confirmed Cloudflare gap, existing API architecture, vendor contract or developer bottleneck.",
          stakeholder:"Developer platform product lead and runtime/platform engineering lead",
          discovery_question:"As more developers integrate with PolyAI, which parts of API delivery, onboarding and governance are becoming priorities?",
          outreach:"Your developer platform and APIs suggest a growing builder ecosystem " + platform + ". I'd value understanding what infrastructure priorities that creates.",
          evidence:platform,confidence:"medium"
        });
      }
      c.cloudflare_opportunities = opportunities.slice(0, 4);
      if (platform) c.questions = [...new Set(["As more developers integrate with PolyAI, which parts of API delivery, onboarding and governance are becoming priorities?",...list(c.questions)])].slice(0, 6);
      if (runtime) c.technical_signals = [...new Set(["Public hiring references runtime, inference and data-platform responsibilities " + runtime,...list(c.technical_signals)])].slice(0, 8);
    }
    const compact = false; // Full research is available for every account.
    const sources = list(c.sources);
    const perspective = sources[0]?.customer_perspective || {};
    const pursuit = pursuitFor(c);
    const priorities = Array.isArray(perspective.priorities) ? perspective.priorities : [];
    const opportunities = list(c.cloudflare_opportunities);
    const aiSignals = list(c.ai_signals);
    const hiring = sources.flatMap(source => Array.isArray(source.hiring_signals) ? source.hiring_signals : [])
      .filter((h, i, all) => all.findIndex(x => x.role === h.role && x.evidence === h.evidence) === i);
    const priority = priorityFor(c);
    const pillars = ["Connect", "Protect", "Build"];
    const aiThemes = ["Build & Scale AI Applications", "Secure AI Applications & Agents", "Optimise AI Inference & Delivery", "AI Cost & Inference Economics", "Multi-Model Operations"];
    const link = validLink(c.crunchbase_url);
    const cite = value => esc(value || "").replace(/\[S(\d+)\]/g, (match, n) =>
      Number(n) > 0 && Number(n) <= sources.length ? '<a class="citation" href="#source-' + n + '">' + match + '</a>' : match);
    const aiSourceExcerpt = evidence => {
      const ref = /\[S(\d+)\]/.exec(evidence || "");
      if (!ref) return "";
      const source = sources[Number(ref[1]) - 1];
      if (!source) return "";
      const raw = String(source.snippet || "").replace(/\s+/g, " ").trim();
      if (!raw) return "";
      // A short verbatim excerpt, not an AI-generated interpretation of the source.
      const sentence = raw.split(/(?<=[.!?])\s+/).find(x => x.length >= 35 && !/^\s*(?:#|\||\[)/.test(x)) || raw;
      return sentence.length > 210 ? sentence.slice(0, 207).trimEnd() + "…" : sentence;
    };
    const businessHighlights = priorities.filter(p => p.basis === "stated" && /\[S\d+\]/.test(p.evidence || "")).slice(0, 3);
    const mainOpportunity = opportunities.find(o => o.confidence !== "low" && /\[S\d+\]/.test(o.evidence || ""));
    const reason = compact ? "Series D investment, developer platform expansion and enterprise adoption warrant discovery; infrastructure needs are unverified."
      : ([businessHighlights[0]?.priority ? businessHighlights[0].priority + " " + businessHighlights[0].evidence : "", mainOpportunity?.signal || "", mainOpportunity?.pillar ? mainOpportunity.pillar + " discovery hypothesis — not a verified requirement" : ""].filter(Boolean).join(" · ") || priority.reason);
    const scoredAt = sources[0]?.scored_at || c.researched_at;
    const revisedBrief = !!c.brief_recomputed;
    const scoreCaveat = revisedBrief ? "Account potential uses the saved Clef attractiveness score plus TAS; engagement readiness is recalculated from saved evidence without API calls." : "Clef score reflects the research run; it is not verified buying intent.";
    // Only surface details explicitly present in stored source excerpts.
    const jobSources = sources.map((source,i)=>({source,ref:"[S"+(i+1)+"]"}))
      .filter(x=>/\\b(ai platform engineer|ai infrastructure engineer|agent platform engineer)\\b/i.test(x.source.title || ""));
    const jobInsights = jobSources.flatMap(({source,ref})=>{
      const raw=String(source.snippet || "");
      const details=[];
      if (/\\b(six months|6 months|within (?:the )?first six months)\\b/i.test(raw) && /\\b(agent|platform|ship|production)\\b/i.test(raw))
        details.push("Six-month AI agent delivery milestone " + ref);
      if (/\\b(architectural decisions|architecture decisions|greenfield|from the ground up|still open)\\b/i.test(raw))
        details.push("AI platform architecture still being defined " + ref);
      if (/\\b(observability|tracing|evaluation|cost optimis|cost optimiz)\\b/i.test(raw))
        details.push("Observability, tracing, evaluation and cost controls are in the platform remit " + ref);
      if (/\\b(ai gateways?|model routing|model serving|orchestration)\\b/i.test(raw))
        details.push("Model serving, gateway or orchestration capabilities feature in the platform remit " + ref);
      return details;
    }).filter((v,i,a)=>a.indexOf(v)===i).slice(0,4);
    const commercialNarrative = mainOpportunity ? [
      {label:"Business priority", value:businessHighlights[0] ? businessHighlights[0].priority + " — " + businessHighlights[0].why_it_matters + " " + businessHighlights[0].evidence : "No specific company-stated priority established"},
      {label:"Technical initiative", value:mainOpportunity.signal || mainOpportunity.evidence},
      {label:"Potential consequence", value:mainOpportunity.implication},
      {label:"Cloudflare hypothesis", value:mainOpportunity.hypothesis + " Potential fit: " + mainOpportunity.product_fit},
      {label:"What could rule it out", value:mainOpportunity.limitations},
      {label:"How to qualify", value:mainOpportunity.discovery_question}
    ] : [];

    // Keep imported Crunchbase fields unchanged. Display clearly labelled
    // sourced research facts when the import lacks headcount/funding.
    const sourceFacts = sources.map((source, index) => ({
      text: (source.title || "") + " " + (source.snippet || ""),
      ref: "[S" + (index + 1) + "]",
      url: source.url || ""
    }));
    const headcountFact = sourceFacts.find(x => /\b(?:employees|total employees|headcount)\b/i.test(x.text) &&
      /\b(?:employees|total employees|headcount)\b/i.test(x.text) && /\b\d{2,5}\s+(?:total\s+)?employees\b/i.test(x.text));
    const headcountMatch = headcountFact?.text.match(/\b(\d{2,5})\s+(?:total\s+)?employees\b/i);
    const fundingCandidates = sourceFacts.filter(x => /\b(?:series [a-f]|funding round)\b/i.test(x.text) &&
      /\$\s?(\d+(?:\.\d+)?)\s?(?:million|m)\b/i.test(x.text));
    const fundingFact = fundingCandidates.sort((a,b) => {
      const official = x => /(?:poly\.ai|prnewswire\.com)/i.test(x.url) ? 1 : 0;
      return official(b) - official(a);
    })[0];
    const fundingMatch = fundingFact?.text.match(/(?:raised|raise|funding|round)[^$]{0,90}\$\s?(\d+(?:\.\d+)?)\s?(?:million|m)\b/i) ||
      fundingFact?.text.match(/\$\s?(\d+(?:\.\d+)?)\s?(?:million|m)\b/i);
    const headcountDisplay = c.employees ? esc(c.employees) : headcountMatch
      ? esc(headcountMatch[1]) + " (reported " + cite(headcountFact.ref) + ")" : "Unknown size";
    const fundingDisplay = c.funding_usd != null ? money(c.funding_usd) : fundingMatch
      ? "$" + esc(fundingMatch[1]) + "M round (reported " + cite(fundingFact.ref) + ")" : "—";

    const statusMessage =
      c.status === "running"
        ? "Research is running in the background."
        : c.status === "pending"
          ? "Research is queued. Scheduled processing runs every 5 minutes."
          : c.status === "failed"
            ? "Research failed. You can retry it."
            : c.status === "complete"
              ? "Research completed successfully."
              : "Research has not yet been completed.";

    $("detailContent").innerHTML = `
      <div class="research-export-tools" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <button type="button" class="primary" id="copyFullResearch">Copy readable research</button>
        <button type="button" id="downloadFullResearch">Export research (.txt)</button>
        <button type="button" id="expandResearch">Expand all</button>
        <button type="button" id="collapseResearch">Collapse all</button>
        <button type="button" id="reloadResearch">Reload saved report</button>
      </div>
      <p class="meta" id="exportFeedback" role="status" aria-live="polite">Report stays open while background status updates continue.</p>
      <div class="meta">
        ${esc(c.sector || "Unclassified")} ·
        ${headcountDisplay} employees ·
        ${fundingDisplay} funding ·
        Growth score ${c.growth_score ?? "—"} ·
        Prediction ${esc(c.growth_prediction || "—")} ·
        Last funding ${esc(c.last_funding_date || "—")}
      </div>

      <p>${esc(c.description || "")}</p>

      ${link ? `
        <p>
          <a href="${esc(link)}"
             target="_blank"
             rel="noopener noreferrer">
            Crunchbase profile ↗
          </a>
        </p>
      ` : ""}

      <div class="info">${esc(statusMessage)}</div>

      <button class="primary research-btn" id="researchOne"
        ${c.status === "running"
          ? "disabled"
          : ""}>
        ${researchButtonText(c.status)}
      </button>
      <p class="info" id="researchFeedback" role="status" aria-live="polite"></p>

      <div class="priority-summary brief-hero">
        <div class="priority-head"><strong>${esc(priority.tier)}</strong><strong>${esc(priority.score ?? "—")}/100</strong></div>
        <p><strong>Why this account:</strong> ${cite(reason)}</p>\n        <p class="meta">${esc(scoreCaveat)}</p>
        <p class="meta">Territory rank: ${rankedTerritory().find(x => x.id === c.id)?.rank ?? "Unranked"} · ${esc(priority.quality)} · Absolute score determines priority; rank compares researched accounts.</p>
      </div>
      <div class="brief-stats"><span>Research: <strong>${esc(c.confidence || "unknown")} confidence</strong></span><span>Readiness: <strong>${esc(priority.engagement.total)}/100</strong></span></div>
      <section class="brief-priorities">
        <h3>Company priorities &amp; strategic direction</h3>
        <p class="meta">Company-stated priorities are distinguished from inferred ones. These are outside-in findings, not confirmed customer conversations.</p>
        ${!compact && perspective.mission ? '<p><strong>What they are working toward:</strong> ' + cite(perspective.mission) + '</p>' : ''}
        ${jobInsights.length ? `<div class="brief-signal"><strong>Engineering hiring signal · AI platform</strong>
          ${jobInsights.map(x=>'<p class="meta">' + cite(x) + '</p>').join("")}
          <p class="meta">Planned engineering work, not a confirmed vendor evaluation.</p>
        </div>` : ""}
        ${priorities.length ? (compact ? priorities.slice(0, 3) : priorities).map((p, i) => `
          <div class="brief-signal">
            <div class="signal-head"><strong>${i + 1}. ${esc(p.priority)}</strong><span class="mini-status">${esc(p.basis === "stated" ? "Company-stated" : "Inferred")}</span></div>
            ${!compact && p.why_it_matters ? '<p>' + cite(p.why_it_matters) + '</p>' : ''}
            <div class="meta">Evidence: ${cite(p.evidence || "Not established")}</div>
          </div>`).join("") : '<p class="meta">No sufficiently evidenced strategic priorities identified yet.</p>'}
        ${!compact && perspective.business_tension ? '<p class="meta"><strong>Potential business tradeoff:</strong> ' + cite(perspective.business_tension) + '</p>' : ''}
      </section>
      <h3>Cloudflare opportunities</h3>
      <p class="meta">Outside-in hypotheses, not verified customer problems.</p>
      ${pillars.map(p => {
        const matches = opportunities.filter(o => o.pillar === p && /\[S\d+\]/.test(o.evidence || ""));
        return '<div class="brief-signal"><strong>' + p + '</strong>' +
          (matches.length ? matches.slice(0, 2).map(o =>
            '<p><strong>Research signal:</strong> ' + cite(o.signal || o.evidence) + '</p>' +
            '<p class="meta"><strong>Cloudflare fit:</strong> ' + esc(o.product_fit || "To qualify") + '</p>'
          ).join("") : '<p class="meta">No specific evidenced opportunity.</p>') + '</div>';
      }).join("")}
      ${compact ? `<details class="brief-details"><summary>AI opportunity signals</summary>` : ""}
      <h3>AI opportunity signals</h3>
      <p class="meta">AI economics and multi-model signals are exploratory and not separately scored.</p>
      ${aiThemes.map(theme => {
        const signal = aiSignals.find(x => x.theme === theme);
        return '<div class="brief-ai-row"><div class="signal-head"><strong>' + esc(theme) + '</strong>' + pill(signal?.signal || "insufficient") + '</div>' + (signal && signal.signal !== "insufficient" ? '<p class="meta"><strong>Source excerpt:</strong> ' + cite(signal.hypothesis || aiSourceExcerpt(signal.evidence) || "Specific activity documented") + ' ' + cite(signal.evidence) + '</p>' : '<p class="meta">Insufficient public evidence.</p>') + '</div>';
      }).join("")}
      ${compact ? "</details>" : ""}
      <h3>Recommended stakeholders</h3>
      ${(sources[0]?.recommended_stakeholders || []).map(h => '<div class="brief-signal"><strong>' + esc(h.name ? h.name + ' — ' + h.role : h.role + ' (name not verified)') + '</strong>' + (h.signals || []).map(signal => '<p>' + cite(signal) + '</p>').join('') + '</div>').join('') || '<p class="meta">No verified stakeholder recommendations saved. Refresh this account to discover relevant people and roles.</p>'}
      <details class="brief-details"><summary>Discovery questions</summary>
      ${compact ? listHtml(list(c.questions).slice(0, 3)) : listHtml(c.questions)}
      </details>
      <details class="brief-details"><summary>Supporting commercial reasoning</summary>
      ${commercialNarrative.map(step => '<div class="brief-signal"><strong>' + esc(step.label) + '</strong><p>' + cite(step.value) + '</p></div>').join("")}
      </details>
      <details class="brief-details"><summary>IGNITE scoring and saved Clef assessment</summary>
      <h3>Account attractiveness · Clef Flash</h3>
      ${pursuit?.status === 'scored' && pursuit.account ? `
        <p><strong>${esc(pursuit.account.total)}/100 base · ${esc(priority.score)}/100 TAS-adjusted potential</strong></p>
        <p class="meta">Is this company worth pursuing? Not a confirmed Cloudflare opportunity.</p>
        ${(pursuit.account.dimensions || []).map(d => `
          <div class="opportunity"><strong>${esc(d.label)}: ${esc(Math.round(d.score / 4 * d.weight))}/${esc(d.weight)} points</strong>
          <div class="meta">Clef rubric: ${esc(d.score)}/4</div></div>`).join('')}
        <h3>Engagement readiness · IGNITE</h3>
        <p><strong>${esc(priority.engagement.total)}/100 · ${esc(priority.tier)}</strong></p>
        ${priority.engagement.dimensions.map(d=>`<p>${esc(d.label)}: ${Math.round(d.score*d.weight/4)}/${d.weight}</p>`).join("")}
        <p class="meta">60/100 threshold on both axes. Engagement readiness is not verified buying intent.</p>
        <h3>Historical Clef buying-readiness assessment (not used for IGNITE)</h3>
        <p><strong>${esc(pursuit.readiness?.total ?? '—')}/100 · ${esc(pursuit.readiness?.tier || 'Unknown')}</strong></p>
        <p class="meta">How much of the technical need, timing and access is actually evidenced?</p>
        ${(pursuit.readiness?.dimensions || []).map(d => `
          <div class="opportunity"><strong>${esc(d.label)}: ${esc(Math.round(d.score / 4 * d.weight))}/${esc(d.weight)} points</strong>
          <div class="meta">Clef rubric: ${esc(d.score)}/4</div></div>`).join('')}
        <p><strong>Suggested next action:</strong> ${esc(({Pursue:"Prioritize AE discovery; involve SE after qualification.",Develop:"Develop account and validate initiative timing.",Activate:"Qualify efficiently against commercial potential.",Nurture:"Monitor triggers."})[priority.tier] || "Research required")}</p>
        <p><strong>Best-supported pillar:</strong> ${esc(pursuit.primary_pillar || 'Not established')}</p>
        <p class="meta">${esc(pursuit.caveat || '')}</p>
      ` : pursuit?.status === 'scored' ? `
        <p><strong>Legacy pursuit score: ${esc(pursuit.total)}/100 · ${esc(pursuit.tier)}</strong></p>
        <p class="meta">Refresh research to generate separate attractiveness and readiness scores.</p>
      ` : `
        <p><strong>Not evaluated</strong></p>
        <p class="meta">${esc(pursuit?.caveat || 'Refresh research to evaluate.')}</p>
      `}
      </details>
      <details class="brief-details"><summary>Additional company research and technical context</summary>
      <h3>Digital-native qualification</h3>
      ${pill(c.digital_native || "unresearched")}
      <p>
        ${esc(c.digital_native_reason ||
          "Research not yet completed.")}
      </p>

      <h3>Company overview</h3>
      <p>${esc(c.summary || "No research available yet.")}</p>
      <h3>Growth signals</h3>
      ${listHtml(c.growth_signals)}

      <h3>Technical signals</h3>
      ${listHtml(c.technical_signals)}

      <h3>Hiring &amp; technology signals</h3>
      <p class="meta">Employer-specific job postings are hiring indicators, not proof that listed technologies are deployed. Dates are shown only when stated in the source.</p>
      ${hiring.length ? hiring.map(h => `
        <div class="opportunity">
          <strong>${esc(h.role)}</strong>
          <p class="meta">Posted: ${esc(h.posted_date || 'Not verified')} · Source confidence: ${esc(h.confidence)}</p>
          <p>Technologies mentioned: ${esc((h.technologies || []).join(', ') || 'None specified')}</p>
          <p class="meta">Evidence: ${esc(h.evidence)}</p>
          <p>Discovery angle: ${esc(h.relevance || 'Qualify the purpose of this hiring initiative.')}</p>
        </div>
      `).join('') : '<p class="meta">No verified employer-specific hiring signals found in the research sources.</p>'}

      </details>
\n      <details class="brief-details"><summary>Detailed research &amp; TAS · ${formatTas(tasTableValue(c))}/yr scenario</summary>
      ${pillars.map(p => {
        const matches = opportunities.filter(o => o.pillar === p && /\[S\d+\]/.test(o.evidence || ""));
        return '<div class="brief-signal"><strong>' + p + '</strong>' +
          (matches.length ? matches.map(o =>
            '<p><strong>Research signal:</strong> ' + cite(o.signal || o.evidence) + '</p>' +
            '<p><strong>Why it matters:</strong> ' + cite(o.implication || "Not established") + '</p>' +
            '<p><strong>Hypothesis:</strong> ' + cite(o.hypothesis) + '</p>' +
            '<p><strong>Potential fit:</strong> ' + esc(o.product_fit || "Not established") + '</p>' +
            '<p><strong>What we do not know:</strong> ' + esc(o.limitations || "Not established") + '</p>' +
            '<p><strong>Who to approach:</strong> ' + esc(o.stakeholder || "Not established") + '</p>' +
            '<p><strong>Discovery:</strong> ' + esc(o.discovery_question || "Not established") + '</p>' +
            '<p><strong>Outreach example:</strong> ' + esc(o.outreach || "Not established") + '</p>' +
            '<div class="meta">Evidence: ' + cite(o.evidence) + ' · ' + esc(o.confidence || "unknown") + ' confidence</div>'
          ).join("") : '<p class="meta">No specific evidenced opportunity.</p>') + '</div>';
      }).join("")}
      ${tasSection(c)}
      </details>
      <details class="brief-details" id="research-sources"><summary>Sources and excerpts (${sources.length})</summary>
      <p class="meta">Numbered citations link to the corresponding source excerpt. Open the original page to verify context.</p>
      ${sources.map((s, i) => {
        const u = validLink(s.url);
        return `
          <div class="source" id="source-${i + 1}">
            ${u
              ? `<a href="${esc(u)}"
                    target="_blank"
                    rel="noopener noreferrer">
                   [S${i + 1}] ${esc(s.title || u)} ↗
                 </a>`
              : `[S${i + 1}] ${esc(s.title)}`}
            <p>${esc(s.snippet)}</p>
          </div>
        `;
      }).join("") || "<p>No sources yet.</p>"}

      </details>
      <p class="meta">
        Research confidence:
        ${esc(c.confidence || "not assessed")}
        · Last researched:
        ${esc(c.researched_at || "never")}
      </p>

      ${c.error
        ? `<p class="info">Last error: ${esc(c.error)}</p>`
        : ""}

      <div class="info">
        AI-generated research is a starting point.
        Verify cited pages and do not present
        hypotheses as confirmed customer problems.
      </div>
    `;

    wireTas();
    const reportRoot = $("detailContent");
    const exportFeedback = message => { const el = $("exportFeedback"); if (el) el.textContent = message; };
    const fullResearchText = (includeRaw = false) => {
      const clone = reportRoot.cloneNode(true);
      clone.removeAttribute("id");
      clone.querySelectorAll("details").forEach(el => { el.open = true; });
      clone.querySelectorAll("a[href]").forEach(el => {
        const href = el.getAttribute("href");
        if (/^https?:\/\//i.test(href)) el.append(document.createTextNode(" (" + href + ")"));
      });
      clone.querySelectorAll("input, select, textarea").forEach(el => {
        el.replaceWith(document.createTextNode(el.value || ""));
      });
      clone.querySelectorAll(".research-export-tools, button, #exportFeedback, #researchFeedback").forEach(el => el.remove());
      clone.style.cssText = "position:fixed;left:-100000px;top:0;width:900px;display:block;";
      document.body.appendChild(clone);
      try {
        return c.name + "\nRESEARCH REPORT\n\n" + clone.innerText.trim() +
          (includeRaw ? "\n\n--- COMPLETE SAVED RESEARCH DATA (JSON) ---\n" + JSON.stringify(c, null, 2) : "");
      } finally { clone.remove(); }
    };
    $("copyFullResearch").onclick = async () => {
      const value = fullResearchText();
      try {
        await navigator.clipboard.writeText(value);
        exportFeedback("Readable research copied, including collapsed sections and sources. Raw JSON is available in the text export.");
      } catch {
        const field = document.createElement("textarea");
        field.value = value;
        field.setAttribute("aria-label", "Full research text");
        field.style.cssText = "width:100%;min-height:180px;";
        $("exportFeedback").after(field);
        field.focus(); field.select();
        exportFeedback("Clipboard unavailable. Press Ctrl+C (or Cmd+C) to copy the selected full report.");
      }
    };
    $("downloadFullResearch").onclick = () => {
      const url = URL.createObjectURL(new Blob([fullResearchText(true)], {type:"text/plain;charset=utf-8"}));
      const a = document.createElement("a");
      a.href = url; a.download = c.name.replace(/[^a-z0-9_-]+/gi, "-") + "-research.txt";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      exportFeedback("Full research export prepared.");
    };
    $("expandResearch").onclick = () => reportRoot.querySelectorAll("details").forEach(el => { el.open = true; });
    $("collapseResearch").onclick = () => reportRoot.querySelectorAll("details").forEach(el => { el.open = false; });
    $("reloadResearch").onclick = () => detail(id, true);
    const button = $("researchOne");
    const feedback = message => { const el = $("researchFeedback"); if (el) el.textContent = message; };

    if (button && !button.disabled) {
      button.onclick = async () => {
        if (activeResearchRequests.has(id)) return;
        activeResearchRequests.add(id);
        button.disabled = true;
        button.textContent = "Queuing research…";
        feedback("Submitting one refresh request…");
        try {
          const result = await api("/api/research/" + encodeURIComponent(id), {method:"POST"});
          const already = result.status === "already_queued";
          const message = already ? "Research is already queued or running. No extra click needed." : "Research queued. Waiting for the updated report…";
          feedback(message);
          button.textContent = "⏳ Research queued";
          notice(message);
          // Poll the actual persisted status rather than re-rendering the stale
          // completed brief immediately (which previously re-enabled Refresh).
          let sawActive = !already;
          for (let attempt=0;attempt<90;attempt++) {
            await new Promise(resolve=>setTimeout(resolve,4000));
            if (currentCompanyId !== id) return;
            let latest;
            try { latest = await api("/api/companies/"+encodeURIComponent(id)); }
            catch (pollError) { feedback("Research submitted; status check failed: "+pollError.message); continue; }
            if (latest.status === "queued" || latest.status === "running" || latest.status === "pending") {
              sawActive = true;
              feedback("Research "+latest.status+"… checking automatically.");
              button.textContent = "⏳ Research "+latest.status;
              continue;
            }
            if (latest.status === "failed") {
              feedback("Research failed: "+(latest.error||"Unknown error"));
              activeResearchRequests.delete(id);
              button.disabled=false;
              button.textContent="↻ Retry research";
              return;
            }
            if (latest.status === "complete" && (sawActive || latest.researched_at !== c.researched_at)) {
              feedback("Updated research is ready.");
              activeResearchRequests.delete(id);
              await load();
              button.textContent = "Updated report ready";
              feedback("Updated research is ready. Click Reload saved report when you finish reading or copying.");
              return;
            }
          }
          feedback("Research request accepted but still processing. You can close this brief and return later; no repeated clicks are needed.");
          button.textContent="⏳ Check back later";
        } catch (e) {
          const message = /Unauthorized/i.test(e.message)
            ? "Refresh requires an admin token. Close this brief, select Set admin token, enter the configured ADMIN_TOKEN, then try again."
            : "Could not queue research: " + e.message;
          feedback(message);
          notice(message);
          activeResearchRequests.delete(id);
          button.disabled=false;
          button.textContent=researchButtonText(c.status);
        }
      };
    }

    if (!silent && c.status === "failed" && c.error) {
      notice("Research failed: " + c.error);
    }

  } catch (e) {
    if (!silent) notice(e.message);
  }
}

// --------------------------------------------------
// AUTOMATIC STATUS REFRESH
// --------------------------------------------------

async function refreshStatus() {
  if (refreshBusy) return;

  refreshBusy = true;

  try {
    await load();

    if (
      currentCompanyId &&
      !$("overlay").classList.contains("hidden")
    ) {
      // The per-account refresh poll owns the brief until research finishes.
      // Do not replace its button or feedback during a background status tick.
      // Keep the open report as a stable snapshot. Reload is explicitly user-controlled.
      // Background table refresh must never replace selected text or expanded sections.
    }
  } finally {
    refreshBusy = false;
  }
}

// Refresh status every 15 seconds.
setInterval(() => {
  if (!document.hidden) {
    refreshStatus().catch(e => {
      console.warn("Status refresh failed:", e);
    });
  }
}, 15000);

// --------------------------------------------------
// CSV IMPORT
// --------------------------------------------------

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }

  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);

  const heads = (rows.shift() || []).map(h =>
    h.replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
  );

  return rows.map(r =>
    Object.fromEntries(
      heads.map((h, i) => [h, r[i] || ""])
    )
  );
}

async function importData(text) {
  const data = parseCsv(text).map(r => ({
    name: r.name || r.company_name || "",
    website: r.website || "",
    description: r.description || "",
    crunchbase_url: r.crunchbase_url || "",
    employees: r.employees || r.employee_range || "",
    funding_usd:
      r.funding_usd || r.total_funding_usd || "",
    growth_score: r.growth_score || "",
    sector: r.sector || "",
    last_funding_date: r.last_funding_date || "",
    growth_score_tier: r.growth_score_tier || "",
    growth_prediction: r.growth_prediction || ""
  }));

  if (!data.length) {
    throw Error("CSV is empty");
  }

  // Import in chunks of up to 500 companies.
  let imported = 0;

  for (let i = 0; i < data.length; i += 500) {
    const chunk = data.slice(i, i + 500);
    const result = await api("/api/import", {
      method: "POST",
      body: JSON.stringify(chunk)
    });
    imported += result.imported;
  }

  notice(
    `Imported ${imported} companies. ` +
    "Select the companies you want to research, then click Research selected."
  );

  await load();
}

// --------------------------------------------------
// BUTTONS
// --------------------------------------------------

$("settingsBtn").onclick = () => {
  const s = prompt(
    "Enter your FlareFinder ADMIN_TOKEN (stored only for this browser tab):",
    token
  );

  if (s !== null) {
    token = s.trim();
    sessionStorage.setItem("flarefinder-admin", token);

    notice(
      token
        ? "Admin token set for this tab."
        : "Admin token cleared."
    );
  }
};

$("csvInput").onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    await importData(await file.text());
  } catch (err) {
    notice(err.message);
  }

  e.target.value = "";
};

$("sampleBtn").onclick = async () => {
  try {
    const response = await fetch("/sample-companies.csv");
    if (!response.ok) {
      throw Error("Sample file missing");
    }
    await importData(await response.text());
  } catch (e) {
    notice(e.message);
  }
};

$("crunchbaseBtn").onclick = async () => {
  try {
    const response = await fetch("/crunchbase-companies.csv");
    if (!response.ok) {
      throw Error("Bundled CSV missing");
    }
    await importData(await response.text());
  } catch (e) {
    notice(e.message);
  }
};

$("selectVisibleBtn").onclick = () => {
  for (const c of visibleResearchCandidates()) selectedCompanies.add(c.id);
  render();
  updateSelectionLabel();
  notice(selectedCompanies.size + " companies selected. Click Research selected to queue them in batches.");
};
$("clearSelectionBtn").onclick = () => {
  selectedCompanies.clear();
  render();
  updateSelectionLabel();
};
$("batchBtn").onclick = async () => {
  const ids = [...selectedCompanies];
  if (!ids.length) { notice("Select companies or click Select visible unresearched first."); return; }
  const button = $("batchBtn");
  button.disabled = true;
  let queued = 0, submitted = 0;
  try {
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const result = await api("/api/research/selected", {
        method: "POST", body: JSON.stringify({ids:chunk})
      });
      queued += result.queued || 0;
      submitted += chunk.length;
      for (const id of chunk) selectedCompanies.delete(id);
      updateSelectionLabel();
      notice("Submitted " + submitted + "/" + ids.length + " accounts; " + queued + " newly queued. Research runs in the background.");
    }
    notice("Submitted " + submitted + " accounts; " + queued + " newly queued. Research runs in the background (up to 3 concurrently).");
    await load();
  } catch (e) {
    notice("Batch stopped after " + submitted + "/" + ids.length + " submissions: " + e.message + ". Remaining selection is preserved; retry when ready.");
    await load();
  } finally {
    button.disabled = false;
    updateSelectionLabel();
  }
};

$("syncCuratedBtn").onclick = async () => {
  try {
    const response = await fetch("/crunchbase-companies.csv", {cache:"no-store"});
    if (!response.ok) throw Error("Curated shortlist CSV unavailable");
    const raw = await response.text();
    const parsed = parseCsv(raw);
    if (parsed.length !== 106) throw Error("Expected exactly 106 curated companies; found "+parsed.length);
    // Ensure every canonical account is present before attempting removal.
    await importData(raw);
    const preview = await api("/api/sync-curated", {method:"POST",body:JSON.stringify({confirm:false})});
    if (preview.missing) throw Error(preview.missing+" curated accounts are missing; no deletions made.");
    if (!preview.remove) { notice("Already synchronized: 106 companies."); await load(); return; }
    if (!confirm("Remove "+preview.remove+" companies outside the 106-company shortlist, including their saved research? This cannot be undone. Retained research will be preserved.")) return;
    const result = await api("/api/sync-curated", {method:"POST",body:JSON.stringify({confirm:true,expected_ids:preview.ids})});
    selectedCompanies.clear();
    notice("Synchronization complete: removed "+result.deleted+" companies; "+result.remaining+" remain.");
    await load();
  } catch(e) { notice("Synchronization failed: "+e.message); }
};

$("cleanupExcludedBtn").onclick = async () => {
  try {
    const preview = await api("/api/cleanup-excluded", {method:"POST",body:JSON.stringify({confirm:false})});
    if (!preview.count) { notice("No excluded accounts found in D1."); return; }
    if (!confirm("Remove " + preview.count + " excluded companies and their saved research from FlareFinder? Active jobs will be skipped. This cannot be undone.")) return;
    const result = await api("/api/cleanup-excluded", {method:"POST",body:JSON.stringify({confirm:true})});
    selectedCompanies.clear();
    notice("Removed " + result.deleted + " excluded companies. Skipped " + result.skipped + " active research jobs.");
    await load();
  } catch (e) { notice(e.message); }
};

$("clearQueueBtn").onclick = async () => {
  if (!confirm("Clear ALL pending research requests? Running and completed research will be preserved.")) return;
  try {
    const result = await api("/api/research/clear-pending", {method:"POST"});
    notice(result.cleared + " pending research requests cleared. Running and completed research preserved.");
    await load();
  } catch (e) { notice(e.message); }
};

function closeDetail() {
  currentCompanyId = null;
  detailRequestId++;
  $("overlay").classList.add("hidden");
}

$("closeBtn").onclick = closeDetail;

$("overlay").onclick = e => {
  if (e.target === $("overlay")) {
    closeDetail();
  }
};

["search", "nativeFilter", "statusFilter", "tierFilter"].forEach(id => {
  $(id).addEventListener(
    id === "search" ? "input" : "change",
    render
  );
});

load();
