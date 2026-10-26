import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, ArrowRight, Building2, Briefcase, Loader2, CheckCircle2, AlertCircle, Package, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ── Reusable input field ───────────────────────────────────────────── */
function InputField({ id, label, type = 'text', placeholder, icon: Icon, value, onChange, autoComplete, disabled }) {
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
          disabled={disabled}
          className="input-field w-full py-2 text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ paddingLeft: Icon ? '34px' : '12px', paddingRight: isPassword ? '38px' : '12px' }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)} disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
            aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Role selector button ───────────────────────────────────────────── */
function RoleButton({ icon: Icon, label, description, selected, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center cursor-pointer ${
        selected
          ? 'border-[#2563EB] bg-[#EFF6FF]'
          : 'border-[#E5E7EB] bg-white hover:border-[#BFDBFE] hover:bg-[#F8FAFF]'
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selected ? 'bg-[#2563EB]' : 'bg-[#F1F5F9]'}`}>
        <Icon size={15} color={selected ? '#FFFFFF' : '#64748B'} strokeWidth={2} />
      </div>
      <span className={`text-[12px] font-semibold ${selected ? 'text-[#1D4ED8]' : 'text-[#334155]'}`}>{label}</span>
      <span className={`text-[10px] leading-tight ${selected ? 'text-[#3B82F6]' : 'text-[#94A3B8]'}`}>{description}</span>
    </button>
  );
}

/* ── Main AuthModal ─────────────────────────────────────────────────── */
export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const { signup, login, loading, error, clearError } = useAuth();

  const [tab, setTab] = useState('signup');
  const [successMsg, setSuccessMsg] = useState('');

  // Signup fields
  const [role, setRole] = useState('BUYER');  // 'BUYER' or 'SELLER'
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [industry, setIndustry] = useState('');

  // Signin fields (default credentials pre-populated for instant access)
  const [signinEmail, setSigninEmail] = useState('aryan@globex.ai');
  const [signinPass, setSigninPass] = useState('GlobeX@2026');

  // Local validation error
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Clear errors when switching tabs
  useEffect(() => {
    clearError();
    setLocalError('');
    setSuccessMsg('');
  }, [tab]);

  const handleClose = () => {
    clearError();
    setLocalError('');
    setSuccessMsg('');
    onClose();
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');

    if (signupPass !== signupConfirm) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (signupPass.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    if (!companyType) {
      setLocalError('Please select your company type.');
      return;
    }

    const result = await signup({
      name: signupName,
      email: signupEmail,
      password: signupPass,
      role,
      companyName,
      companyType,
      industry,
    });

    if (result.success) {
      setSuccessMsg(`Welcome to GlobeX, ${signupName.split(' ')[0]}! Redirecting to your AI Agents dashboard…`);
      setTimeout(() => { handleClose(); if (onAuthSuccess) onAuthSuccess(); }, 1200);
    }
  };

  const handleSignin = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');

    const result = await login({ email: signinEmail, password: signinPass });
    if (result.success) {
      setSuccessMsg('Signed in! Redirecting to your AI Agents dashboard…');
      setTimeout(() => { handleClose(); if (onAuthSuccess) onAuthSuccess(); }, 900);
    }
  };

  if (!isOpen) return null;

  const displayError = localError || error;
  const companyTypes = role === 'BUYER'
    ? ['Manufacturer', 'Trader', 'MSME', 'Distributor', 'Other']
    : ['Manufacturer', 'Trader', 'MSME', 'Exporter', 'Distributor', 'Other'];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40" onClick={handleClose}>
      <div
        className="w-full max-w-[420px] bg-white rounded-xl border border-[#E5E7EB] shadow-xl relative overflow-y-auto max-h-[95vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-7 pt-6 pb-4 border-b border-[#F1F5F9]">
          <button id="auth-modal-close" onClick={handleClose} aria-label="Close"
            className="absolute top-4 right-4 w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:text-[#334155] hover:bg-[#F5F7FA] transition-colors">
            <X size={15} />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <img src="/globex-logo.jpg" alt="GlobeX Logo" className="w-7 h-7 rounded-lg object-contain bg-white border border-[#E5E7EB]" />
            <span className="text-sm font-bold text-[#0F172A]">GlobeX</span>
          </div>

          <h2 className="text-lg font-semibold text-[#0F172A] mb-0.5">
            {tab === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-[12px] text-[#64748B]">
            {tab === 'signup' ? 'Start your free trial — no credit card required.' : 'Sign in to continue to GlobeX.'}
          </p>

          {/* Tab switcher */}
          <div className="flex gap-0.5 bg-[#F5F7FA] rounded p-0.5 mt-4">
            {['signup', 'signin'].map(t => (
              <button key={t} id={`auth-tab-${t}`} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded text-[12px] font-semibold transition-all ${
                  tab === t ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#334155]'
                }`}>
                {t === 'signup' ? 'Sign Up' : 'Sign In'}
              </button>
            ))}
          </div>
        </div>

        <div className="px-7 py-5">
          {/* Success banner */}
          {successMsg && (
            <div className="flex items-start gap-2 bg-[#F0FDF4] border border-[#86EFAC] rounded-lg px-3 py-2.5 mb-4">
              <CheckCircle2 size={15} className="text-[#16A34A] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#15803D] font-medium">{successMsg}</p>
            </div>
          )}

          {/* Error banner */}
          {displayError && !successMsg && (
            <div className="flex items-start gap-2 bg-[#FFF1F2] border border-[#FECDD3] rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle size={15} className="text-[#E11D48] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#BE123C] font-medium">{displayError}</p>
            </div>
          )}

          {/* Google button */}
          <button id="auth-google-btn" type="button"
            className="w-full py-2 px-3 flex items-center justify-center gap-2 bg-white border border-[#D1D5DB] rounded-lg text-[12px] font-semibold text-[#334155] hover:bg-[#F9FAFB] transition-colors mb-3">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-[10px] text-[#94A3B8]">or</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          {/* ── SIGN UP FORM ──────────────────────────────────────────── */}
          {tab === 'signup' ? (
            <form onSubmit={handleSignup} className="flex flex-col gap-3.5">
              {/* Role Picker */}
              <div>
                <p className="text-[12px] font-medium text-[#334155] mb-2">I am joining as a…</p>
                <div className="flex gap-2">
                  <RoleButton
                    icon={ShoppingCart}
                    label="Buyer"
                    description="Find verified exporters & products"
                    selected={role === 'BUYER'}
                    onClick={() => setRole('BUYER')}
                    disabled={loading}
                  />
                  <RoleButton
                    icon={Package}
                    label="Seller / Exporter"
                    description="Discover global buyers & markets"
                    selected={role === 'SELLER'}
                    onClick={() => setRole('SELLER')}
                    disabled={loading}
                  />
                </div>
              </div>

              <InputField id="signup-name" label="Full Name" placeholder="Rajesh Kumar" icon={User}
                value={signupName} onChange={e => setSignupName(e.target.value)} autoComplete="name" disabled={loading} />

              <InputField id="signup-email" label="Work Email" type="email" placeholder="rajesh@company.com" icon={Mail}
                value={signupEmail} onChange={e => setSignupEmail(e.target.value)} autoComplete="email" disabled={loading} />

              <InputField id="signup-company" label="Company Name" placeholder="Kumar Spices Pvt Ltd" icon={Building2}
                value={companyName} onChange={e => setCompanyName(e.target.value)} autoComplete="organization" disabled={loading} />

              {/* Company Type */}
              <div>
                <label htmlFor="signup-company-type" className="block text-[12px] font-medium text-[#334155] mb-1">Company Type</label>
                <div className="relative">
                  <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                  <select
                    id="signup-company-type"
                    value={companyType}
                    onChange={e => setCompanyType(e.target.value)}
                    disabled={loading}
                    className="input-field w-full py-2 text-[13px] pl-[34px] pr-3 appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">Select company type…</option>
                    {companyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <InputField id="signup-industry" label="Industry / Product Category" placeholder={role === 'SELLER' ? 'e.g. Food & Spices, Textiles' : 'e.g. Industrial Equipment'} icon={Package}
                value={industry} onChange={e => setIndustry(e.target.value)} autoComplete="off" disabled={loading} />

              <InputField id="signup-password" label="Password" type="password" placeholder="Min. 8 characters" icon={Lock}
                value={signupPass} onChange={e => setSignupPass(e.target.value)} autoComplete="new-password" disabled={loading} />

              <InputField id="signup-confirm" label="Confirm Password" type="password" placeholder="Repeat password" icon={Lock}
                value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} autoComplete="new-password" disabled={loading} />

              <button id="auth-submit-btn" type="submit" disabled={loading}
                className="btn-primary w-full py-2.5 text-[13px] flex items-center justify-center gap-2 mt-1 disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Creating account…</>
                ) : (
                  <>{role === 'BUYER' ? 'Sign Up as Buyer' : 'Sign Up as Seller'}<ArrowRight size={13} /></>
                )}
              </button>

              <p className="text-[11px] text-[#94A3B8] text-center">
                By signing up, you agree to our{' '}
                <a href="#" className="text-[#2563EB] hover:underline">Terms</a>{' '}and{' '}
                <a href="#" className="text-[#2563EB] hover:underline">Privacy Policy</a>.
              </p>
            </form>
          ) : (
          /* ── SIGN IN FORM ──────────────────────────────────────────── */
            <form onSubmit={handleSignin} className="flex flex-col gap-3.5">
              {/* 1-Click Default Sign-In Selector */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
                <p className="text-[11px] font-semibold text-[#475569] mb-1.5 flex items-center justify-between">
                  <span>⚡ Quick 1-Click Sign-In:</span>
                  <span className="text-[10px] text-[#2563EB] font-normal">Pre-configured</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSigninEmail('aryan@globex.ai');
                      setSigninPass('GlobeX@2026');
                    }}
                    className={`flex flex-col items-start p-2 rounded border transition-all text-left cursor-pointer ${
                      signinEmail === 'aryan@globex.ai'
                        ? 'border-[#2563EB] bg-[#EFF6FF]'
                        : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8]'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-[#0F172A]">Aryan Rane</span>
                    <span className="text-[9px] text-[#64748B]">aryan@globex.ai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSigninEmail('demo@spicesexport.in');
                      setSigninPass('Demo@123');
                    }}
                    className={`flex flex-col items-start p-2 rounded border transition-all text-left cursor-pointer ${
                      signinEmail === 'demo@spicesexport.in'
                        ? 'border-[#2563EB] bg-[#EFF6FF]'
                        : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8]'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-[#0F172A]">Demo Exporter</span>
                    <span className="text-[9px] text-[#64748B]">demo@spicesexport.in</span>
                  </button>
                </div>
              </div>

              <InputField id="signin-email" label="Email" type="email" placeholder="rajesh@company.com" icon={Mail}
                value={signinEmail} onChange={e => setSigninEmail(e.target.value)} autoComplete="email" disabled={loading} />

              <InputField id="signin-password" label="Password" type="password" placeholder="Your password" icon={Lock}
                value={signinPass} onChange={e => setSigninPass(e.target.value)} autoComplete="current-password" disabled={loading} />

              <div className="text-right -mt-1">
                <a href="#" className="text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8]">Forgot password?</a>
              </div>

              <button id="auth-submit-btn" type="submit" disabled={loading}
                className="btn-primary w-full py-2.5 text-[13px] flex items-center justify-center gap-2 mt-1 disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Signing in…</>
                ) : (
                  <>Sign In <ArrowRight size={13} /></>
                )}
              </button>
            </form>
          )}

          <p className="text-[11px] text-[#64748B] text-center mt-4">
            {tab === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => setTab(tab === 'signup' ? 'signin' : 'signup')}
              className="text-[#2563EB] font-semibold hover:text-[#1D4ED8]"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}>
              {tab === 'signup' ? 'Sign in' : 'Sign up free'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
