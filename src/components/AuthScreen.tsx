import { useState } from 'react'
import { supabase } from '../lib/supabase'

type AuthScreenProps = { onLocalMode: () => void }

export function AuthScreen({ onLocalMode }: AuthScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!supabase) return
    const result = isSignUp ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password })
    if (result.error) setError(result.error.message)
    else if (isSignUp && !result.data.session) setMessage('E-postanı doğrula, sonra giriş yap.')
  }

  return <main className="auth-page"><div className="auth-card"><p className="eyebrow">KİŞİSEL ALAN</p><h1>{isSignUp ? 'Hesap oluştur' : 'Giriş yap'}<span>.</span></h1><p className="auth-intro">wondR verilerin yalnızca hesabında tutulur.</p><form onSubmit={submit}><label className="form-field"><span>E-posta</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="form-field"><span>Şifre</span><input required minLength={6} type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-message" role="status">{message}</p>}<button className="study-button auth-submit" type="submit">{isSignUp ? 'Hesap oluştur' : 'Giriş yap'}</button></form><button className="auth-switch" type="button" onClick={() => { setIsSignUp((current) => !current); setError(''); setMessage('') }}>{isSignUp ? 'Zaten hesabın var mı? Giriş yap' : 'İlk kez mi geliyorsun? Hesap oluştur'}</button><button className="auth-local" type="button" onClick={onLocalMode}>Yerel sürümle devam et</button></div></main>
}
