import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';

/** Simple row-action menu (Edit / Delete). */
export function RowMenu({ onEdit, onDelete, children }) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>{children}</DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content align="end" sideOffset={4} className="z-50 min-w-36 rounded-xl border border-hair bg-surface p-1 shadow-xl">
          <DropdownPrimitive.Item onSelect={onEdit} className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-ink outline-none data-[highlighted]:bg-accent-soft/60">
            Edit
          </DropdownPrimitive.Item>
          <DropdownPrimitive.Item onSelect={onDelete} className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-danger outline-none data-[highlighted]:bg-danger/10">
            Delete
          </DropdownPrimitive.Item>
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}
