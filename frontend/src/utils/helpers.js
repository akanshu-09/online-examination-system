// Avoid exposing raw server errors to users.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  if (error.code === 'ERR_NETWORK' || !error.response) {
    return 'Could not reach the server. Make sure the backend is running at http://127.0.0.1:8000.';
  }

  const { status, data } = error.response;
  const detail = typeof data?.detail === 'string' ? data.detail : null;

  switch (status) {
    case 400:
      return detail || 'This action has already been completed.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 404:
      return detail || 'The requested item could not be found.';
    case 422:
      return 'Please check the information you entered.';
    case 500:
      return 'Something went wrong on the server. Please try again.';
    default:
      return detail || fallback;
  }
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPercentage(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(2)}%`;
}

export function formatSeconds(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function optionKey(letter) {
  return `option_${letter.toLowerCase()}`;
}
