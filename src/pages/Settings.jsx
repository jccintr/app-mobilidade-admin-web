import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorText } from '../lib/api.js';
import { Gift, Plus, Trash2, Upload } from 'lucide-react';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select, Spinner } from '../components/ui.jsx';
import { cents, moneyInput, parseMoney } from '../lib/format.js';

const PIX_TYPES = [
  ['', 'Detectar automaticamente'],
  ['CPF', 'CPF'],
  ['CNPJ', 'CNPJ'],
  ['PHONE', 'Telefone'],
  ['EMAIL', 'E-mail'],
  ['RANDOM', 'Chave aleatória'],
];

const parsePercent = (text) => {
  const clean = String(text ?? '').replace('%', '').trim().replace(',', '.');
  if (clean === '') return 0;
  const value = Number(clean);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
};

const emptyBilling = { feeFixed: '', feePercent: '', lowBalance: '', welcome: '', pixKey: '', pixKeyType: '', receiverName: '', city: '', notifyEmail: '' };

/** Taxa por corrida + créditos dos motoristas (Pix da operadora). Salvo junto com o resto, no botão "Salvar". */
function BillingCard({ form, setForm, saved }) {
  const queryClient = useQueryClient();
  const [example, setExample] = useState('20,00');
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const fixed = parseMoney(form.feeFixed) ?? 0;
  const percent = parsePercent(form.feePercent) ?? 0;
  const base = parseMoney(example) ?? 0;
  const fee = Math.min(base, fixed + Math.round((base * percent) / 100));
  const enabled = fixed > 0 || percent > 0;

  const welcomeAll = useMutation({
    mutationFn: () => api.post('/admin/credits/welcome-existing'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  });

  return (
    <Card
      title="Cobrança dos motoristas"
      description="O passageiro paga a corrida direto ao motorista. A operadora cobra do motorista uma taxa por corrida, descontada dos créditos dele no aceite."
      actions={enabled ? <Badge tone="green">Cobrança ligada</Badge> : <Badge>Cobrança desligada</Badge>}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Taxa por corrida</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor fixo (R$)" hint="0 = sem valor fixo.">
              <Input inputMode="decimal" placeholder="0,00" value={form.feeFixed} onChange={(e) => set({ feeFixed: e.target.value })} />
            </Field>
            <Field label="Percentual (%)" hint="Sobre a corrida, sem pedágio.">
              <Input inputMode="decimal" placeholder="0" value={form.feePercent} onChange={(e) => set({ feePercent: e.target.value })} />
            </Field>
          </div>
          {parsePercent(form.feePercent) === null || percent > 100 ? <Alert>O percentual deve ser um número entre 0 e 100.</Alert> : null}
          <div className="rounded-lg bg-gray-100 p-4 text-sm dark:bg-gray-800/60">
            <div className="flex flex-wrap items-center gap-2">
              <span>Numa corrida de R$</span>
              <div className="w-28">
                <Input inputMode="decimal" className="h-8" value={example} onChange={(e) => setExample(e.target.value)} aria-label="Valor da corrida de exemplo" />
              </div>
            </div>
            <dl className="num mt-3 grid grid-cols-[1fr_auto] gap-y-1">
              <dt>Taxa da operadora</dt>
              <dd className="font-semibold">{cents(fee)}</dd>
              <dt>Motorista recebe</dt>
              <dd className="font-semibold">{cents(base - fee)}</dd>
            </dl>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Com taxa ligada, só recebe a corrida quem tem saldo para a taxa. Se o passageiro cancelar depois do aceite, a taxa volta ao motorista;
              se o motorista cancelar, ele perde a taxa. Pedágio fica todo com o motorista.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Aviso de saldo baixo (R$)" hint="Push quando o saldo ficar abaixo. 0 = sem aviso.">
              <Input inputMode="decimal" placeholder="0,00" value={form.lowBalance} onChange={(e) => set({ lowBalance: e.target.value })} />
            </Field>
            <Field label="Crédito de boas-vindas (R$)" hint="Dado uma vez, quando o motorista é aprovado.">
              <Input inputMode="decimal" placeholder="0,00" value={form.welcome} onChange={(e) => set({ welcome: e.target.value })} />
            </Field>
          </div>
          {saved.welcomeCreditCents > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={Gift}
                loading={welcomeAll.isPending}
                onClick={() =>
                  window.confirm(`Dar ${cents(saved.welcomeCreditCents)} de boas-vindas a todos os motoristas já aprovados que ainda não receberam?`) &&
                  welcomeAll.mutate()
                }
              >
                Dar boas-vindas aos já aprovados
              </Button>
              {welcomeAll.data && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {welcomeAll.data.granted === 0 ? 'Todos já tinham recebido.' : `${welcomeAll.data.granted} motorista(s) receberam o crédito.`}
                </span>
              )}
              {welcomeAll.error && <span className="text-sm text-red-600">{errorText(welcomeAll.error)}</span>}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Pix para a compra de créditos</h3>
            {saved.pixReady ? <Badge tone="green">Pix pronto</Badge> : <Badge tone="amber">Pix não configurado</Badge>}
          </div>
          <div className="grid grid-cols-[1fr_11rem] gap-3">
            <Field label="Chave Pix" hint="CPF, CNPJ, telefone com DDD, e-mail ou chave aleatória.">
              <Input value={form.pixKey} onChange={(e) => set({ pixKey: e.target.value })} placeholder="(35) 99999-1234" />
            </Field>
            <Field label="Tipo da chave">
              <Select value={form.pixKeyType} onChange={(e) => set({ pixKeyType: e.target.value })}>
                {PIX_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome do recebedor" hint="Como aparece no app do banco. Vazio = nome da operadora.">
              <Input value={form.receiverName} onChange={(e) => set({ receiverName: e.target.value })} maxLength={60} />
            </Field>
            <Field label="Cidade do recebedor">
              <Input value={form.city} onChange={(e) => set({ city: e.target.value })} maxLength={40} placeholder="Brazópolis" />
            </Field>
          </div>
          <Field label="E-mail para avisos de pagamento" hint='Recebe o aviso quando um motorista toca em "Já paguei". Vazio = e-mail dos administradores.'>
            <Input type="email" value={form.notifyEmail} onChange={(e) => set({ notifyEmail: e.target.value })} placeholder="financeiro@suaoperadora.com" />
          </Field>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            O QR Code é gerado com o valor do pacote e o código da compra, e o dinheiro cai direto nesta chave. Os pacotes ficam na página Créditos.
          </p>
        </div>
      </div>
    </Card>
  );
}

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
  const [billing, setBilling] = useState(emptyBilling);

  const load = (settings) => {
    const b = settings.billing;
    setBilling({
      feeFixed: b.feeFixedCents ? moneyInput(b.feeFixedCents) : '',
      feePercent: b.feePercent ? String(b.feePercent).replace('.', ',') : '',
      lowBalance: b.lowBalanceCents ? moneyInput(b.lowBalanceCents) : '',
      welcome: b.welcomeCreditCents ? moneyInput(b.welcomeCreditCents) : '',
      pixKey: b.pix.key ?? '',
      pixKeyType: b.pix.keyType ?? '',
      receiverName: b.pix.receiverName ?? '',
      city: b.pix.city ?? '',
      notifyEmail: b.notifyEmail ?? '',
    });
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
    mutationFn: () => {
      const percent = parsePercent(billing.feePercent);
      const amounts = { feeFixedCents: billing.feeFixed, lowBalanceCents: billing.lowBalance, welcomeCreditCents: billing.welcome };
      const parsed = Object.fromEntries(Object.entries(amounts).map(([key, text]) => [key, text.trim() === '' ? 0 : parseMoney(text)]));
      if (percent === null || percent < 0 || percent > 100 || Object.values(parsed).some((value) => value === null)) {
        return Promise.reject(new Error('Confira os valores da cobrança: use números como 1,50 e um percentual entre 0 e 100.'));
      }
      const savedPix = data.settings.billing.pix;
      const pixChanged = billing.pixKey.trim() !== (savedPix.key ?? '') || (billing.pixKeyType || null) !== (savedPix.keyType ?? null);
      return api.patch('/admin/settings', {
        brand: { displayName: name.trim() },
        cities: cities.filter((c) => c.name.trim()).map((c) => ({ ...c, name: c.name.trim(), uf: c.uf.trim().toUpperCase() })),
        map,
        billing: {
          ...parsed,
          feePercent: percent,
          notifyEmail: billing.notifyEmail.trim(),
          pix: {
            receiverName: billing.receiverName.trim(),
            city: billing.city.trim(),
            // A chave só vai quando muda (a API valida e normaliza; "" remove).
            ...(pixChanged ? { key: billing.pixKey.trim(), keyType: billing.pixKeyType || null } : {}),
          },
        },
      });
    },
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
      <PageHeader title="Configurações" description="Marca, cidades atendidas, onde os mapas abrem e a cobrança dos motoristas." />
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

      <BillingCard form={billing} setForm={setBilling} saved={data.settings.billing} />

      <Button disabled={save.isPending || name.trim().length < 2} onClick={() => { setMessage({ tone: 'red', text: '' }); save.mutate(); }}>
        {save.isPending ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  );
}
