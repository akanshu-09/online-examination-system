import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, HelpCircle, ArrowRight } from 'lucide-react';
import { getExams } from '../../api/exams';
import { getErrorMessage } from '../../utils/helpers';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

export default function ExamsList() {
  const [exams, setExams] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setExams(await getExams());
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load exams.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">Exams</span>
        <h1 className="page-title">Available Exams</h1>
        <p className="page-desc">Choose an exam to view details and begin.</p>
      </div>

      {loading && <Loader label="Loading exams…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (!exams || exams.length === 0) && (
        <EmptyState
          icon={ClipboardList}
          title="No exams available"
          description="There are no exams published right now. Check back soon."
        />
      )}

      {!loading && !error && exams && exams.length > 0 && (
        <div className="exam-grid">
          {exams.map((exam) => (
          <Link key={exam.id} to={`/student/exams/${exam.id}`} className="exam-card card" style={{ textDecoration: 'none' }}>
              <div className="exam-card-title">{exam.title}</div>
              {exam.description && <div className="exam-card-desc">{exam.description}</div>}
              <div className="exam-meta">
                {exam.duration != null && <span><Clock size={13} /> {exam.duration} min</span>}
                {exam.questions_count != null && <span><HelpCircle size={13} /> {exam.questions_count} questions</span>}
              </div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>
                View details <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
