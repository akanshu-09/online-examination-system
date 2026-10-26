import api from './axios';

export async function getExams() {
  const { data } = await api.get('/exams');
  return data;
}

export async function getExam(examId) {
  const { data } = await api.get(`/exams/${examId}`);
  return data;
}

// NOTE: even if the backend includes correct_option in this payload,
// the UI must never read or render it for students. See ExamInterface.jsx.
export async function getExamQuestions(examId) {
  const { data } = await api.get(`/exams/${examId}/questions`);
  return data;
}
