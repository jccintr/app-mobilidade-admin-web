import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorText } from '../lib/api.js';
import { dateTime, money, VEHICLE, WEEKDAYS } from '../lib/format.js';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select, Spinner, Table, Td, Textarea } from '../components/ui.jsx';

const TEMPLATE = {
  currency: 'BRL',
  timezone: 'America/Sao_Paulo',
  vehicleTariffs: {
    car: { baseFare: 4, perKm: 2.2, perMinute: 0.35, minimumFare: 8 },
  },
  adjustments: [],
  extras: { waitPerMinute: 0.5, perStop: 2 },
  limits: { maxPercentTotal: 60, minPercentTotal: -50 },
  rounding: { step: 0.5, mode: 'nearest' },
};

// Remove campos auxiliares de tela antes de enviar.
const clean = (cfg) => ({ ...cfg, adjustments: cfg.adjustments.map(({ idLocked, ...rest }) => rest) });
const clone = (value) => JSON.parse(JSON.stringify(value));

/** Campo numérico que aceita "2,5" e "2." enquanto se digita. */
function Num({ value, onChange, ...props }) {
  const [text, setText] = useState(String(value ?? 0));
  useEffect(() => {
    if (Number(text.replace(',', '.')) !== value) setText(String(value ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Input
      {...props}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const n = Number(raw.replace(',', '.'));
        if (raw.trim() !== '' && Number.isFinite(n)) onChange(n);
      }}
    />
  );
}

function VehicleTariff({ type, tariff, onChange }) {
  const set = (key) => (n) => onChange({ ...tariff, [key]: n });
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <strong>{VEHICLE[type]}</strong>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(tariff)} onChange={(e) => onChange(e.target.checked ? clone(TEMPLATE.vehicleTariffs[type]) : null)} />
          Atende
        </label>
      </div>
      {tariff && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bandeirada (R$)"><Num value={tariff.baseFare} onChange={set('baseFare')} /></Field>
          <Field label="Por km (R$)"><Num value={tariff.perKm} onChange={set('perKm')} /></Field>
          <Field label="Por minuto (R$)"><Num value={tariff.perMinute} onChange={set('perMinute')} /></Field>
          <Field label="Mínima (R$)"><Num value={tariff.minimumFare} onChange={set('minimumFare')} /></Field>
        </div>
      )}
    </div>
  );
}

