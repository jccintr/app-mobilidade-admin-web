import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { cents, dateTime, FEE_STATUS, money, PAYMENT, RIDE_STATUS, timeOnly, VEHICLE, vehicleText } from '../lib/format.js';
import { ArrowLeft } from 'lucide-react';
import { Alert, Badge, Card, Spinner, StatusBadge, Table, Td } from '../components/ui.jsx';

const OFFER = { pending: 'Aguardando', accepted: 'Aceitou', declined: 'Recusou', expired: 'Não respondeu' };

function FareLines({ fare, title }) {
  if (!fare) return null;
  return (
    <Card title={title}>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {fare.lines.map((line, i) => (
            <tr key={`${line.code}-${i}`}>
              <td className="py-2">
                {line.label}
                {line.detail && <span className="block text-xs text-gray-500 dark:text-gray-400">{line.detail}</span>}
              </td>
              <td className={`py-2 text-right ${line.amountCents < 0 ? 'text-green-600' : ''}`}>{money(line.amount)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-2">Total</td>
            <td className="py-2 text-right">{money(fare.total)}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

export default function RideDetail() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['ride', id], queryFn: () => api.get(`/admin/rides/${id}`), refetchInterval: 10_000 });
  if (isLoading) return <Spinner />;
  if (error) return <Alert>{error.message}</Alert>;
  const r = data.ride;

  return (
    <div className="space-y-4">
      <Link to="/corridas" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"><ArrowLeft size={14} />Corridas</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="num text-xl font-semibold tracking-tight">Corrida {money(r.total)}</h1>
        <StatusBadge map={RIDE_STATUS} value={r.status} />
        <Badge>{VEHICLE[r.vehicleType]}</Badge>
        <Badge>{PAYMENT[r.paymentMethod] ?? r.paymentMethod}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Trajeto">
          <dl className="space-y-2 text-sm">
            <div><dt className="text-gray-500">Origem</dt><dd>{r.pickup.address ?? `${r.pickup.location.coordinates[1]}, ${r.pickup.location.coordinates[0]}`}</dd></div>
            <div><dt className="text-gray-500">Destino</dt><dd>{r.dropoff.address ?? `${r.dropoff.location.coordinates[1]}, ${r.dropoff.location.coordinates[0]}`}</dd></div>
            <div><dt className="text-gray-500">Distância e tempo estimados</dt><dd>{r.route?.distanceKm} km · {r.route?.durationMin} min</dd></div>
          </dl>
        </Card>
        <Card title="Pessoas">
          <dl className="space-y-2 text-sm">
            <div><dt className="text-gray-500">Passageiro</dt><dd>{r.passengerInfo?.name ?? '—'}{r.driverRating ? ` · nota dada a ele: ${r.driverRating.stars}/5` : ''}</dd></div>
            <div>
              <dt className="text-gray-500">Motorista</dt>
              <dd>
                {r.driverInfo?.name ?? '—'}
                {r.driverInfo?.vehicle ? ` · ${vehicleText(r.driverInfo.vehicle)}` : ''}
                {r.passengerRating ? ` · nota recebida: ${r.passengerRating.stars}/5` : ''}
              </dd>
            </div>
            {r.cancelledBy && (
              <div><dt className="text-gray-500">Cancelamento</dt><dd>por {r.cancelledBy === 'system' ? 'sistema' : r.cancelledBy === 'driver' ? 'motorista' : 'passageiro'}{r.cancelReason ? `: ${r.cancelReason}` : ''}</dd></div>
            )}
          </dl>
        </Card>
      </div>

      <Card title="Linha do tempo">
        <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Pedida', r.createdAt],
            ['Aceita', r.acceptedAt],
            ['Motorista chegou', r.arrivedAt],
            ['Iniciada', r.startedAt],
            ['Concluída', r.completedAt],
            ['Cancelada', r.cancelledAt],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <li key={label} className="flex justify-between gap-3"><span className="text-gray-500">{label}</span><span>{dateTime(value)}</span></li>
            ))}
        </ul>
      </Card>

      {r.fee && r.fee.status !== 'none' && (
        <Card title="Taxa da operadora">
          <dl className="num grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-gray-500">Taxa</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <strong>{cents(r.fee.totalCents)}</strong>
              <StatusBadge map={FEE_STATUS} value={r.fee.status} />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {[r.fee.fixedCents ? `${cents(r.fee.fixedCents)} fixo` : null, r.fee.percent ? `${String(r.fee.percent).replace('.', ',')}% de ${cents(r.fee.baseCents)}` : null].filter(Boolean).join(' + ')}
              </span>
            </dd>
            <dt className="text-gray-500">Motorista recebe</dt>
            <dd>{cents(r.driverNetCents)}{r.status !== 'completed' ? ' (se concluída)' : ''}</dd>
            {r.fee.status === 'charged' && r.status === 'cancelled' && r.cancelledBy === 'driver' && (
              <>
                <dt className="text-gray-500">Observação</dt>
                <dd>O motorista cancelou depois de aceitar: a taxa não foi devolvida.</dd>
              </>
            )}
          </dl>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <FareLines fare={r.estimate} title={`Estimativa (regra v${r.ruleVersion})`} />
        {r.finalFare && <FareLines fare={r.finalFare} title="Valor final (recalculado)" />}
      </div>
      {r.estimate?.appliedAdjustments?.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Adicionais aplicados: {r.estimate.appliedAdjustments.map((a) => a.label ?? a.id).join(', ')}.
        </p>
      )}

      <Card title="Ofertas ao motorista">
        {r.offers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma oferta enviada.</p>
        ) : (
          <Table head={['Enviada às', 'Motorista (id)', 'Resultado']}>
            {r.offers.map((o, i) => (
              <tr key={i}>
                <Td>{timeOnly(o.offeredAt)}</Td>
                <Td className="font-mono text-xs">{o.driverId}</Td>
                <Td>{OFFER[o.status] ?? o.status}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
