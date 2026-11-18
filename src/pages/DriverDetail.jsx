import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorText, fetchDocument } from '../lib/api.js';
import { DOC_LABEL, DRIVER_STATUS, dateTime, vehicleText, VEHICLE } from '../lib/format.js';
import { ArrowLeft, Ban, Check, LockOpen, Route, X } from 'lucide-react';
import { Alert, Avatar, Button, Card, Field, Modal, Spinner, StatusBadge, Textarea } from '../components/ui.jsx';

function DocumentView({ driverId, type, info }) {
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!info?.uploaded) return undefined;
    let revoke;
    fetchDocument(`/admin/drivers/${driverId}/documents/${type}`)
      .then((result) => {
        setDoc(result);
        if (result.url.startsWith('blob:')) revoke = result.url;
      })
      .catch((e) => setError(e.message));
    return () => revoke && URL.revokeObjectURL(revoke);
  }, [driverId, type, info?.uploaded, info?.uploadedAt]);

  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <div className="mb-2 flex items-center justify-between text-sm">
        <strong>{DOC_LABEL[type]}</strong>
        {info?.uploaded ? <span className="text-gray-500 dark:text-gray-400">enviado em {dateTime(info.uploadedAt)}</span> : <span className="text-red-600">não enviado</span>}
      </div>
      {error && <Alert>{error}</Alert>}
      {doc &&
        (doc.mime === 'application/pdf' ? (
          <iframe title={DOC_LABEL[type]} src={doc.url} className="h-72 w-full rounded" />
        ) : (
          <a href={doc.url} target="_blank" rel="noreferrer">
            <img src={doc.url} alt={DOC_LABEL[type]} className="max-h-72 w-full rounded object-contain" />
          </a>
        ))}
      {doc && (
        <a className="mt-2 inline-block text-sm underline" href={doc.url} target="_blank" rel="noreferrer">
          Abrir em tela cheia
        </a>
      )}
    </div>
  );
}

export default function DriverDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const { data, isLoading, error } = useQuery({ queryKey: ['driver', id], queryFn: () => api.get(`/admin/drivers/${id}`) });

  const action = useMutation({
    mutationFn: ({ name, body }) => api.post(`/admin/drivers/${id}/${name}`, body),
    onSuccess: (result) => {
      queryClient.setQueryData(['driver', id], (old) => ({ ...old, driver: result.driver }));
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setRejecting(false);
      setReason('');
      setMessage('');
    },
    onError: (e) => setMessage(errorText(e)),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Alert>{error.message}</Alert>;

  const { driver, complete } = data;
  const run = (name, body) => {
    setMessage('');
    action.mutate({ name, body });
  };

  return (
    <div className="space-y-4">
      <Link to="/motoristas" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"><ArrowLeft size={14} />Motoristas</Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar src={driver.avatarUrl} name={driver.name} size={56} />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{driver.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{driver.email} · {driver.phone}</p>
        </div>
        <StatusBadge map={DRIVER_STATUS} value={driver.status} />
      </div>

      {message && <Alert>{message}</Alert>}
      {driver.status === 'rejected' && driver.rejectionReason && <Alert tone="amber">Motivo da reprovação: {driver.rejectionReason}</Alert>}
      {driver.status === 'pending_approval' && !complete && <Alert tone="amber">Cadastro incompleto: faltam veículo ou documentos.</Alert>}

      <Card title="Decisão">
        <div className="flex flex-wrap gap-2">
          <Link to={`/corridas?motorista=${driver.id}`}>
            <Button variant="ghost" icon={Route}>Ver corridas</Button>
          </Link>
          {['pending_approval', 'rejected'].includes(driver.status) && (
            <Button variant="success" icon={Check} disabled={action.isPending || !complete} onClick={() => run('approve')}>
              Aprovar motorista
            </Button>
          )}
          {['pending_approval', 'approved'].includes(driver.status) && (
            <Button variant="secondary" icon={X} disabled={action.isPending} onClick={() => setRejecting(true)}>
              Reprovar
            </Button>
          )}
          {driver.status !== 'blocked' ? (
            <Button variant="danger" icon={Ban} disabled={action.isPending} onClick={() => confirm('Bloquear este motorista? Ele será desconectado.') && run('block')}>
              Bloquear
            </Button>
          ) : (
            <Button variant="secondary" icon={LockOpen} disabled={action.isPending} onClick={() => run('unblock')}>
              Desbloquear
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Dados">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Veículo</dt>
            <dd>{driver.vehicle?.type ? `${VEHICLE[driver.vehicle.type]} · ` : ''}{vehicleText(driver.vehicle)}</dd>
            <dt className="text-gray-500">Avaliação</dt>
            <dd>{driver.ratingCount ? `${driver.ratingAvg?.toFixed(2)} (${driver.ratingCount})` : 'sem avaliações'}</dd>
            <dt className="text-gray-500">Cadastro</dt>
            <dd>{dateTime(driver.createdAt)}</dd>
            <dt className="text-gray-500">E-mail verificado</dt>
            <dd>{driver.emailVerified ? 'sim' : 'não'}</dd>
            {driver.approvedAt && (
              <>
                <dt className="text-gray-500">Aprovado em</dt>
                <dd>{dateTime(driver.approvedAt)}</dd>
              </>
            )}
          </dl>
        </Card>
        <Card title="Foto de perfil">
          {driver.avatarUrl ? <img src={driver.avatarUrl} alt="" className="max-h-64 rounded-lg" /> : <p className="text-sm text-gray-500">Sem foto.</p>}
        </Card>
      </div>

      <Card title="Documentos">
        <div className="grid gap-4 md:grid-cols-3">
          {['cnh', 'selfie', 'crlv'].map((type) => (
            <DocumentView key={type} driverId={driver.id} type={type} info={driver.documents?.[type]} />
          ))}
        </div>
      </Card>

      {rejecting && (
        <Modal title="Reprovar motorista" onClose={() => setRejecting(false)}>
          <div className="space-y-3">
            <Field label="Motivo (o motorista verá)" hint="Mínimo de 3 caracteres.">
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRejecting(false)}>Cancelar</Button>
              <Button variant="danger" disabled={reason.trim().length < 3 || action.isPending} onClick={() => run('reject', { reason: reason.trim() })}>
                Reprovar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
