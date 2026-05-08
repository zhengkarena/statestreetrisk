# Demo Script — RiskFlow Studio

10-minute live demo. Q&A is separate. This script is for internalization, not
verbatim reading. Phrasing is what I'd actually say; clicks are precise.

**Time budget**

| Section | Budget |
|---|---|
| Cold open | 0:30 |
| Tab 1 — Process Canvas | 1:30 |
| Tab 2 — Data Hub | 1:00 |
| Tab 3 — Risk Metrics | 1:30 |
| Tab 4 — AI Co-Pilot | 1:30 |
| Tab 5 — Project & UAT | 1:00 |
| Tab 6 — Production Monitor | 1:15 |
| Tab 7 — Docs Repo | 0:30 |
| Architecture closing | 0:45 |
| JD traceability summary | 0:30 |
| **Total** | **10:00** |

**Pre-demo checklist**

- `npm run dev` running, browser at `http://localhost:5173`, sized to ~1280px wide
- OpenAI API key entered in Settings, **Test connection** confirmed green
- Sample CSV (`symbol,quantity,price` header + 5–10 rows) on desktop, ready to drop into Data Hub
- Process Canvas tab is the landing tab; localStorage clean enough that the default lifecycle and mock tasks are showing
- README open in a second tab on GitHub for the architecture closing
- Slide deck on second monitor: opener slide showing, closer slide cued

---

## Cold open (~0:30)

Standing on the opener slide.

> "What you're about to see is RiskFlow Studio. I built it specifically for this conversation — to demonstrate how I would approach the Risk Modeling Process Designer role end to end, not just talk about it. It runs locally on my machine with realistic mock data, but the upload flow accepts portfolio CSV or Excel, so if you want to point it at a State Street book partway through, I can do that. Seven tabs, each one anchored to a specific responsibility in the JD. I'll walk through them in the order someone would actually use them in a model lifecycle."

Switch to the running app.

---

## Tab 1: Process Canvas (~1:30)

### What to show

- Land on Process Canvas (default tab)
- Gesture across the seven horizontal stage cards: Data Ingestion → Model Development → Validation → UAT → Production → Monitoring → Decommission
- Click the **Validation** card
- In the right-side editor, point at owner = *Model Risk Management (MRM)*, SLA = *4 weeks from submission*, the description referencing SR 11-7
- Briefly point at the toolbar: Add stage, Reset to default, Export JSON

### What to say

> "This is Process Canvas. It's where I'd start a new model — laying out the lifecycle, owners, inputs, outputs, and SLAs before any code gets written. The default view is a fully populated daily VaR lifecycle: Data Ingestion at T+0 by 06:00 ET owned by Market Data Ops, then Model Development with the Quant Team, independent Validation by MRM citing SR 11-7, UAT with Risk Technology, Production with Risk Production, ongoing Monitoring with ERM, and Decommission with the model owner. Click Validation — four-week SLA, inputs and outputs spelled out, the description language is operational. Each stage is editable; new stages can be added; the whole canvas exports as JSON for handoff. The point is: this is the artifact I'd produce in the first stakeholder workshop, and it stays the source of truth as the design evolves."

### JD anchor

> *"Lead the risk modeling process design by interacting with model developers, model owners, source data providers, and downstream process owners to architect optimal modeling process design."*

### If the VP asks

- *"How would this scale to a hundred models?"* → "In production each stage is a Postgres row with role-based access. Model owners and MRM see the same canonical view; changes flow through approval workflow with audit log."
- *"How does this fit with PEGA / Appian?"* → "PEGA owns the case-level workflow. This is upstream — it's the design artifact the workflow operates on. We'd export from here into PEGA as the lifecycle definition."
- *"Why a custom canvas rather than a Visio diagram?"* → "Because the data is structured. Owners, SLAs, dependencies are queryable, exportable, version-controlled. Visio gives you a picture; this gives you a contract."

