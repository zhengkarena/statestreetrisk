import { seededReturns } from '../lib/risk.js';

// Annualized vol assumptions for the baseline universe. Stable across reloads
// because seededReturns hashes the symbol for its PRNG seed.
const VOLS = {
  AAPL: 0.28,
  MSFT: 0.24,
  JPM: 0.30,
  SPY: 0.18,
  XOM: 0.32,
};

const DAYS = 252;

const cache = new Map();

function buildBaseline() {
  Object.entries(VOLS).forEach(([sym, vol]) => {
    cache.set(sym, seededReturns(sym, DAYS, vol));
  });
}
buildBaseline();

export const DEFAULT_VOL = 0.25;

// Lookup or generate-on-the-fly. For symbols outside the baseline (e.g.
// uploaded CSV with unknown tickers), generate a stable seeded series at
// DEFAULT_VOL so VaR keeps working end-to-end on the demo path.
export function getMarketReturns(symbol) {
  if (!symbol) return [];
  if (cache.has(symbol)) return cache.get(symbol);
  const r = seededReturns(symbol, DAYS, DEFAULT_VOL);
  cache.set(symbol, r);
  return r;
}

export function knownSymbols() {
  return Object.keys(VOLS);
}
