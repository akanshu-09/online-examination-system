import api from './axios';

export async function getUserResults(userId) {
  const { data } = await api.get(`/results/${userId}`);
  return data;
}

export async function getAttemptResult(attemptId) {
  const { data } = await api.get(`/results/attempt/${attemptId}`);
  return data;
}
