import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rb-blue)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--rb-blue)] text-white shadow-sm hover:brightness-110 active:brightness-95',
        secondary:
          'bg-[var(--rb-bg-active)] text-[var(--rb-text-primary)] hover:bg-[var(--rb-bg-elevated)]',
        ghost:
          'text-[var(--rb-text-primary)] hover:bg-[var(--rb-bg-hover)]',
        outline:
          'border border-[var(--rb-border-strong)] bg-transparent text-[var(--rb-text-primary)] hover:bg-[var(--rb-bg-hover)]',
        destructive: 'bg-[var(--rb-red)] text-white hover:brightness-110',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
});

export { buttonVariants };
