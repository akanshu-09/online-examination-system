import { AlertTriangle, RotateCw } from 'lucide-react';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="state-block state-error">
      <AlertTriangle size={22} strokeWidth={2} />
      <p>{message || 'Something went wrong. Please try again.'}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RotateCw size={15} /> Try again
        </button>
      )}
    </div>
  );
}
