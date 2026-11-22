
const $ = id => document.getElementById(id);

let companies = [];
let token = sessionStorage.getItem("flarefinder-admin") || "";
let currentCompanyId = null;
let detailRequestId = 0;
let refreshBusy = false;

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

function render() {
  const q = $("search").value.toLowerCase();
  const native = $("nativeFilter").value;
  const status = $("statusFilter").value;

  const items = companies.filter(c =>
    (
      c.name + " " +
      (c.sector || "") + " " +
      (c.description || "")
    ).toLowerCase().includes(q) &&
    (!native || c.digital_native === native) &&
    (!status || (c.status || "pending") === status)
  );

  $("total").textContent = companies.length;
  $("done").textContent =
    companies.filter(c => c.status === "complete").length;
  $("native").textContent =
    companies.filter(c => c.digital_native === "yes").length;
  $("pending").textContent =
    companies.filter(c => c.status !== "complete").length;

  $("rows").innerHTML = items.length
    ? items.map(c => `
      <tr>
        <td>
          <div class="company-name">${esc(c.name)}</div>
          <div class="description">
            ${esc(c.sector || c.description || "No description")}
          </div>
        </td>
        <td>${esc(c.employees || "—")}</td>
        <td>${money(c.funding_usd)}</td>
        <td class="score">${c.growth_score ?? "—"}</td>
        <td>${pill(c.digital_native || "unresearched")}</td>
        <td>${pill(c.status === "complete" ? aiSignal(c.ai_signals) : "unresearched")}</td>
        <td>${pill(c.status || "pending")}</td>
        <td>
          <button class="link-btn" data-id="${esc(c.id)}">
            View brief →
          </button>
        </td>
      </tr>
    `).join("")
    : `<tr>
         <td class="empty" colspan="8">
           No companies found.
         </td>
       </tr>`;

  document.querySelectorAll("[data-id]").forEach(b => {
    b.onclick = () => detail(b.dataset.id);
  });
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
      return "⏳ Research queued";
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
    const opportunities = list(c.cloudflare_opportunities);
    const aiSignals = list(c.ai_signals);
    const hiring = sources.flatMap(source => Array.isArray(source.hiring_signals) ? source.hiring_signals : [])
      .filter((h, i, all) => all.findIndex(x => x.role === h.role && x.evidence === h.evidence) === i);
    const priority = accountPriority(c, opportunities, aiSignals, hiring);
    const pillars = ["Connect", "Protect", "Build"];
    const aiThemes = ["Build & Scale AI Applications", "Secure AI Applications & Agents", "Optimise AI Inference & Delivery"];
    const link = validLink(c.crunchbase_url);

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
        ${c.status === "running" || c.status === "pending"
          ? "disabled"
          : ""}>
        ${researchButtonText(c.status)}
      </button>

      <h3>Account priority</h3>
      <p><strong>${esc(priority.tier)}</strong> · ${esc(priority.reason)}</p>
      <p class="meta">Provisional research-based tier, not an estimate of deal size or buying intent.</p>

      <h3>Digital-native qualification</h3>
      ${pill(c.digital_native || "unresearched")}
      <p>
        ${esc(c.digital_native_reason ||
          "Research not yet completed.")}
      </p>

      <h3>Company overview</h3>
      <p>${esc(c.summary || "No research available yet.")}</p>

      <p class="meta">Evidence references [S1], [S2], etc. correspond to numbered research sources below.</p>
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

      <h3>Cloudflare opportunities · Connect / Protect / Build</h3>
      <p class="meta">Core pillar research for every company. Hypotheses are not verified customer problems.</p>
      ${pillars.map(p => {
        const matches = opportunities.filter(o => o.pillar === p);
        return `<div class="opportunity"><strong>${p}</strong>${matches.length
          ? matches.map(o => `<p>${esc(o.hypothesis || "")}</p><div class="meta">Evidence: ${esc(o.evidence || "Not established")} · Confidence: ${esc(o.confidence || "low")}</div>`).join("")
          : '<p class="meta">Insufficient evidence for a specific opportunity.</p>'}</div>`;
      }).join("")}

      <h3>AI opportunity signals</h3>
      <p class="meta">Additional AI-specific commercial themes, assessed separately from digital-native fit.</p>
      ${aiThemes.map(theme => {
        const s = aiSignals.find(x => x.theme === theme);
        const level = s?.signal || "insufficient";
        return `<div class="opportunity">
          <div class="signal-head"><strong>${esc(theme)}</strong>${pill(level)}</div>
          <p class="meta">Evidence: ${esc(s?.evidence || "No specific public evidence identified.")}</p>
          ${s?.hypothesis && level !== "insufficient" ? `<p>Potential discovery angle: ${esc(s.hypothesis)}</p><div class="meta">Confidence: ${esc(s.confidence || "low")}</div>` : ""}
        </div>`;
      }).join("")}

      <h3>Relevant Cloudflare customer stories</h3>
      <p class="meta">Published Cloudflare examples matched to this account's research themes. They are not proof of this prospect's needs.</p>
      ${relevantCaseStudies(opportunities, aiSignals).map(story => `
        <div class="opportunity">
          <strong><a href="${esc(story.url)}" target="_blank" rel="noopener noreferrer">${esc(story.name)} ↗</a></strong>
          <p>${esc(story.outcome)}</p>
          <div class="meta">Cloudflare products: ${esc(story.products)} · Matched on: ${esc(story.reasons.join(", "))}</div>
        </div>
      `).join("") || '<p>No closely matched case studies yet. <a href="https://www.cloudflare.com/case-studies/" target="_blank" rel="noopener noreferrer">Browse Cloudflare customer stories ↗</a></p>'}

      <h3>Discovery questions</h3>
      ${listHtml(c.questions)}

      <h3>Research sources (${sources.length})</h3>
      ${sources.map((s, i) => {
        const u = validLink(s.url);
        return `
          <div class="source">
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

    const button = $("researchOne");

    if (button && !button.disabled) {
      button.onclick = async () => {
        button.disabled = true;
        button.textContent = "Queuing research…";

        try {
          await api(
            "/api/research/" + encodeURIComponent(id),
            { method: "POST" }
          );

          notice(
            "Research queued for " + c.name +
            ". Background processing runs every 5 minutes."
          );

          await load();
          await detail(id, true);
        } catch (e) {
          notice(e.message);
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
    "Click Research all pending to start batch research."
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
  try {
    const result = await api("/api/research-all", {
      method: "POST"
    });

    notice(
      `${result.queued} companies queued. ` +
      "Research runs automatically every 5 minutes."
    );

    await load();
  } catch (e) {
    notice(e.message);
  }
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

["search", "nativeFilter", "statusFilter"].forEach(id => {
  $(id).addEventListener(
    id === "search" ? "input" : "change",
    render
  );
});

load();
