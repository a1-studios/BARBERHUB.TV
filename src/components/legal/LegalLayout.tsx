import { ReactNode } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Props {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}

export function LegalLayout({ title, lastUpdated = 'May 8, 2026', children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-3xl mx-auto">
          <div
            className="h-px w-24 mb-6"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--cyan) / 0.8), transparent)' }}
          />
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            {title}
          </h1>
          <p className="text-xs text-muted-foreground mt-2">Last updated: {lastUpdated}</p>
          <div
            className="mt-8 space-y-8 [&_h2]:text-xl [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-white [&_h2]:flex [&_h2]:items-baseline [&_h2]:gap-3 [&_h2_span.num]:text-primary [&_h2_span.num]:font-mono [&_h3]:text-sm [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-cyan-300 [&_h3]:mt-4 [&_p]:text-sm [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mt-2 [&_ul]:space-y-1 [&_ul_li]:text-sm [&_ul_li]:text-muted-foreground [&_a]:text-cyan-300 [&_a:hover]:text-cyan-200 [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-white"
          >
            {children}
          </div>
          <p className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
            &copy; 2026 Barber Hub LLC. All rights reserved. 175 East Shore Road, Great Neck, NY.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
