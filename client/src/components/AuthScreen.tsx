import { useState, type FormEvent } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { ArrowRight, X } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface AuthScreenProps {
  loading?: boolean;
  configError?: string | null;
  initialMode?: 'sign-in' | 'sign-up';
  onClose?: () => void;
}

export function AuthScreen({ loading = false, configError = null, initialMode = 'sign-in', onClose }: AuthScreenProps) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'sign-in') {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
      } else {
        const result = await supabase.auth.signUp({ email, password });
        if (result.error) throw result.error;
        setMessage(result.data.session ? 'Your account is ready.' : 'Check your email to confirm your account.');
      }
    } catch (authError) {
      setError((authError as AuthError).message ?? 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendRecoveryEmail = async () => {
    if (!email) {
      setError('Enter your email address first.');
      return;
    }
    setError(null);
    setMessage(null);
    const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (result.error) setError(result.error.message);
    else { setRecoverySent(true); setMessage('Check your email for a password reset link.'); }
  };

  const authContent = (
      <section className={`auth-card ${onClose ? 'auth-card-modal' : ''}`} aria-labelledby="auth-title">
        {onClose && <button type="button" className="icon-button auth-close" aria-label="Close sign in" onClick={onClose}><X size={18} /></button>}
        <div className="brand-lockup auth-brand"><span className="brand-mark"><img src="/logo.svg" alt="Studio Booth logo" /></span><span>Studio Booth</span></div>
        <p className="eyebrow">Private photo studio</p>
        <h1 id="auth-title">{mode === 'sign-in' ? <>Welcome<br /><em>back.</em></> : <>Make it<br /><em>yours.</em></>}</h1>
        <p className="auth-intro">{mode === 'sign-in' ? 'Sign in to continue to your photobooth.' : 'Create an account to start using the photobooth.'}</p>
        <form className="auth-form" onSubmit={submit}>
          <label className="setting-field">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label className="setting-field">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={6} required /></label>
          {configError && <div className="error-box" role="alert">{configError}</div>}
          {error && <div className="error-box" role="alert">{error}</div>}
          {message && <div className="success-box" role="status">{message}</div>}
          <button className="primary-button auth-submit" type="submit" disabled={loading || isSubmitting || Boolean(configError)}>
            {isSubmitting ? 'Please wait...' : mode === 'sign-in' ? 'Sign in' : 'Create account'} <ArrowRight size={19} />
          </button>
        </form>
        <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(null); setMessage(null); }}>
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
        {mode === 'sign-in' && <button type="button" className="auth-switch" disabled={recoverySent} onClick={() => void sendRecoveryEmail()}>{recoverySent ? 'Reset email sent' : 'Forgot your password?'}</button>}
      </section>
  );

  if (onClose) return authContent;

  return (
    <main className="booth-shell auth-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      {authContent}
    </main>
  );
}
