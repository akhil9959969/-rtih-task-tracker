import { useEffect, useState } from 'react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Field, Input, Textarea } from './ui/input';
import { StatusSelect } from './ui/select';
import { api, ApiError } from '../lib/api';
import { useToast } from './ui/toast';

/**
 * Create/edit dialog. Validates on the client for fast feedback, then the
 * server validates again - its field errors are shown under the inputs.
 * The task list only changes after the server confirms the write.
 */
export function TaskFormDialog({ open, onOpenChange, task, onSaved }) {
  const editing = Boolean(task);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Pending');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setTitle(task?.title || '');
      setDescription(task?.description || '');
      setStatus(task?.status || 'Pending');
      setErrors({});
      setSaving(false);
    }
  }, [open, task]);

  function validateClient() {
    const e = {};
    if (!title.trim()) e.title = 'Please enter a task title.';
    if (!['Pending', 'In Progress', 'Completed'].includes(status)) e.status = 'Please select a valid task status.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!validateClient() || saving) return;
    setSaving(true);
    try {
      const payload = { title: title.trim(), description: description.trim(), status };
      if (editing) {
        await api.updateTask(task.id, payload);
        toast('Task updated.');
      } else {
        await api.createTask(payload);
        toast('Task added.');
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(err.fieldErrors);
      } else {
        toast(err.message || 'Could not save the task.', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Edit task' : 'New task'}
      description="It saves to your account only."
    >
      <form
        onSubmit={(e) => { e.preventDefault(); save(); }}
      >
        <Field label="Title" error={errors.title} htmlFor="task-title">
          <Input
            id="task-title"
            value={title}
            invalid={Boolean(errors.title)}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Prepare review notes"
            maxLength={200}
            autoFocus
          />
        </Field>
        <Field label="Description" htmlFor="task-desc">
          <Textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details"
          />
        </Field>
        <Field label="Status" error={errors.status} htmlFor="task-status">
          <StatusSelect id="task-status" value={status} onChange={setStatus} />
        </Field>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create task'}</Button>
        </div>
      </form>
    </Dialog>
  );
}
