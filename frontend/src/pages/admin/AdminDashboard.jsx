import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { getExams } from '../../api/exams';
import { getAdminResults } from '../../api/admin';
import { getErrorMessage, formatDate, formatPercentage } from '../../utils/helpers';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

export default function AdminDashboard() {
  const [exams, setExams] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [examsData, resultsData] = await Promise.all([getExams(), getAdminResults()]);
      setExams(examsData);
      setResults(resultsData);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the dashboard.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <Loader label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;


  const totalAttempts = results?.length ?? 0;
  const uniqueStudents = new Set((results || []).map((r) => r.student_id)).size;
  const avgScore = totalAttempts
    ? results.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / totalAttempts
    : null;
  const recent = (results || []).slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title dashboard-title">Dashboard</h1>
      </div>

      <div className="stat-bar">
        <div className="stat-bar-item">
          <div className="stat-bar-value">{exams?.length ?? 0}</div>
          <div className="stat-bar-label">Total exams</div>
        </div>
        <div className="stat-bar-item">
          <div className="stat-bar-value">{uniqueStudents}</div>
          <div className="stat-bar-label">Students attempted</div>
        </div>
        <div className="stat-bar-item">
          <div className="stat-bar-value">{totalAttempts}</div>
          <div className="stat-bar-label">Total attempts</div>
        </div>
        <div className="stat-bar-item">
          <div className="stat-bar-value">{avgScore !== null ? formatPercentage(avgScore) : '—'}</div>
          <div className="stat-bar-label">Average score</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
          <h2 className="section-title">Recent Results</h2>
          <Link to="/admin/results" className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>
        </div>
        <p className="section-sub">The latest submitted attempts across all exams.</p>

        {recent.length === 0 ? (
          <EmptyState icon={BarChart3} title="No attempts yet" description="Results will appear here once students start submitting exams." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Exam</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.attempt_id}>
                    <td>{r.student_name}</td>
                    <td>{r.exam_title}</td>
                    <td>{r.score}/{r.total_questions}</td>
                    <td>{formatPercentage(r.percentage)}</td>
                    <td>{formatDate(r.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
