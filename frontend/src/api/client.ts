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
  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
    const error: any = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  // Update session and CSRF tokens if returned in data or headers
  const newCsrf = data?.data?.csrfToken || data?.csrfToken;
  if (newCsrf) {
    setCsrfToken(newCsrf);
  }

  const newSessionId = data?.data?.sessionId || data?.sessionId;
  if (newSessionId) {
    setSessionId(newSessionId);
  }

  return data;
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
