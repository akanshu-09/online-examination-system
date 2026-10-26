import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { getExams } from '../../api/exams';
import { getErrorMessage } from '../../utils/helpers';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

export default function AdminExams() {
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
      <div className="page-header flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Exams</h1>
          <p className="page-desc">All exams currently in the system.</p>
        </div>
        <Link to="/admin/exams/create" className="btn-secondary" style={{ fontSize: 15, padding: '5px 20px' }}>
          <Plus size={16} /> Create Exam
        </Link>
      </div>

      {loading && <Loader label="Loading exams…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (!exams || exams.length === 0) && (
        <EmptyState
          icon={FileText}
          title="No exams yet"
          description="Create your first exam to get started."
          action={<Link to="/admin/exams/create" className="btn-secondary" style={{ fontSize: 15, padding: '5px 20px' }}>Create Exam</Link>}
        />
      )}

      {!loading && !error && exams && exams.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Exam Name</th>
                  <th>Duration</th>
                  <th>Questions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id}>
                    <td className="text-muted">{exam.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{exam.title}</div>
                      {exam.description && (
                        <div style={{ fontSize: 12.5, color: 'var(--color-ink-muted)', marginTop: 2 }}>
                          {exam.description}
                        </div>
                      )}
                    </td>
                    <td>{exam.duration != null ? `${exam.duration} min` : '—'}</td>
                    <td>{exam.questions_count ?? '—'}</td>
                    <td>
                      <Link to={`/admin/questions/create?exam_id=${exam.id}`} className="btn btn-secondary btn-sm">
                        Add Questions
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
