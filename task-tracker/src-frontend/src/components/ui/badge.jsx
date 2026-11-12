import { cn } from '../../lib/utils';

const tones = {
  Pending: 'bg-pend-bg text-pend-tx',
  'In Progress': 'bg-prog-bg text-prog-tx',
  Completed: 'bg-done-bg text-done-tx',
};

export function StatusBadge({ status, className }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-extrabold', tones[status] || tones.Pending, className)}>
      {status}
    </span>
  );
}