---

## Tab 2: Data Hub (~1:00)

### What to show

- Switch to Data Hub
- Gesture at the architecture diagram: Bloomberg / Refinitiv / Databricks / Snowflake / S3 → Ingestion + Validation → RiskFlow
- Drag the prepared CSV into the upload zone (or use Choose file)
- Show the parsed preview: row count, column types, validation passed, missing/outlier stats
- Click **Use this dataset**
- Active portfolio panel flips to *Source: uploaded*

### What to say

> "Data Hub is the reusability story. Top half is the source architecture — Bloomberg, Refinitiv, Databricks, Snowflake, S3 feeding into ingestion and validation, then into the tool. Bottom half is the upload path: I drop a CSV, it parses with Papaparse, infers column types, validates against required fields — symbol, quantity, price, case-insensitive — flags missing values and z-score outliers, and on Use this dataset becomes the active portfolio for everything downstream. So if you want to see this run on State Street data instead of my mock book, drop a file, and Risk Metrics, Greeks, stress all recompute against your numbers. The architecture diagram is illustrative; the actual connectors live in the API layer in production, not the frontend."

### JD anchor

> *"Data solution architect with Databricks / Snowflake / AWS / Azure / Oracle / MySQL / MongoDB."*

### If the VP asks

- *"What if my file has different column headers?"* → "Required headers are case-insensitive. Anything else is preserved verbatim. If the file genuinely doesn't have symbol/quantity/price, validation surfaces a specific error listing what's missing and what was found."
- *"Real Snowflake connection?"* → "Real connections live in the API layer in production; the frontend hits `/api/portfolio`. The architecture diagram shows where the boundary sits."
- *"What about Excel?"* → "Same path — `.xlsx` and `.xls` parse via SheetJS, dynamically loaded only when an Excel file is picked, so CSV users don't pay the cost."

---

## Tab 3: Risk Metrics (~1:30)

### What to show

- Switch to Risk Metrics
- Point at the three summary cards at top: notional ~$125M, MTM ~$60M, 10 positions
- Three VaR cards in a row — read off Historical 99% **$1,184K**, Parametric 99% **$1,047K**, MC 99% **$1,065K**, point at the red tail in each mini-distribution
- Scroll to the Greeks table — gesture at the Vega and Theta columns, show the portfolio totals row
- Stress section — click **2022 Rate Shock**, total P&L flips to **−$30,927,699**
- Quickly point at the per-position breakdown: equities red, swap rows red

### What to say

> "Risk Metrics. Portfolio is $60M MTM, 10 positions — five equities, three equity options, two interest rate swaps. Three VaR methods at 1-day horizon: historical 99% at $1.18M, parametric at $1.05M, Monte Carlo at $1.07M. They diverge deliberately — historical is fattest at the tail because it carries real correlation structure; parametric assumes a normal; MC samples per-asset normals independently and ignores cross-asset correlation. The mini-charts show the distribution, red shows the tail past the 95% cutoff. Greeks table is full Black-Scholes for the options — the formulas are cited in `lib/risk.js` — equities are delta-1 per share, swaps held out of the equity Greeks and brought in via DV01 in stress. Watch — click 2022 Rate Shock. Equity minus 19, rates plus 425 bps, vol plus 5 IV points. Portfolio loses $30.9M. Equities take a hit, options re-price under shock vol and rates, and the receive-fixed swaps lose hard on rates up. Biggest of the three presets because both the equity and the rate book lose at once — a coherent regime-shift story. Custom shocks recompute live."

### JD anchor

> *"Solid understanding of risk measures: Greeks, VAR, Stress Testing, market data and data vendors."*

### If the VP asks

