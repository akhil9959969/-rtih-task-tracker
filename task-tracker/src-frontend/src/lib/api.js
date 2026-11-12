/**
 * Thin API client. Every request goes to the PHP backend on the same
 * origin. Mutations attach the per-session CSRF token (fetched from
 * /api/csrf.php before login, refreshed by every API response);
 * the session cookie itself is HttpOnly and never touched by JS.
 */

const BASE = '/task-tracker/api';

let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

// Login and registration also require the token (pre-auth CSRF protection),
// so fetch it from the session first. After logout the old token is invalid,
// so a 403 means "fetch a fresh token and retry once".
async function ensureCsrf(force = false) {
  if (force || !csrfToken) {
    const data = await request('/csrf.php');
    csrfToken = data.csrf_token;
  }
}

async function withCsrf(path, body) {
  await ensureCsrf();
  try {
    return await request(path, { method: 'POST', body });
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      await ensureCsrf(true);
      return request(path, { method: 'POST', body });
    }
    throw e;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Network problem. Check that Apache is running and try again.', 0);
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    throw new ApiError('The server returned an unexpected response.', res.status);
  }
  if (!res.ok) {
    throw new ApiError(data.error || 'Something went wrong. Please try again.', res.status, data.errors);
  }
  if (data.csrf_token) csrfToken = data.csrf_token;
  return data;
}

export class ApiError extends Error {
  constructor(message, status, fieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors || null;
  }
}

export const api = {
  me: () => request('/me.php'),
  register: (name, email, password) => withCsrf('/register.php', { name, email, password }),
  login: (email, password) => withCsrf('/login.php', { email, password }),
  logout: async () => {
    const r = await request('/logout.php', { method: 'POST' });
    csrfToken = null; // the session is gone; the next login fetches a fresh token
    return r;
  },
  tasks: (search, status) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const q = params.toString();
    return request(`/tasks.php${q ? `?${q}` : ''}`);
  },
  createTask: (task) => request('/tasks.php', { method: 'POST', body: task }),
  updateTask: (id, task) => request(`/tasks.php?id=${encodeURIComponent(id)}`, { method: 'PUT', body: task }),
  deleteTask: (id) => request(`/tasks.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
