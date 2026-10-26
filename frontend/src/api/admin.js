import api from './axios';

export async function createExam(payload) {
  const { data } = await api.post('/admin/exams', payload);
  return data;
}

export async function addQuestion(payload) {
  const { data } = await api.post('/admin/questions', payload);
  return data;
}

export async function getAdminResults() {
  const { data } = await api.get('/admin/results');
  return data;
}
