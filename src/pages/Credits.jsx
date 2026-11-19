import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, FileText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, errorText, fetchDocument } from '../lib/api.js';
import { cents, dateTime, moneyInput, parseMoney, PURCHASE_STATUS } from '../lib/format.js';
import { Alert, Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Pager, Spinner, StatusBadge, Table, Td, Textarea, cx } from '../components/ui.jsx';
import { useCreditSummary } from '../components/CreditAlerts.jsx';

const TABS = [
  ['informed', 'Para conferir'],
  ['pending', 'Aguardando pagamento'],
  ['', 'Todas'],
];

// ---------------------------------------------------------------- comprovante

function ReceiptModal({ purchase, onClose }) {
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let revoke;
    fetchDocument(`/admin/credit-purchases/${purchase.id}/receipt`)
      .then((result) => {
        setDoc(result);
        if (result.url.startsWith('blob:')) revoke = result.url;
      })
      .catch((e) => setError(e.message));
    return () => revoke && URL.revokeObjectURL(revoke);
  }, [purchase.id]);

  return (
    <Modal title={`Comprovante · ${purchase.code}`} onClose={onClose} wide>
      {error && <Alert>{error}</Alert>}
      {!doc && !error && <Spinner />}
      {doc &&
        (doc.mime === 'application/pdf' ? (
          <iframe title="Comprovante" src={doc.url} className="h-[70vh] w-full rounded" />
        ) : (
          <img src={doc.url} alt="Comprovante" className="max-h-[70vh] w-full rounded object-contain" />
        ))}
      {doc && (
        <a className="mt-3 inline-block text-sm underline" href={doc.url} target="_blank" rel="noreferrer">
          Abrir em tela cheia
        </a>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- compras

function PurchaseRow({ purchase, onReceipt, onConfirm, onReject, busy }) {
  const canConfirm = ['pending', 'informed', 'expired'].includes(purchase.status);
  const canReject = ['pending', 'informed'].includes(purchase.status);
  const bonus = purchase.package.creditCents - purchase.package.priceCents;
  return (
    <li
      className={cx(
        'flex flex-wrap items-start justify-between gap-4 px-5 py-4',
        purchase.status === 'informed' && 'bg-amber-50/70 dark:bg-amber-500/5',
      )}
    >
      <div className="min-w-0 space-y-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="num font-mono text-[13px] font-semibold">{purchase.code}</span>
          <StatusBadge map={PURCHASE_STATUS} value={purchase.status} />
        </div>
        <p>
          {purchase.driver ? (
            <Link to={`/motoristas/${purchase.driver.id}`} className="font-medium hover:underline">
              {purchase.driver.name}
            </Link>
          ) : (
            'Motorista removido'
          )}
          {purchase.driver?.phone && <span className="text-gray-500 dark:text-gray-400"> · {purchase.driver.phone}</span>}
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          {purchase.package.name} · pagar <strong className="num">{cents(purchase.package.priceCents)}</strong> · recebe{' '}
          <strong className="num">{cents(purchase.package.creditCents)}</strong>
          {bonus > 0 && <span className="text-emerald-700 dark:text-emerald-300"> (bônus {cents(bonus)})</span>}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Pedida em {dateTime(purchase.createdAt)}
          {purchase.informedAt && <> · informou o pagamento em {dateTime(purchase.informedAt)}</>}
          {purchase.status === 'pending' && <> · vence em {dateTime(purchase.expiresAt)}</>}
          {purchase.confirmedAt && <> · confirmada em {dateTime(purchase.confirmedAt)}</>}
          {purchase.rejectedAt && <> · recusada em {dateTime(purchase.rejectedAt)}</>}
        </p>
        {purchase.payerNote && <p className="text-[13px] italic text-gray-600 dark:text-gray-300">“{purchase.payerNote}”</p>}
        {purchase.rejectionReason && <p className="text-[13px] text-red-700 dark:text-red-300">Motivo: {purchase.rejectionReason}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {purchase.hasReceipt && (
          <Button size="sm" variant="secondary" icon={FileText} onClick={() => onReceipt(purchase)}>
            Comprovante
          </Button>
        )}
        {canReject && (
          <Button size="sm" variant="secondary" icon={X} disabled={busy} onClick={() => onReject(purchase)}>
            Recusar
          </Button>
        )}
        {canConfirm && (
          <Button size="sm" variant="success" icon={Check} disabled={busy} onClick={() => onConfirm(purchase)}>
            Confirmar pagamento
          </Button>
        )}
      </div>
    </li>
  );
}

function Purchases() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = params.get('status') ?? 'informed';
  const driverId = params.get('motorista') || undefined;
  const [page, setPage] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState({ tone: 'red', text: '' });
  const { data: summary } = useCreditSummary();

  useEffect(() => setPage(1), [tab, driverId]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['credit-purchases', tab, driverId, page],
    queryFn: () => api.get('/admin/credit-purchases', { status: tab || undefined, driverId, page, limit: 20 }),
    refetchInterval: 30_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['credit-purchases'] });
    queryClient.invalidateQueries({ queryKey: ['credit-summary'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const review = useMutation({
    mutationFn: ({ purchase, action, body }) => api.post(`/admin/credit-purchases/${purchase.id}/${action}`, body),
    onSuccess: (result, { action, purchase }) => {
      setRejecting(null);
      setReason('');
      setMessage(
        action === 'confirm'
          ? { tone: 'green', text: `Compra ${purchase.code} confirmada: ${cents(purchase.package.creditCents)} entraram no saldo de ${purchase.driver?.name ?? 'motorista'} (saldo atual ${cents(result.balanceCents)}).` }
          : { tone: 'green', text: `Compra ${purchase.code} recusada. O motorista foi avisado.` },
      );
      refresh();
    },
    onError: (e) => setMessage({ tone: 'red', text: errorText(e) }),
  });

  const confirmPurchase = (purchase) => {
    const who = purchase.driver?.name ?? 'o motorista';
    const ok = window.confirm(
      `Confirmar que ${cents(purchase.package.priceCents)} de ${who} (código ${purchase.code}) entraram na conta?\n\n${cents(purchase.package.creditCents)} serão creditados no saldo dele. Isso não pode ser desfeito.`,
    );
    if (ok) {
      setMessage({ tone: 'red', text: '' });
      review.mutate({ purchase, action: 'confirm' });
    }
  };

  const setTab = (value) => {
    const next = new URLSearchParams(params);
    if (value === 'informed') next.delete('status');
    else next.set('status', value);
    setParams(next, { replace: true });
  };

  return (
    <Card
      flush
      title="Compras de créditos"
      description="Confira no extrato do banco se o Pix com o código da compra entrou e confirme. Os créditos só são liberados depois da confirmação."
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-3 pt-2 dark:border-gray-800" role="tablist">
        {TABS.map(([value, label]) => {
          const count = value === 'informed' ? summary?.informed : value === 'pending' ? summary?.pending : null;
          const active = tab === value;
          return (
            <button
              key={value || 'all'}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(value)}
              className={cx(
                '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-[13px] font-medium transition',
                active ? 'border-brand text-gray-900 dark:text-gray-100' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
              )}
            >
              {label}
              {count > 0 && (
                <span className={cx('num rounded-full px-1.5 text-[11px] font-semibold', value === 'informed' ? 'bg-amber-500 text-gray-950' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300')}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {driverId && (
          <span className="ml-auto flex items-center gap-2 py-2 text-xs text-gray-500 dark:text-gray-400">
            Filtrando por um motorista
            <button type="button" className="underline" onClick={() => { const next = new URLSearchParams(params); next.delete('motorista'); setParams(next, { replace: true }); }}>
              limpar
            </button>
          </span>
        )}
      </div>

      {message.text && <div className="px-5 pt-4"><Alert tone={message.tone}>{message.text}</Alert></div>}
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <div className="p-5"><Alert>{error.message}</Alert></div>
      ) : data.data.length === 0 ? (
        <Empty>{tab === 'informed' ? 'Nenhum pagamento aguardando conferência.' : 'Nenhuma compra por aqui.'}</Empty>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.data.map((purchase) => (
            <PurchaseRow
              key={purchase.id}
              purchase={purchase}
              busy={review.isPending}
              onReceipt={setReceipt}
              onConfirm={confirmPurchase}
              onReject={(p) => { setReason(''); setRejecting(p); }}
            />
          ))}
        </ul>
      )}
      <Pager data={data} onPage={setPage} />

      {receipt && <ReceiptModal purchase={receipt} onClose={() => setReceipt(null)} />}
      {rejecting && (
        <Modal title={`Recusar compra ${rejecting.code}`} onClose={() => setRejecting(null)}>
          <div className="space-y-3">
            <Field label="Motivo (o motorista verá)" hint="Ex.: Pix não encontrado no extrato.">
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRejecting(null)}>Cancelar</Button>
              <Button
                variant="danger"
                disabled={reason.trim().length < 3 || review.isPending}
                onClick={() => review.mutate({ purchase: rejecting, action: 'reject', body: { reason: reason.trim() } })}
              >
                Recusar compra
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- pacotes

function PackageForm({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial ? moneyInput(initial.priceCents) : '');
  const [credit, setCredit] = useState(initial ? moneyInput(initial.creditCents) : '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [error, setError] = useState('');

  const priceCents = parseMoney(price);
  const creditCents = parseMoney(credit) ?? priceCents;
  const valid = name.trim().length >= 2 && priceCents >= 100 && creditCents >= priceCents;

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), priceCents, creditCents, active };
      return initial ? api.patch(`/admin/credit-packages/${initial.id}`, body) : api.post('/admin/credit-packages', body);
    },
    onSuccess: onSaved,
    onError: (e) => setError(errorText(e)),
  });

  return (
    <Modal title={initial ? 'Editar pacote' : 'Novo pacote'} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError('');
          if (valid) save.mutate();
        }}
      >
        <Alert>{error}</Alert>
        <Field label="Nome" hint="Aparece para o motorista. Ex.: R$ 50 + R$ 5 de bônus">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço (R$)" hint="Valor do Pix. Mínimo R$ 1,00.">
            <Input inputMode="decimal" placeholder="50,00" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Crédito (R$)" hint="Vazio = igual ao preço.">
            <Input inputMode="decimal" placeholder={price || '55,00'} value={credit} onChange={(e) => setCredit(e.target.value)} />
          </Field>
        </div>
        {priceCents > 0 && creditCents > priceCents && (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Bônus de {cents(creditCents - priceCents)}.</p>
        )}
        {priceCents > 0 && creditCents < priceCents && <p className="text-sm text-red-600">O crédito não pode ser menor que o preço.</p>}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
          Disponível para os motoristas
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={save.isPending} disabled={!valid}>Salvar pacote</Button>
        </div>
      </form>
    </Modal>
  );
}

function Packages() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null | 'new' | pacote
  const [error, setError] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['credit-packages'], queryFn: () => api.get('/admin/credit-packages') });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['credit-packages'] });

  const toggle = useMutation({
    mutationFn: (pkg) => api.patch(`/admin/credit-packages/${pkg.id}`, { active: !pkg.active }),
    onSuccess: refresh,
    onError: (e) => setError(errorText(e)),
  });
  const remove = useMutation({
    mutationFn: (pkg) => api.del(`/admin/credit-packages/${pkg.id}`),
    onSuccess: refresh,
    onError: (e) => setError(errorText(e)),
  });

  return (
    <Card
      flush
      title="Pacotes de créditos"
      description="O que o motorista pode comprar. Compras já feitas guardam uma cópia do pacote, então editar ou excluir é seguro."
      actions={<Button size="sm" icon={Plus} onClick={() => setEditing('new')}>Novo pacote</Button>}
    >
      {error && <div className="px-5 pt-4"><Alert>{error}</Alert></div>}
      {isLoading ? (
        <Spinner />
      ) : data.data.length === 0 ? (
        <Empty>Nenhum pacote criado. Crie o primeiro para os motoristas poderem comprar créditos.</Empty>
      ) : (
        <Table head={['Pacote', 'Preço', 'Crédito', 'Situação', '']}>
          {data.data.map((pkg) => (
            <tr key={pkg.id}>
              <Td className="font-medium">{pkg.name}</Td>
              <Td className="num">{cents(pkg.priceCents)}</Td>
              <Td className="num">
                {cents(pkg.creditCents)}
                {pkg.bonusCents > 0 && <span className="ml-1 text-xs text-emerald-700 dark:text-emerald-300">+{cents(pkg.bonusCents)}</span>}
              </Td>
              <Td>{pkg.active ? <Badge tone="green">Disponível</Badge> : <Badge>Desabilitado</Badge>}</Td>
              <Td className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" disabled={toggle.isPending} onClick={() => toggle.mutate(pkg)}>
                    {pkg.active ? 'Desabilitar' : 'Habilitar'}
                  </Button>
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(pkg)} aria-label={`Editar ${pkg.name}`} />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    aria-label={`Excluir ${pkg.name}`}
                    disabled={remove.isPending}
                    onClick={() => window.confirm(`Excluir o pacote "${pkg.name}"?`) && remove.mutate(pkg)}
                  />
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      {editing && (
        <PackageForm
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- página

export default function Credits() {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/admin/settings') });
  const billing = data?.settings.billing;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Créditos"
        description="Os motoristas compram créditos via Pix na chave da operadora; a taxa de cada corrida sai desse saldo no aceite."
      />
      {billing && !billing.pixReady && (
        <Alert tone="amber">
          A chave Pix da operadora ainda não está configurada: os motoristas não conseguem comprar créditos.{' '}
          <Link to="/configuracoes" className="font-medium underline">Configurar agora</Link>
        </Alert>
      )}
      {billing && !billing.enabled && (
        <Alert tone="blue">
          A cobrança está desligada (sem taxa por corrida): os motoristas recebem corridas sem precisar de saldo.{' '}
          <Link to="/configuracoes" className="font-medium underline">Definir a taxa</Link>
        </Alert>
      )}
      <Purchases />
      <Packages />
    </div>
  );
}
