import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorText } from '../lib/api.js';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Alert, Button, Card, Field, Input, PageHeader, Spinner } from '../components/ui.jsx';

const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = import.meta.env.VITE_TILE_ATTRIBUTION || '© OpenStreetMap';
const FALLBACK = (import.meta.env.VITE_MAP_CENTER || '-15.78,-47.93').split(',').map(Number);

const pin = L.divIcon({
  className: '',
  html: '<div class="pin" style="width:20px;height:20px;background:#dc2626"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function Picker({ center, zoom, onChange }) {
  const map = useMap();
  useMapEvents({
    click: (event) => onChange({ center: { lat: event.latlng.lat, lng: event.latlng.lng }, zoom: map.getZoom() }),
    zoomend: () => onChange({ center, zoom: map.getZoom() }),
  });
  // Quando as coordenadas são digitadas, leva o mapa até lá.
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);
  return <Marker position={[center.lat, center.lng]} icon={pin} />;
}

const round = (n) => Math.round(n * 1e6) / 1e6;

export default function Settings() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/admin/settings') });

  const [name, setName] = useState('');
  const [cities, setCities] = useState([]);
  const [map, setMap] = useState({ center: { lat: FALLBACK[0], lng: FALLBACK[1] }, zoom: 13 });
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');
  const [message, setMessage] = useState({ tone: 'red', text: '' });

  const load = (settings) => {
    setName(settings.brand.displayName);
    setCities(settings.cities);
    const m = settings.map ?? { center: { lat: FALLBACK[0], lng: FALLBACK[1] }, zoom: 13 };
    setMap(m);
    setLatText(String(round(m.center.lat)));
    setLngText(String(round(m.center.lng)));
  };
  useEffect(() => {
    if (data) load(data.settings);
  }, [data]);

  const refreshTenant = () => {
    queryClient.invalidateQueries({ queryKey: ['tenant'] });
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  };

  const save = useMutation({
    mutationFn: () =>
      api.patch('/admin/settings', {
        brand: { displayName: name.trim() },
        cities: cities.filter((c) => c.name.trim()).map((c) => ({ ...c, name: c.name.trim(), uf: c.uf.trim().toUpperCase() })),
        map,
      }),
    onSuccess: () => {
      setMessage({ tone: 'green', text: 'Configurações salvas.' });
      refreshTenant();
    },
    onError: (e) => setMessage({ tone: 'red', text: errorText(e) }),
  });

  const logo = useMutation({
    mutationFn: (file) => {
      if (!file) return api.del('/admin/settings/logo');
      const form = new FormData();
      form.append('logo', file);
      return api.upload('/admin/settings/logo', form);
    },
    onSuccess: () => {
      setMessage({ tone: 'green', text: 'Logo atualizado.' });
      refreshTenant();
    },
    onError: (e) => setMessage({ tone: 'red', text: errorText(e) }),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Alert>{error.message}</Alert>;
  const { logoUrl } = data.settings.brand;

  const setCoord = (axis, text) => {
    axis === 'lat' ? setLatText(text) : setLngText(text);
    const n = Number(text.replace(',', '.'));
    const limit = axis === 'lat' ? 90 : 180;
    if (text.trim() !== '' && Number.isFinite(n) && Math.abs(n) <= limit) setMap((m) => ({ ...m, center: { ...m.center, [axis]: n } }));
  };
  const onPick = (next) => {
    setMap(next);
    setLatText(String(round(next.center.lat)));
    setLngText(String(round(next.center.lng)));
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Configurações" description="Marca, cidades atendidas e o ponto onde os mapas abrem." />
      {message.text && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Marca">
          <div className="space-y-4">
            <Field label="Nome exibido"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <div>
              <span className="mb-1 block text-sm font-medium">Logo</span>
              <div className="flex items-center gap-4">
                {logoUrl ? <img src={logoUrl} alt="" className="h-14 max-w-[8rem] rounded object-contain" /> : <span className="text-sm text-gray-500 dark:text-gray-400">Sem logo</span>}
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  <Upload size={15} />
                  {logo.isPending ? 'Enviando...' : 'Enviar imagem'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) logo.mutate(file);
                    }}
                  />
                </label>
                {logoUrl && <Button variant="ghost" size="sm" disabled={logo.isPending} onClick={() => logo.mutate(null)}>Remover</Button>}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">JPG, PNG ou WEBP. O logo é salvo na hora; as demais alterações precisam de "Salvar".</p>
            </div>
          </div>
        </Card>

        <Card
          title="Cidades atendidas"
          actions={<Button size="sm" variant="secondary" icon={Plus} onClick={() => setCities([...cities, { name: '', uf: '' }])}>Adicionar</Button>}
        >
          {cities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma cidade cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {cities.map((city, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Cidade"
                    value={city.name}
                    onChange={(e) => setCities(cities.map((c, i) => (i === index ? { ...c, name: e.target.value } : c)))}
                  />
                  <Input
                    placeholder="UF"
                    className="max-w-[5rem] uppercase"
                    maxLength={2}
                    value={city.uf}
                    onChange={(e) => setCities(cities.map((c, i) => (i === index ? { ...c, uf: e.target.value } : c)))}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setCities(cities.filter((_, i) => i !== index))} aria-label="Remover cidade"><Trash2 size={15} /></Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Onde o mapa abre">
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Clique no mapa para marcar o centro da cidade e use o zoom para definir o enquadramento. O painel e os apps abrirão aqui.
        </p>
        <div className="relative z-0 h-80 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <MapContainer center={[map.center.lat, map.center.lng]} zoom={map.zoom} className="h-full w-full">
            <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
            <Picker center={map.center} zoom={map.zoom} onChange={onPick} />
          </MapContainer>
        </div>
        <div className="mt-3 grid max-w-md grid-cols-3 gap-3">
          <Field label="Latitude"><Input value={latText} onChange={(e) => setCoord('lat', e.target.value)} inputMode="decimal" /></Field>
          <Field label="Longitude"><Input value={lngText} onChange={(e) => setCoord('lng', e.target.value)} inputMode="decimal" /></Field>
          <Field label="Zoom"><Input value={map.zoom} readOnly /></Field>
        </div>
      </Card>

      <Button disabled={save.isPending || name.trim().length < 2} onClick={() => { setMessage({ tone: 'red', text: '' }); save.mutate(); }}>
        {save.isPending ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  );
}
