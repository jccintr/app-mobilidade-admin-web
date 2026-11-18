const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3333').replace(/\/$/, '');

function tenantFromHost() {
  const parts = window.location.hostname.split('.');
  return parts.length >= 3 ? parts[0] : null;
}

export const TENANT = import.meta.env.VITE_TENANT || tenantFromHost() || 'demo';
export { API_URL };

const TOKEN_KEY = 'admin_token';
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (token) => {
  try {
    token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sem armazenamento: a sessão vale só até recarregar */
  }
};

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path, query) {
  const url = new URL(API_URL + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  return url;
}

async function request(path, { method = 'GET', body, query, as = 'json', form } = {}) {
  const headers = { 'X-Tenant': TENANT };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !form) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Não foi possível falar com a API. Ela está no ar?');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = data.error ?? {};
    if (response.status === 401 && token) window.dispatchEvent(new Event('auth:expired'));
    throw new ApiError(response.status, error.code ?? 'ERROR', error.message ?? 'Erro inesperado.', error.details);
  }
  if (as === 'blob') return response.blob();
  return response.status === 204 ? null : response.json();
}

export const api = {
  get: (path, query) => request(path, { query }),
  post: (path, body = {}) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (path, form) => request(path, { method: 'PUT', form }),
  blob: (path, query) => request(path, { query, as: 'blob' }),
};

/**
 * Documento privado: o servidor devolve o arquivo (disco) ou um link temporário (Cloudinary, com ?link=1).
 * Retorna { url, mime } pronto para <img>/<iframe>.
 */
export async function fetchDocument(path) {
  const headers = { 'X-Tenant': TENANT, Authorization: `Bearer ${getToken()}` };
  const response = await fetch(buildUrl(path, { link: 1 }), { headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, data.error?.code ?? 'ERROR', data.error?.message ?? 'Não foi possível abrir o documento.');
  }
  const type = response.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const data = await response.json();
    return { url: data.url, mime: /\.pdf($|\?)/i.test(data.url) ? 'application/pdf' : 'image/*' };
  }
  const blob = await response.blob();
  return { url: URL.createObjectURL(blob), mime: blob.type };
}

/** Mensagem amigável a partir de um erro da API (inclui os detalhes de validação). */
export function errorText(error) {
  if (!error) return '';
  const details = Array.isArray(error.details) ? error.details.map((d) => `${d.path}: ${d.message}`).join(' · ') : '';
  return details ? `${error.message} ${details}` : error.message;
}
