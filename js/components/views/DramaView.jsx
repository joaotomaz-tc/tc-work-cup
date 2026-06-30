import { useState } from 'react';
import { OWNER_OF, OWNER_COLOR } from '../../data/owners.js';
import { BASE_ODDS, strength } from '../../data/odds.js';
import { Crest, FlagDot } from '../ui/primitives.jsx';
import { BoardHead } from '../ui/BoardHead.jsx';

function BraggingRights({ A }) {
  const confirmed = A.clashes.filter(c => !c.live);
  const bigWin = confirmed.reduce((best, c) => {
    const m = Math.abs(c.ga - c.gb); if (m === 0) return best;
    if (!best || m > best.margin) {
      const winTeam = c.ga > c.gb ? c.a : c.b;
      return { winTeam, loseTeam:winTeam===c.a?c.b:c.a, margin:m, ga:c.ga, gb:c.gb, stage:c.stage, winOwner:OWNER_OF[winTeam]||null };
    }
    return best;
  }, null);
  const goalFest = confirmed.reduce((best, c) => {
    const t = c.ga + c.gb;
    return (!best || t > best.t) ? { a:c.a, b:c.b, ga:c.ga, gb:c.gb, t, stage:c.stage, oa:c.oa, ob:c.ob } : best;
  }, null);
  if (!bigWin && !goalFest) return <p className="wc-muted-sm">Check back once matches between pooled teams have been played.</p>;
  return (
    <div className="wc-brag-list">
      {bigWin && <div className="wc-brag-item">
        <span className="wc-brag-icon">🎯</span>
        <div>
          <div style={{ font:"600 14px 'DM Sans',sans-serif", color:"var(--text)" }}>Biggest win</div>
          <div className="wc-muted-sm">
            {bigWin.winOwner && <span style={{ color:OWNER_COLOR[bigWin.winOwner] }}>{bigWin.winOwner}</span>}
            {bigWin.winOwner && "'s "}<b>{bigWin.winTeam}</b> beat <b>{bigWin.loseTeam}</b> {Math.max(bigWin.ga,bigWin.gb)}–{Math.min(bigWin.ga,bigWin.gb)} · {bigWin.stage}
          </div>
        </div>
      </div>}
      {goalFest && <div className="wc-brag-item">
        <span className="wc-brag-icon">🔥</span>
        <div>
          <div style={{ font:"600 14px 'DM Sans',sans-serif", color:"var(--text)" }}>Goal fest</div>
          <div className="wc-muted-sm">
            <FlagDot team={goalFest.a}/><b>{goalFest.a}</b> {goalFest.ga}–{goalFest.gb} <b>{goalFest.b}</b>
            <FlagDot team={goalFest.b}/> ({goalFest.t} goals) · {goalFest.stage}
          </div>
        </div>
      </div>}
    </div>
  );
}

export function DramaView({ A, state }) {
  const [copied, setCopied] = useState(false);
  const shareText = (o) => {
    const rank = A.ownerRanked.findIndex(x => x.owner === o) + 1;
    const od = A.owner[o];
    const h2h = A.h2hRanked.find(x => x.owner === o);
    return `${o} · #${rank} · ${od.odds.toFixed(1)}% trophy odds · ${od.teamsLeft}/${od.teams.length} teams alive · H2H: ${h2h?.w||0}W ${h2h?.d||0}D ${h2h?.l||0}L | TC Work Cup 2026`;
  };
  return (
    <div className="wc-stack">
      <div className="wc-card wc-pad">
        <BoardHead emoji="⚡" title="Upset Log" sub="Underdogs beating the favourites"/>
        {A.upsets.length === 0 && <p className="wc-muted-sm">No upsets yet — the favourites are all winning so far.</p>}
        <div className="wc-stack" style={{ marginTop:A.upsets.length?12:0 }}>
          {A.upsets.map((u, i) => (
            <div key={i} className="wc-upset-card wc-card">
              <div className="wc-upset-header">
                <span className="wc-muted-sm">{u.stage}</span>
                <span className="wc-pill wc-pill--upset">Upset ×{(u.winOdds/u.loseOdds).toFixed(0)}</span>
              </div>
              <div className="wc-upset-teams">
                <div className="wc-upset-side">
                  <FlagDot team={u.winner}/><b style={{ color:"var(--text)" }}>{u.winner}</b>
                  {u.winOwner && <span className="owntag" style={{ color:OWNER_COLOR[u.winOwner] }}>{u.winOwner}</span>}
                  <span className="wc-muted-sm" style={{ marginLeft:"auto", fontSize:11 }}>({BASE_ODDS[u.winner]||"?"})</span>
                </div>
                <div className="wc-upset-score">{u.ga}–{u.gb}{u.pens?<span className="wc-muted-sm" style={{ fontSize:11 }}> ({u.pens[0]}–{u.pens[1]} pens)</span>:""}</div>
                <div className="wc-upset-side wc-upset-side--lose">
                  <FlagDot team={u.loser}/><span style={{ color:"var(--muted)" }}>{u.loser}</span>
                  {u.loseOwner && <span className="owntag" style={{ color:OWNER_COLOR[u.loseOwner], opacity:.7 }}>{u.loseOwner}</span>}
                  <span className="wc-muted-sm" style={{ marginLeft:"auto", fontSize:11 }}>({BASE_ODDS[u.loser]||"?"})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wc-card wc-pad">
        <BoardHead emoji="🎲" title="Draw Luck" sub="Who drew the strongest portfolio at the start?"/>
        <p className="wc-muted-sm" style={{ marginBottom:14 }}>Based on opening bookmaker prices. Top = strongest draw. Bottom = biggest longshots.</p>
        <div className="wc-luck-list">
          {A.drawLuck.map((d, i) => (
            <div key={d.owner} className="wc-luck-row">
              <span className="wc-list-rank">{i+1}</span>
              <Crest owner={d.owner} size={22}/>
              <div className="wc-luck-body">
                <div className="wc-luck-top">
                  <span className="wc-luck-name">{d.owner}</span>
                  <span className="wc-luck-odds">
                    {d.teams.map(t => `${(1 / strength(t)).toFixed(0)}`).join(" / ")}
                  </span>
                </div>
                <div className="wc-luck-bar">
                  <div className="wc-luck-fill" style={{ width:`${(d.strength / A.drawLuck[0].strength) * 100}%` }}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wc-card wc-pad">
        <BoardHead emoji="👑" title="Bragging Rights" sub="Best moments involving pooled teams"/>
        <BraggingRights A={A}/>
      </div>

      <div className="wc-card wc-pad">
        <BoardHead emoji="📤" title="Share Your Stats" sub="Copy to paste in the team chat"/>
        <div className="wc-share-grid">
          {A.ownerRanked.map(O => (
            <button key={O.owner} className="wc-share-btn wc-card" onClick={() => {
              try { navigator.clipboard.writeText(shareText(O.owner)).then(() => { setCopied(O.owner); setTimeout(() => setCopied(c => c===O.owner?false:c), 2000); }); } catch (e) {}
            }}>
              <Crest owner={O.owner} size={26}/>
              <span style={{ flex:1, font:"600 13px 'DM Sans',sans-serif", color:"var(--text)", textAlign:"left" }}>{O.owner}</span>
              <span className={"wc-share-copy"+(copied===O.owner?" is-copied":"")}>{copied===O.owner?"Copied!":"Copy"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
