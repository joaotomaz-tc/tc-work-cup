import { OWNER_OF, OWNER_COLOR } from '../../data/owners.js';
import { GROUP_OF } from '../../data/tournament.js';
import { KO_ORDER } from '../../data/bracket.js';
import { Crest, FlagDot } from '../ui/primitives.jsx';
import { BoardHead } from '../ui/BoardHead.jsx';

function ScorerBoard({ A }) {
  const list = A.scorers, leader = A.bootLeader;
  return (
    <div className="wc-card wc-pad">
      <BoardHead emoji="⚽" title="Golden Boot" sub="Top scorers" holder={leader?OWNER_OF[leader.t]:null}/>
      {list.length === 0 && <p className="wc-muted-sm">No goals recorded yet.</p>}
      <div className="wc-list">
        {list.map((s, i) => (
          <div key={s.p+s.t} className="wc-list-row">
            <span className="wc-list-rank">{i+1}</span>
            <span className="wc-list-name">{s.p}</span>
            <span className="wc-list-team"><FlagDot team={s.t}/>{s.t}</span>
            <span className="owntag" style={{ color:OWNER_COLOR[OWNER_OF[s.t]] }}>{OWNER_OF[s.t]}</span>
            <span className="wc-list-val">{s.g}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GloveBoard({ A }) {
  const list = A.cleanSheets, leader = A.gloveLeader;
  return (
    <div className="wc-card wc-pad">
      <BoardHead emoji="🧤" title="Golden Glove" sub="Most clean sheets" holder={leader?leader.owner:null}/>
      {list.length === 0 && <p className="wc-muted-sm">No clean sheets yet.</p>}
      <div className="wc-list">
        {list.map((s, i) => (
          <div key={s.t} className="wc-list-row">
            <span className="wc-list-rank">{i+1}</span>
            <span className="wc-list-team"><FlagDot team={s.t}/><b>{s.t}</b></span>
            <span className="owntag" style={{ color:OWNER_COLOR[s.owner] }}>{s.owner}</span>
            <span className="wc-list-val">{s.cs}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PathToGlory({ A, state }) {
  const alive = A.ownerRanked.filter(O => !O.out);
  if (!alive.length) return <p className="wc-muted-sm">Tournament complete.</p>;
  return (
    <div className="wc-path-list">
      {alive.map(O => (
        <div key={O.owner} className="wc-path-row">
          <Crest owner={O.owner} size={28}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ font:"600 14px 'DM Sans',sans-serif", color:"var(--text)", marginBottom:6 }}>{O.owner}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {O.teams.filter(t => !A.teamOut[t]).map(t => {
                const koNext = (state.ko || []).filter(m => (m.a===t||m.b===t) && m.hs==null)
                  .sort((a, b) => KO_ORDER.indexOf(a.round) - KO_ORDER.indexOf(b.round))[0];
                const grp = GROUP_OF[t];
                const stage = koNext ? koNext.round : (A.complete[grp] ? "Groups done" : `Group ${grp}`);
                return (
                  <span key={t} className="wc-team-tag">
                    <FlagDot team={t}/>{t}
                    <span className="wc-muted-sm" style={{ fontSize:10, marginLeft:2 }}>· {stage}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupAwards({ A }) {
  const gw = A.groupAwards.groupWinners;
  if (!gw.length) return <p className="wc-muted-sm">Group stage awards will appear as groups complete.</p>;
  const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟","#️⃣","#️⃣"];
  return (
    <div className="wc-brag-list" style={{ marginTop:12 }}>
      {gw.map((g, i) => (
        <div key={g.team} className="wc-brag-item">
          <span className="wc-brag-icon">{medals[i]||"·"}</span>
          <div>
            <div style={{ font:"500 13px 'DM Sans',sans-serif", color:"var(--text)" }}>
              <FlagDot team={g.team}/><b>{g.team}</b> topped Group {g.L} ({g.pts} pts, {g.gf} goals)
              {g.owner && <span> · <span className="owntag" style={{ color:OWNER_COLOR[g.owner] }}>{g.owner}</span></span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsView({ A, state }) {
  return (
    <div className="wc-stack">
      <ScorerBoard A={A}/>
      <GloveBoard A={A}/>

      <div className="wc-card wc-pad">
        <BoardHead emoji="📊" title="Player Stats" sub="Combined record across all group and knockout matches"/>
        <div className="wc-table-wrap" style={{ marginTop:14 }}>
          <table className="lt">
            <thead><tr>
              <th style={{ textAlign:"left", paddingLeft:14 }}>Player</th>
              <th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th className="sorted">Pts</th>
            </tr></thead>
            <tbody>{A.ownerRanked.map(O => (
              <tr key={O.owner} style={{ opacity:O.out?.5:1 }}>
                <td style={{ textAlign:"left", paddingLeft:14 }}>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
                    <Crest owner={O.owner} size={22}/><b style={{ color:"var(--text)" }}>{O.owner}</b>
                    {O.out && <span className="wc-pill wc-pill--out" style={{ marginLeft:4 }}>Out</span>}
                  </span>
                </td>
                <td>{O.p}</td><td>{O.w}</td><td>{O.d}</td><td>{O.l}</td>
                <td>{O.gf}</td><td>{O.ga}</td><td>{O.gd>=0?"+":""}{O.gd}</td>
                <td className="sorted"><b style={{ color:"var(--text)" }}>{O.pts}</b></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="wc-card wc-pad">
        <BoardHead emoji="🛤" title="Path to Glory" sub="Surviving teams and their current stage"/>
        <PathToGlory A={A} state={state}/>
      </div>

      <div className="wc-card wc-pad">
        <BoardHead emoji="🏅" title="Group Stage Awards" sub="Best performers in the group phase"/>
        <GroupAwards A={A}/>
      </div>

      {A.penaltyBoard.length > 0 && <div className="wc-card wc-pad">
        <BoardHead emoji="🥅" title="Penalty Corner" sub="Shootout record for pooled clashes"/>
        <div className="wc-list">
          {A.penaltyBoard.map((o, i) => (
            <div key={o.owner} className="wc-list-row">
              <span className="wc-list-rank">{i+1}</span>
              <Crest owner={o.owner} size={22}/>
              <span style={{ font:"600 14px 'DM Sans',sans-serif", color:"var(--text)", flex:1 }}>{o.owner}</span>
              <span className="wc-muted-sm">{o.pw}W · {o.pl}L</span>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}
