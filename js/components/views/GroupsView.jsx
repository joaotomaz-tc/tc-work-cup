import { OWNER_OF, OWNER_COLOR } from '../../data/owners.js';
import { GROUPS, GROUP_LETTERS } from '../../data/tournament.js';
import { FIXTURES } from '../../data/fixtures.js';
import { fmtFixtureWhen } from '../../lib/format.js';
import { FlagDot, ProvisionalBanner } from '../ui/primitives.jsx';

function GroupFixtures({ L, groupResults, liveMatchMap, fixtureSchedules = {} }) {
  return (
    <div className="wc-fixture-strip">
      {FIXTURES[L].map(fx => {
        const r = groupResults[fx.id];
        const isLive = r?.src === "live";
        const played = r && r.hs != null;
        const lm = played && isLive ? liveMatchMap[[fx.a, fx.b].sort().join("|")] : null;
        const when = !played && fixtureSchedules[fx.id] ? fmtFixtureWhen(fixtureSchedules[fx.id]) : null;
        return (
          <div key={fx.id} className={"wc-fixture-row"+(isLive?" is-live":"")}>
            <span className="wc-fixture-home"><FlagDot team={fx.a}/>{fx.a}</span>
            <span className="wc-fixture-score">
              {played
                ? <><span>{r.hs} – {r.as}</span>{isLive && <span className="wc-fixture-live-row"><span className="wc-live-badge">Live</span>{lm?.clock && <span className="wc-fixture-clock">{lm.clock}</span>}</span>}</>
                : <><span>vs</span>{when && <span className="wc-fixture-when">{when}</span>}</>
              }
            </span>
            <span className="wc-fixture-away">{fx.b}<FlagDot team={fx.b}/></span>
          </div>
        );
      })}
    </div>
  );
}

export function GroupsView({ A, Aconf, state, liveTeams, liveMatchMap }) {
  const confSt = (Aconf || A).standings;
  const liveActive = liveTeams && liveTeams.size > 0;
  return (
    <div className="wc-groups">
      {liveActive && <ProvisionalBanner/>}
      {GROUP_LETTERS.map(L => {
        const st = A.standings[L];
        const confStL = confSt[L] || [];
        const confRankMap = {};
        confStL.forEach(s => { confRankMap[s.name] = s.rank; });
        const hasLiveInGroup = liveActive && GROUPS[L].some(t => liveTeams.has(t));
        const groupComplete = (Aconf || A).complete[L];
        return (
          <div key={L} className="wc-card wc-group">
            <div className="wc-group-head">
              <span className="wc-group-badge">{L}</span>
              <span className="wc-group-title">Group {L}</span>
              <span className="wc-group-status">{groupComplete?"Complete":hasLiveInGroup?"Live":"In progress"}</span>
            </div>
            <div className="wc-table-wrap">
              <table className="grp">
                <thead><tr><th></th><th style={{ textAlign:"left" }}>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
                <tbody>{st.map(s => {
                  const out = A.teamOut[s.name];
                  const confRank = confRankMap[s.name];
                  const rankChanged = liveActive && confRank != null && confRank !== s.rank;
                  return (
                    <tr key={s.name} className={rankChanged?"is-changed":""} style={{ opacity:out?.45:1 }}>
                      <td>
                        <span className="rankdot" style={{ background:s.rank<=2?"var(--qualify)":s.rank===3?(out?"var(--live)":"var(--gold)"):"var(--live)" }}>{s.rank}</span>
                        {rankChanged && <span className={"wc-rank-delta "+(s.rank<confRank?"wc-rank-delta--up":"wc-rank-delta--down")} style={{ marginLeft:3 }}>{s.rank<confRank?"↑":"↓"}</span>}
                      </td>
                      <td style={{ textAlign:"left" }}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                          <FlagDot team={s.name}/>
                          <span style={{ color:"var(--text)" }}>{s.name}</span>
                          {OWNER_OF[s.name] && <span className="owntag" style={{ color:OWNER_COLOR[OWNER_OF[s.name]] }}>{OWNER_OF[s.name]}</span>}
                        </span>
                      </td>
                      <td>{s.p}</td><td>{s.w}</td><td>{s.d}</td><td>{s.l}</td><td>{s.gf}</td><td>{s.ga}</td>
                      <td>{s.gd>=0?"+":""}{s.gd}</td><td><b style={{ color:"var(--text)" }}>{s.pts}</b></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <GroupFixtures L={L} groupResults={state.groupResults||{}} liveMatchMap={liveMatchMap} fixtureSchedules={state.fixtureSchedules||{}}/>
          </div>
        );
      })}
      <p className="wc-legend">
        <i className="rankdot" style={{ background:"var(--qualify)" }}/> Top 2 qualify
        <i className="rankdot" style={{ background:"var(--gold)" }}/> 3rd — best 8
        <i className="rankdot" style={{ background:"var(--live)" }}/> Eliminated
      </p>
    </div>
  );
}
