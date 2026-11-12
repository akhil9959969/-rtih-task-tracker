export function TaskListSkeleton() {
  return (
    <div className="rounded-2xl border border-hair bg-surface p-2" aria-label="Loading tasks">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3.5 border-b border-hair px-4 py-4 last:border-0">
          <div className="h-5 w-5 rounded-full bg-hair" />
          <div className="flex-1">
            <div className="h-3.5 w-1/3 rounded bg-hair" />
            <div className="mt-2 h-3 w-1/4 rounded bg-hair" />
          </div>
          <div className="h-5 w-16 rounded-full bg-hair" />
        </div>
      ))}
    </div>
  );
}
