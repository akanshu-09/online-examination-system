import { useEffect, useMemo, useState } from 'react';
import { Search, ArrowUpDown, BarChart3 } from 'lucide-react';
import { getAdminResults } from '../../api/admin';
import { getErrorMessage, formatDate, formatPercentage } from '../../utils/helpers';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

const SORT_FIELDS = {
  student: (r) => r.student_name || '',
  exam: (r) => r.exam_title || '',
  score: (r) => Number(r.score) || 0,
  percentage: (r) => Number(r.percentage) || 0,
  submitted: (r) => new Date(r.submitted_at).getTime() || 0,
};

export default function AdminResults() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [sortField, setSortField] = useState('submitted');
  const [sortDir, setSortDir] = useState('desc');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setResults(await getAdminResults());
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load results.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const examOptions = useMemo(() => {
    const titles = new Set((results || []).map((r) => r.exam_title));
    return ['all', ...titles];
  }, [results]);

  const filtered = useMemo(() => {
    if (!results) return [];
    const q = search.trim().toLowerCase();
    let rows = results.filter((r) => {
      const matchesSearch = !q || r.student_name?.toLowerCase().includes(q) || r.exam_title?.toLowerCase().includes(q);
      const matchesExam = examFilter === 'all' || r.exam_title === examFilter;
      return matchesSearch && matchesExam;
    });
    const getter = SORT_FIELDS[sortField];
    rows = [...rows].sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [results, search, examFilter, sortField, sortDir]);

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Student Results</h1>
        <p className="page-desc">Every submitted attempt across all exams.</p>
      </div>

      {loading && <Loader label="Loading results…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (!results || results.length === 0) && (
        <EmptyState icon={BarChart3} title="No results yet" description="Results will appear once students submit exams." />
      )}

      {!loading && !error && results && results.length > 0 && (
        <div className="card card-pad">
          <div className="table-toolbar">
            <div className="search-input-wrap">
              <Search size={15} />
              <input
                className="input"
                placeholder="Search student or exam…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="select" style={{ width: 200 }} value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
              {examOptions.map((title) => (
                <option key={title} value={title}>{title === 'all' ? 'All exams' : title}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="No matching results" description="Try a different search term or filter." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableHeader label="Student" field="student" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                    <SortableHeader label="Exam" field="exam" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                    <SortableHeader label="Score" field="score" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                    <SortableHeader label="Percentage" field="percentage" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                    <SortableHeader label="Submitted At" field="submitted" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
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
      )}
    </div>
  );
}

function SortableHeader({ label, field, sortField, sortDir, onClick }) {
  const active = sortField === field;
  return (
    <th onClick={() => onClick(field)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      <span className="flex items-center gap-8">
        {label}
        <ArrowUpDown size={12} style={{ opacity: active ? 1 : 0.35 }} />
      </span>
    </th>
  );
}
