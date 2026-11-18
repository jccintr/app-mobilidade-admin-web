import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { DRIVER_STATUS, vehicleText, VEHICLE } from '../lib/format.js';
import { Search } from 'lucide-react';
import { Alert, Avatar, Card, Empty, Input, PageHeader, Pager, Select, Spinner, StatusBadge, Table, Td } from '../components/ui.jsx';

export default function Drivers() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['drivers', status, q, page],
    queryFn: () => api.get('/admin/drivers', { status, q, page, limit: 20 }),
    placeholderData: (previous) => previous,
  });

  const setStatus = (value) => {
    setPage(1);
    setParams(value ? { status: value } : {});
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Motoristas" description="Analise cadastros, aprove e acompanhe quem atende na sua cidade." />
      <Card flush>
        <div className="grid gap-3 border-b border-gray-200 p-4 sm:grid-cols-[220px_1fr] dark:border-gray-800">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação">
            <option value="">Todas as situações</option>
            {Object.entries(DRIVER_STATUS).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </Select>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, e-mail, telefone ou placa"
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
          <Empty>Nenhum motorista encontrado.</Empty>
        ) : (
          <Table head={['Motorista', 'Veículo', 'Situação', 'Cadastro', '']}>
            {data.data.map((d) => (
              <tr key={d.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar src={d.avatarUrl} name={d.name} />
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{d.email}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  {d.vehicle?.type ? `${VEHICLE[d.vehicle.type] ?? d.vehicle.type} · ` : ''}
                  {vehicleText(d.vehicle)}
                </Td>
                <Td>
                  <StatusBadge map={DRIVER_STATUS} value={d.status} />
                </Td>
                <Td>{new Date(d.createdAt).toLocaleDateString('pt-BR')}</Td>
                <Td>
                  <Link className="font-medium text-brand hover:underline" to={`/motoristas/${d.id}`}>
                    {d.status === 'pending_approval' ? 'Analisar' : 'Abrir'}
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        <Pager data={data} onPage={setPage} />
      </Card>
    </div>
  );
}
