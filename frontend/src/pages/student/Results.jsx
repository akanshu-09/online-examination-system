import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowRight, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserResults } from '../../api/results';
import { getErrorMessage, formatDate, formatPercentage } from '../../utils/helpers';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

export default function Results() {
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setResults(await getUserResults(user.id));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your results.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">History</span>
        <h1 className="page-title">Previous Results</h1>
        <p className="page-desc">All of your completed exam attempts.</p>
      </div>

      {loading && <Loader label="Loading results…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (!results || results.length === 0) && (
        <EmptyState
          icon={Trophy}
          title="No results yet"
          description="Complete an exam and your results will show up here."
          action={<Link to="/student/exams" className="btn-secondary" style={{ fontSize: 15, padding: '10px 20px' }} >Browse exams</Link>}
        />
      )}

      {!loading && !error && results && results.length > 0 && (
        <div className="card">
          <div className="card-list">
            {results.map((r) => (
              <Link key={r.attempt_id} to={`/student/results/${r.attempt_id}`} className="card-list-item" style={{ textDecoration: 'none' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--color-ink)' }}>{r.exam_title}</p>
                  <p style={{ fontSize: 12.5, color: 'var(--color-ink-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={12} /> {formatDate(r.submitted_at)}
                  </p>
                </div>
                <div className="flex items-center gap-12">
                  <span className="badge badge-primary">
                    {r.score}/{r.total_questions} · {formatPercentage(r.percentage)}
                  </span>
                  <ArrowRight size={16} style={{ color: 'var(--color-ink-faint)' }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
