import api from './axios';

export async function login(credentials) {
  const { data } = await api.post('/login', credentials);
  return data;
}

export async function register(details) {
  const { data } = await api.post('/auth/register', details);
  return data;
}
export async function sendVerificationCode(email) {
  const { data } = await api.post('/auth/send-verification-code', { email });
  return data;
}

export async function verifyEmail(email, code) {
  const { data } = await api.post('/auth/verify-email', { email, code });
  return data;
}
