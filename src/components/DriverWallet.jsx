import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal, Wallet } from 'lucide-react';
import { api, errorText } from '../lib/api.js';
import { cents, dateTime, parseMoney, WALLET_TYPE } from '../lib/format.js';
import { Alert, Button, Card, Empty, Field, Input, Modal, Pager, Select, Spinner, Table, Td, Textarea, cx } from './ui.jsx';

/** Saldo de créditos, extrato e ajuste manual de um motorista (detalhe do motorista). */
export default function DriverWallet({ driverId }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState(false);
  const [direction, setDirection] = useState('credit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['driver-wallet', driverId, page],
    queryFn: () => api.get(`/admin/drivers/${driverId}/wallet`, { page, limit: 10 }),
  });

  const amountCents = parseMoney(amount);
  const adjust = useMutation({
    mutationFn: () => api.post(`/admin/drivers/${driverId}/wallet/adjust`, { amountCents: direction === 'credit' ? amountCents : -amountCents, note: note.trim() }),
    onSuccess: () => {
      setAdjusting(false);
      setAmount('');
      setNote('');
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['driver-wallet', driverId] });
    },
    onError: (e) => setError(errorText(e)),
  });

  return (
    <Card
      flush
      title="Créditos"
      description="A taxa de cada corrida sai deste saldo no aceite. Créditos não expiram e não são reembolsados."
      actions={
        <>
          <Link to={`/creditos?status=&motorista=${driverId}`}><Button size="sm" variant="ghost">Compras</Button></Link>
          <Button size="sm" variant="secondary" icon={SlidersHorizontal} onClick={() => { setError(''); setAdjusting(true); }}>Ajustar saldo</Button>
        </>
      }
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"><Wallet size={18} /></span>
            <div>
              <p className="text-[13px] text-gray-500 dark:text-gray-400">Saldo atual</p>
              <p className="num text-2xl font-semibold tracking-tight">{cents(data.balanceCents)}</p>
            </div>
            <p className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              {data.welcomeGrantedAt ? `Recebeu boas-vindas em ${dateTime(data.welcomeGrantedAt)}.` : 'Ainda não recebeu crédito de boas-vindas.'}
            </p>
          </div>
          {data.entries.data.length === 0 ? (
            <Empty>Nenhuma movimentação ainda.</Empty>
          ) : (
            <Table head={['Quando', 'Movimentação', 'Valor', 'Saldo depois']}>
              {data.entries.data.map((entry) => (
                <tr key={entry.id}>
                  <Td className="whitespace-nowrap text-gray-500 dark:text-gray-400">{dateTime(entry.createdAt)}</Td>
                  <Td>
                    <span className="font-medium">{WALLET_TYPE[entry.type] ?? entry.type}</span>
                    {entry.rideId && (
                      <Link to={`/corridas/${entry.rideId}`} className="ml-2 text-xs underline">ver corrida</Link>
                    )}
                    {entry.note && entry.type !== 'ride_fee' && <p className="text-xs text-gray-500 dark:text-gray-400">{entry.note}</p>}
                  </Td>
                  <Td className={cx('num whitespace-nowrap font-medium', entry.amountCents < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300')}>
                    {entry.amountCents > 0 ? '+' : '−'} {cents(Math.abs(entry.amountCents))}
                  </Td>
                  <Td className="num whitespace-nowrap">{cents(entry.balanceAfterCents)}</Td>
                </tr>
              ))}
            </Table>
          )}
          <Pager data={data.entries} onPage={setPage} />
        </>
      )}

      {adjusting && (
        <Modal title="Ajustar saldo" onClose={() => setAdjusting(false)}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError('');
              adjust.mutate();
            }}
          >
            <Alert>{error}</Alert>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <Select value={direction} onChange={(e) => setDirection(e.target.value)}>
                  <option value="credit">Adicionar crédito</option>
                  <option value="debit">Retirar crédito</option>
                </Select>
              </Field>
              <Field label="Valor (R$)">
                <Input inputMode="decimal" placeholder="10,00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
              </Field>
            </div>
            <Field label="Motivo" hint="Fica no extrato do motorista. Ex.: cortesia, Pix pago depois do prazo.">
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdjusting(false)}>Cancelar</Button>
              <Button type="submit" loading={adjust.isPending} disabled={!amountCents || note.trim().length < 3}>
                {direction === 'credit' ? 'Adicionar' : 'Retirar'} {amountCents ? cents(amountCents) : ''}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
