import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useLive } from '../lib/useLive.js';
import { useTenant } from '../lib/tenant.jsx';
import { money, RIDE_STATUS, vehicleText, VEHICLE } from '../lib/format.js';
import { Alert, Avatar, Badge, Card, PageHeader, StatusBadge } from '../components/ui.jsx';

const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = import.meta.env.VITE_TILE_ATTRIBUTION || '© OpenStreetMap';
const FALLBACK_CENTER = (import.meta.env.VITE_MAP_CENTER || '-15.78,-47.93').split(',').map(Number);

const FINAL = new Set(['completed', 'cancelled', 'no_driver']);

const dot = (color, size = 18) =>
  L.divIcon({
    className: '',
    html: `<div class="pin" style="width:${size}px;height:${size}px;background:${color}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const ICONS = {
  free: dot('#16a34a'),
  busy: dot('#2563eb'),
  pickup: dot('#f59e0b', 14),
  dropoff: dot('#dc2626', 14),
};

function FitOnce({ points }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || points.length === 0) return;
    done.current = true;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
  }, [points, map]);
  return null;
}

export default function LiveMap() {
  const { tenant } = useTenant();
  const initialCenter = tenant.map ? [tenant.map.center.lat, tenant.map.center.lng] : FALLBACK_CENTER;
  const initialZoom = tenant.map?.zoom ?? 13;
  const { data, refetch, error } = useQuery({ queryKey: ['live'], queryFn: () => api.get('/admin/live'), staleTime: 0 });
  const [drivers, setDrivers] = useState({});
  const [rides, setRides] = useState({});
  const lastRefetch = useRef(0);

  useEffect(() => {
    if (!data) return;
    setDrivers(Object.fromEntries(data.drivers.map((d) => [d.id, d])));
    setRides(Object.fromEntries(data.rides.map((r) => [r.id, r])));
  }, [data]);

  // Evento de motorista que ainda não conhecemos: busca a foto atual (no máximo a cada 5 s).
  const refresh = useCallback(() => {
    if (Date.now() - lastRefetch.current < 5000) return;
    lastRefetch.current = Date.now();
    refetch();
  }, [refetch]);

  const handlers = useMemo(
    () => ({
      'live:driver-location': ({ driverId, lat, lng, at }) => {
        setDrivers((current) => {
          if (!current[driverId]) {
            refresh();
            return current;
          }
          return { ...current, [driverId]: { ...current[driverId], position: { lat, lng }, positionAt: at } };
        });
      },
      'live:driver-status': ({ driverId, online }) => {
        if (online) return refresh();
        setDrivers((current) => {
          const { [driverId]: _removed, ...rest } = current;
          return rest;
        });
      },
      'live:ride': (ride) => {
        setRides((current) => {
          if (FINAL.has(ride.status)) {
            const { [ride.id]: _removed, ...rest } = current;
            return rest;
          }
          const old = current[ride.id];
          return {
            ...current,
            [ride.id]: {
              ...old,
              ...ride,
              pickupPoint: old?.pickupPoint ?? { lat: ride.pickup.location.coordinates[1], lng: ride.pickup.location.coordinates[0] },
              dropoffPoint: old?.dropoffPoint ?? { lat: ride.dropoff.location.coordinates[1], lng: ride.dropoff.location.coordinates[0] },
            },
          };
        });
        refresh(); // motorista pode ter mudado de livre para ocupado
      },
    }),
    [refresh],
  );
  const connected = useLive(handlers);

  const driverList = Object.values(drivers);
  const rideList = Object.values(rides);
  const rideByDriver = Object.fromEntries(rideList.filter((r) => r.driverId).map((r) => [r.driverId, r]));
  const points = [...driverList.map((d) => [d.position.lat, d.position.lng]), ...rideList.map((r) => [r.pickupPoint.lat, r.pickupPoint.lng])];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mapa ao vivo"
        description="Motoristas online e corridas em aberto, atualizados em tempo real."
        actions={<Badge tone={connected ? 'green' : 'amber'}>{connected ? 'Tempo real conectado' : 'Reconectando'}</Badge>}
      />
      {error && <Alert>{error.message}</Alert>}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="relative z-0 h-[65vh] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <MapContainer center={initialCenter} zoom={initialZoom} className="h-full w-full">
            <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
            <FitOnce points={points} />

            {rideList.map((ride) => (
              <Fragment key={ride.id}>
                <Marker position={[ride.pickupPoint.lat, ride.pickupPoint.lng]} icon={ICONS.pickup}>
                  <Popup>Origem · {ride.passengerInfo?.name ?? 'passageiro'}</Popup>
                </Marker>
                <Marker position={[ride.dropoffPoint.lat, ride.dropoffPoint.lng]} icon={ICONS.dropoff}>
                  <Popup>Destino · {ride.dropoff.address ?? ''}</Popup>
                </Marker>
                <Polyline
                  positions={[
                    [ride.pickupPoint.lat, ride.pickupPoint.lng],
                    [ride.dropoffPoint.lat, ride.dropoffPoint.lng],
                  ]}
                  pathOptions={{ color: ride.status === 'in_progress' ? '#16a34a' : '#f59e0b', weight: 3, dashArray: '6 8' }}
                />
              </Fragment>
            ))}

            {driverList.map((driver) => {
              const ride = rideByDriver[driver.id];
              return (
                <Marker key={driver.id} position={[driver.position.lat, driver.position.lng]} icon={driver.busy ? ICONS.busy : ICONS.free}>
                  <Popup>
                    <div className="min-w-[200px] space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar src={driver.avatarUrl} name={driver.name} size={32} />
                        <strong>{driver.name}</strong>
                      </div>
                      <div>{vehicleText(driver.vehicle)}</div>
                      <div>{driver.ratingAvg ? `nota ${driver.ratingAvg.toFixed(2)}` : 'sem avaliações'}</div>
                      {ride ? (
                        <div>
                          {RIDE_STATUS[ride.status]?.label} · {money(ride.total)}
                          <br />
                          <Link to={`/corridas/${ride.id}`}>Ver corrida</Link>
                        </div>
                      ) : (
                        <div>Livre</div>
                      )}
                      <div className="text-xs text-gray-500">Posição de {driver.positionAt ? new Date(driver.positionAt).toLocaleTimeString('pt-BR') : '—'}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        <div className="space-y-4">
          <Card title="Legenda">
            <ul className="space-y-1.5 text-sm">
              <li><span className="mr-2 inline-block h-3 w-3 rounded-full bg-green-600" />Motorista livre ({driverList.filter((d) => !d.busy).length})</li>
              <li><span className="mr-2 inline-block h-3 w-3 rounded-full bg-blue-600" />Motorista em corrida ({driverList.filter((d) => d.busy).length})</li>
              <li><span className="mr-2 inline-block h-3 w-3 rounded-full bg-amber-500" />Origem do passageiro</li>
              <li><span className="mr-2 inline-block h-3 w-3 rounded-full bg-red-600" />Destino</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">A linha tracejada liga origem e destino (não é a rota do motorista).</p>
          </Card>
          <Card title={`Corridas em aberto (${rideList.length})`}>
            {rideList.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma no momento.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {rideList.map((ride) => (
                  <li key={ride.id}>
                    <Link to={`/corridas/${ride.id}`} className="block rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge map={RIDE_STATUS} value={ride.status} />
                        <strong>{money(ride.total)}</strong>
                      </div>
                      <div className="mt-1 text-gray-600 dark:text-gray-300">
                        {ride.passengerInfo?.name ?? 'Passageiro'} com {ride.driverInfo?.name ?? 'motorista a definir'} ({VEHICLE[ride.vehicleType]})
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
