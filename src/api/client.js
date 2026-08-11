// API client for the Sales Manager backend.
// Shares the same MongoDB as the Coordinator CRM, so leads/quotations/etc. appear in both apps.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach server. Is the Manager backend running on :5001?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// Convenience helpers per collection
const resource = (name) => ({
  list: () => api(`/${name}`),
  create: (body) => api(`/${name}`, { method: 'POST', body }),
  bulk: (arr) => api(`/${name}/bulk`, { method: 'POST', body: arr }),
  update: (id, body) => api(`/${name}/${id}`, { method: 'PUT', body }),
  remove: (id) => api(`/${name}/${id}`, { method: 'DELETE' }),
});

export const leadsApi = resource('leads');
export const quotationsApi = resource('quotations');
export const appointmentsApi = resource('appointments');
export const projectsApi = resource('projects');
export const paymentsApi = resource('payments');
export const pipelineApi = resource('pipeline');
export const measurementsApi = resource('measurements');
export const designsApi = resource('designs');
export const negotiationsApi = resource('negotiations');
export const ordersApi = resource('orders');
export const teamApi = resource('team');

export { API_BASE };
