import { cn } from '../../lib/utils';

export function Input({ className, invalid, ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-sub transition-colors duration-150',
        invalid ? 'border-danger' : 'border-hair focus:border-accent',
        'focus:outline-none',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-sub transition-colors duration-150 min-h-20 resize-y',
        invalid ? 'border-danger' : 'border-hair focus:border-accent',
        'focus:outline-none',
        className
      )}
      {...props}
    />
  );
}

export function Field({ label, error, children, htmlFor }) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold text-ink">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs font-semibold text-danger" role="alert">{error}</p>}
    </div>
  );
}
