import { OWNER_COLOR } from '../../data/owners.js';
import { Crest, FlagDot, ProvisionalBanner } from '../ui/primitives.jsx';
import { ClashSide } from '../ui/BoardHead.jsx';

export function HeadToHead({ A, Aconf, liveActive }) {
  const confH2H = {};
  (Aconf || A).h2hRanked.forEach(O => { confH2H[O.owner] = O; });
  return (
    <div>
      <p className="section-note">Every match where two pooled teams meet. Same-player clashes count both ways; penalty knockouts count as a draw.</p>
      {liveActive && <ProvisionalBanner/>}
      <div className="wc-table-wrap" style={{ marginBottom:20 }}>
        <table className="lt">
          <thead><tr>
            <th style={{ textAlign:"left", paddingLeft:14 }}>Player</th>
            <th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th className="sorted">Pts</th>
          </tr></thead>
          <tbody>{A.h2hRanked.map(O => {
            const prev = confH2H[O.owner];
            const ptsDiff = liveActive && prev && prev.pts !== O.pts;
            return (
              <tr key={O.owner}>
                <td style={{ textAlign:"left", paddingLeft:14 }}>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
                    <Crest owner={O.owner} size={22}/>
                    <b style={{ color:"var(--text)" }}>{O.owner}</b>
                  </span>
                </td>
                <td>{O.p}</td><td>{O.w}</td><td>{O.d}</td><td>{O.l}</td>
                <td>{O.gf}</td><td>{O.ga}</td><td>{O.gd>=0?"+":""}{O.gd}</td>
                <td className="sorted">
                  <b style={{ color:"var(--text)" }}>{O.pts}</b>
                  {ptsDiff && <span className="wc-prev"> ({prev.pts})</span>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <h2 className="section-title">The clashes</h2>
      {A.clashes.length === 0 && <div className="wc-card wc-empty">No two pooled teams have met yet.</div>}
      <div className="wc-stack">
        {A.clashes.map((c, i) => {
          const same = c.oa === c.ob;
          const winTeam = !c.live
            ? (c.ga>c.gb?c.a:c.ga<c.gb?c.b:(c.pens?(c.pens[0]>c.pens[1]?c.a:c.b):null))
            : null;
          const winOwner = winTeam ? OWNER_COLOR[c.oa] : null;
          const leadTeam = c.live ? (c.ga>c.gb?c.a:c.ga<c.gb?c.b:null) : null;
          return (
            <div key={i} className={"wc-card wc-match"+(c.live?" is-live":"")}>
              <div className="wc-match-stage">
                {c.live && <span className="wc-live-badge" style={{ marginRight:6 }}>Live</span>}
                {c.stage}{same?" · same player":""}
              </div>
              <ClashSide team={c.a} owner={c.oa} score={c.ga} pen={c.pens?c.pens[0]:null} lose={winTeam&&winTeam!==c.a} lead={leadTeam===c.a}/>
              <div style={{ height:1, background:"var(--line)", margin:"2px 0" }}/>
              <ClashSide team={c.b} owner={c.ob} score={c.gb} pen={c.pens?c.pens[1]:null} lose={winTeam&&winTeam!==c.b} lead={leadTeam===c.b}/>
              <div className="wc-match-foot" style={{ color:same?"var(--accent)":(winOwner||undefined) }}>
                {c.live ? "In progress" : (same ? `Both results count for ${c.oa}` : (winOwner ? `${c.oa===winOwner?c.oa:c.ob} wins the bragging rights` : "Honours even"))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
