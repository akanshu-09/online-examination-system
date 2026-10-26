import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, HelpCircle } from 'lucide-react';
import { getExam } from '../../api/exams';
import { getErrorMessage } from '../../utils/helpers';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';

export default function ExamDetails() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setExam(await getExam(examId));
    } catch (err) {
      setError(getErrorMessage(err, 'Exam not found.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [examId]);

  if (loading) return <Loader label="Loading exam…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!exam) return null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <span className="page-eyebrow">Exam details</span>
        <h1 className="page-title">{exam.title}</h1>
      </div>

      <div className="card card-pad">
        {exam.description && <p style={{ color: 'var(--color-ink-muted)', lineHeight: 1.6, marginBottom: 18 }}>{exam.description}</p>}

        <div className="exam-meta" style={{ marginBottom: 22, fontSize: 14 }}>
          {exam.duration != null && <span><Clock size={15} /> {exam.duration} minutes</span>}
          {exam.questions_count != null && <span><HelpCircle size={15} /> {exam.questions_count} questions</span>}
        </div>

        <button
          className="btn-secondary" style={{ fontSize: 15, padding: '12px 20px' }}
          onClick={() => navigate(`/student/exams/${examId}/instructions`, { state: { exam } })}
        >
          Start Examination
        </button>
      </div>
    </div>
  );
}
