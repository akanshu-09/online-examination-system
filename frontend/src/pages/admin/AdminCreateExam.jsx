import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { createExam } from '../../api/admin';
import { getErrorMessage } from '../../utils/helpers';
import { useToast } from '../../components/common/Toast';

export default function AdminCreateExam() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createExam({
        title: title.trim(),
        description: description.trim(),
        duration: Number(duration),
      });
      showToast('Exam created successfully.');
      setTitle('');
      setDescription('');
      setDuration('');
      navigate('/admin/exams');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the exam.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="page-header">
        <h1 className="page-title">Create Exam</h1>
        <p className="page-desc">Set up a new exam. You can add questions to it afterward.</p>
      </div>

      <div className="card card-pad">
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="title">Exam title</label>
            <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Operating Systems" />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Brief description of what this exam covers" />
          </div>
          <div className="field">
            <label htmlFor="duration">Duration (minutes)</label>
            <input id="duration" type="number" min="1" className="input" value={duration} onChange={(e) => setDuration(e.target.value)} required placeholder="30" />
          </div>
          <button type="submit" className=" btn-secondary" style={{ fontSize: 15, padding: '5px 20px' }} disabled={loading}>
            {loading && <Loader2 size={16} className="spin-icon" />}
            {loading ? 'Creating…' : 'Create Exam'}
          </button>
        </form>
      </div>
    </div>
  );
}
