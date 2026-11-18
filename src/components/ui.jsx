import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Inbox, Loader2, X } from 'lucide-react';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/** Cabeçalho de página: título, apoio opcional e ações à direita. */
export function PageHeader({ title, description, actions, back }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {back}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className, flush }) {
  return (
    <section className={cx('rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] dark:border-gray-800 dark:bg-gray-900 dark:shadow-none', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-3.5 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
      )}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

const variants = {
  primary: 'bg-brand text-brand-fg hover:brightness-110 active:brightness-95',
  secondary:
    'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  ghost: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
};

export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      {...props}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-sm',
        variants[variant],
        className,
      )}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : Icon ? <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={cx('inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800', className)}
    >
      {children}
    </button>
  );
}

const tones = {
  gray: ['bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', 'bg-gray-400'],
  green: ['bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', 'bg-emerald-500'],
  amber: ['bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', 'bg-amber-500'],
  red: ['bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300', 'bg-red-500'],
  blue: ['bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300', 'bg-blue-500'],
};

/** Estado = ponto colorido + texto (a cor nunca é o único sinal). */
export function Badge({ tone = 'gray', children }) {
  const [box, dot] = tones[tone] ?? tones.gray;
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', box)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', dot)} />
      {children}
    </span>
  );
}

export function StatusBadge({ map, value }) {
  const item = map[value] ?? { label: value, tone: 'gray' };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition ' +
  'focus:border-gray-900 focus:ring-2 focus:ring-gray-900/15 ' +
  'dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-gray-300 dark:focus:ring-gray-300/25';

export function Field({ label, hint, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
    </label>
  );
}

export const Input = ({ className, ...props }) => <input {...props} className={cx(inputClass, 'h-9', className)} />;
/** Campo de senha com botão para mostrar/ocultar o que foi digitado. */
export function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Ocultar senha' : 'Mostrar senha';
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={cx(inputClass, 'h-9 pr-10', className)} />
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export const Select = ({ className, ...props }) => <select {...props} className={cx(inputClass, 'h-9 pr-8', className)} />;
export const Textarea = ({ className, ...props }) => <textarea {...props} className={cx(inputClass, className)} />;

export function Alert({ tone = 'red', children }) {
  if (!children) return null;
  const [box] = tones[tone] ?? tones.red;
  return <div role="alert" className={cx('rounded-lg px-3.5 py-2.5 text-sm', box)}>{children}</div>;
}

export function Spinner({ label = 'Carregando...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500 dark:text-gray-400">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  );
}

export function Empty({ children, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-sm text-gray-500 dark:text-gray-400">
      <Icon size={22} strokeWidth={1.5} />
      <p>{children}</p>
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)] dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {Icon && (
          <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg', tone === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300')}>
            <Icon size={16} strokeWidth={1.9} />
          </span>
        )}
      </div>
      <p className="num mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('max-h-[90vh] w-full overflow-auto rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900', wide ? 'max-w-3xl' : 'max-w-md')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <IconButton label="Fechar" onClick={onClose} className="-mr-2">
            <X size={16} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-100 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-400">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 [&>tr]:transition-colors [&>tr:hover]:bg-gray-50 dark:[&>tr:hover]:bg-gray-800/40">{children}</tbody>
      </table>
    </div>
  );
}

export const Td = ({ className, ...props }) => <td {...props} className={cx('px-4 py-3', className)} />;

export function Pager({ data, onPage }) {
  if (!data || data.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
      <span className="num text-gray-500 dark:text-gray-400">
        Página {data.page} de {data.totalPages} · {data.total} registros
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>
          Anterior
        </Button>
        <Button variant="secondary" size="sm" disabled={data.page >= data.totalPages} onClick={() => onPage(data.page + 1)}>
          Próxima
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

export function Avatar({ src, name, size = 36 }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
  return src ? (
    <img src={src} alt="" style={style} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span style={style} className="inline-flex shrink-0 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
      {(name ?? '?').slice(0, 1).toUpperCase()}
    </span>
  );
}
