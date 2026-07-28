import PageHeader from "../components/ui/PageHeader";
import { players } from "../data/mockData";
function Statistics() {
  const topScorers = [...players].sort((a,b) => b.goals-a.goals).slice(0,5);
  const maxGoals = Math.max(...topScorers.map((player) => player.goals));
  return <div className="page-stack"><PageHeader eyebrow="Performance center" title="Statisztikák" description="A jelenlegi mintadatokból számolt csapat- és játékosmutatók." /><section className="dashboard-grid"><article className="panel dashboard-wide"><div className="panel-heading"><div><p className="eyebrow">Top scorers</p><h3>Góllövőlista</h3></div></div><div className="chart-list">{topScorers.map((player, index) => <div className="chart-row" key={player.id}><span>{index+1}. {player.nickname}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${(player.goals/maxGoals)*100}%` }} /></div><strong>{player.goals}</strong></div>)}</div></article><article className="panel"><p className="eyebrow">Csapatátlag</p><h3>Teljesítménymutatók</h3><div className="metric-list"><div><span>Átlagos overall</span><strong>{Math.round(players.reduce((sum,p)=>sum+p.rating,0)/players.length)}</strong></div><div><span>Összes gól</span><strong>{players.reduce((sum,p)=>sum+p.goals,0)}</strong></div><div><span>Összes gólpassz</span><strong>{players.reduce((sum,p)=>sum+p.assists,0)}</strong></div><div><span>Aktív játékosok</span><strong>{players.filter(p=>p.status==="Aktív").length}</strong></div></div></article></section></div>;
}
export default Statistics;
