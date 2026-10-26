export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="loader">
      <span className="loader-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
