import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Trophy, Clock, HelpCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getExams } from '../../api/exams';
import { getUserResults } from '../../api/results';
import { getErrorMessage, formatPercentage, formatDate } from '../../utils/helpers';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

export default function Dashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [examsData, resultsData] = await Promise.all([
        getExams(),
        getUserResults(user.id),
      ]);
      setExams(examsData);
      setResults(resultsData);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your dashboard.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    
  }, []);

  if (loading) return <Loader label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const recentResults = (results || []).slice(0, 3);
  const avgPct = results?.length
    ? results.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / results.length
    : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title dashboard-title">Dashboard</h1>
      </div>

      <div className="stat-bar">
        <div className="stat-bar-item">
          <div className="stat-bar-value">{exams?.length ?? 0}</div>
          <div className="stat-bar-label">Available exams</div>
        </div>
        <div className="stat-bar-item">
          <div className="stat-bar-value">{results?.length ?? 0}</div>
          <div className="stat-bar-label">Exams completed</div>
        </div>
        <div className="stat-bar-item">
          <div className="stat-bar-value">{avgPct !== null ? formatPercentage(avgPct) : '—'}</div>
          <div className="stat-bar-label">Average score</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
            <h2 className="section-title">Available Exams</h2>
            <Link to="/student/exams" className="btn btn-ghost btn-sm">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <p className="section-sub">Pick up where you left off or start something new.</p>

          {!exams || exams.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No exams available yet"
              description="Check back later — your instructor hasn't published any exams."
            />
          ) : (
            <div className="dashboard-exams-list flex-col gap-12">
              {exams.slice(0, 3).map((exam) => (
                <Link key={exam.id} to={`/student/exams/${exam.id}`} className="exam-card card" style={{ textDecoration: 'none' }}>
                  <div className="exam-card-title">{exam.title}</div>
                  {exam.description && <div className="exam-card-desc">{exam.description}</div>}
                  <div className="exam-meta">
                    {exam.duration != null && (
                      <span><Clock size={13} /> {exam.duration} min</span>
                    )}
                    {exam.questions_count != null && (
                      <span><HelpCircle size={13} /> {exam.questions_count} questions</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <h2 className="section-title">Recent Results</h2>
          <p className="section-sub">Your latest completed attempts.</p>

          {recentResults.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No results yet"
              description="Complete an exam to see your score here."
            />
          ) : (
            <div className="flex-col gap-12">
              {recentResults.map((r) => (
                <Link
                  key={r.attempt_id}
                  to={`/student/results/${r.attempt_id}`}
                  className="card card-list-item"
                  style={{ textDecoration: 'none' }}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)' }}>{r.exam_title}</p>
                    <p style={{ fontSize: 12.5, color: 'var(--color-ink-muted)', marginTop: 2 }}>
                      {formatDate(r.submitted_at)}
                    </p>
                  </div>
                  <span className="badge badge-primary">
                    {r.score}/{r.total_questions} · {formatPercentage(r.percentage)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
