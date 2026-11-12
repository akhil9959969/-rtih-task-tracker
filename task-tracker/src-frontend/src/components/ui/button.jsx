import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-btn hover:brightness-105 shadow-sm',
        ghost: 'bg-transparent border border-hair2 text-ink hover:bg-accent-soft/40',
        danger: 'bg-danger text-white hover:brightness-105',
      },
      size: {
        md: 'px-4 py-2.5',
        lg: 'px-5 py-3',
        icon: 'p-2',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

// forwardRef is required: Radix Slot (DropdownMenu.Trigger asChild) passes a
// ref to measure the anchor's position; without it the menu opens unpositioned.
export const Button = forwardRef(function Button({ variant, size, className, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
