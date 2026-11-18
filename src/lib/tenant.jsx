import { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api.js';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const query = useQuery({ queryKey: ['tenant'], queryFn: () => api.get('/tenant/public'), retry: false, staleTime: Infinity });
  const tenant = query.data?.tenant;

  useEffect(() => {
    if (!tenant) return;
    document.title = `${tenant.brand.displayName} · Painel`;
  }, [tenant]);

  return <TenantContext.Provider value={{ tenant, loading: query.isLoading, error: query.error }}>{children}</TenantContext.Provider>;
}

export const useTenant = () => useContext(TenantContext);