const slugify = (text) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function Adjustment({ item, onChange, onRemove }) {
  const when = item.when ?? {};
  const setWhen = (patch) => {
    const next = { ...when, ...patch };
    for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key];
    onChange({ ...item, when: next });
  };
  const toggleIn = (key, value) => {
    const list = when[key] ?? [];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    setWhen({ [key]: next.length ? next : undefined });
  };
  const csv = (key) => (when[key] ?? []).join(', ');
  const setCsv = (key) => (e) => {
    const list = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
    setWhen({ [key]: list.length ? list : undefined });
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Field label="Nome do adicional">
          <Input
            value={item.label}
            onChange={(e) => onChange({ ...item, label: e.target.value, id: item.idLocked ? item.id : slugify(e.target.value) || item.id })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={item.effect.type} onChange={(e) => onChange({ ...item, effect: { ...item.effect, type: e.target.value } })}>
              <option value="percent">Percentual (%)</option>
              <option value="fixed">Valor fixo (R$)</option>
            </Select>
          </Field>
          <Field label="Valor">
            <Num value={item.effect.value} onChange={(n) => onChange({ ...item, effect: { ...item.effect, value: n } })} />
          </Field>
        </div>
        <div className="flex items-end gap-3 pb-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={item.enabled !== false} onChange={(e) => onChange({ ...item, enabled: e.target.checked })} />
            Ativo
          </label>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={onRemove}>Remover</Button>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">Vale quando TODAS as condições marcadas abaixo forem verdadeiras. Sem nenhuma condição, vale sempre.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={Boolean(when.timeRange)} onChange={(e) => setWhen({ timeRange: e.target.checked ? { from: '22:00', to: '05:00' } : undefined })} />
            Faixa de horário
          </label>
          {when.timeRange && (
            <div className="flex items-center gap-2">
              <Input type="time" value={when.timeRange.from} onChange={(e) => setWhen({ timeRange: { ...when.timeRange, from: e.target.value } })} />
              <span>até</span>
              <Input type="time" value={when.timeRange.to} onChange={(e) => setWhen({ timeRange: { ...when.timeRange, to: e.target.value } })} />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium">Dias da semana</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleIn('weekdays', day)}
                className={`rounded-md border px-2 py-1 text-xs ${(when.weekdays ?? []).includes(day) ? 'border-brand bg-brand text-brand-fg' : 'border-gray-300 dark:border-gray-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Field label="Datas específicas (feriados)" hint="AAAA-MM-DD separadas por vírgula">
          <Input value={csv('dates')} onChange={setCsv('dates')} placeholder="2026-12-25, 2027-01-01" />
        </Field>
        <Field label="Zonas" hint="Códigos separados por vírgula (zonas ainda não são detectadas automaticamente)">
          <Input value={csv('zones')} onChange={setCsv('zones')} placeholder="rodoviaria" />
        </Field>
        <Field label="Chuva">
          <Select value={when.rain === undefined ? '' : String(when.rain)} onChange={(e) => setWhen({ rain: e.target.value === '' ? undefined : e.target.value === 'true' })}>
            <option value="">Indiferente</option>
            <option value="true">Somente com chuva</option>
            <option value="false">Somente sem chuva</option>
          </Select>
        </Field>
        <div className="space-y-2">
          <span className="text-sm font-medium">Veículos</span>
          <div className="flex gap-3 text-sm">
            {Object.entries(VEHICLE).map(([value, label]) => (
              <label key={value} className="flex items-center gap-1.5">
                <input type="checkbox" checked={(when.vehicleTypes ?? []).includes(value)} onChange={() => toggleIn('vehicleTypes', value)} />
                {label}
              </label>
            ))}
            <span className="text-xs text-gray-500">(nenhum marcado = todos)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Simulator({ config }) {
  const [input, setInput] = useState({ vehicleType: 'car', distanceKm: 5, durationMin: 15, rain: false, zones: '', waitMinutes: 0, stops: 0, tolls: 0, requestedAt: '' });
  const set = (patch) => setInput((current) => ({ ...current, ...patch }));
  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        vehicleType: input.vehicleType,
        distanceKm: input.distanceKm,
        durationMin: input.durationMin,
        rain: input.rain,
        zones: input.zones.split(',').map((s) => s.trim()).filter(Boolean),
        waitMinutes: input.waitMinutes,
        stops: Math.round(input.stops),
        tolls: input.tolls,
      };
      if (input.requestedAt) body.requestedAt = new Date(input.requestedAt).toISOString();
      return api.post('/admin/pricing/simulate', { config, input: body });
    },
  });
  const fare = mutation.data?.fare;

  return (
    <Card title="Simulador">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Veículo">
          <Select value={input.vehicleType} onChange={(e) => set({ vehicleType: e.target.value })}>
            {Object.entries(VEHICLE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Chuva">
          <Select value={String(input.rain)} onChange={(e) => set({ rain: e.target.value === 'true' })}>
            <option value="false">Sem chuva</option>
            <option value="true">Com chuva</option>
          </Select>
        </Field>
        <Field label="Distância (km)"><Num value={input.distanceKm} onChange={(n) => set({ distanceKm: n })} /></Field>
        <Field label="Duração (min)"><Num value={input.durationMin} onChange={(n) => set({ durationMin: n })} /></Field>
        <Field label="Espera (min)"><Num value={input.waitMinutes} onChange={(n) => set({ waitMinutes: n })} /></Field>
        <Field label="Paradas"><Num value={input.stops} onChange={(n) => set({ stops: n })} /></Field>
        <Field label="Pedágio (R$)"><Num value={input.tolls} onChange={(n) => set({ tolls: n })} /></Field>
        <Field label="Zonas"><Input value={input.zones} onChange={(e) => set({ zones: e.target.value })} placeholder="rodoviaria" /></Field>
        <div className="col-span-2">
          <Field label="Pedida em (opcional)" hint="Vazio = agora. Útil para testar horário noturno, domingo e feriado.">
            <Input type="datetime-local" value={input.requestedAt} onChange={(e) => set({ requestedAt: e.target.value })} />
          </Field>
        </div>
      </div>
      <Button className="mt-3 w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? 'Calculando...' : 'Calcular com a regra em edição'}
      </Button>
      {mutation.error && <div className="mt-3"><Alert>{errorText(mutation.error)}</Alert></div>}
      {fare && (
        <table className="mt-4 w-full text-sm">
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {fare.lines.map((line, i) => (
              <tr key={i}>
                <td className="py-1.5">{line.label}</td>
                <td className="py-1.5 text-right">{money(line.amount)}</td>
              </tr>
            ))}
            <tr className="text-base font-semibold">
              <td className="py-2">Total</td>
              <td className="py-2 text-right">{money(fare.total)}</td>
            </tr>
          </tbody>
        </table>
      )}
      {fare && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Calculado para {fare.context.localDate} às {fare.context.localTime} ({fare.context.timezone}).</p>}
    </Card>
  );
}

export default function Tariff() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['rules'], queryFn: () => api.get('/admin/pricing-rules') });
  const [config, setConfig] = useState(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [activate, setActivate] = useState(true);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [message, setMessage] = useState({ tone: 'red', text: '' });
  const [loadedFrom, setLoadedFrom] = useState(null);

  const rules = data?.data ?? [];
  const active = rules.find((r) => r.active);

  // Primeira carga: edita a partir da regra ativa (ou do modelo, se ainda não há nenhuma).
  useEffect(() => {
    if (!data || config) return;
    const base = active ?? rules[0];
    setConfig(clone(base ? base.config : TEMPLATE));
    setLoadedFrom(base ? base.version : null);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => api.post('/admin/pricing-rules', { name: name.trim(), notes: notes.trim() || undefined, activate, config: clean(config) }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      setMessage({ tone: 'green', text: `Versão ${result.rule.version} salva${result.rule.active ? ' e ativada' : ''}.` });
      setLoadedFrom(result.rule.version);
      setName('');
      setNotes('');
    },
    onError: (e) => setMessage({ tone: 'red', text: errorText(e) }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, on }) => api.post(`/admin/pricing-rules/${id}/${on ? 'activate' : 'deactivate'}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules'] }),
    onError: (e) => setMessage({ tone: 'red', text: errorText(e) }),
  });

  if (isLoading || !config) return <Spinner />;
  if (error) return <Alert>{error.message}</Alert>;

  const update = (patch) => setConfig((current) => ({ ...current, ...patch }));
  const setTariff = (type) => (tariff) => {
    const next = { ...config.vehicleTariffs };
    if (tariff) next[type] = tariff;
    else delete next[type];
    update({ vehicleTariffs: next });
  };
  const setAdjustment = (index, value) => update({ adjustments: config.adjustments.map((a, i) => (i === index ? value : a)) });

  const openJson = () => {
    setJsonText(JSON.stringify(clean(config), null, 2));
    setJsonError('');
    setShowJson(true);
  };
  const applyJson = () => {
    try {
      setConfig(JSON.parse(jsonText));
      setJsonError('');
      setShowJson(false);
    } catch {
      setJsonError('JSON inválido.');
    }
  };

  const cleanConfig = clean(config);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tarifa"
        description={`Cada alteração cria uma nova versão; as corridas antigas continuam explicáveis pela versão com que foram calculadas.${loadedFrom ? ` Você está editando a partir da v${loadedFrom}.` : ''}`}
        actions={active ? <Badge tone="green">Ativa: v{active.version} · {active.name}</Badge> : <Badge tone="red">Nenhuma regra ativa</Badge>}
      />
      {message.text && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card title="Valores por veículo">
            <div className="grid gap-3">
              {['car'].map((type) => (
                <VehicleTariff key={type} type={type} tariff={config.vehicleTariffs[type]} onChange={setTariff(type)} />
              ))}
            </div>
          </Card>

          <Card title="Extras, limites e arredondamento">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Field label="Espera por minuto (R$)"><Num value={config.extras.waitPerMinute} onChange={(n) => update({ extras: { ...config.extras, waitPerMinute: n } })} /></Field>
              <Field label="Por parada (R$)"><Num value={config.extras.perStop} onChange={(n) => update({ extras: { ...config.extras, perStop: n } })} /></Field>
              <Field label="Fuso horário"><Input value={config.timezone} onChange={(e) => update({ timezone: e.target.value })} /></Field>
              <Field label="Soma máxima dos % (acréscimo)"><Num value={config.limits.maxPercentTotal} onChange={(n) => update({ limits: { ...config.limits, maxPercentTotal: n } })} /></Field>
              <Field label="Soma mínima dos % (desconto)" hint="Número negativo"><Num value={config.limits.minPercentTotal} onChange={(n) => update({ limits: { ...config.limits, minPercentTotal: n } })} /></Field>
              <Field label="Arredondar para múltiplos de (R$)"><Num value={config.rounding.step} onChange={(n) => update({ rounding: { ...config.rounding, step: n } })} /></Field>
              <Field label="Modo de arredondamento">
                <Select value={config.rounding.mode} onChange={(e) => update({ rounding: { ...config.rounding, mode: e.target.value } })}>
                  <option value="nearest">Mais próximo</option>
                  <option value="up">Sempre para cima</option>
                </Select>
              </Field>
            </div>
          </Card>

          <Card
            title="Adicionais (horário, chuva, feriado...)"
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={Plus}
                onClick={() =>
                  update({
                    adjustments: [
                      ...config.adjustments,
                      { id: `adicional-${config.adjustments.length + 1}`, label: '', enabled: true, when: {}, effect: { type: 'percent', value: 10 } },
                    ],
                  })
                }
              >
                Adicionar
              </Button>
            }
          >
            {config.adjustments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum adicional. Use o botão para criar, por exemplo, o adicional noturno ou de chuva.</p>
            ) : (
              <div className="space-y-3">
                {config.adjustments.map((item, index) => (
                  <Adjustment
                    key={index}
                    item={{ ...item, idLocked: item.idLocked ?? Boolean(item.label) }}
                    onChange={(value) => setAdjustment(index, value)}
                    onRemove={() => update({ adjustments: config.adjustments.filter((_, i) => i !== index) })}
                  />
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              O adicional de chuva só entra quando a chave "Chuva" do topo da tela estiver ligada.
            </p>
          </Card>

          <Card
            title="Salvar como nova versão"
            actions={<Button size="sm" variant="ghost" onClick={openJson}>Ver/editar JSON</Button>}
          >
            {showJson && (
              <div className="mb-4 space-y-2">
                <Textarea rows={14} className="font-mono text-xs" value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
                <Alert>{jsonError}</Alert>
                <div className="flex gap-2">
                  <Button size="sm" onClick={applyJson}>Aplicar</Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowJson(false)}>Fechar</Button>
                </div>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome da versão"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Tarifa de outubro" /></Field>
              <Field label="Observação (opcional)"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} />
              Ativar agora (vale para as próximas corridas pedidas)
            </label>
            <Button
              className="mt-3"
              disabled={save.isPending || name.trim().length < 2}
              onClick={() => {
                setMessage({ tone: 'red', text: '' });
                save.mutate();
              }}
            >
              {save.isPending ? 'Salvando...' : 'Salvar versão'}
            </Button>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="xl:sticky xl:top-20">
            <Simulator config={cleanConfig} />
          </div>
        </div>
      </div>

      <Card title="Versões">
        <Table head={['Versão', 'Nome', 'Criada em', 'Situação', '']}>
          {rules.map((rule) => (
            <tr key={rule.id}>
              <Td>v{rule.version}</Td>
              <Td>{rule.name}{rule.notes ? <span className="block text-xs text-gray-500">{rule.notes}</span> : null}</Td>
              <Td>{dateTime(rule.createdAt)}</Td>
              <Td>{rule.active ? <Badge tone="green">Ativa</Badge> : <Badge>Inativa</Badge>}</Td>
              <Td>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setConfig(clone(rule.config));
                      setLoadedFrom(rule.version);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Editar a partir desta
                  </Button>
                  <Button size="sm" variant="ghost" disabled={toggle.isPending} onClick={() => toggle.mutate({ id: rule.id, on: !rule.active })}>
                    {rule.active ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