- *"Why three VaR methods?"* → "Different methods catch different risks. Historical sees actual fat tails but is window-dependent. Parametric is fast and explainable but assumes normal. MC is flexible. Showing all three is the diligent answer; showing one is the lazy one."
- *"How big a portfolio could this handle?"* → "In the browser, comfortably tens of thousands of positions for VaR; the Greeks table starts to lag past a few hundred rows. In production this math runs on Celery or Ray workers reading from Snowflake — same logic, distributed across however many cores you need."
- *"Is the math right?"* → "Black-Scholes Greeks cross-checked against an external calculator within half a percent. Normal CDF is Abramowitz & Stegun 26.2.17 — the citation's in the code."
- *"What about FRTB / expected shortfall?"* → "Not in this demo. Both are clean extensions — ES is a percentile-of-worst-N rather than the percentile itself; FRTB-IMA adds the liquidity horizons and shocks. Same `lib/risk.js` shape, different aggregation."

---

## Tab 4: AI Co-Pilot (~1:30)

### What to show

- Switch to AI Co-Pilot
- Click **Generate Process Design Document** on the top card
- Wait ~10 seconds — say what's happening while it streams the response
- When it lands, scroll the result. Point at:
  - Section 3 (Stakeholders) referencing Market Data Ops by name
  - Section 4 (Lifecycle) carrying the four-week MRM SLA
  - Any SR 11-7 citation in Controls or Risk Considerations
- Click **Save to Docs Repo** — the emerald *Saved to Docs Repo* confirmation appears for two seconds

### What to say

> "AI Co-Pilot. Four specific actions, no chat — the spec for each is opinionated. I'll run Generate Process Design Document. It reads the canvas from Tab 1, sends it to OpenAI's GPT-4o-mini with a system prompt that requires anchored output — every section has to reference specific stages, owners, and SLAs from the canvas data, and where appropriate it cites SR 11-7 for governance and Basel for market-risk backtesting. While it's generating — there are four cards: design doc, ops manual, top-five bottlenecks, auto-generated UAT test cases from a free-text model spec. Here it is. Look — Section 3 names Market Data Ops as the source data provider, Section 4 references the four-week MRM validation SLA from the canvas, the Controls section cites SR 11-7. None of this is generic boilerplate; it's anchored to the lifecycle I designed in Tab 1. Click Save to Docs Repo — saved. The system prompts are the leverage; they're as much of the work as the code."

### JD anchor

> *"5+ years process workflow design, data modeling & analytics, leveraging AI capabilities."*

### If the VP asks

- *"How do you handle prompt drift / regression?"* → "System prompts are version-controlled in `src/tabs/AICopilot.jsx`. In production they go in a prompt registry with A/B testing and human eval. The anchoring constraint — *must reference specific stages from input* — is the strongest safeguard against generic output."
- *"What about hallucination on regulatory references?"* → "Two layers. The prompt forces references to specific stage data so it can't invent stages. And the output goes through MRM review like any other regulatory document — it's a draft, not a deliverable. The tool replaces the blank-page problem, not the sign-off process."
- *"Cost?"* → "About 2,000 input tokens and 1,500 output tokens per design doc on Sonnet 4.6. A few cents per document. In production we'd add prompt caching on the system prompt — that's a 90% input-token discount on repeat calls."

---

## Tab 5: Project & UAT (~1:00)

### What to show

- Switch to Project & UAT
- Gesture across the four columns; mention the count badges
- Scroll if needed; click the **SR 11-7 annual model validation cycle — Credit VaR** card in the UAT column
- Side panel opens — point at status, priority chip, due date
- Scroll within the panel to the UAT cases table — read off the failed case: *"Recovery rate scenario sensitivity — 22% deviation from spec"*

### What to say

