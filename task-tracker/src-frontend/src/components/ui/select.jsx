import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

/** Status select styled with the project tokens. */
export const ALL_STATUSES = 'all';

export function StatusSelect({ value, onChange, allowAll, id }) {
  // Radix Select cannot use an empty-string item value, so "all" is a
  // sentinel that the parent maps back to its empty filter.
  const options = [
    ...(allowAll ? [{ value: ALL_STATUSES, label: 'All statuses' }] : []),
    { value: 'Pending', label: 'Pending' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Completed', label: 'Completed' },
  ];
  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        id={id}
        className="inline-flex min-w-36 items-center justify-between gap-2 rounded-xl border border-hair bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-hair2 focus:outline-none data-[placeholder]:text-sub"
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon><ChevronDown size={16} className="text-sub" /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={6} className="z-50 min-w-44 overflow-hidden rounded-xl border border-hair bg-surface p-1 shadow-xl">
          <SelectPrimitive.Viewport>
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.label}
                value={o.value}
                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-ink outline-none data-[highlighted]:bg-accent-soft/60"
              >
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator><Check size={15} className="text-accent" /></SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
