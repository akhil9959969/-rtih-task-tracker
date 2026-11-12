import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckSquare, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { Button } from '../components/ui/button';
import { Field, Input } from '../components/ui/input';

/* Floating sample cards rendered in real CSS 3D (rotateX/rotateY/translateZ
 * inside a perspective stage, with pointer parallax). Purely decorative. */
function CardStack3D() {
  const fine = typeof window !== 'undefined'
    && window.matchMedia('(pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onMove(e) {
    if (!fine) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.setProperty('--tilt-x', `${(8 - py * 6).toFixed(2)}deg`);
    e.currentTarget.style.setProperty('--tilt-y', `${(-10 + px * 8).toFixed(2)}deg`);
  }

  const slot = 'absolute preserve-3d';
  const card = 'w-72 rounded-2xl border border-hair bg-surface/95 p-4 shadow-lift-lg backdrop-blur';
  return (
    <div
      className="stage-3d relative hidden h-80 w-full items-center justify-center lg:flex"
      onMouseMove={onMove}
    >
      <div
        className="tilt-3d preserve-3d relative h-56 w-72"
        style={{ '--tilt-x': '8deg', '--tilt-y': '-10deg' }}
      >
        <div className={slot} style={{ transform: 'translateZ(-90px) translateY(52px) translateX(48px)', opacity: 0.7 }}>
          <div className={card} style={{ animation: 'float-y 7s ease-in-out infinite' }}>
            <div className="flex items-center gap-2.5">
              <Circle size={18} className="text-hair2" />
              <div className="h-2.5 w-32 rounded-full bg-hair" />
            </div>
            <div className="mt-3 h-2 w-44 rounded-full bg-hair" />
          </div>
        </div>
        <div className={slot} style={{ transform: 'translateZ(-40px) translateY(24px) translateX(-24px)', opacity: 0.9 }}>
          <div className={card} style={{ animation: 'float-y 6s ease-in-out 0.6s infinite' }}>
            <div className="flex items-center gap-2.5">
              <Clock size={18} className="text-accent" />
              <div className="h-2.5 w-28 rounded-full bg-hair2" />
              <span className="ml-auto rounded-full bg-prog-bg px-2 py-0.5 text-[10px] font-bold text-prog-tx">In Progress</span>
            </div>
            <div className="mt-3 h-2 w-40 rounded-full bg-hair" />
          </div>
        </div>
        <div className={slot} style={{ transform: 'translateZ(20px) translateY(-10px) translateX(10px)' }}>
          <div className={card} style={{ animation: 'float-y 5.4s ease-in-out 0.3s infinite' }}>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-done-tx" />
              <div className="h-2.5 w-24 rounded-full bg-hair2" />
              <span className="ml-auto rounded-full bg-done-bg px-2 py-0.5 text-[10px] font-bold text-done-tx">Completed</span>
            </div>
            <div className="mt-3 h-2 w-36 rounded-full bg-hair" />
            <div className="mt-2 h-2 w-28 rounded-full bg-hair" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="relative min-h-screen bg-bg">
      <div className="aurora" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center gap-10 p-5 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm shrink-0 rounded-3xl border border-hair bg-surface/95 p-9 shadow-lift backdrop-blur"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-btn"><CheckSquare size={16} /></span>
            <span className="text-[17px] font-extrabold tracking-tight text-ink">Task Tracker</span>
          </div>
          <h1 className="mt-5 font-serif text-3xl font-normal text-ink">{title}</h1>
          <p className="mb-6 mt-1.5 text-[13.5px] text-sub">{subtitle}</p>
          {children}
          <div className="mt-5 text-center text-[13px] text-sub">{footer}</div>
        </motion.div>
        <div className="hidden flex-1 flex-col items-center gap-8 lg:flex">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="max-w-md text-center font-serif text-4xl leading-tight text-ink"
          >
            Your day, <span className="text-gradient">beautifully in order.</span>
          </motion.p>
          <CardStack3D />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="max-w-xs text-center text-[13px] text-sub"
          >
            Tasks, statuses and search - private to your account, stored safely in MySQL.
          </motion.p>
        </div>
      </div>
    </div>
  );
}

function useAuthSubmit(action) {
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = (m) => setErrors({ form: m });

  async function submit(validate, ...args) {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length || busy) return;
    setBusy(true);
    try {
      await action(...args);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      else toast(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return { errors, busy, submit };
}

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { errors, busy, submit } = useAuthSubmit(login);

  return (
    <AuthLayout
      title="Welcome back."
      subtitle="Sign in to see your tasks. Your work is private to your account."
      footer={<>New here? <Link to="/register" className="font-bold text-accent">Create an account</Link></>}
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(() => {
        const v = {};
        if (!email.trim()) v.email = 'Please enter your email address.';
        if (!password) v.password = 'Please enter a password.';
        return v;
      }, email, password); }}>
        <Field label="Email" error={errors.email} htmlFor="email">
          <Input id="email" type="email" value={email} invalid={Boolean(errors.email)} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
        </Field>
        <Field label="Password" error={errors.password} htmlFor="password">
          <Input id="password" type="password" value={password} invalid={Boolean(errors.password)} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
        </Field>
        {errors.form && <p className="mb-3 text-xs font-semibold text-danger" role="alert">{errors.form}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</Button>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { errors, busy, submit } = useAuthSubmit(register);

  return (
    <AuthLayout
      title="Create your account."
      subtitle="One account, your own private task list."
      footer={<>Already registered? <Link to="/login" className="font-bold text-accent">Sign in</Link></>}
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(() => {
        const v = {};
        if (!name.trim()) v.name = 'Please enter your name.';
        if (!email.trim()) v.email = 'Please enter your email address.';
        if (password.length < 8) v.password = 'Please use at least 8 characters for the password.';
        if (confirm !== password) v.confirm = 'The passwords do not match.';
        return v;
      }, name, email, password); }}>
        <Field label="Name" error={errors.name} htmlFor="name">
          <Input id="name" value={name} invalid={Boolean(errors.name)} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />
        </Field>
        <Field label="Email" error={errors.email} htmlFor="remail">
          <Input id="remail" type="email" value={email} invalid={Boolean(errors.email)} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password" error={errors.password} htmlFor="rpassword">
          <Input id="rpassword" type="password" value={password} invalid={Boolean(errors.password)} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </Field>
        <Field label="Confirm password" error={errors.confirm} htmlFor="confirm">
          <Input id="confirm" type="password" value={confirm} invalid={Boolean(errors.confirm)} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the password" />
        </Field>
        {errors.form && <p className="mb-3 text-xs font-semibold text-danger" role="alert">{errors.form}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</Button>
      </form>
    </AuthLayout>
  );
}
