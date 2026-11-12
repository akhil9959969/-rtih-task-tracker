import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Search } from 'lucide-react';
import { TiltCard } from '../components/TiltCard';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { AppShell } from '../components/AppShell';
import { TaskList } from '../components/TaskList';
import { TaskListSkeleton } from '../components/ui/skeleton';
import { TaskFormDialog } from '../components/TaskFormDialog';
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog';
import { Button } from '../components/ui/button';
import { StatusSelect, ALL_STATUSES } from '../components/ui/select';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/toast';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* Count-up animation for stat numbers; static when reduced motion is on. */
function useCountUp(target) {
  const [shown, setShown] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      prev.current = target;
      setShown(target);
      return;
    }
    const from = prev.current;
    if (from === target) return;
    const t0 = performance.now();
    const dur = 450;
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(from + (target - from) * eased));
      if (k < 1) raf = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}

function StatCard({ value, label, dot, delay = 0 }) {
  const shown = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex-1"
    >
      <TiltCard max={6} className="h-full rounded-2xl border border-hair bg-surface p-4 shadow-lift sm:p-5">
        <div className="text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">{shown}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-sub">
          {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
          {label}
        </div>
      </TiltCard>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({ Pending: 0, 'In Progress': 0, Completed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL_STATUSES);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async (s = search, f = status) => {
    const filterValue = f === ALL_STATUSES ? '' : f;
    try {
      const data = await api.tasks(s, filterValue);
      setTasks(data.tasks);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      toast(err.message || 'Could not load tasks.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, status, toast]);

  // Initial load, then re-query when search/filter change (small debounce
  // on typing so we do not fire one request per keystroke).
  useEffect(() => {
    const t = setTimeout(() => load(), search ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  async function toggleDone(task) {
    try {
      await api.updateTask(task.id, {
        title: task.title,
        description: task.description || '',
        status: task.status === 'Completed' ? 'Pending' : 'Completed',
      });
      load();
    } catch (err) {
      toast(err.message || 'Could not update the status.', 'error');
    }
  }

  const total = summary.Pending + summary['In Progress'] + summary.Completed;
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AppShell>
      <div id="overview" className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">{greeting()}, {user?.name?.split(' ')[0]}.</h1>
            <p className="mt-1.5 text-[13.5px] text-sub">{today} - here is your day at a glance.</p>
          </div>
          <Button size="lg" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={17} /> New task
          </Button>
        </motion.div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard value={total} label="Total tasks" />
          <StatCard value={summary.Pending} label="Pending" dot="var(--pend-tx)" delay={0.05} />
          <StatCard value={summary['In Progress']} label="In progress" dot="var(--accent)" delay={0.1} />
          <StatCard value={summary.Completed} label="Completed" dot="var(--done-tx)" delay={0.15} />
        </div>

        <div id="tasks" className="mt-7 mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sub" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title..."
              aria-label="Search tasks by title"
              className="w-full rounded-xl border border-hair bg-surface py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-sub focus:border-accent focus:outline-none"
            />
          </div>
          <StatusSelect value={status} onChange={setStatus} allowAll />
        </div>

        <TaskList
          tasks={tasks}
          loading={loading}
          filtered={Boolean(search || (status && status !== ALL_STATUSES))}
          onToggleDone={toggleDone}
          onEdit={(t) => { setEditing(t); setFormOpen(true); }}
          onDelete={setDeleting}
          onNew={() => { setEditing(null); setFormOpen(true); }}
          skeleton={<TaskListSkeleton />}
        />

        <div id="settings" className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-hair bg-surface p-5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-sub">Settings</div>
          <ThemeSwitcher />
          <p className="text-center text-[12.5px] text-sub">
            Signed in as {user?.email || user?.name}. Only you can see these tasks.
          </p>
        </div>
      </div>

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editing} onSaved={load} />
      <ConfirmDeleteDialog task={deleting} onOpenChange={() => setDeleting(null)} onDeleted={load} />
    </AppShell>
  );
}
