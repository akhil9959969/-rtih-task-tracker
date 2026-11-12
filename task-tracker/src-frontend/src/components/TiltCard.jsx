import { useRef } from 'react';

/**
 * CSS-3D tilt wrapper: rotates its child in real 3D (rotateX/rotateY in a
 * perspective stage) following the pointer. Disabled for touch devices and
 * for users who prefer reduced motion - then it renders flat.
 */
export function TiltCard({ max = 7, className = '', children, ...props }) {
  const ref = useRef(null);
  const fine = typeof window !== 'undefined'
    && window.matchMedia('(pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onMove(e) {
    if (!fine || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--tilt-x', `${(-py * max).toFixed(2)}deg`);
    ref.current.style.setProperty('--tilt-y', `${(px * max).toFixed(2)}deg`);
    ref.current.dataset.resting = 'false';
  }
  function onLeave() {
    if (!ref.current) return;
    ref.current.style.setProperty('--tilt-x', '0deg');
    ref.current.style.setProperty('--tilt-y', '0deg');
    ref.current.dataset.resting = 'true';
  }

  return (
    <div className="stage-3d">
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        data-resting="true"
        className={`tilt-3d preserve-3d ${className}`}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}
