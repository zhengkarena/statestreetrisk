import { useEffect, useRef, useState } from 'react';
import Markdown from '../components/Markdown.jsx';
import { callAI, DEFAULT_MODEL, AIError } from '../lib/ai.js';
import { get, set } from '../lib/storage.js';
import { DEFAULT_CANVAS } from '../data/defaultCanvas.js';

// ---------- System prompts ----------

const SYS_DESIGN_DOC = `You are a senior Risk Modeling Process Designer in State Street's Enterprise Risk Management group. Produce a formal Model Process Design Document for the risk model lifecycle in the user's message.

Anchor every section to the specific stages, owners, inputs, outputs, and SLAs provided. Do NOT generate generic boilerplate. If a stage lacks detail, infer reasonable practice but call out the assumption explicitly.

Reference Federal Reserve SR 11-7 (Guidance on Model Risk Management) for governance and validation expectations, and the Basel framework where market risk is relevant.

Output Markdown with these exact top-level sections, in order:

## 1. Purpose
## 2. Scope
## 3. Stakeholders
## 4. Lifecycle Stages
## 5. Inputs and Outputs
## 6. Controls
## 7. Dependencies
## 8. Risk Considerations

Use Markdown tables where they aid clarity (stakeholder RACI, stage SLAs, controls matrix). Keep prose tight and operational.`;

const SYS_OPS_MANUAL = `You are an operational risk lead in State Street's Enterprise Risk Management group, writing a runbook that ops engineers and model owners will use to operate this risk model in production.

Anchor every step to the specific stages, owners, inputs, outputs, and SLAs in the user's message. Do NOT produce generic content.

Output Markdown structured as:

# Operational Runbook: <model name inferred from the lifecycle>

For each lifecycle stage, output:

## <stage name>
**Owner:** ...
**Frequency:** ...

**Steps:**
1. ...
2. ...

**Escalation on failure:** ...

**Common failure modes & recovery:**
- ...

End with a final section:

## Cross-Stage Considerations
- Monitoring and alerting
- Audit trail and evidence retention (SR 11-7 expectations)
- Incident response and rollback
- Change management`;

const SYS_BOTTLENECKS = `You are a model risk process auditor in State Street's Enterprise Risk Management group. Identify the top 5 bottlenecks and operational risks in the lifecycle in the user's message.

Anchor every finding to a specific stage, owner, or SLA in the data — name the stage and cite the relevant SLA/owner. Do NOT produce generic risks like "data quality issues". Each finding must be specific enough that a reader can act on it.

Where applicable, reference SR 11-7 controls or Basel backtesting requirements.

Output Markdown:

# Top 5 Bottlenecks and Mitigations

### 1. <Title — name the bottleneck specifically>
**Risk:** <what fails and the impact>
**Why it bottlenecks:** <root cause, anchored to a stage/owner/SLA>
**Mitigation:** <concrete action(s)>
**Owner:** <role responsible>

### 2. ...
### 3. ...
### 4. ...
### 5. ...`;

const SYS_UAT = `You are a UAT lead for risk model testing in State Street's Enterprise Risk Management group. Given the model specification in the user's message, produce a comprehensive UAT test plan as a single Markdown table.

Cover all of:
- Positive paths (model behaves as designed on representative data)
- Boundary conditions and corner cases
- Regulatory backtesting (Basel traffic-light zones for VaR exception counts where the model is a market-risk model)
- Data quality edge cases (missing, stale, outlier inputs)
- Performance and SLA validation
- Reproducibility / determinism of outputs

Aim for 12–20 test cases. Use IDs of the form UAT-<MODEL>-001, UAT-<MODEL>-002. Leave Pass/Fail empty (it is filled during execution).

Output ONLY the Markdown table — no prose intro, no closing notes. Columns:

| ID | Scenario | Preconditions | Inputs | Expected Result | Pass/Fail |`;

const DEFAULT_VAR_SPEC = `Model name: Daily 1-day VaR (Historical Simulation)
Asset class: Equity and equity options portfolio
Horizon: 1 trading day
Confidence: 95% and 99%
Methodology: Historical simulation using 252-day window of EOD market data
Inputs: Position book (symbol, quantity, price), market data (EOD prices)
Outputs: VaR at 95% and 99%, contribution-to-VaR by underlying
Backtesting: Daily exception count vs realized P&L over rolling 250 days
SLA: Production VaR published by 07:30 ET`;

// ---------- Component ----------

