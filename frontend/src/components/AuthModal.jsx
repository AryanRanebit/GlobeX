import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, ArrowRight, BarChart3, Loader2 } from 'lucide-react';

function InputField({ id, label, type = 'text', placeholder, icon: Icon, value, onChange, autoComplete, error }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-medium text-[#334155] mb-1">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
        )}
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`input-field w-full py-2 text-[13px] ${error ? 'border-red-400 focus:border-red-500' : ''}`}
          style={{ paddingLeft: Icon ? '34px' : '12px', paddingRight: isPassword ? '38px' : '12px' }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
            aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Reset state when switching tabs
  const switchTab = (t) => {
    setTab(t);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (tab === 'signup') {
        if (signupPass !== signupConfirm) {
          setError("Passwords don't match.");
          setLoading(false);
          return;
        }
        if (signupPass.length < 8) {
          setError("Password must be at least 8 characters.");
          setLoading(false);
          return;
        }

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
          // Parse Zod validation errors if present
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
      <div className="w-full max-w-[400px] bg-white rounded-lg border border-[#E5E7EB] shadow-lg relative p-7" onClick={e => e.stopPropagation()}>

        <button id="auth-modal-close" onClick={onClose} aria-label="Close"
          className="absolute top-3 right-3 w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:text-[#334155] hover:bg-[#F5F7FA] transition-colors">
          <X size={15} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-[#2563EB] flex items-center justify-center">
            <BarChart3 size={12} color="#FFFFFF" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-[#0F172A]">GlobeX</span>
        </div>

        <h2 className="text-lg font-semibold text-[#0F172A] mb-0.5">
          {tab === 'signup' ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="text-[12px] text-[#64748B] mb-4">
          {tab === 'signup' ? 'Start your free trial — no credit card required.' : 'Sign in to continue to GlobeX.'}
        </p>

        {/* Tab switcher */}
        <div className="flex gap-0.5 bg-[#F5F7FA] rounded p-0.5 mb-4">
          {['signup', 'signin'].map(t => (
            <button key={t} id={`auth-tab-${t}`} onClick={() => switchTab(t)}
              className={`flex-1 py-1.5 rounded text-[12px] font-semibold transition-all ${
                tab === t ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#334155]'
              }`}>
              {t === 'signup' ? 'Sign Up' : 'Sign In'}
            </button>
          ))}
        </div>

        {/* Google */}
        <button id="auth-google-btn" type="button"
          className="w-full py-2 px-3 flex items-center justify-center gap-2 bg-white border border-[#D1D5DB] rounded text-[12px] font-semibold text-[#334155] hover:bg-[#F9FAFB] transition-colors mb-3">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-[#E5E7EB]" />
          <span className="text-[10px] text-[#94A3B8]">or</span>
          <div className="flex-1 h-px bg-[#E5E7EB]" />
        </div>

        {/* Error / Success banners */}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          {tab === 'signup' ? (
            <>
              <InputField id="signup-name" label="Full Name" placeholder="Rajesh Kumar" icon={User} value={signupName} onChange={e => setSignupName(e.target.value)} autoComplete="name" />
              <InputField id="signup-email" label="Work Email" type="email" placeholder="rajesh@company.com" icon={Mail} value={signupEmail} onChange={e => setSignupEmail(e.target.value)} autoComplete="email" />
              <InputField id="signup-password" label="Password" type="password" placeholder="Min. 8 characters" icon={Lock} value={signupPass} onChange={e => setSignupPass(e.target.value)} autoComplete="new-password" />
              <InputField id="signup-confirm" label="Confirm Password" type="password" placeholder="Repeat password" icon={Lock} value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} autoComplete="new-password" />
            </>
          ) : (
            <>
              <InputField id="signin-email" label="Email" type="email" placeholder="rajesh@company.com" icon={Mail} value={signinEmail} onChange={e => setSigninEmail(e.target.value)} autoComplete="email" />
              <InputField id="signin-password" label="Password" type="password" placeholder="Your password" icon={Lock} value={signinPass} onChange={e => setSigninPass(e.target.value)} autoComplete="current-password" />
              <div className="text-right -mt-1">
                <a href="#" className="text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8]">Forgot password?</a>
              </div>
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

        <p className="text-[11px] text-[#64748B] text-center mt-4">
          {tab === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => switchTab(tab === 'signup' ? 'signin' : 'signup')}
            className="text-[#2563EB] font-semibold hover:text-[#1D4ED8]"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}>
            {tab === 'signup' ? 'Sign in' : 'Sign up free'}
          </button>
        </p>
      </div>
    </div>
  );
}
