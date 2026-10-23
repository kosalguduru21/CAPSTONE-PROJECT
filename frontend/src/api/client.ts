// API client for Apartment Maintenance Operations

let csrfToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('app_csrf_token') : null;
let sessionId: string | null = typeof window !== 'undefined' ? localStorage.getItem('app_session_id') : null;

export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
  if (token) {
    localStorage.setItem('app_csrf_token', token);
  } else {
    localStorage.removeItem('app_csrf_token');
  }
};

export const getCsrfToken = () => csrfToken;

export const setSessionId = (token: string | null) => {
  sessionId = token;
  if (token) {
    localStorage.setItem('app_session_id', token);
  } else {
    localStorage.removeItem('app_session_id');
  }
};

export const getSessionId = () => sessionId;

function normalizeItem(item: any): any {
  if (!item || typeof item !== 'object') return item;
  const res = { ...item };
  if (res._id && !res.id) res.id = res._id;
  if (res.reference && !res.orderNumber) res.orderNumber = res.reference;
  if (res.orderNumber && !res.reference) res.reference = res.orderNumber;
  if (res.name && !res.fullName) res.fullName = res.name;
  if (res.fullName && !res.name) res.name = res.fullName;
  return res;
}

function normalizePayload(data: any): any {
  if (!data) return data;

  let target = data;
  if (typeof data === 'object' && data.success !== undefined && data.data !== undefined) {
    target = data.data;
  }

  if (Array.isArray(target)) {
    return target.map(normalizeItem);
  }

  if (target && typeof target === 'object') {
    if (Array.isArray(target.workOrders)) {
      return target.workOrders.map(normalizeItem);
    }
    if (target.workOrder) {
      return normalizeItem(target.workOrder);
    }
    if (Array.isArray(target.vendors)) {
      return target.vendors.map(normalizeItem);
    }
    if (Array.isArray(target.documents)) {
      return target.documents.map(normalizeItem);
    }
    if (Array.isArray(target.notices)) {
      return target.notices.map(normalizeItem);
    }
    if (Array.isArray(target.relatedCases)) {
      return target.relatedCases.map((rc: any) => ({
        ...rc,
        workOrder: normalizeItem(rc.workOrder),
      }));
    }
  }

  return normalizeItem(target);
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, body, ...customConfig } = options;

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: Record<string, string> = {};

  if (csrfToken) {
    defaultHeaders['x-csrf-token'] = csrfToken;
  }

  if (sessionId) {
    defaultHeaders['x-session-id'] = sessionId;
    defaultHeaders['Authorization'] = `Bearer ${sessionId}`;
  }

  // Only set Content-Type to application/json if body is not FormData
  if (!(body instanceof FormData) && body !== undefined) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...(headers as Record<string, string>),
    },
    credentials: 'include', // essential for cookie-based server sessions
    body: body instanceof FormData ? body : (typeof body === 'object' ? JSON.stringify(body) : body),
  };

  const response = await fetch(url, config);

  // Parse response
  let rawData: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    rawData = await response.json();
  } else {
    rawData = await response.text();
  }

  if (!response.ok) {
    const errorMessage = rawData?.error || rawData?.message || `Request failed with status ${response.status}`;
    const error: any = new Error(errorMessage);
    error.status = response.status;
    error.data = rawData;
    throw error;
  }

  // Update session and CSRF tokens if returned in rawData or headers
  const newCsrf = rawData?.data?.csrfToken || rawData?.csrfToken;
  if (newCsrf) {
    setCsrfToken(newCsrf);
  }

  const newSessionId = rawData?.data?.sessionId || rawData?.sessionId;
  if (newSessionId) {
    setSessionId(newSessionId);
  }

  return normalizePayload(rawData);
}

export const api = {
  get: <T = any>(url: string, options?: RequestOptions) => apiRequest<T>(url, { ...options, method: 'GET' }),
  post: <T = any>(url: string, body?: any, options?: RequestOptions) => apiRequest<T>(url, { ...options, method: 'POST', body }),
  put: <T = any>(url: string, body?: any, options?: RequestOptions) => apiRequest<T>(url, { ...options, method: 'PUT', body }),
  patch: <T = any>(url: string, body?: any, options?: RequestOptions) => apiRequest<T>(url, { ...options, method: 'PATCH', body }),
  delete: <T = any>(url: string, options?: RequestOptions) => apiRequest<T>(url, { ...options, method: 'DELETE' }),
  
  // File upload helper
  upload: <T = any>(url: string, formData: FormData, options?: RequestOptions) => 
    apiRequest<T>(url, { ...options, method: 'POST', body: formData }),
};
