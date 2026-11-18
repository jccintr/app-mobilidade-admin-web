import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { dateTime, money, RIDE_STATUS, VEHICLE } from '../lib/format.js';
import { Alert, Button, Card, Empty, PageHeader, Pager, Select, Spinner, StatusBadge, Table, Td } from '../components/ui.jsx';

export default function Rides() {
  const [params, setParams] = useSearchParams();
  const passengerId = params.get('passageiro') ?? '';
  const driverId = params.get('motorista') ?? '';
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['rides', status, passengerId, driverId, page],
    queryFn: () => api.get('/admin/rides', { status, passengerId, driverId, page, limit: 20 }),
    placeholderData: (previous) => previous,
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Corridas" description="Histórico e corridas em andamento. Atualiza sozinho a cada 15 segundos." />
      <Card flush>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <div className="w-full max-w-xs">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Situação"
          >
            <option value="">Todas as situações</option>
            {Object.entries(RIDE_STATUS).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </Select>
          </div>
          {(passengerId || driverId) && (
            <Button variant="secondary" size="sm" icon={X} onClick={() => setParams({})}>
              {passengerId ? 'Só deste passageiro' : 'Só deste motorista'}
            </Button>
          )}
        </div>
        {error && <div className="p-4"><Alert>{error.message}</Alert></div>}
        {isLoading ? (
          <Spinner />
        ) : data.data.length === 0 ? (
          <Empty>Nenhuma corrida encontrada.</Empty>
        ) : (
          <Table head={['Pedida em', 'Passageiro', 'Motorista', 'Veículo', 'Valor', 'Situação', '']}>
            {data.data.map((r) => (
              <tr key={r.id}>
                <Td>{dateTime(r.createdAt)}</Td>
                <Td>{r.passengerInfo?.name ?? '—'}</Td>
                <Td>{r.driverInfo?.name ?? '—'}</Td>
                <Td>{VEHICLE[r.vehicleType] ?? r.vehicleType}</Td>
                <Td className="num font-medium">{money(r.total)}</Td>
                <Td>
                  <StatusBadge map={RIDE_STATUS} value={r.status} />
                </Td>
                <Td>
                  <Link className="font-medium text-brand hover:underline" to={`/corridas/${r.id}`}>
                    Detalhes
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
