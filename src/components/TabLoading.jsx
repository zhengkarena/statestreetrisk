import { useEffect, useState } from 'react';

// 150ms delay before the spinner appears. If the lazy chunk loads inside that
// window — which is typical for the small ones — Suspense unmounts the
// fallback before this component flips to visible, so users see no flicker.
export default function TabLoading({ label }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex items-center gap-3 text-slate-500">
        <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-navy-700 animate-spin" />
        <span className="text-sm">Loading{label ? ` ${label}` : ''}…</span>
      </div>
    </div>
  );
}
