export function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon__badge">Coming soon</div>
      <h2>{title}</h2>
      {note ? <p>{note}</p> : null}
    </div>
  );
}
