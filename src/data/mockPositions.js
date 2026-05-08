// Mock portfolio: 5 equities, 3 equity options, 2 IR swaps.
// Notionals between $1M and $50M. All prices/strikes USD.
// `quantity` and `price` are the universal required fields used by uploads;
// type-specific fields are extras carried alongside.

export const MOCK_POSITIONS = [
  // ---------- Equities ----------
  {
    id: 'eq-aapl',
    type: 'equity',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    quantity: 50000,
    price: 187.42,
    currency: 'USD',
  },
  {
    id: 'eq-msft',
    type: 'equity',
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    quantity: 32000,
    price: 412.18,
    currency: 'USD',
  },
  {
    id: 'eq-jpm',
    type: 'equity',
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    quantity: 75000,
    price: 198.65,
    currency: 'USD',
  },
  {
    id: 'eq-spy',
    type: 'equity',
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    quantity: 18000,
    price: 521.34,
    currency: 'USD',
  },
  {
    id: 'eq-xom',
    type: 'equity',
    symbol: 'XOM',
    name: 'Exxon Mobil Corp.',
    quantity: 120000,
    price: 113.92,
    currency: 'USD',
  },

  // ---------- Equity Options ----------
  {
    id: 'opt-aapl-call',
    type: 'option',
    symbol: 'AAPL 200C 2026-06',
    underlying: 'AAPL',
    optionType: 'call',
    strike: 200,
    spot: 187.42,
    iv: 0.28,
    timeToExpiry: 0.42,
    riskFreeRate: 0.045,
    quantity: 1500,
    price: 9.85,
    currency: 'USD',
  },
  {
    id: 'opt-spy-put',
    type: 'option',
    symbol: 'SPY 500P 2026-09',
    underlying: 'SPY',
    optionType: 'put',
    strike: 500,
    spot: 521.34,
    iv: 0.18,
    timeToExpiry: 0.67,
    riskFreeRate: 0.045,
    quantity: 800,
    price: 12.4,
    currency: 'USD',
  },
  {
    id: 'opt-msft-call',
    type: 'option',
    symbol: 'MSFT 420C 2026-12',
    underlying: 'MSFT',
    optionType: 'call',
    strike: 420,
    spot: 412.18,
    iv: 0.24,
    timeToExpiry: 0.92,
    riskFreeRate: 0.045,
    quantity: 600,
    price: 28.7,
    currency: 'USD',
  },

  // ---------- IR Swaps ----------
  // Receive fixed / pay floating SOFR. Notional is the swap notional.
  // `quantity` = 1 (one contract), `price` = current MTM mark per million notional.
  {
    id: 'swap-usd-5y',
    type: 'swap',
    symbol: 'USD IRS 5Y SOFR',
    notional: 25000000,
    fixedRate: 0.0395,
    floatingRef: 'SOFR',
    tenor: '5Y',
    dv01: 12150, // approx $/bp at 25M notional, 5Y duration ~4.6
    quantity: 1,
    price: 0,
    currency: 'USD',
  },
  {
    id: 'swap-usd-10y',
    type: 'swap',
    symbol: 'USD IRS 10Y SOFR',
    notional: 40000000,
    fixedRate: 0.0418,
    floatingRef: 'SOFR',
    tenor: '10Y',
    dv01: 33600, // approx $/bp at 40M notional, 10Y duration ~8.4
    quantity: 1,
    price: 0,
    currency: 'USD',
  },
];
