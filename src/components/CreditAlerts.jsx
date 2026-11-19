import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { cents } from '../lib/format.js';
import { useLive } from '../lib/useLive.js';

/** Compras de créditos aguardando conferência (badge do menu e alerta do Início). */
export function useCreditSummary() {
  return useQuery({
    queryKey: ['credit-summary'],
    queryFn: () => api.get('/admin/credit-purchases/summary'),
    refetchInterval: 60_000,
  });
}

/** Bipe curto (sem arquivo de áudio). O navegador só toca depois que a pessoa interagiu com a página. */
function beep() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const ctx = new Context();
    const now = ctx.currentTime;
    [0, 0.18].forEach((offset, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = index ? 1046 : 784;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {
    /* sem som: o aviso visual continua */
  }
}

/**
 * Escuta "Já paguei" em tempo real: toca um bipe, mostra um aviso no canto da tela
 * e atualiza o contador do menu e a lista de compras.
 */
export function CreditAlerts() {
  const queryClient = useQueryClient();
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  useLive({
    'credit:informed': ({ purchase, driver }) => {
      queryClient.invalidateQueries({ queryKey: ['credit-summary'] });
      queryClient.invalidateQueries({ queryKey: ['credit-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      beep();
      setToasts((list) => [...list.slice(-2), { id: purchase.id, purchase, driver }]);
    },
  });

  useEffect(() => {
    if (!toasts.length) return undefined;
    const timer = setTimeout(() => setToasts((list) => list.slice(1)), 15_000);
    return () => clearTimeout(timer);
  }, [toasts]);

  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[2100] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      {toasts.map(({ id, purchase, driver }) => (
        <div key={id} className="flex gap-3 rounded-xl border border-amber-200 bg-white p-4 shadow-lg dark:border-amber-500/30 dark:bg-gray-900">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
            <Wallet size={18} />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">Pagamento de créditos informado</p>
            <p className="mt-0.5 text-gray-600 dark:text-gray-300">
              {driver.name} · {purchase.package.name} · <span className="num">{cents(purchase.package.priceCents)}</span>
            </p>
            <Link to="/creditos" onClick={() => dismiss(id)} className="mt-1.5 inline-block text-[13px] font-medium underline underline-offset-2">
              Conferir agora
            </Link>
          </div>
          <button type="button" aria-label="Fechar aviso" onClick={() => dismiss(id)} className="-mr-1 -mt-1 h-7 w-7 shrink-0 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800">
            <X size={15} className="mx-auto" />
          </button>
        </div>
      ))}
    </div>
  );
}
