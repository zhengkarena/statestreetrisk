import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const COMPONENTS = {
  h1: ({ children }) => <h1 className="text-lg font-bold text-slate-900 mt-3 mb-2">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-slate-900 mt-4 mb-2 border-b border-slate-200 pb-1">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-slate-900 mt-3 mb-1.5">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-slate-800 mt-2 mb-1">{children}</h4>
  ),
  p: ({ children }) => <p className="text-sm text-slate-700 mb-2 leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-2 text-sm text-slate-700 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-2 text-sm text-slate-700 space-y-0.5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ inline, children }) =>
    inline ? (
      <code className="bg-slate-100 text-slate-900 px-1 rounded text-[12px] font-mono">
        {children}
      </code>
    ) : (
      <code className="block bg-slate-100 text-slate-900 p-3 rounded text-xs font-mono overflow-x-auto mb-2">
        {children}
      </code>
    ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3">
      <table className="text-xs border border-slate-200 rounded">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
  th: ({ children }) => (
    <th className="px-2.5 py-1.5 text-left border-b border-slate-200 font-semibold text-slate-800">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2.5 py-1.5 border-b border-slate-100 text-slate-700 align-top">
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-navy-300 pl-3 italic text-slate-600 my-2">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-slate-200" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-navy-700 underline">
      {children}
    </a>
  ),
};

export default function Markdown({ body }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
      {body}
    </ReactMarkdown>
  );
}
