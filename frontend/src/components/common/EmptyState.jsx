export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="state-block state-empty">
      {Icon && <Icon size={26} strokeWidth={1.75} />}
      <p className="state-empty-title">{title}</p>
      {description && <p className="state-empty-desc">{description}</p>}
      {action}
    </div>
  );
}
