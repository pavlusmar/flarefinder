# FlareFinder — 106-company curated Crunchbase + Dealroom research universe

[Strategic research rebuild, reference plans, test results and staging acceptance](research-framework/test-results.md)


## Form3 analyst-curated research example (November 2026)

The **Load Form3 research example** button (admin token required) replaces Form3's saved research only after explicit confirmation. It does **not** trigger Tavily/Workers AI or modify the 106-company shortlist. It refuses to overwrite queued/running research. The example includes a manually scored 74/100 pursuit assessment, cited technical/business evidence, Cloudflare hypotheses, counter-evidence, AI signals and discovery questions. It is an **illustrative analyst-curated reference**, not a validated Clef output or confirmed opportunity.

Form3's TAS calculator uses FY2026 reported £26.7m revenue with an illustrative 1.30 USD/GBP conversion ($34.71m), the existing 5.5% financial-services technology-budget assumption, 1–5% overall addressable share, and 15% AI allocation with 2–10% AI-addressable share. Result: approximately $19.1k–$95.5k annual overall TAS (midpoint $57.3k) and $5.7k–$28.6k AI TAS (midpoint $17.2k). **AI TAS is included within overall TAS, not additive.** These are editable scenario assumptions, not verified Form3 spending or official Cloudflare forecasts.

