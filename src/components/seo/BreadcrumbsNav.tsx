import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Visible breadcrumb trail mirroring the JSON-LD BreadcrumbList emitted on the page.
 */
export default function BreadcrumbsNav({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="max-w-3xl mx-auto px-4 pt-6 pb-2 text-xs text-muted-foreground flex items-center flex-wrap gap-1"
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1">
            {c.href && !isLast ? (
              <Link to={c.href} className="hover:text-primary transition-colors">
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-foreground font-medium' : ''}>{c.label}</span>
            )}
            {!isLast && <ChevronRight className="h-3 w-3" />}
          </span>
        );
      })}
    </nav>
  );
}
