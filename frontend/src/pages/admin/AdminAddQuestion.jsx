import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getExams } from '../../api/exams';
import { addQuestion } from '../../api/admin';
import { getErrorMessage, OPTION_LABELS } from '../../utils/helpers';
import { useToast } from '../../components/common/Toast';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';

const emptyForm = {
  exam_id: '',
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
};

export default function AdminAddQuestion() {
  const [searchParams] = useSearchParams();
  const presetExamId = searchParams.get('exam_id') || '';

  const [exams, setExams] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ ...emptyForm, exam_id: presetExamId });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      setExams(await getExams());
    } catch (err) {
      setLoadError(getErrorMessage(err, 'Could not load exams.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await addQuestion({
        ...form,
        exam_id: Number(form.exam_id),
      });
      showToast('Question added to the exam.');
      setForm((f) => ({ ...emptyForm, exam_id: f.exam_id }));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not add the question.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading exams…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1 className="page-title">Add Questions</h1>
        <p className="page-desc">Add a multiple-choice question to an existing exam.</p>
      </div>

      <div className="card card-pad">
        {(!exams || exams.length === 0) ? (
          <p className="text-muted">Create an exam first before adding questions.</p>
        ) : (
          <>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="exam">Select exam</label>
                <select id="exam" className="select" value={form.exam_id} onChange={(e) => update('exam_id', e.target.value)} required>
                  <option value="" disabled>Choose an exam…</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>{exam.title}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="question_text">Question</label>
                <textarea id="question_text" className="textarea" value={form.question_text} onChange={(e) => update('question_text', e.target.value)} required placeholder="Which SQL command is used to retrieve data?" />
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="option_a">Option A</label>
                  <input id="option_a" className="input" value={form.option_a} onChange={(e) => update('option_a', e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="option_b">Option B</label>
                  <input id="option_b" className="input" value={form.option_b} onChange={(e) => update('option_b', e.target.value)} required />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="option_c">Option C</label>
                  <input id="option_c" className="input" value={form.option_c} onChange={(e) => update('option_c', e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="option_d">Option D</label>
                  <input id="option_d" className="input" value={form.option_d} onChange={(e) => update('option_d', e.target.value)} required />
                </div>
              </div>

              <div className="field">
                <label>Correct answer</label>
                <div className="flex gap-8">
                  {OPTION_LABELS.map((letter) => (
                    <label
                      key={letter}
                      className={`btn btn-sm ${form.correct_option === letter ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        type="radio"
                        name="correct_option"
                        value={letter}
                        checked={form.correct_option === letter}
                        onChange={() => update('correct_option', letter)}
                        style={{ display: 'none' }}
                      />
                      {letter}
                    </label>
                  ))}
                </div>
                <span className="field-hint">Only visible to admins — never shown to students.</span>
              </div>

              <button type="submit" className="btn-secondary" style={{ fontSize: 15, padding: '5px 20px' }} disabled={saving}>
                {saving && <Loader2 size={16} className="spin-icon" />}
                {saving ? 'Adding…' : 'Add Question'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
