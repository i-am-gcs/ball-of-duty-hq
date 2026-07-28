function StatCard({ label, value, detail, icon }) {
  return (
    <article className="stat-card panel">
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}
export default StatCard;
