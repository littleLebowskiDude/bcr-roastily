import { useId, useState, type ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function SectionCard({ title, subtitle, children, defaultOpen = false }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-slate-100 backdrop-blur">
      <header className={`flex items-center justify-between gap-3 ${isOpen ? "mb-4" : "mb-2"}`}>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls={`${contentId}-content`}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300"
        >
          {isOpen ? "Collapse" : "Expand"}
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>
      {isOpen ? <div id={`${contentId}-content`}>{children}</div> : null}
    </section>
  );
}
