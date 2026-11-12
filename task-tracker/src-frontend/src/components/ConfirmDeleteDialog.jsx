import { useState } from 'react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { api } from '../lib/api';
import { useToast } from './ui/toast';

/** Destructive action always passes through this explicit confirmation. */
export function ConfirmDeleteDialog({ task, onOpenChange, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function confirm() {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.deleteTask(task.id);
      toast('Task deleted.');
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast(err.message || 'Could not delete the task.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={Boolean(task)}
      onOpenChange={onOpenChange}
      title="Delete this task?"
      description={`"${task?.title || ''}" will be permanently removed. This cannot be undone.`}
    >
      <div className="mt-2 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Keep task</Button>
        <Button variant="danger" onClick={confirm} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
      </div>
    </Dialog>
  );
}
