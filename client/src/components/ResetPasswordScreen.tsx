import { useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

type ResetPasswordScreenProps = { session: Session | null; loading?: boolean };

export function ResetPasswordScreen({ session, loading = false }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    const result = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setMessage('Your password has been updated. You can now sign in with the new password.');
    setPassword('');
    setConfirmation('');
  };

  if (loading) return <main className="booth-shell auth-shell"><section className="auth-card"><p className="eyebrow">Studio Booth</p><h1>Verifying<br /><em>your link.</em></h1></section></main>;

  if (!session) return <main className="booth-shell auth-shell"><section className="auth-card"><p className="eyebrow">Password recovery</p><h1>Link<br /><em>expired.</em></h1><p className="auth-intro">This password reset link is invalid or has expired. Request a new one from the sign-in page.</p><button className="primary-button auth-submit" type="button" onClick={() => window.location.assign('/')}><ArrowRight size={19} /> Return to sign in</button></section></main>;

  return <main className="booth-shell auth-shell"><section className="auth-card" aria-labelledby="reset-title"><div className="brand-lockup auth-brand"><span className="brand-mark"><img src="/logo.svg" alt="Studio Booth logo" /></span><span>Studio Booth</span></div><p className="eyebrow">Password recovery</p><h1 id="reset-title">Choose a<br /><em>new password.</em></h1><p className="auth-intro">Set a new password for {session.user.email}.</p><form className="auth-form" onSubmit={submit}><label className="setting-field">New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required /></label><label className="setting-field">Confirm new password<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} autoComplete="new-password" required /></label>{error && <div className="error-box" role="alert">{error}</div>}{message && <div className="success-box" role="status"><CheckCircle2 size={17} /> {message}</div>}<button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating...' : 'Update password'} <ArrowRight size={19} /></button></form>{message && <button type="button" className="auth-switch" onClick={() => window.location.assign('/')}>Return to sign in</button>}</section></main>;
}