Sources: [Form3 September 2026 AI/MCP announcement](https://www.form3.tech/resources/press-releases/this-launch-marks-the-evolution-of-form3-from-clou), [CNCF Form3/Cilium case study](https://www.cncf.io/case-studies/form3/), [Form3 engineering stack](https://www.form3.tech/engineering), [Form3 technical ecosystem](https://www.form3.tech/partnerships/technical-ecosystem), and FY2026 Form3 Group statutory accounts.


## Curated import shortlist (22 November 2026)

The **active bundled import** contains **106** manually screened digital-native or software-led candidates. **167** entries were excluded (including clear non-digital-native businesses) and **5** ambiguous entries were held back for review. The full original 278-company combined dataset is preserved in Git history (PR #21); exclusions and review items are retained in `data/digital-native-curation-audit.csv`. This is a pragmatic manual pre-screen, **not verified technical due diligence**: some companies may be borderline, and some valid prospects may be held back. The new **Sync exactly 106 companies** action imports the canonical combined shortlist and, after preview and confirmation, removes out-of-scope accounts and associated research from D1. The regular import remains an upsert. No paid research is triggered by this change.


## Combined discovery universe (22 November 2026)

The bundled import CSV now contains **278 unique companies**: 131 from the original Crunchbase cohort, 150 names extracted from the user's Dealroom Early Stage + Breakout interactive map (4 overlaps; 146 additions), and ElevenLabs as a separately labelled strategic AI-native watchlist company. The Dealroom extraction preserved company names, UUIDs and the map's **hot / still early-stage** indicator, but did **not** establish a separate Early Stage versus Breakout classification for every company. Do not infer that a company is digital-native merely from its appearance on the map. Dealroom-only entries have blank funding, website and employee fields until enriched; they are **unqualified discovery candidates**, not verified prospects. The combined CSV includes source, Dealroom UUID, map cohort, hot flag and account segment columns. Existing Crunchbase enrichment is preserved. Importing upserts records and does not delete prior D1 research; the deployed database must be imported separately using the dashboard and admin token. Research is not automatically triggered by this commit.


**Current bundled dataset: 131 UK companies** selected using two size-based cohorts: 51–500 employees with High or Medium Crunchbase Growth Score (73), and 501–1,000 employees without a Growth Score restriction (58). Both cohorts require a Likely or Very Likely growth prediction, active for-profit UK headquarters, no recorded exit, at least $5 million total funding, and last funding between 2024-01-01 and 2026-11-22. These are unqualified research prospects, not validated digital natives.

The `data/crunchbase-companies.csv` and `public/crunchbase-companies.csv` files now contain the 131-account normalized import dataset. The original 62-company export remains in `data/original-crunchbase-export.csv`; the full 131-company source export is `data/crunchbase-tiered-growth-51-1000-2026-11-22.csv`.

**To update an already deployed D1 database:** deploy the latest GitHub commit, open FlareFinder, enter the existing Admin token and click **Load 131 Crunchbase companies**. Import upserts company metadata and preserves existing research. It does **not** delete accounts from the previous dataset, so the total can exceed 131 if the old database has accounts absent from the new cohort. Do not click Research all pending unless you want to incur research costs.

---


# FlareFinder

An evidence-led Cloudflare territory research application, built with **Cloudflare Workers, D1, Workers AI and Cron Triggers**. Import a CSV of companies, qualify digital-native status, investigate growth and technical signals, and generate Cloudflare Connect / Protect / Build opportunity hypotheses with public-source links.

> **Important:** This is a demo/prototype, not an official Cloudflare product. AI findings are hypotheses requiring human verification. It does not prove a company uses a particular vendor or has a particular problem.

## What's included

- Responsive company dashboard with filters, growth scores, funding and research status
- CSV import (up to 500 companies per upload), with a sample dataset
- Public web research through a Tavily search API key (optional until you run research)
- Workers AI analysis using `@cf/meta/llama-3.1-8b-instruct`
- D1 persistence for company profiles, research briefs, sources and status
- Individual research and scheduled batch research (2 companies every 5 minutes)
- Simple admin token protection for write/research actions
- No Crunchbase MCP calls or Crunchbase API credentials required

## 1. Put it on GitHub

Unzip the project and upload its **contents** to a new GitHub repository (or `git init`, `git add .`, `git commit -m "Initial FlareFinder"`, and push). Do **not** commit `.dev.vars`, tokens or API keys.

## 2. Create your Cloudflare resources

Install Node.js 20+ and run:

```bash
npm install
npx wrangler login
npx wrangler d1 create flarefinder-db
```

Copy the database UUID from the output into `wrangler.toml` as `database_id`. Apply the migration:

```bash
npm run db:remote
```

You can also run locally with `npm run db:local`.

## 3. Configure API keys and admin access

Create a Tavily API key at https://tavily.com/ (third-party provider; pricing/limits depend on your account). This is used to retrieve current public search snippets; the AI cannot reliably perform live research without it.

For deployed Workers, set secrets:

```bash
npx wrangler secret put SEARCH_API_KEY
npx wrangler secret put ADMIN_TOKEN
```

Use a long random value for `ADMIN_TOKEN` (e.g., generated by a password manager). Never put secrets in `wrangler.toml` or your repository.

For local development, copy `.dev.vars.example` to `.dev.vars` and enter your own values.

## 4. Run or deploy

```bash
npm run dev
# Open the localhost URL shown by Wrangler
npm run deploy
```

Cloudflare may ask you to enable Workers AI billing or configure account permissions depending on your plan. The app uses Workers AI, D1, scheduled triggers and a third-party search API; review usage and pricing before running all companies.

**Git-based deployment:** After initial setup, you can connect the GitHub repository to Cloudflare Workers Builds in the Cloudflare dashboard. The build command can be `npm run deploy`; ensure the D1 binding and secrets exist in the target account/environment. For a first deployment, CLI is often easier because it creates/configures resources explicitly.

## 5. Import companies

Click **Admin token** in the dashboard and enter the same `ADMIN_TOKEN` you set in Wrangler. The token is kept in **sessionStorage** for that browser tab, not persisted to the server.

Click **Load samples** to import six illustrative companies or **Import CSV** for your own file. Supported columns:

```csv
name,website,description,crunchbase_url,employees,funding_usd,growth_score,sector
Example Ltd,https://example.com,API-first SaaS platform,,51-100,10000000,85,SaaS
```

Only the six sample rows are included. **The complete list of 62 Crunchbase matches has not been exported or retrieved**, and is not represented as available here. Use a dataset you have permission to use. Crunchbase subscription/API terms may limit exporting, storing or republishing company data.

Click **Research company** on a brief, or **Research all pending** to process one immediately and continue in scheduled batches. Scheduled research runs every five minutes; 131 companies will take several hours at the default rate. You can adjust the cron frequency or batch size, but higher concurrency and AI/search usage may increase costs and hit provider limits.

## Research methodology

1. Retrieve public web-search results for a company.
2. Ask Workers AI to assess digital-native status, growth and technical evidence.
3. Generate Cloudflare Connect / Protect / Build *hypotheses*, not claims of verified need.
4. Store research with source URLs, snippets, timestamps and confidence labels.
5. Review the sources manually before presenting or contacting prospects.

The search provider may surface irrelevant or stale results. The AI sees search snippets, not full audited source documents. Do not treat output as a definitive competitive intelligence report.

## Security and production limitations

This is an **interview demo**. It uses a shared bearer admin token for write endpoints; read endpoints are public. Do not import confidential customer information, sensitive personal data, internal account plans, or proprietary information into a public deployment. Before wider use, add Cloudflare Access, per-user authorization, rate limiting, usage budgets, and audit logging. Consider adding source-domain validation, explicit citations per finding, stronger schema validation, retry/backoff, and Cloudflare Workflows/Queues for production-grade orchestration.

A Cron Trigger is asynchronous and may take time to activate after deployment. The app does not guarantee research completion or avoid all third-party rate limits. Researching all 131 incurs external API and Workers AI usage. The sample company metrics are a starting snapshot and should be verified against your licensed source.

## Troubleshooting

- **401 Unauthorized**: Enter your `ADMIN_TOKEN` in the dashboard and ensure it matches the Wrangler secret.
- **No companies**: Apply the D1 migration and import the CSV.
- **Search API key not configured**: Add `SEARCH_API_KEY` via `wrangler secret put` or `.dev.vars`.
- **AI invalid JSON**: Retry the company; the lightweight model may occasionally produce malformed structured output.
- **Cron not running**: Verify scheduled triggers in the Cloudflare dashboard and review Worker logs.

## Project structure

```text
src/index.ts                 Worker API, research pipeline and cron handler
public/index.html            Dashboard UI
public/app.js                Browser interactions and CSV parsing
public/style.css             Dashboard styling
public/sample-companies.csv  Demo data
migrations/0001_initial.sql D1 schema
wrangler.toml                Cloudflare configuration
```
