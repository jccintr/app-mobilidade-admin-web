import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api, errorText } from '../lib/api.js';
import { Alert, Button, Field, Input, PasswordInput } from '../components/ui.jsx';

/**
 * Recuperação de senha do administrador em duas etapas:
 *  1) informa o e-mail e recebe um código de 6 dígitos;
 *  2) digita o código e a nova senha.
 * `onDone(email)` volta para o login com o e-mail já preenchido.
 */
export default function ForgotPassword({ initialEmail = '', onBack, onDone }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const requestCode = (event) => {
    event?.preventDefault();
    return run(async () => {
      await api.post('/admin/password/request', { email });
      setInfo(`Se ${email} for um administrador desta operadora, enviamos um código para ele. Confira também a caixa de spam.`);
      setStep('reset');
    });
  };

  const resetPassword = (event) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    return run(async () => {
      await api.post('/admin/password/reset', { email, code, password });
      onDone(email);
    });
  };

  return (
    <div className="w-full max-w-sm space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100">
        <ArrowLeft size={15} /> Voltar para o login
      </button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {step === 'email' ? 'Informe o e-mail de administrador. Vamos enviar um código para criar uma nova senha.' : 'Digite o código recebido e escolha a nova senha.'}
        </p>
      </div>
      <Alert>{error}</Alert>

      {step === 'email' ? (
        <form onSubmit={requestCode} className="space-y-5">
          <Field label="E-mail">
            <Input type="email" required autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            {busy ? 'Enviando' : 'Enviar código'}
          </Button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-5">
          <Alert tone="blue">{info}</Alert>
          <Field label="Código">
            <Input
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="000000"
              className="num tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
            <PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirme a nova senha">
            <PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            {busy ? 'Salvando' : 'Salvar nova senha'}
          </Button>
          <button
            type="button"
            disabled={busy}
            onClick={() => requestCode()}
            className="block w-full text-center text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Não recebeu? Enviar outro código
          </button>
        </form>
      )}
    </div>
  );
}
