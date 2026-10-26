import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { getAttemptResult } from '../../api/results';
import { getErrorMessage, formatDateTime } from '../../utils/helpers';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import ScoreRing from '../../components/common/ScoreRing';

export default function ResultDetail() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setResult(await getAttemptResult(attemptId));
    } catch (err) {
      setError(getErrorMessage(err, 'Result not found.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [attemptId]);

  if (loading) return <Loader label="Loading result…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!result) return null;
  const terminated = Boolean(result.terminated);

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="card">
        <div className="result-hero">
          <span className="result-badge"><CheckCircle2 size={13} style={{ marginRight: 4, verticalAlign: -2 }} /> {terminated ? 'Exam terminated' : 'Exam completed'}</span>
          <h1 className="result-exam-title">{result.exam_title || 'Exam Result'}</h1>

          {terminated && (
            <p className="form-error" style={{ marginBottom: 20 }}>
              {result.termination_reason || 'Exam terminated due to excessive tab switching.'}
            </p>
          )}

          <ScoreRing percentage={result.percentage} />

          <p className="result-fraction">{result.score} / {result.total_questions} correct</p>

          <div className="result-stats">
            <div className="result-stat">
              <div className="result-stat-value">{result.score}</div>
              <div className="result-stat-label">Correct Answers</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-value">{result.total_questions}</div>
              <div className="result-stat-label">Total Questions</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-value" style={{ fontSize: 15 }}>{formatDateTime(result.submitted_at)}</div>
              <div className="result-stat-label">Submitted</div>
            </div>
          </div>

          <div className="result-actions">
            <button className="btn-secondary" style={{ fontSize: 15, padding: '12px 20px' }} onClick={() => navigate('/student')}>Back to Dashboard</button>
            <Link to="/student/results" className="btn-secondary" style={{ fontSize: 15, padding: '12px 20px' }}>View All Results</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
