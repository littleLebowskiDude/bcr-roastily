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
    <section className="group rounded-2xl bg-white shadow-warm transition-warm hover:shadow-warm-lg">
      {/* Accent bar */}
      <div className="h-1 rounded-t-2xl bg-gradient-to-r from-espresso-200 via-espresso-100 to-espresso-200 opacity-60" />

      <div className="p-5 md:p-6">
        <header className={`flex items-center justify-between gap-4 ${isOpen ? "mb-5" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-espresso-100">
              <svg className="h-4 w-4 text-espresso-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-espresso-900">{title}</p>
              {subtitle ? <p className="text-sm text-espresso-500">{subtitle}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls={`${contentId}-content`}
            className="inline-flex items-center gap-2 rounded-lg border border-espresso-200 bg-linen-50 px-3 py-1.5 text-xs font-semibold text-espresso-700 transition-warm hover:border-espresso-300 hover:bg-espresso-50"
          >
            {isOpen ? "Collapse" : "Expand"}
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>

        {isOpen ? (
          <div
            id={`${contentId}-content`}
            className="animate-fade-in"
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
