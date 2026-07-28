import { useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { initialBenefits } from "../data/players";

function BenefitTracker() {
  const [rows, setRows] = useState(initialBenefits);
  function change(id, field, amount) { setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: Math.max(0, row[field] + amount) } : row)); }
  const leader = useMemo(() => [...rows].sort((a,b) => (b.attendance + b.votes + b.bonus) - (a.attendance + a.votes + a.bonus))[0], [rows]);
  return <div className="page-stack"><PageHeader eyebrow="Benefit system" title="Benefit Tracker" description="Aktivitás, szavazási részvétel és közösségi bónuszpontok kezelése." /><section className="stat-grid compact"><StatCardInline label="Aktuális vezető" value={leader.player} /><StatCardInline label="Összpontszám" value={leader.attendance + leader.votes + leader.bonus} /><StatCardInline label="Követett játékosok" value={rows.length} /></section><section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Játékos</th><th>Jelenlét</th><th>Szavazás</th><th>Bónusz</th><th>Összesen</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.player}</strong></td>{["attendance","votes","bonus"].map((field) => <td key={field}><div className="stepper"><button onClick={() => change(row.id, field, -1)}>−</button><span>{row[field]}</span><button onClick={() => change(row.id, field, 1)}>+</button></div></td>)}<td><strong className="total-score">{row.attendance + row.votes + row.bonus}</strong></td></tr>)}</tbody></table></div></section></div>;
}
function StatCardInline({ label, value }) { return <article className="panel mini-stat"><span>{label}</span><strong>{value}</strong></article>; }
export default BenefitTracker;
