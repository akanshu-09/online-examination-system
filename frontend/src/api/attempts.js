import api from './axios';

export async function startAttempt(userId, examId) {
  const { data } = await api.post('/attempts', {
    user_id: userId,
    exam_id: examId,
  });
  return data;
}

// Backend has UPDATE behavior: re-posting the same question_id overwrites
// the previous selection, so it's safe to call this on every selection.
export async function saveAnswer(attemptId, questionId, selectedOption) {
  const { data } = await api.post(`/attempts/${attemptId}/answers`, {
    question_id: questionId,
    selected_option: selectedOption,
  });
  return data;
}

export async function updateAnswerReview(attemptId, questionId, markedForReview) {
  const { data } = await api.patch(`/attempts/${attemptId}/answers/${questionId}/review`, {
    marked_for_review: markedForReview,
  });
  return data;
}

export async function recordTabSwitch(attemptId, tabSwitchCount, terminated = false) {
  const { data } = await api.post(`/attempts/${attemptId}/tab-switch`, {
    tab_switch_count: tabSwitchCount,
    terminated,
    termination_reason: terminated ? 'Excessive tab switching' : null,
  });
  return data;
}

// Can only be called once; a second call returns 400 which callers
// should handle gracefully (see utils/helpers.js getErrorMessage).
export async function submitAttempt(attemptId) {
  const { data } = await api.post(`/attempts/${attemptId}/submit`);
  return data;
}
