import { OWNER_COLOR } from '../../data/owners.js';
import { Crest, FlagDot, ProvisionalBanner } from '../ui/primitives.jsx';

export function Leaderboard({ A, Aconf, liveActive, liveTeams }) {
  const confRank = {}, confOdds = {};
  (Aconf || A).ownerRanked.forEach((O, i) => { confRank[O.owner] = i+1; confOdds[O.owner] = O.odds; });
  return (
    <div className="wc-players">
      {liveActive && <ProvisionalBanner/>}
      {A.ownerRanked.map((O, i) => {
        const lead = i === 0 && !O.out;
        const cr = confRank[O.owner], co = confOdds[O.owner];
        const rankDelta = liveActive && cr != null && cr !== (i+1) ? cr - (i+1) : 0;
        const oddsDelta = liveActive && co != null && Math.abs(co - O.odds) >= 0.05;
        return (
          <article key={O.owner} className={"wc-player wc-card"+(lead?" wc-player--lead":"")+(O.out?" is-out":"")}>
            <div className="wc-player-top">
              <div className="wc-player-rank-col">
                <span className="wc-player-rank">{i+1}</span>
                {rankDelta !== 0 && <span className={"wc-rank-delta "+(rankDelta>0?"wc-rank-delta--up":"wc-rank-delta--down")}>{rankDelta>0?"↑":"↓"}{Math.abs(rankDelta)}</span>}
              </div>
              <Crest owner={O.owner} size={40}/>
              <div className="wc-player-info">
                <div className="wc-player-name-row">
                  <h3 className="wc-player-name">{O.owner}</h3>
                  {lead && <span className="wc-pill wc-pill--gold">Leader</span>}
                  <span className={"wc-pill "+(O.out?"wc-pill--out":"wc-pill--in")}>{O.out?"Out":"In"}</span>
                </div>
                <p className="wc-player-meta">{O.teamsLeft} of {O.teams.length} teams still in the tournament</p>
              </div>
              <div className="wc-player-odds">
                <span className="wc-odds-val">{O.odds.toFixed(1)}%</span>
                {oddsDelta && <span className="wc-prev">was {co.toFixed(1)}%</span>}
                <span className="wc-odds-lbl">Trophy odds</span>
              </div>
            </div>
            <div className="wc-bar"><div className="wc-bar-fill" style={{ width:`${Math.min(100,O.odds)}%` }}/></div>
            <div className="wc-team-tags">
              {O.teams.map(t => {
                const isLive = liveActive && liveTeams.has(t);
                return (
                  <span key={t} className={"wc-team-tag"+(A.teamOut[t]?" is-out":"")+(isLive?" is-live":"")}>
                    <FlagDot team={t}/>{t}{isLive && <span className="wc-live-dot">Live</span>}
                  </span>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
