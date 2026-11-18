import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useTenant } from '../lib/tenant.jsx';
import { errorText } from '../lib/api.js';
import { Alert, Button, Field, Input, PasswordInput } from '../components/ui.jsx';
import ForgotPassword from './ForgotPassword.jsx';

export default function Login() {
  const { login } = useAuth();
  const { tenant } = useTenant();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [notice, setNotice] = useState('');
  const { brand } = tenant;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await login(email, password);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const logo = brand.logoUrl ? (
    <img src={brand.logoUrl} alt="" className="h-12 w-12 rounded-lg bg-white/90 object-contain p-1" />
  ) : (
    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-xl font-bold">{brand.displayName.slice(0, 1)}</span>
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      {/* Painel da marca: a cor da operadora ocupa só este espaço */}
      <aside className="hidden flex-col justify-between bg-[var(--brand-base)] p-12 text-[var(--brand-base-fg)] lg:flex">
        {logo}
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight">{brand.displayName}</p>
          <p className="mt-3 text-base opacity-80">Painel de operação: motoristas, corridas, tarifa e mapa ao vivo.</p>
        </div>
        <p className="text-sm opacity-60">Acesso restrito aos administradores da operadora.</p>
      </aside>

      <main className="flex items-center justify-center p-6">
        {forgot ? (
          <ForgotPassword
            initialEmail={email}
            onBack={() => setForgot(false)}
            onDone={(resetEmail) => {
              setEmail(resetEmail);
              setPassword('');
              setError('');
              setNotice('Senha alterada. Entre com a nova senha.');
              setForgot(false);
            }}
          />
        ) : (
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden">
            <div className="mb-4 inline-flex rounded-xl bg-brand p-2 text-brand-fg">{logo}</div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Use o e-mail e a senha de administrador.</p>
          </div>
          <Alert tone="green">{notice}</Alert>
          <Alert>{error}</Alert>
          <Field label="E-mail">
            <Input type="email" required autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Senha">
            <PasswordInput required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="-mt-2 text-right">
            <button
              type="button"
              onClick={() => {
                setError('');
                setNotice('');
                setForgot(true);
              }}
              className="text-sm text-gray-500 underline-offset-4 hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-100"
            >
              Esqueci minha senha
            </button>
          </div>
          <Button type="submit" loading={busy} className="w-full">
            {busy ? 'Entrando' : 'Entrar'}
          </Button>
        </form>
        )}
      </main>
    </div>
  );
}
