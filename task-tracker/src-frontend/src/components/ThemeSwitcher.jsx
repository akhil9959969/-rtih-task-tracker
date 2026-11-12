import { useEffect, useState } from 'react';

const THEMES = [
  { id: 'ivory', label: 'Ivory', swatch: '#D96C45' },
  { id: 'dark', label: 'Dark', swatch: '#E58A5A' },
  { id: 'sage', label: 'Sage', swatch: '#6B7A5F' },
];

/**
 * Theme picker: switches the data-theme attribute on <html> and remembers
 * the choice in localStorage. The default (no saved choice) is "ivory".
 */
export function ThemeSwitcher({ compact }) {
  const [theme, setTheme] = useState('ivory');
  // Multiple switchers (sidebar, settings card, drawer) share one theme:
  // watch the data-theme attribute so every instance shows the same choice.
  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme || localStorage.getItem('task-tracker-theme') || 'ivory');
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  function pick(id) {
    document.documentElement.dataset.theme = id;
    localStorage.setItem('task-tracker-theme', id);
    setTheme(id);
  }

  return (
    <div className={compact ? 'flex items-center gap-1.5' : 'rounded-xl border border-hair p-2'} role="group" aria-label="Color theme">
      {!compact && <div className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-sub">Theme</div>}
      <div className="flex flex-wrap gap-1.5">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            aria-pressed={theme === t.id}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold transition-colors ${theme === t.id ? 'border-accent bg-accent-soft/60 text-ink' : 'border-hair2 text-sub hover:text-ink'}`}
          >
            <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: t.swatch }} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
