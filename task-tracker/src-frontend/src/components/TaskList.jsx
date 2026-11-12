import { motion, AnimatePresence } from 'motion/react';
import { Circle, CheckCircle2, MoreHorizontal, ClipboardList } from 'lucide-react';
import { StatusBadge } from './ui/badge';
import { RowMenu } from './ui/dropdown';
import { Button } from './ui/button';

function formatDate(value) {
  // MySQL returns "YYYY-MM-DD HH:MM:SS"; show a short friendly date.
  const d = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * One task row. React escapes all rendered text, so stored titles and
 * descriptions cannot inject markup into the page.
 */
function TaskRow({ task, onToggleDone, onEdit, onDelete }) {
  const done = task.status === 'Completed';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-b border-hair px-4 py-4 last:border-0"
    >
      <button
        onClick={() => onToggleDone(task)}
        aria-label={done ? `Mark "${task.title}" as pending` : `Mark "${task.title}" as completed`}
        className="order-1 shrink-0 text-hair2 transition-colors hover:text-accent"
      >
        {done ? <CheckCircle2 size={21} className="text-done-tx" /> : <Circle size={21} />}
      </button>
      <div className="order-2 min-w-0 flex-1">
        <div className={`truncate text-[14.5px] font-bold ${done ? 'text-sub line-through' : 'text-ink'}`}>{task.title}</div>
        {task.description && <div className="mt-0.5 truncate text-[12.5px] text-sub">{task.description}</div>}
      </div>
      <div className="order-4 flex shrink-0 basis-full items-center gap-2 pl-[34px] sm:order-3 sm:basis-auto sm:pl-0">
        <StatusBadge status={task.status} />
        <span className="text-[11.5px] text-sub sm:text-[12.5px]">{formatDate(task.created_at)}</span>
      </div>
      <div className="order-3 shrink-0 sm:order-4">
        <RowMenu onEdit={() => onEdit(task)} onDelete={() => onDelete(task)}>
          <Button variant="ghost" size="icon" aria-label={`Actions for "${task.title}"`}>
            <MoreHorizontal size={17} />
          </Button>
        </RowMenu>
      </div>
    </motion.div>
  );
}

export function EmptyState({ filtered, onNew }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-hair2 bg-surface px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-text"><ClipboardList size={22} /></span>
      <p className="font-serif text-xl text-ink">{filtered ? 'No tasks match that.' : 'No tasks yet.'}</p>
      <p className="mt-1 max-w-64 text-[13px] text-sub">
        {filtered ? 'Try a different search or clear the status filter.' : 'Add your first task and it will show up here.'}
      </p>
      {!filtered && <Button className="mt-5" onClick={onNew}>+ New task</Button>}
    </div>
  );
}

export function TaskList({ tasks, loading, filtered, onToggleDone, onEdit, onDelete, onNew, skeleton }) {
  if (loading) return skeleton;
  if (tasks.length === 0) return <EmptyState filtered={filtered} onNew={onNew} />;
  return (
    <div className="rounded-2xl border border-hair bg-surface p-2">
      <AnimatePresence initial={false}>
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} onToggleDone={onToggleDone} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </AnimatePresence>
    </div>
  );
}
