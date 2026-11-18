import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { money, RIDE_STATUS } from '../lib/format.js';
import { Banknote, CarTaxiFront, Route, TriangleAlert, Users } from 'lucide-react';
import { Alert, Card, PageHeader, Spinner, Stat } from '../components/ui.jsx';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/admin/dashboard'), refetchInterval: 15_000 });
  if (isLoading) return <Spinner />;
  if (error) return <Alert>{error.message}</Alert>;

  const { drivers, ridesToday, passengers, rain } = data;
  const pending = drivers.pending_approval ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Início" description="Resumo de hoje na sua operação." />

      {pending > 0 && (
        <Link to="/motoristas?status=pending_approval" className="block">
          <Alert tone="amber">
            <span className="flex items-center gap-2">
              <TriangleAlert size={16} />
              <span>
                <strong>{pending}</strong> {pending === 1 ? 'motorista aguarda' : 'motoristas aguardam'} sua aprovação. Clique para analisar.
              </span>
            </span>
          </Alert>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Route} label="Corridas hoje" value={ridesToday.total} hint={`${ridesToday.byStatus.completed ?? 0} concluídas`} />
        <Stat icon={Banknote} label="Movimentado hoje" value={money(ridesToday.revenue)} hint="Soma das corridas concluídas" />
        <Stat icon={CarTaxiFront} label="Motoristas online" value={drivers.online} hint={`${drivers.approved ?? 0} aprovados`} />
        <Stat icon={Users} label="Passageiros" value={passengers} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Corridas de hoje por situação">
          {Object.keys(ridesToday.byStatus).length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma corrida hoje.</p>
          ) : (
            <ul className="num space-y-3 text-sm">
              {Object.entries(ridesToday.byStatus).map(([status, count]) => (
                <li key={status} className="flex justify-between">
                  <span>{RIDE_STATUS[status]?.label ?? status}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Motoristas">
          <ul className="num space-y-3 text-sm">
            <li className="flex justify-between"><span>Aguardando aprovação</span><strong>{pending}</strong></li>
            <li className="flex justify-between"><span>Aprovados</span><strong>{drivers.approved ?? 0}</strong></li>
            <li className="flex justify-between"><span>Reprovados</span><strong>{drivers.rejected ?? 0}</strong></li>
            <li className="flex justify-between"><span>Bloqueados</span><strong>{drivers.blocked ?? 0}</strong></li>
            <li className="flex justify-between"><span>Cadastro incompleto</span><strong>{drivers.incomplete ?? 0}</strong></li>
          </ul>
          <p className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">Adicional de chuva: {rain ? 'ligado' : 'desligado'}.</p>
        </Card>
      </div>
    </div>
  );
}
