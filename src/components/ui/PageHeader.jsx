function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export default PageHeader;
