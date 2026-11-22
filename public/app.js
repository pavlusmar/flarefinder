
const $ = id => document.getElementById(id);

let companies = [];
let token = sessionStorage.getItem("flarefinder-admin") || "";
let currentCompanyId = null;
let detailRequestId = 0;
let refreshBusy = false;
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
function priorityFor(c) {
  const p = pursuitFor(c);
  const score = c.status === "complete" && p?.status === "scored" ? (p.account?.total ?? p.total) : null;
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
  const datedFunding = c.last_funding_date && /^20\d\d/.test(c.last_funding_date) ? "Funding " + c.last_funding_date : "";
  const leading = sourced.sort((a,b) => ({high:3,medium:2,low:1}[b.confidence]||0)-({high:3,medium:2,low:1}[a.confidence]||0))[0];
  const signal = strong[0];
  const reason = score === null ? "Research required before prioritization" :
    [datedFunding, leading ? leading.pillar + ": " + leading.hypothesis : "", signal ? signal.theme + ": " + signal.hypothesis : ""].filter(Boolean).join(" · ").slice(0, 190) ||
    "No sufficiently sourced workload trigger; validate fit";
  return {score,tier,reason,quality,pillar:leading?.pillar || "Unverified",ai:signal?.theme || "Not established"};
}
function rankedTerritory() {
  const result = companies.map(c => ({...c, priority:priorityFor(c)}));
  result.sort((a,b) => (b.priority.score ?? -1)-(a.priority.score ?? -1) || a.name.localeCompare(b.name));
  let rank=0;
  for (const c of result) if(c.priority.score !== null) c.rank=++rank;
  return result;
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
      <td class="score">${c.priority.score ?? "—"}</td>
      <td>${esc(c.priority.pillar)}</td>
      <td>${esc(c.priority.ai)}</td>
      <td>${pill(c.status || "pending")}</td>
      <td><button class="link-btn" data-id="${esc(c.id)}">View signals →</button></td>
    </tr>`).join("") : '<tr><td class="empty" colspan="9">No matching companies.</td></tr>';
  document.querySelectorAll("[data-id]").forEach(b => b.onclick = () => detail(b.dataset.id));
  document.querySelectorAll("[data-select-id]").forEach(b => b.onchange = () => { if (b.checked) selectedCompanies.add(b.dataset.selectId); else selectedCompanies.delete(b.dataset.selectId); $("batchBtn").textContent = `▶ Research selected (${selectedCompanies.size})`; });
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
function tasSection(c) {
  const baseline = tasIndustryBaseline(c.sector);
  return `<section class="brief-tas">
    <h3>Commercial potential · TAS scenario</h3>
    <p class="meta">Planning scenario only — not a Cloudflare quote, verified budget, forecast or quota.</p>
    <div class="brief-signal">
      <label>Annual revenue (USD millions; verify source)
        <input id="tasRevenue" type="number" min="0" step="0.1" placeholder="Unknown — enter researched revenue" style="width:100%;margin-top:5px">
      </label>
      <p class="meta">Industry proxy: ${esc(baseline.label)}. Broad technology-spend baseline ${baseline.pct}% of revenue (editable; not a company fact).</p>
      <label>Technology spend % <input id="tasIT" type="number" min="0" max="100" step="0.1" value="${baseline.pct}" style="width:85px"></label>
      <p class="meta">Illustrative addressable share of technology spend — not verified Cloudflare pricing. Adjust based on actual workloads and vendors.</p>
      <label>Low % <input id="tasLow" type="number" min="0" max="100" step="0.1" value="1" style="width:75px"></label>
      <label>High % <input id="tasHigh" type="number" min="0" max="100" step="0.1" value="5" style="width:75px"></label>
      <div id="tasResult" class="info">TAS not estimated: annual revenue is unknown.</div>
      <p class="meta">Formula: revenue × technology-spend ratio × Cloudflare-addressable share. Default 1–5% is a hypothetical sensitivity range, not an industry statistic. AI infrastructure is included, not added twice. Replace with workload-based estimates when known.</p>
    </div>
  </section>`;
}
function wireTas() {
  const inputs = ["tasRevenue","tasIT","tasLow","tasHigh"].map(id => $(id));
  if (inputs.some(x => !x)) return;
  const update = () => {
    const [revenue,it,low,high] = inputs.map(x => x.value === "" ? NaN : Number(x.value));
    const out = $("tasResult");
    if (![revenue,it,low,high].every(Number.isFinite) || revenue <= 0 || it < 0 || it > 100 || low < 0 || high > 100 || high < low) {
      out.textContent = "TAS not estimated: enter valid revenue and percentage assumptions (high ≥ low).";
      return;
    }
    const tech = revenue * 1e6 * it / 100;
    const fmt = n => "$" + Math.round(n).toLocaleString("en-US");
    out.textContent = "Estimated technology spend: " + fmt(tech) + "/yr · Illustrative Cloudflare TAS: " + fmt(tech * low / 100) + "–" + fmt(tech * high / 100) + "/yr (unvalidated)";
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

    const sources = list(c.sources);
    const perspective = sources[0]?.customer_perspective || {};
    const pursuit = sources[0]?.pursuit_score || null;
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
    const businessHighlights = priorities.filter(p => p.basis === "stated" && /\[S\d+\]/.test(p.evidence || "")).slice(0, 3);
    const reason = [c.last_funding_date ? "Latest funding " + c.last_funding_date : "", businessHighlights[0]?.why_it_matters || "", opportunities.find(o => o.confidence !== "low" && /\[S\d+\]/.test(o.evidence || ""))?.hypothesis || ""].filter(Boolean).join(" · ") || priority.reason;

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
      <div class="meta">
        ${esc(c.sector || "Unclassified")} ·
        ${esc(c.employees || "Unknown size")} employees ·
        ${money(c.funding_usd)} funding ·
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
        <p><strong>Why this account:</strong> ${cite(reason)}</p>
        <p class="meta">Territory rank: ${rankedTerritory().find(x => x.id === c.id)?.rank ?? "Unranked"} · ${esc(priority.quality)} · Absolute score determines priority; rank compares researched accounts.</p>
      </div>
      ${tasSection(c)}
      <div class="brief-stats"><span>Research: <strong>${esc(c.confidence || "unknown")} confidence</strong></span><span>Readiness: <strong>${esc(pursuit?.readiness?.tier || "unknown")}</strong></span></div>
      <section class="brief-priorities">
        <h3>Company priorities &amp; strategic direction</h3>
        <p class="meta">Company-stated priorities are distinguished from inferred ones. These are outside-in findings, not confirmed customer conversations.</p>
        ${perspective.mission ? '<p><strong>What they are working toward:</strong> ' + cite(perspective.mission) + '</p>' : ''}
        ${priorities.length ? priorities.map((p, i) => `
          <div class="brief-signal">
            <div class="signal-head"><strong>${i + 1}. ${esc(p.priority)}</strong><span class="mini-status">${esc(p.basis === "stated" ? "Company-stated" : "Inferred")}</span></div>
            ${p.why_it_matters ? '<p>' + cite(p.why_it_matters) + '</p>' : ''}
            <div class="meta">Evidence: ${cite(p.evidence || "Not established")}</div>
          </div>`).join("") : '<p class="meta">No sufficiently evidenced strategic priorities identified yet.</p>'}
        ${perspective.business_tension ? '<p class="meta"><strong>Potential business tradeoff:</strong> ' + cite(perspective.business_tension) + '</p>' : ''}
      </section>
      <h3>Other business signals</h3>
      ${list(c.growth_signals).length ? listHtml(c.growth_signals) : '<p class="meta">No additional structured growth signals found. Review the cited company announcements below.</p>'}
      <h3>Cloudflare opportunities</h3>
      <p class="meta">Outside-in hypotheses, not verified customer problems.</p>
      ${pillars.map(p => {
        const matches = opportunities.filter(o => o.pillar === p && /\[S\d+\]/.test(o.evidence || ""));
        return '<div class="brief-signal"><strong>' + p + '</strong>' + (matches.length ? matches.map(o => '<p>' + cite(o.hypothesis) + '</p><div class="meta">' + cite(o.evidence) + ' · ' + esc(o.confidence) + ' confidence</div>').join("") : '<p class="meta">No specific evidenced opportunity.</p>') + '</div>';
      }).join("")}
      <h3>AI opportunity signals</h3>
      <p class="meta">AI economics and multi-model signals are exploratory and not separately scored.</p>
      ${aiThemes.map(theme => {
        const signal = aiSignals.find(x => x.theme === theme);
        return '<div class="brief-ai-row"><div class="signal-head"><strong>' + esc(theme) + '</strong>' + pill(signal?.signal || "insufficient") + '</div>' + (signal && signal.signal !== "insufficient" ? '<p>' + cite(signal.evidence) + '</p>' : '<p class="meta">Insufficient public evidence.</p>') + '</div>';
      }).join("")}
      <h3>Discovery questions</h3>
      ${listHtml(c.questions)}
      <details class="brief-details"><summary>Detailed Clef scoring and readiness</summary>
      <h3>Account attractiveness · Clef Flash</h3>
      ${pursuit?.status === 'scored' && pursuit.account ? `
        <p><strong>${esc(pursuit.account.total)}/100 · ${esc(pursuit.tier)}</strong></p>
        <p class="meta">Is this company worth pursuing? Not a confirmed Cloudflare opportunity.</p>
        ${(pursuit.account.dimensions || []).map(d => `
          <div class="opportunity"><strong>${esc(d.label)}: ${esc(Math.round(d.score / 4 * d.weight))}/${esc(d.weight)} points</strong>
          <div class="meta">Clef rubric: ${esc(d.score)}/4</div></div>`).join('')}
        <h3>Opportunity readiness · Clef Flash</h3>
        <p><strong>${esc(pursuit.readiness?.total ?? '—')}/100 · ${esc(pursuit.readiness?.tier || 'Unknown')}</strong></p>
        <p class="meta">How much of the technical need, timing and access is actually evidenced?</p>
        ${(pursuit.readiness?.dimensions || []).map(d => `
          <div class="opportunity"><strong>${esc(d.label)}: ${esc(Math.round(d.score / 4 * d.weight))}/${esc(d.weight)} points</strong>
          <div class="meta">Clef rubric: ${esc(d.score)}/4</div></div>`).join('')}
        <p><strong>Suggested next action:</strong> ${esc(pursuit.next_action || '')}</p>
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
\n      <h3 id="research-sources">Sources and excerpts (${sources.length})</h3>
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
    const button = $("researchOne");
    const feedback = message => { const el = $("researchFeedback"); if (el) el.textContent = message; };

    if (button && !button.disabled) {
      button.onclick = async () => {
        button.disabled = true;
        button.textContent = "Queuing research…";
        feedback("Sending refresh request…");

        try {
          await api(
            "/api/research/" + encodeURIComponent(id),
            { method: "POST" }
          );

          const message = "Research started for " + c.name + ". Check status shortly.";
          feedback(message);
          notice(message);

          await load();
          await detail(id, true);
        } catch (e) {
          const message = /Unauthorized/i.test(e.message)
            ? "Refresh requires an admin token. Close this brief, select Set admin token, enter the configured ADMIN_TOKEN, then try again."
            : "Could not queue research: " + e.message;
          feedback(message);
          notice(message);
          button.disabled = false;
          button.textContent = researchButtonText(c.status);
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
      await detail(currentCompanyId, true);
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

$("batchBtn").onclick = async () => {
  const ids = [...selectedCompanies];
  if (!ids.length) { notice("Select the companies you want to research first."); return; }
  try {
    const result = await api("/api/research/selected", {
      method: "POST", body: JSON.stringify({ids})
    });
    selectedCompanies.clear();
    $("batchBtn").textContent = "▶ Research selected (0)";
    notice(result.message + " " + result.queued + " companies selected; up to 3 run concurrently.");
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