> "Project & UAT. JIRA-lite, four columns, twelve seeded cards covering work this team actually does: equity VaR recalibration, Vega Greek discrepancy on long-dated SPX options, Snowflake schema migration, decommission of legacy parametric VaR. Take the SR 11-7 annual model validation cycle for Credit VaR — high priority, due in five days. Click in. Four UAT cases: PD calibration backtest passes with KS p-value 0.12, LGD distribution stability passes, concentration-limit logic passes, and recovery rate scenario sensitivity fails — 22% deviation from spec on the LGD shift-down state. That fail is what triggers the back-and-forth with quant. Status dropdown on each case toggles pass / fail / pending, model and owner filters on top, click-to-move arrows transition cards across columns. This is where the operational structure for managing the modeling processes lives day-to-day."

### JD anchor

> *"Project planning, implementation, issue, remediation, UAT test case creation, progressive status tracking and management."*

### If the VP asks

- *"How does this map to JIRA / Confluence at State Street?"* → "Same data model. Tasks become JIRA issues, UAT cases become JIRA sub-tasks or Xray test cases, docs become Confluence pages. The React UI is interchangeable; the data shape is what matters."
- *"What about RBAC?"* → "In production the side-panel edits go through API endpoints with role-based access — model owners edit their cards, MRM changes validation status, ops moves execution cards. The frontend renders or disables based on the auth claim."
- *"Where does the SR 11-7 framing come from?"* → "It's the Federal Reserve's guidance on model risk management. Validation, ongoing monitoring, and inventory are all SR 11-7 expectations. The card titles, the canvas descriptions, and the AI prompts all reference it because that's the framework this team operates under."

---

## Tab 6: Production Monitor (~1:15)

### What to show

- Switch to Production Monitor
- Health tiles row — gesture across, point at the **red Credit VaR tile (11 / 5 limit)**, the two amber tiles (Greeks Engine, Market Data Pipeline)
- Scroll to the backtest chart, point at the six exception triangles, read the summary: *"6 exceptions in last 250 days · Basel zone: amber"*
- Scroll to alerts; click **Investigate** on *"Credit VaR backtest: 11 exceptions over rolling 250d, Basel red zone breach"*
- Runbook expands inline — gesture at the numbered required actions and the *Basel III §718.94* reference

### What to say

> "Production Monitor. Six model engines on top with traffic-light status — most green, Greeks Engine amber on latency, Market Data Pipeline amber on FX feed staleness, and Credit VaR red because it crossed the Basel red zone — eleven exceptions on rolling 250 days at 99% confidence. That auto-escalates the capital multiplier from 3.0× to 4.0× per Basel III §718.94. Backtest chart below is the portfolio-level series — six exceptions over 250 days, amber zone. Per-model and portfolio counts are tracked independently — the subtitle calls that out so you don't have to ask. Click Investigate on the Credit VaR red zone alert — runbook expands inline. CRO and Head of MRM notification within one business day, SR 11-7 incident in MRM tracker, root-cause backtest on extended windows, page on-call quant. Specific actions, specific extensions, real regulatory references. This is the artifact someone on call uses at 2 AM, not a wiki page they have to search for."

### JD anchor

> *"Work with modeling teams to support modeling production problem-solving in real time."*

### If the VP asks

- *"Where does the alert data come from in production?"* → "Datadog or Splunk for telemetry, the model-exception tracker for VaR breaches, ServiceNow for incident overlay. The frontend hits a single `/api/alerts` endpoint and gets a unified view."
- *"How are runbooks maintained?"* → "They live in Confluence in production; the alert links to them. We don't store them in the alert itself — that's the demo simplification. The link is a deep-link to the right Confluence page."
- *"Tile says 11 exceptions, chart shows 6 — why?"* → "Different scopes. The tile is the Credit VaR backtest. The chart is the portfolio-level Equity & Options book. Both are real signals; they're tracked independently. The chart subtitle says so explicitly."

---

## Tab 7: Docs Repo (~0:30)

### What to show

- Switch to Docs Repo
- Sidebar shows the Process Design Document saved two minutes ago, with the navy *Process Design* badge and today's date
- Click it — rendered Markdown appears in the right pane

### What to say

