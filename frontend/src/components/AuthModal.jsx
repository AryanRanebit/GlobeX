import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, ArrowRight, BarChart3, Loader2 } from 'lucide-react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InputField({ id, label, type = 'text', placeholder, icon: Icon, value, onChange, onBlur, autoComplete, error, required = true }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-medium text-ink mb-1">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        )}
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`input-field w-full py-2 text-[13px] ${error ? 'border-red-400 focus:border-red-500' : ''}`}
          style={{ paddingLeft: Icon ? '34px' : '12px', paddingRight: isPassword ? '38px' : '12px' }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-muted"
            aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {error && <p id={errorId} className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function AuthModal({ isOpen, onClose }) {
  const [tab, setTab] = useState('signup');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPass, setSigninPass] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef(null);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Escape to close (only while open)
  useEffect(() => {
    if (!isOpen) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Focus trap + initial focus
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const el = dialogRef.current;
    const getFocusable = () =>
      Array.from(el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(n => !n.disabled && n.offsetParent !== null);

    const items = getFocusable();
    // Focus the first input when the dialog opens
    const firstInput = el.querySelector('input');
    (firstInput || items[0])?.focus();

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [isOpen, tab]);

  // Reset state when switching tabs
  const switchTab = (t) => {
    setTab(t);
    setError('');
    setSuccess('');
    setFieldErrors({});
  };

  const validate = useCallback((fields) => {
    const errs = {};
    if (fields.includes('signup-name') && !signupName.trim()) errs['signup-name'] = 'Please enter your name.';
    if (fields.includes('signup-email') && !EMAIL_RE.test(signupEmail)) errs['signup-email'] = 'Enter a valid email address.';
    if (fields.includes('signup-password') && signupPass.length < 8) errs['signup-password'] = 'Password must be at least 8 characters.';
    if (fields.includes('signup-confirm') && signupConfirm !== signupPass) errs['signup-confirm'] = "Passwords don't match.";
    if (fields.includes('signin-email') && !EMAIL_RE.test(signinEmail)) errs['signin-email'] = 'Enter a valid email address.';
    if (fields.includes('signin-password') && !signinPass) errs['signin-password'] = 'Please enter your password.';
    return errs;
  }, [signupName, signupEmail, signupPass, signupConfirm, signinEmail, signinPass]);

  const blurValidate = (field) => {
    const errs = validate([field]);
    setFieldErrors(prev => ({ ...prev, [field]: errs[field] }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const fields = tab === 'signup'
      ? ['signup-name', 'signup-email', 'signup-password', 'signup-confirm']
      : ['signin-email', 'signin-password'];
    const errs = validate(fields);
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setLoading(true);

    try {
      if (tab === 'signup') {
        let res;
        try {
          res = await fetch('/api/v1/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: signupName,
            email: signupEmail,
            password: signupPass,
            companyName: 'My Company',
            companyType: 'Other',
            industry: 'General'
          })
        });
        } catch {
          res = await fetch('http://localhost:3000/api/v1/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: signupName,
            email: signupEmail,
            password: signupPass,
            companyName: 'My Company',
            companyType: 'Other',
            industry: 'General'
          })
        });
        }
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('token', data.data?.tokens?.accessToken || data.tokens?.accessToken || '');
          localStorage.setItem('refreshToken', data.data?.tokens?.refreshToken || data.tokens?.refreshToken || '');
          localStorage.setItem('user', JSON.stringify(data.data?.user || data.user));
          setSuccess('Account created! Welcome to GlobeX 🎉');
          setTimeout(() => {
            onClose();
            window.location.reload();
          }, 1000);
        } else {
          const msg = data.errors?.[0]?.message || data.message || 'Signup failed. Please try again.';
          setError(msg);
        }
      } else {
        let res;
        try {
          res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: signinEmail,
            password: signinPass
          })
        });
        } catch {
          res = await fetch('http://localhost:3000/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: signinEmail,
            password: signinPass
          })
        });
        }
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('token', data.data?.tokens?.accessToken || data.tokens?.accessToken || '');
          localStorage.setItem('refreshToken', data.data?.tokens?.refreshToken || data.tokens?.refreshToken || '');
          localStorage.setItem('user', JSON.stringify(data.data?.user || data.user));
          setSuccess('Welcome back! 👋');
          setTimeout(() => {
            onClose();
            window.location.reload();
          }, 1000);
        } else {
          const msg = data.errors?.[0]?.message || data.message || 'Invalid email or password.';
          setError(msg);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="w-full max-w-[400px] bg-white rounded-lg border border-line shadow-lg relative p-7"
        onClick={e => e.stopPropagation()}
      >

        <button id="auth-modal-close" onClick={onClose} aria-label="Close"
          className="absolute top-3 right-3 w-7 h-7 rounded flex items-center justify-center text-faint hover:text-ink hover:bg-page transition-colors">
          <X size={15} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-blue flex items-center justify-center">
            <BarChart3 size={12} color="#FFFFFF" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-navy">GlobeX</span>
        </div>

        <h2 id="auth-modal-title" className="text-lg font-semibold text-navy mb-0.5">
          {tab === 'signup' ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="text-[12px] text-muted mb-4">
          {tab === 'signup' ? 'Start your free trial — no credit card required.' : 'Sign in to continue to GlobeX.'}
        </p>

        {/* Tab switcher */}
        <div className="flex gap-0.5 bg-page rounded p-0.5 mb-4">
          {['signup', 'signin'].map(t => (
            <button key={t} id={`auth-tab-${t}`} onClick={() => switchTab(t)}
              aria-pressed={tab === t}
              className={`flex-1 py-1.5 rounded text-[12px] font-semibold transition-all ${
                tab === t ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-ink'
              }`}>
              {t === 'signup' ? 'Sign Up' : 'Sign In'}
            </button>
          ))}
        </div>

        {/* OAuth / SSO is not wired up yet - hidden until a provider is connected.
        <button id="auth-google-btn" type="button" ...>Continue with Google</button>
        */}

        {/* Error / Success banners announced to screen readers */}
        <div aria-live="polite" role="status">
          {error && (
            <div className="mb-3 px-3 py-2 rounded bg-red-50 border border-red-200 text-[12px] text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 px-3 py-2 rounded bg-green-50 border border-green-200 text-[12px] text-green-700 font-medium">
              {success}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1" noValidate>
          {tab === 'signup' ? (
            <>
              <InputField id="signup-name" label="Full Name" placeholder="Rajesh Kumar" icon={User} value={signupName} onChange={e => setSignupName(e.target.value)} onBlur={() => blurValidate('signup-name')} autoComplete="name" error={fieldErrors['signup-name']} />
              <InputField id="signup-email" label="Work Email" type="email" placeholder="rajesh@company.com" icon={Mail} value={signupEmail} onChange={e => setSignupEmail(e.target.value)} onBlur={() => blurValidate('signup-email')} autoComplete="email" error={fieldErrors['signup-email']} />
              <InputField id="signup-password" label="Password" type="password" placeholder="Min. 8 characters" icon={Lock} value={signupPass} onChange={e => setSignupPass(e.target.value)} onBlur={() => blurValidate('signup-password')} autoComplete="new-password" error={fieldErrors['signup-password']} />
              <InputField id="signup-confirm" label="Confirm Password" type="password" placeholder="Repeat password" icon={Lock} value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} onBlur={() => blurValidate('signup-confirm')} autoComplete="new-password" error={fieldErrors['signup-confirm']} />
            </>
          ) : (
            <>
              <InputField id="signin-email" label="Email" type="email" placeholder="rajesh@company.com" icon={Mail} value={signinEmail} onChange={e => setSigninEmail(e.target.value)} onBlur={() => blurValidate('signin-email')} autoComplete="email" error={fieldErrors['signin-email']} />
              <InputField id="signin-password" label="Password" type="password" placeholder="Your password" icon={Lock} value={signinPass} onChange={e => setSigninPass(e.target.value)} onBlur={() => blurValidate('signin-password')} autoComplete="current-password" error={fieldErrors['signin-password']} />
              {/* "Forgot password?" link removed - no reset flow exists yet. */}
            </>
          )}

          <button id="auth-submit-btn" type="submit" disabled={loading}
            className="btn-primary w-full py-2 text-[13px] flex items-center justify-center gap-1.5 mt-1 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> {tab === 'signup' ? 'Creating...' : 'Signing in...'}</>
              : <>{tab === 'signup' ? 'Create Account' : 'Sign In'} <ArrowRight size={13} /></>
            }
          </button>
        </form>

        <p className="text-[11px] text-muted text-center mt-4">
          {tab === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => switchTab(tab === 'signup' ? 'signin' : 'signup')}
            className="text-blue font-semibold hover:text-blue-dark"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}>
            {tab === 'signup' ? 'Sign in' : 'Sign up free'}
          </button>
        </p>
      </div>
    </div>
  );
}
