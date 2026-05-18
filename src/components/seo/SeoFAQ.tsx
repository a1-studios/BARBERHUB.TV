import { trackSeoEvent } from '@/lib/seoAnalytics';

export interface FAQItem {
  question: string;
  answer: string;
}

interface SeoFAQProps {
  items: FAQItem[];
  citySlug?: string;
  serviceSlug?: string;
}

/**
 * Accessible <details>-based FAQ accordion. JSON-LD is emitted by the
 * parent landing page; this only renders the visible UI and tracks opens.
 */
export default function SeoFAQ({ items, citySlug, serviceSlug }: SeoFAQProps) {
  return (
    <section className="max-w-3xl mx-auto px-4 pb-20">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">Frequently asked</h2>
      <div className="space-y-3">
        {items.map((q) => (
          <details
            key={q.question}
            className="p-4 rounded-lg border border-border group bg-card/40"
            onToggle={(e) => {
              if ((e.target as HTMLDetailsElement).open) {
                trackSeoEvent('seo_faq_open', {
                  city_slug: citySlug ?? null,
                  service_slug: serviceSlug ?? null,
                  question: q.question,
                });
              }
            }}
          >
            <summary className="font-semibold cursor-pointer list-none flex justify-between items-center gap-3">
              <span>{q.question}</span>
              <span className="text-primary group-open:rotate-45 transition-transform text-xl leading-none">+</span>
            </summary>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{q.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