export default function AICopilot() {
  const canvas = get('canvas', null) ?? DEFAULT_CANVAS;
  const canvasJson = JSON.stringify(canvas, null, 2);

  return (
    <div className="p-6 space-y-4 max-w-[1100px] mx-auto">
      <header className="bg-white border border-slate-200 rounded-lg px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">AI Co-Pilot</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Specific, opinionated automations powered by OpenAI. All actions read live data from
          your workspace; outputs are anchored to the actual lifecycle and spec, not generic.
          Direct calls to api.openai.com — your key is sent only to OpenAI.
        </p>
      </header>

      <ActionCard
        title="Generate Process Design Document"
        anchor="Tab 1 canvas → Markdown design doc"
        description="Reads the current canvas and produces a formal Markdown design document with the standard 8 sections (Purpose, Scope, Stakeholders, Lifecycle, I/O, Controls, Dependencies, Risk Considerations). References SR 11-7 and Basel where relevant."
        defaultTitle="Process Design Document"
        docType="Process Design"
        buildPrompts={() => ({
          system: SYS_DESIGN_DOC,
          user:
            'Lifecycle data (JSON):\n```json\n' +
            canvasJson +
            '\n```\n\nGenerate the Model Process Design Document for this lifecycle.',
        })}
        canRun={canvas.length > 0}
        notReadyReason="Add at least one stage in Process Canvas first."
      />

      <ActionCard
        title="Generate Operational Manual"
        anchor="Tab 1 canvas → ops runbook"
        description="Step-by-step operational runbook from the canvas. Per-stage owner / frequency / steps / escalation / failure modes, plus cross-stage controls."
        defaultTitle="Operational Runbook"
        docType="Ops Manual"
        buildPrompts={() => ({
          system: SYS_OPS_MANUAL,
          user:
            'Lifecycle data (JSON):\n```json\n' +
            canvasJson +
            '\n```\n\nGenerate the operational runbook.',
        })}
        canRun={canvas.length > 0}
        notReadyReason="Add at least one stage in Process Canvas first."
      />

      <ActionCard
        title="Identify Process Bottlenecks"
        anchor="Tab 1 canvas → top 5 risks"
        description="Audit-style review of the lifecycle. Top 5 bottlenecks anchored to specific stages and SLAs, each with a concrete mitigation and named owner. Cites SR 11-7 / Basel where relevant."
        defaultTitle="Bottleneck Analysis"
        docType="Bottleneck Analysis"
        buildPrompts={() => ({
          system: SYS_BOTTLENECKS,
          user:
            'Lifecycle data (JSON):\n```json\n' +
            canvasJson +
            '\n```\n\nIdentify the top 5 bottlenecks with mitigations.',
        })}
        canRun={canvas.length > 0}
        notReadyReason="Add at least one stage in Process Canvas first."
      />

      <UATCard />
    </div>
  );
}

// ---------- UAT card (has its own textarea input) ----------

function UATCard() {
  const [spec, setSpec] = useState(DEFAULT_VAR_SPEC);
  return (
    <ActionCard
      title="Auto-generate UAT Test Cases"
      anchor="Model spec → UAT table"
      description="Produces a Markdown table of UAT cases covering positive paths, boundaries, regulatory backtesting, data quality, performance/SLA, and reproducibility. Default spec is a 1-day VaR model — edit to match your model under test."
      defaultTitle="UAT Test Cases"
      docType="UAT Cases"
      buildPrompts={() => ({
        system: SYS_UAT,
        user: 'Model specification:\n\n' + spec + '\n\nGenerate the UAT test plan table.',
      })}
      canRun={spec.trim().length > 0}
      notReadyReason="Provide a model specification."
      extraInput={
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
            Model spec
          </label>
          <textarea
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500 resize-y"
          />
        </div>
      }
    />
  );
}

// ---------- Generic action card ----------

function ActionCard({
  title,
  anchor,
  description,
  defaultTitle,
  docType,
  buildPrompts,
  canRun,
  notReadyReason,
  extraInput,
}) {
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const controllerRef = useRef(null);

  // Abort in-flight request on unmount.
  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const run = async () => {
    if (!canRun) return;
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    setStatus('loading');
    setResult('');
    setError('');
    try {
      const { system, user } = buildPrompts();
      const text = await callAI({ system, user, signal: ctrl.signal });
      setResult(text);
      setStatus('done');
    } catch (e) {
      if (e instanceof AIError && e.code === 'aborted') {
        setStatus('idle');
        return;
      }
      setError(e.message || 'Unknown error');
      setStatus('error');
    } finally {
      controllerRef.current = null;
    }
  };

  const cancel = () => controllerRef.current?.abort();

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
  };

  const saveToDocs = () => {
    if (!result) return;
    const now = new Date().toISOString();
    const dateStr = new Date().toLocaleDateString('en-US');
    const doc = {
      id: 'doc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: `${defaultTitle} — ${dateStr}`,
      type: docType || 'Manual',
      body: result,
      createdAt: now,
      updatedAt: now,
    };
    const docs = get('docs', []) || [];
    set('docs', [doc, ...docs]);
    setSavedNote('Saved to Docs Repo');
    setTimeout(() => setSavedNote(''), 2000);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <header className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-700">
            {anchor}
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
        </div>
        <div className="flex-shrink-0">
          {status === 'loading' ? (
            <button
              onClick={cancel}
              className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={run}
              disabled={!canRun}
              title={canRun ? '' : notReadyReason}
              className="px-3 py-1.5 text-sm bg-navy-800 text-white rounded hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {status === 'done' ? 'Regenerate' : 'Generate'}
            </button>
          )}
        </div>
      </header>

      {extraInput && <div className="px-5 py-4 border-b border-slate-200">{extraInput}</div>}

      {status === 'loading' && (
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
          <Spinner />
          <div className="text-xs text-slate-700">
            <span className="font-mono text-slate-900">{DEFAULT_MODEL}</span> thinking…
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-800 mb-1">
            Generation failed
          </div>
          <div className="text-sm text-red-900 break-words">{error}</div>
        </div>
      )}

      {status === 'done' && result && (
        <>
          <div className="px-5 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Result
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copy}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-white"
              >
                Copy
              </button>
              <button
                onClick={saveToDocs}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-white"
              >
                Save to Docs Repo
              </button>
              {savedNote && (
                <span className="text-xs text-emerald-700 font-medium">{savedNote}</span>
              )}
            </div>
          </div>
          <div className="px-5 py-4">
            <Markdown body={result} />
          </div>
        </>
      )}
    </section>
  );
}

function Spinner() {
  return (
    <div className="h-3 w-3 rounded-full border-2 border-navy-300 border-t-navy-800 animate-spin" />
  );
}
