// ---------------------------------------------------------------------------
// risk.js — pure-JS risk math used by Tab 2 (Risk Metrics).
//
// No third-party numeric libs. Everything below is hand-rolled or cited.
//
// Conventions used throughout:
//   - Volatilities and rates are decimals (0.20 = 20%).
//   - Time-to-expiry T is in years.
//   - Delta/Gamma/Vega/Theta/Rho returned by bsGreeks are PER ONE OPTION on
//     ONE SHARE of underlying, raw Black-Scholes outputs (not scaled).
//   - Position-level Greeks are raw_greek * quantity, with Vega scaled to
//     $ per 1% IV move, Theta to $ per calendar day, Rho to $ per 1% rate.
//   - Equity positions: delta=1 per share, all other Greeks=0.
//   - IR swaps: simplified DV01-only model. P&L on rate shock =
//       -DV01 * rate_shock_bps  (receive-fixed loses on rates up).
//     We do NOT compute swap delta/gamma/vega/theta/rho — they are not
//     meaningful in the same equity-Greek dimension and would mislead a
//     viewer of the Greeks panel. Swaps simply contribute zero to those.
// ---------------------------------------------------------------------------

// ---------- Deterministic RNG ----------

// Mulberry32 — small fast 32-bit PRNG. Seeded by hashSymbol so each underlying
// gets a stable but distinct return path across reloads.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a 32-bit string hash → 32-bit unsigned int seed.
export function hashSymbol(s) {
  let h = 0x811c9dc5;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Standard-normal sample via Box-Muller from two uniforms.
function boxMuller(rng) {
  // Avoid log(0).
  let u1 = 0;
  while (u1 === 0) u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Generate `n` daily log-returns (treated as simple returns for small moves)
// drawn from N(0, sigmaDaily^2) using a seeded PRNG. mu fixed at 0 — for VaR
// the daily drift is negligible and assuming zero gives cleaner numbers.
export function seededReturns(symbol, n, sigmaAnnual) {
  const rng = mulberry32(hashSymbol(symbol));
  const sigmaDaily = sigmaAnnual / Math.sqrt(252);
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = boxMuller(rng) * sigmaDaily;
  return out;
}

// ---------- Normal distribution helpers ----------

// Standard normal PDF.
export function normPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Standard normal CDF — Abramowitz & Stegun 26.2.17 (max abs error 7.5e-8).
//   N(x) ≈ 1 - φ(x) · (a1·k + a2·k² + a3·k³ + a4·k⁴ + a5·k⁵)
//   k = 1 / (1 + 0.2316419 · |x|)
// For x < 0 use symmetry: N(x) = 1 - N(-x).
export function normCDF(x) {
  const a1 = 0.319381530;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const k = 1 / (1 + 0.2316419 * ax);
  const w =
    1 -
    normPDF(ax) *
      (a1 * k + a2 * k * k + a3 * k ** 3 + a4 * k ** 4 + a5 * k ** 5);
  return sign === 1 ? w : 1 - w;
}

// ---------- Black-Scholes Greeks ----------

// European call/put on a non-dividend-paying underlying.
//   d1 = (ln(S/K) + (r + σ²/2)·T) / (σ·√T)
//   d2 = d1 - σ·√T
//   Call: C = S·N(d1) - K·e^(-rT)·N(d2)
//   Put : P = K·e^(-rT)·N(-d2) - S·N(-d1)
// Greeks are raw analytical derivatives.
export function bsGreeks(S, K, r, sigma, T, optionType) {
  if (T <= 0 || sigma <= 0) {
    // Degenerate — return intrinsic, zeros for sensitivities.
    const intrinsic =
      optionType === 'put' ? Math.max(K - S, 0) : Math.max(S - K, 0);
    return { price: intrinsic, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const Nd1 = normCDF(d1);
  const Nd2 = normCDF(d2);
  const pdfd1 = normPDF(d1);
  const discK = K * Math.exp(-r * T);

  const isCall = optionType !== 'put';
  const price = isCall ? S * Nd1 - discK * Nd2 : discK * (1 - Nd2) - S * (1 - Nd1);
  const delta = isCall ? Nd1 : Nd1 - 1;
  const gamma = pdfd1 / (S * sigma * sqrtT);
  const vega = S * pdfd1 * sqrtT; // per 1.00 vol move (i.e. 100%); scale to 1% later
  const theta = isCall
    ? -(S * pdfd1 * sigma) / (2 * sqrtT) - r * discK * Nd2
    : -(S * pdfd1 * sigma) / (2 * sqrtT) + r * discK * (1 - Nd2);
  const rho = isCall ? T * discK * Nd2 : -T * discK * (1 - Nd2);

  return { price, delta, gamma, vega, theta, rho };
}

// ---------- Position-level Greeks ----------

// Returns position-scaled, demo-friendly Greeks:
//   delta : shares-equivalent  (qty * raw_delta)
//   gamma : qty * raw_gamma    ($ per $1 underlying move per unit qty)
//   vega  : $ per 1% IV move   (qty * raw_vega / 100)
//   theta : $ per calendar day (qty * raw_theta / 365)
//   rho   : $ per 1% rate move (qty * raw_rho / 100)
// Equities: delta = qty (shares), all other Greeks = 0.
// Swaps: returned as zeros — see header note.
export function positionGreeks(p) {
  const qty = Number(p.quantity) || 0;

  if (p.type === 'option') {
    const g = bsGreeks(
      Number(p.spot),
      Number(p.strike),
      Number(p.riskFreeRate),
      Number(p.iv),
      Number(p.timeToExpiry),
      p.optionType,
    );
    return {
      price: g.price,
      delta: qty * g.delta,
      gamma: qty * g.gamma,
      vega: (qty * g.vega) / 100,
      theta: (qty * g.theta) / 365,
      rho: (qty * g.rho) / 100,
    };
  }

  if (p.type === 'swap') {
    return { price: 0, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
  }

  // Equity (or unknown type — treated as equity, delta=1).
  return {
    price: Number(p.price) || 0,
    delta: qty,
    gamma: 0,
    vega: 0,
    theta: 0,
    rho: 0,
  };
}

export function portfolioGreeks(positions) {
  const total = { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
  positions.forEach((p) => {
    const g = positionGreeks(p);
    total.delta += g.delta;
    total.gamma += g.gamma;
    total.vega += g.vega;
    total.theta += g.theta;
    total.rho += g.rho;
  });
  return total;
}

// ---------- VaR ----------

// Build the daily portfolio P&L vector across the supplied returns history.
//
// For each historical day t we compute:
//   pnl_t = Σᵢ ($-delta_i) · r_{i,t}     for equity-like positions
//          + 0                            for swaps and options held flat to underlying
// where $-delta_i = qty_i · spot_i · delta_BSi
//
// This is a delta-normal approximation: it captures linear exposure to each
// underlying. Options contribute via their delta only — gamma/vega effects are
// ignored in this VaR view, consistent with delta-normal industry practice.
// Swaps have zero exposure to equity returns and are excluded.
export function portfolioPnLSeries(positions, getReturns) {
  const exposures = []; // { symbol, dollarDelta }
  positions.forEach((p) => {
    if (p.type === 'option') {
      const g = bsGreeks(
        Number(p.spot),
        Number(p.strike),
        Number(p.riskFreeRate),
        Number(p.iv),
        Number(p.timeToExpiry),
        p.optionType,
      );
      const dollarDelta = (Number(p.quantity) || 0) * Number(p.spot) * g.delta;
      exposures.push({ symbol: p.underlying, dollarDelta });
    } else if (p.type === 'swap') {
      // No equity exposure; swap risk is rate-based, handled in stress tests.
    } else {
      // Equity / default.
      const dollarDelta = (Number(p.quantity) || 0) * (Number(p.price) || 0);
      exposures.push({ symbol: p.symbol, dollarDelta });
    }
  });

  const symbols = [...new Set(exposures.map((e) => e.symbol))];
  const returnsBySymbol = {};
  let nDays = 0;
  symbols.forEach((s) => {
    const r = getReturns(s);
    returnsBySymbol[s] = r;
    if (r.length > nDays) nDays = r.length;
  });

  const pnl = new Array(nDays).fill(0);
  exposures.forEach((e) => {
    const r = returnsBySymbol[e.symbol] || [];
    for (let t = 0; t < r.length; t++) pnl[t] += e.dollarDelta * r[t];
  });
  return pnl;
}

// Empirical percentile (linear interpolation) of an array.
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// Historical VaR: positive number = loss magnitude at the given confidence.
// 95% VaR = -percentile(pnls, 5),  99% VaR = -percentile(pnls, 1).
export function historicalVaR(pnls, confidence) {
  const p = 100 - confidence;
  return -percentile(pnls, p);
}

// Parametric (variance-covariance / delta-normal) VaR, assuming daily
// portfolio P&L ~ N(0, σ²) where σ is the sample std of the historical
// portfolio P&L series. z(95) = 1.645, z(99) = 2.326.
export function parametricVaR(pnls, confidence) {
  if (!pnls.length) return 0;
  const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
  const variance =
    pnls.reduce((a, b) => a + (b - mean) ** 2, 0) / pnls.length;
  const std = Math.sqrt(variance);
  const z = confidence >= 99 ? 2.326 : 1.645;
  return z * std;
}

// Monte Carlo VaR — naive: each underlying's daily return drawn independently
// from N(0, σᵢ²) with σᵢ = sample std of that underlying's history.
// This deliberately ignores cross-asset correlation and will typically yield
// lower VaR than the historical method when correlations are positive — that
// divergence is the point of having three methods.
export function monteCarloVaR(positions, getReturns, confidence, draws = 10000) {
  // Build per-underlying sigma and dollar-delta exposure.
  const exposures = [];
  positions.forEach((p) => {
    if (p.type === 'option') {
      const g = bsGreeks(
        Number(p.spot),
        Number(p.strike),
        Number(p.riskFreeRate),
        Number(p.iv),
        Number(p.timeToExpiry),
        p.optionType,
      );
      exposures.push({
        symbol: p.underlying,
        dollarDelta: (Number(p.quantity) || 0) * Number(p.spot) * g.delta,
      });
    } else if (p.type !== 'swap') {
      exposures.push({
        symbol: p.symbol,
        dollarDelta: (Number(p.quantity) || 0) * (Number(p.price) || 0),
      });
    }
  });

  const symbols = [...new Set(exposures.map((e) => e.symbol))];
  const sigmas = {};
  symbols.forEach((s) => {
    const r = getReturns(s);
    if (!r.length) {
      sigmas[s] = 0;
      return;
    }
    const m = r.reduce((a, b) => a + b, 0) / r.length;
    const v = r.reduce((a, b) => a + (b - m) ** 2, 0) / r.length;
    sigmas[s] = Math.sqrt(v);
  });

  const rng = mulberry32(0xc0ffee);
  const pnls = new Array(draws);
  for (let d = 0; d < draws; d++) {
    let pnl = 0;
    for (let i = 0; i < exposures.length; i++) {
      const e = exposures[i];
      const z = boxMuller(rng);
      pnl += e.dollarDelta * sigmas[e.symbol] * z;
    }
    pnls[d] = pnl;
  }
  return { var: -percentile(pnls, 100 - confidence), pnls };
}

// ---------- Stress scenarios ----------

// Apply a shock to a single position and return the P&L change in $.
//   equityShock : decimal, e.g. -0.34 = -34%
//   rateShockBps: integer basis points, e.g. +425
//   volShockPts : absolute IV points, e.g. +0.30 = +30 IV pts
export function shockPositionPnL(p, { equityShock, rateShockBps, volShockPts }) {
  const qty = Number(p.quantity) || 0;
  const rateShock = (rateShockBps || 0) / 10000;

  if (p.type === 'option') {
    const S = Number(p.spot);
    const K = Number(p.strike);
    const r = Number(p.riskFreeRate);
    const iv = Number(p.iv);
    const T = Number(p.timeToExpiry);
    const original = bsGreeks(S, K, r, iv, T, p.optionType).price;
    const shocked = bsGreeks(
      S * (1 + equityShock),
      K,
      r + rateShock,
      Math.max(0.01, iv + volShockPts),
      T,
      p.optionType,
    ).price;
    return qty * (shocked - original);
  }

  if (p.type === 'swap') {
    // Receive-fixed convention: P&L = -DV01 * rate_bps.
    const dv01 = Number(p.dv01) || 0;
    return -dv01 * (rateShockBps || 0);
  }

  // Equity / default.
  const px = Number(p.price) || 0;
  return qty * px * (equityShock || 0);
}

export function shockPortfolioPnL(positions, shock) {
  let total = 0;
  const breakdown = positions.map((p) => {
    const pnl = shockPositionPnL(p, shock);
    total += pnl;
    return { id: p.id, symbol: p.symbol, type: p.type, pnl };
  });
  return { total, breakdown };
}

// ---------- Portfolio summary ----------

export function portfolioSummary(positions) {
  let notional = 0;
  let mtm = 0;
  positions.forEach((p) => {
    const qty = Number(p.quantity) || 0;
    if (p.type === 'swap') {
      notional += Math.abs(Number(p.notional) || 0);
    } else {
      const px = Number(p.price) || 0;
      notional += Math.abs(qty * px);
      mtm += qty * px;
    }
  });
  return { count: positions.length, notional, mtm };
}
