import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckSquare, LayoutGrid, ListTodo, Settings, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeSwitcher } from './ThemeSwitcher';

/**
 * App frame: collapsible sidebar on desktop, slide-over drawer on mobile.
 * "My Tasks" and "Settings" are anchors on the single dashboard page.
 */
export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [active, setActive] = useState(() => (window.location.hash || '#overview').slice(1));

  const initials = (user?.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  // Section navigation: smooth-scroll to the target and flash a highlight so
  // every click gives visible feedback, even when the section is already on
  // screen (a short page cannot scroll, so a plain hash link looks dead).
  const goTo = (id) => (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('section-flash');
    void el.offsetWidth; // restart the animation on a quick second click
    el.classList.add('section-flash');
    window.setTimeout(() => el.classList.remove('section-flash'), 1200);
    window.history.replaceState(null, '', `#${id}`);
    setActive(id);
  };

  const linkCls = (id) =>
    `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
      active === id ? 'bg-accent-soft text-accent-text' : 'text-sub hover:text-ink'
    }`;

  const nav = (
    <>
      <a href="#overview" onClick={goTo('overview')} aria-current={active === 'overview' ? 'true' : undefined} className={linkCls('overview')}>
        <LayoutGrid size={17} /> {!collapsed && 'Overview'}
      </a>
      <a href="#tasks" onClick={goTo('tasks')} aria-current={active === 'tasks' ? 'true' : undefined} className={linkCls('tasks')}>
        <ListTodo size={17} /> {!collapsed && 'My Tasks'}
      </a>
      <a href="#settings" onClick={goTo('settings')} aria-current={active === 'settings' ? 'true' : undefined} className={linkCls('settings')}>
        <Settings size={17} /> {!collapsed && 'Settings'}
      </a>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 232 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 hidden h-screen flex-col border-r border-hair bg-surface p-5 md:flex"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-btn"><CheckSquare size={16} /></span>
          {!collapsed && <span className="text-[17px] font-extrabold tracking-tight">Task Tracker</span>}
        </div>
        <nav className="mt-9 flex flex-col gap-1">{nav}</nav>
        <button onClick={() => setCollapsed((c) => !c)} className="mt-4 rounded-xl px-3 py-2 text-left text-xs font-bold text-sub transition-colors hover:text-ink">
          {collapsed ? '>' : '< Collapse'}
        </button>
        <div className="mt-3">{collapsed ? <ThemeSwitcher compact /> : <ThemeSwitcher />}</div>
        <div className="mt-auto flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-extrabold text-accent-btn">{initials}</span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold">{user?.name}</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} aria-label="Log out" className="rounded-lg p-1.5 text-sub transition-colors hover:bg-danger/10 hover:text-danger">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </motion.aside>

      {/* Mobile top bar + drawer */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-hair bg-surface px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-btn"><CheckSquare size={16} /></span>
            <span className="font-extrabold">Task Tracker</span>
          </div>
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-lg p-2 text-ink"><Menu size={20} /></button>
        </div>
        {drawer && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute left-0 top-0 flex h-full w-64 flex-col bg-surface p-5"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-extrabold">Menu</span>
                <button onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-sub"><X size={18} /></button>
              </div>
              <nav className="flex flex-col gap-1" onClick={() => setDrawer(false)}>{nav}</nav>
              <div className="mt-4 px-1"><ThemeSwitcher /></div>
              <button onClick={logout} className="mt-auto flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-danger">
                <LogOut size={16} /> Log out
              </button>
            </motion.div>
          </div>
        )}
        <main className="flex-1 px-4 py-6 sm:px-8 md:px-11 md:py-8">{children}</main>
      </div>
    </div>
  );
}
