import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionLabelProps {
  children: ReactNode;
  /** Optional right-side annotation — count badge, hint, etc. */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Standardized ALL-CAPS section header used in sidebars, panels, and
 * meta blocks. Centralized so spacing, weight, letter-spacing, and color
 * stay coherent across the chrome — change one thing here, every panel
 * follows.
 */
export function SectionLabel({ children, trailing, className }: SectionLabelProps): JSX.Element {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <span className="rb-section-label">{children}</span>
      {trailing && <span className="rb-section-trailing">{trailing}</span>}
    </div>
  );
}
