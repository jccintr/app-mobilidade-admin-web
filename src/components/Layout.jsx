import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CarTaxiFront,
  ChevronsLeft,
  ChevronsRight,
  CloudRain,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Monitor,
  Moon,
  Route,
  Settings,
  Users,
  Sun,
  Tag,
  Wallet,
  X,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useTenant } from '../lib/tenant.jsx';
import { useTheme } from '../lib/theme.jsx';
import { Avatar, cx } from './ui.jsx';
import { CreditAlerts, useCreditSummary } from './CreditAlerts.jsx';

const NAV = [
  {
    group: 'Operação',
    items: [
      ['/', 'Início', LayoutDashboard],
      ['/mapa', 'Mapa ao vivo', Map],
      ['/corridas', 'Corridas', Route],
    ],
  },
  {
    group: 'Cadastros',
    items: [
      ['/motoristas', 'Motoristas', CarTaxiFront],
      ['/passageiros', 'Passageiros', Users],
    ],
  },
  {
    group: 'Negócio',
    items: [
      ['/creditos', 'Créditos', Wallet, 'credits'],
      ['/tarifa', 'Tarifa', Tag],
      ['/configuracoes', 'Configurações', Settings],
    ],
  },
];


function ThemeMenu() {
  const { mode, setMode } = useTheme();
  const options = [
    ['light', Sun, 'Claro'],
    ['dark', Moon, 'Escuro'],
    ['auto', Monitor, 'Sistema'],
  ];
  return (
    <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-800" role="radiogroup" aria-label="Tema">
      {options.map(([value, Icon, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          title={label}
          aria-label={label}
          onClick={() => setMode(value)}
          className={cx(
            'flex h-7 w-7 items-center justify-center rounded-md transition',
            mode === value ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100',
          )}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}

function RainSwitch() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['conditions'], queryFn: () => api.get('/admin/conditions') });
  const mutation = useMutation({
    mutationFn: (rain) => api.put('/admin/conditions', { rain }),
    onSuccess: (result) => {
      queryClient.setQueryData(['conditions'], result);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  const rain = Boolean(data?.conditions.rain);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={rain}
      disabled={!data || mutation.isPending}
      onClick={() => mutation.mutate(!rain)}
      title="Liga o adicional de chuva nas novas corridas"
      className={cx(
        'flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition disabled:opacity-60',
        rain
          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/60',
      )}
    >
      <CloudRain size={16} />
      <span className="hidden sm:inline">Chuva</span>
      <span
        className={cx('relative h-4 w-7 rounded-full transition', rain ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700')}
        aria-hidden
      >
        <span className={cx('absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all', rain ? 'left-3.5' : 'left-0.5')} />
      </span>
    </button>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (event) => !ref.current?.contains(event.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} className="rounded-full">
        <Avatar name={user?.name || user?.email} size={32} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 w-60 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

function Brand({ collapsed }) {
  const { tenant } = useTenant();
  const brand = tenant?.brand;
  return (
    <div className={cx('flex h-14 items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-800', collapsed && 'justify-center px-0')}>
      {brand?.logoUrl ? (
        <img src={brand.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-md bg-white/95 object-contain p-0.5" />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-fg">
          {(brand?.displayName ?? '?').slice(0, 1)}
        </span>
      )}
      {!collapsed && <span className="truncate text-sm font-semibold text-white">{brand?.displayName}</span>}
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin_nav') === 'collapsed';
    } catch {
      return false;
    }
  });
  const { pathname } = useLocation();
  const { data: creditSummary } = useCreditSummary();
  const badges = { credits: creditSummary?.informed ?? 0 };

  useEffect(() => setMobileOpen(false), [pathname]);
  const toggleCollapsed = () => {
    setCollapsed((current) => {
      try {
        localStorage.setItem('admin_nav', current ? 'open' : 'collapsed');
      } catch {
        /* ignora */
      }
      return !current;
    });
  };

  const nav = (isCollapsed) => (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Principal">
      {NAV.map(({ group, items }) => (
        <div key={group}>
          {!isCollapsed && <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group}</p>}
          <ul className="space-y-0.5">
            {items.map(([to, label, Icon, badgeKey]) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  title={isCollapsed ? label : undefined}
                  className={({ isActive }) =>
                    cx(
                      'group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors',
                      isCollapsed && 'justify-center px-0',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute -left-3 top-2 h-5 w-[3px] rounded-r bg-brand" aria-hidden />}
                      <Icon size={18} strokeWidth={1.8} className={isActive ? 'text-brand' : ''} />
                      {!isCollapsed && label}
                      {badgeKey && badges[badgeKey] > 0 && (
                        <span
                          className={cx(
                            'num flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-gray-950',
                            isCollapsed ? 'absolute right-1.5 top-1' : 'ml-auto',
                          )}
                          aria-label={`${badges[badgeKey]} aguardando conferência`}
                        >
                          {badges[badgeKey]}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Menu fixo no desktop */}
      <aside
        className={cx(
          // A classe "dark" deixa a sidebar sempre escura (grafite), também no modo claro.
          'dark sticky top-0 hidden h-screen shrink-0 flex-col border-r border-gray-800 bg-gray-900 text-gray-100 transition-[width] lg:flex',
          collapsed ? 'w-[68px]' : 'w-60',
        )}
      >
        <Brand collapsed={collapsed} />
        {nav(collapsed)}
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cx(
            'm-3 flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] text-gray-400 hover:bg-white/5 hover:text-white',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          {!collapsed && 'Recolher'}
        </button>
      </aside>

      {/* Menu em gaveta no celular */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[1600] lg:hidden">
          <div className="absolute inset-0 bg-gray-950/50" onClick={() => setMobileOpen(false)} />
          <aside className="dark absolute inset-y-0 left-0 flex w-64 flex-col bg-gray-900 text-gray-100 shadow-xl">
            <div className="flex items-center justify-between pr-2">
              <div className="flex-1"><Brand /></div>
              <button type="button" className="rounded-lg p-2 text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
                <X size={18} />
              </button>
            </div>
            {nav(false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[1300] flex h-14 items-center gap-3 border-b border-gray-200 bg-white/85 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/85 md:px-6">
          <button type="button" className="-ml-1 rounded-lg p-2 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <RainSwitch />
            <ThemeMenu />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 p-4 md:p-8">
          <Outlet />
        </main>
        <CreditAlerts />
      </div>
    </div>
  );
}
