import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, LockOpen, Route, Search } from 'lucide-react';
import { api, errorText } from '../lib/api.js';
import { Alert, Avatar, Badge, Button, Card, Empty, Input, Modal, PageHeader, Pager, Select, Spinner, Table, Td } from '../components/ui.jsx';

export default function Passengers() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null); // passageiro que será bloqueado
  const [message, setMessage] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['passengers', status, q, page],
    queryFn: () => api.get('/admin/passengers', { status, q, page, limit: 20 }),
    placeholderData: (previous) => previous,
  });

  const action = useMutation({
    mutationFn: ({ id, name }) => api.post(`/admin/passengers/${id}/${name}`),
    onSuccess: () => {
      setTarget(null);
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['passengers'] });
    },
    onError: (e) => {
      setTarget(null);
      setMessage(errorText(e));
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Passageiros" description="Quem usa o aplicativo na sua operação. Passageiros bloqueados deixam de conseguir entrar e pedir corridas." />
      {message && <Alert>{message}</Alert>}
      <Card flush>
        <div className="grid gap-3 border-b border-gray-200 p-4 sm:grid-cols-[220px_1fr] dark:border-gray-800">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Situação"
          >
            <option value="">Todas as situações</option>
            <option value="active">Ativos</option>
            <option value="blocked">Bloqueados</option>
          </Select>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, e-mail ou telefone"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {error && <div className="p-4"><Alert>{error.message}</Alert></div>}
        {isLoading ? (
          <Spinner />
        ) : data.data.length === 0 ? (
          <Empty>Nenhum passageiro encontrado.</Empty>
        ) : (
          <Table head={['Passageiro', 'Telefone', 'Corridas', 'Avaliação', 'Situação', 'Cadastro', '']}>
            {data.data.map((p) => (
              <tr key={p.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar src={p.avatarUrl} name={p.name} />
                    <div>
                      <div className="whitespace-nowrap font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{p.email}</div>
                    </div>
                  </div>
                </Td>
                <Td className="whitespace-nowrap">{p.phone}</Td>
                <Td className="num whitespace-nowrap">
                  {p.rides.total}
                  <span className="text-gray-500 dark:text-gray-400"> ({p.rides.completed} concluídas)</span>
                </Td>
                <Td className="num whitespace-nowrap">{p.ratingCount ? `${p.ratingAvg.toFixed(2)} (${p.ratingCount})` : '—'}</Td>
                <Td>{p.status === 'blocked' ? <Badge tone="red">Bloqueado</Badge> : <Badge tone="green">Ativo</Badge>}</Td>
                <Td className="whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Link to={`/corridas?passageiro=${p.id}`}>
                      <Button variant="ghost" size="sm" icon={Route}>Corridas</Button>
                    </Link>
                    {p.status === 'blocked' ? (
                      <Button variant="ghost" size="sm" icon={LockOpen} disabled={action.isPending} onClick={() => action.mutate({ id: p.id, name: 'unblock' })}>
                        Desbloquear
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" icon={Ban} disabled={action.isPending} onClick={() => setTarget(p)}>
                        Bloquear
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        <Pager data={data} onPage={setPage} />
      </Card>

      {target && (
        <Modal title="Bloquear passageiro" onClose={() => setTarget(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>{target.name}</strong> será desconectado e não poderá entrar nem pedir corridas até você desbloquear.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTarget(null)}>Cancelar</Button>
            <Button variant="danger" icon={Ban} loading={action.isPending} onClick={() => action.mutate({ id: target.id, name: 'block' })}>
              Bloquear
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
