import Papa from 'papaparse';
// xlsx@0.18.5 has unpatched advisories on npm (prototype pollution, ReDoS).
// Accepted: this is a local browser demo — files are user-uploaded into the
// page only, never reach a server, so the attack surface is zero. Switching
// to the SheetJS CDN tarball is a deferred packaging concern, not a fix.
//
// Imported dynamically inside parseExcel so users uploading CSV (or never
// uploading at all) don't pay the ~370 KB cost.

export const REQUIRED_COLUMNS = ['symbol', 'quantity', 'price'];

// Parse a File handle. Returns:
//   { rows, columns, error? }
// where rows is an array of plain objects keyed by ORIGINAL header strings,
// columns is the ordered original header list.
export async function parseFile(file) {
  const name = (file.name || '').toLowerCase();
  const isCSV = name.endsWith('.csv') || file.type === 'text/csv';
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');

  if (isCSV) return parseCSV(file);
  if (isExcel) return parseExcel(file);
  return {
    rows: [],
    columns: [],
    error: `Unsupported file type "${file.name}". Use .csv, .xlsx, or .xls.`,
  };
}

function parseCSV(file) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (res) => {
        const columns = res.meta.fields || [];
        const rows = (res.data || []).filter((r) => Object.values(r).some((v) => v !== ''));
        resolve({ rows, columns });
      },
      error: (err) => resolve({ rows: [], columns: [], error: err.message }),
    });
  });
}

async function parseExcel(file) {
  try {
    const [buf, xlsxMod] = await Promise.all([file.arrayBuffer(), import('xlsx')]);
    const XLSX = xlsxMod.default ?? xlsxMod;
    const wb = XLSX.read(buf, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { rows: [], columns: [], error: 'Workbook has no sheets.' };
    const sheet = wb.Sheets[sheetName];
    const arr = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    const columns = arr.length ? Object.keys(arr[0]) : [];
    return { rows: arr, columns };
  } catch (e) {
    return { rows: [], columns: [], error: 'Could not parse Excel file: ' + e.message };
  }
}

// Validate that the parsed data has the required portfolio columns.
// Case-insensitive match. Returns { ok, missing, errorMessage? }.
export function validateRequired(columns) {
  const lower = columns.map((c) => String(c).trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((req) => !lower.includes(req));
  if (missing.length === 0) return { ok: true, missing: [] };
  return {
    ok: false,
    missing,
    errorMessage:
      `Missing required column(s): ${missing.join(', ')}. ` +
      `Found columns: ${columns.length ? columns.join(', ') : '(none)'}. ` +
      `Required for portfolio data: ${REQUIRED_COLUMNS.join(', ')}.`,
  };
}

// Normalize rows to use lowercase canonical keys for the required fields,
// while preserving all other original keys. Coerces quantity/price to Number.
export function normalizeRows(rows, columns) {
  const lowerToOriginal = {};
  columns.forEach((c) => {
    lowerToOriginal[String(c).trim().toLowerCase()] = c;
  });

  return rows.map((r) => {
    const out = { ...r };
    REQUIRED_COLUMNS.forEach((req) => {
      const orig = lowerToOriginal[req];
      if (orig === undefined) return;
      const v = r[orig];
      if (req === 'quantity' || req === 'price') {
        const n = Number(String(v).replace(/[, ]/g, ''));
        out[req] = Number.isFinite(n) ? n : null;
      } else {
        out[req] = v;
      }
      if (orig !== req) delete out[orig];
    });
    return out;
  });
}

// Infer column type per column: 'number' | 'date' | 'string'.
// Looks at non-empty values; needs >=80% to match a type to pick it.
export function inferColumnTypes(rows, columns) {
  const types = {};
  columns.forEach((col) => {
    const values = rows.map((r) => r[col]).filter((v) => v !== '' && v !== null && v !== undefined);
    if (values.length === 0) {
      types[col] = 'string';
      return;
    }
    let nums = 0;
    let dates = 0;
    for (const v of values) {
      const cleaned = String(v).replace(/[, ]/g, '');
      const n = Number(cleaned);
      if (cleaned !== '' && Number.isFinite(n)) {
        nums++;
        continue;
      }
      const looksLikeDate = /\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(String(v));
      if (looksLikeDate && !Number.isNaN(Date.parse(v))) dates++;
    }
    const threshold = values.length * 0.8;
    if (nums >= threshold) types[col] = 'number';
    else if (dates >= threshold) types[col] = 'date';
    else types[col] = 'string';
  });
  return types;
}

// Quality summary: missing per column, outlier (|z| > 3) per numeric column,
// and overall date range across all date columns.
export function buildQualitySummary(rows, columns, types) {
  const missing = {};
  const outliers = {};
  let dateMin = null;
  let dateMax = null;

  columns.forEach((col) => {
    let missingCount = 0;
    const numericValues = [];
    rows.forEach((r) => {
      const v = r[col];
      if (v === '' || v === null || v === undefined) {
        missingCount++;
        return;
      }
      if (types[col] === 'number') {
        const n = Number(String(v).replace(/[, ]/g, ''));
        if (Number.isFinite(n)) numericValues.push(n);
      } else if (types[col] === 'date') {
        const t = Date.parse(v);
        if (!Number.isNaN(t)) {
          if (dateMin === null || t < dateMin) dateMin = t;
          if (dateMax === null || t > dateMax) dateMax = t;
        }
      }
    });
    missing[col] = missingCount;

    if (types[col] === 'number' && numericValues.length >= 3) {
      const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const variance =
        numericValues.reduce((a, b) => a + (b - mean) ** 2, 0) / numericValues.length;
      const std = Math.sqrt(variance);
      if (std > 0) {
        outliers[col] = numericValues.filter((v) => Math.abs((v - mean) / std) > 3).length;
      } else {
        outliers[col] = 0;
      }
    } else {
      outliers[col] = null; // not applicable
    }
  });

  return {
    missing,
    outliers,
    dateRange:
      dateMin !== null && dateMax !== null
        ? {
            from: new Date(dateMin).toISOString().slice(0, 10),
            to: new Date(dateMax).toISOString().slice(0, 10),
          }
        : null,
  };
}