> "Docs Repo. The Process Design Document I generated two minutes ago is here, with the right type badge and today's date. Click in, the Markdown renders with proper heading hierarchy. Edit toggle goes to a textarea. Export as .md downloads it. This is the Confluence-lite endpoint of the AI Co-Pilot pipeline — every generated artifact lands here, every manual doc lives here. We don't lose work."

### JD anchor

> *"Produce modeling process design documents and operational manual for model process users."*

### If the VP asks

- *"Confluence replacement?"* → "No. In production this becomes Confluence pages with API integration. The point of having it in-app is that the AI generation flow has a default destination — the artifact survives the click."

---

## Architecture closing (~0:45)

Open `README.md` on GitHub in the second browser tab; scroll to the Mermaid diagram.

### What to say

> "Last thing. What this looks like in production. The README has a Mermaid diagram. The frontend stays exactly what you just saw, but it becomes a thin client over a Python FastAPI layer. Source data flows through Apache Airflow DAGs from Bloomberg, Refinitiv, Databricks, S3 into Snowflake — that's the warehouse. Postgres holds the metadata: canvas, tasks, docs. Risk math runs on Celery or Ray workers reading from Snowflake — same `lib/risk.js` logic, distributed. The OpenAI key moves into Vault behind an API proxy that adds rate limiting, audit logging, and PII redaction. SSO via Entra ID for both API and UI. Every component on this diagram is something already in your stack per the JD's preferred section — Snowflake, Databricks, AWS, Python, Airflow, FastAPI."

### JD anchor

> *"Data solution architect with Databricks / Snowflake / AWS / Azure / Oracle / MySQL / MongoDB."*

### If the VP asks

- *"How long to build the production version?"* → "The frontend is essentially done. The data layer is a few weeks of Airflow/FastAPI scaffolding. The risk math is straight Python translation of the existing JS. The biggest work is the integration layer — auth, audit, rate limits, vendor connectors. Three to four months for a real MVP."

---

## JD traceability summary (~0:30)

Switch to the closer slide (JD-to-feature traceability matrix).

### What to say

> "To close — every responsibility in the JD has a working artifact in this tool. Process design — Tab 1. Operational structure for managing the processes — Tab 5. Process design documents and operational manuals — Tab 4 generates them, Tab 7 stores them. Project planning, UAT, status tracking — Tab 5. Production support in real time — Tab 6. Greeks, VaR, stress testing — Tab 3. Source data providers and reusability — Tab 2. Cloud tools, AI capabilities, data architecture — visible across all of them and laid out in the README. That's the demo. Happy to go deeper on any piece."

End of demo. Pause. Take questions.

---

## Failure modes

Quick recoveries if something goes wrong mid-demo. One sentence each.

- **API call fails on AI Co-Pilot (Tab 4)** — OpenAI side hiccup or CORS issue. Skip the live generation; pivot to Tab 7 — there's a saved Process Design Document already in the Docs Repo, the output is visible. The demo doesn't depend on a fresh generation.
- **Upload error on Data Hub (Tab 3)** — Show the validation message, point out it tells the user exactly what's missing, revert to mock data; the graceful failure is itself a demo of the validation layer.
- **Recharts doesn't render (Tab 3 or Tab 6)** — Skip the chart, talk through the values in the cards instead; the math is what matters, the chart is presentation.
- **Tab takes too long to lazy-load** — Mention while waiting that the bundle is code-split per tab to keep initial paint at 71 KB; the spinner is the trade-off.
- **Browser crashes / dev server dies** — Switch to the screen recording and narrate live over it.
- **Run out of time** — Skip Tab 7 (it's the visible payoff of Tab 4's save action — the audience already saw the green confirmation), shorten Tab 5 to the kanban view without opening the side panel, and close on the architecture in 30 seconds instead of 45.
- **Asked a question I can't answer** — "I don't know off the top of my head; I'd want to look at \[specific thing\] before answering. Can I follow up after?" Better than guessing.
