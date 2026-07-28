import { useState } from "react";
import PageHeader from "../components/ui/PageHeader";
function Settings() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ clubName: "Ball of Duty CF", manager: "IamGCS", season: "Ball of Duty III. szezon", discord: "Ball of Duty HQ" });
  function update(event) { setSaved(false); setForm({ ...form, [event.target.name]: event.target.value }); }
  function submit(event) { event.preventDefault(); setSaved(true); }
  return <div className="page-stack"><PageHeader eyebrow="Application settings" title="Beállítások" description="A klub alapadatainak szerkesztése. A demóverzióban ezek az adatok csak az aktuális munkamenetben élnek." /><form className="panel settings-form" onSubmit={submit}>{Object.entries(form).map(([name,value]) => <label key={name}><span>{({clubName:"Klub neve",manager:"Menedzser",season:"Aktív szezon",discord:"Discord szerver"})[name]}</span><input name={name} value={value} onChange={update} /></label>)}<div className="form-actions"><button className="button">Beállítások mentése</button>{saved && <span className="success-message">Sikeresen mentve.</span>}</div></form></div>;
}
export default Settings;
