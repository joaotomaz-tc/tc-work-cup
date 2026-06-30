import { useMemo, useState } from 'react';
import { OWNER_OF, OWNER_COLOR } from '../../data/owners.js';
import { buildBracketTeams, koWL } from '../../lib/knockout.js';
import { flagUrl, badgeUrl } from '../../data/teamAssets.js';

const TROPHY = `${import.meta.env.BASE_URL}images/world-cup-trophy.png`;
const TROPHY_SZ = 118;
const ownerCol = team => team ? (OWNER_COLOR[OWNER_OF[team]] || null) : null;

/* ── SVG geometry ─────────────────────────────────────────────── */
const SZ = 800, CX = 400, CY = 400;
const R_CREST = 358;
const R_TM = 308;
const R_32 = 252;
const R_16 = 196;
const R_QF = 140;
const R_SF = 84;

const CREST_SZ = 42;
const FLAG_R = 17;
const N = 32, STEP = (2 * Math.PI) / N, A0 = -Math.PI / 2;

const angPos = pos => A0 + pos * STEP;
const ang32  = k   => A0 + (2*k + 0.5) * STEP;
const ang16  = k   => A0 + (4*k + 1.5) * STEP;
const angQF  = k   => A0 + (8*k + 3.5) * STEP;
const angSF  = k   => A0 + (16*k + 7.5) * STEP;
const pol    = (a, r) => ({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) });

const R32_IDS = [
  "m74","m77","m73","m75","m83","m84","m81","m82",
  "m86","m88","m85","m87","m76","m78","m79","m80",
];
const R16_DEF = [
  { id:"m89", ai:0,  bi:1  }, { id:"m90", ai:2,  bi:3  },
  { id:"m93", ai:4,  bi:5  }, { id:"m94", ai:6,  bi:7  },
  { id:"m95", ai:8,  bi:9  }, { id:"m96", ai:10, bi:11 },
  { id:"m91", ai:12, bi:13 }, { id:"m92", ai:14, bi:15 },
];
const QF_DEF = [
  { id:"m97",  ai:0, bi:1 }, { id:"m98",  ai:2, bi:3 },
  { id:"m100", ai:4, bi:5 }, { id:"m99",  ai:6, bi:7 },
];
const SF_DEF = [
  { id:"m101", ai:0, bi:1 },
  { id:"m102", ai:2, bi:3 },
];

function lineStyle(team, won) {
  if (!team) return { className: "circle-line circle-line--empty" };
  const stroke = ownerCol(team) || "var(--accent)";
  if (won === true)  return { className: "circle-line circle-line--won", stroke };
  if (won === false) return { className: "circle-line circle-line--out" };
  return { className: "circle-line circle-line--pending" };
}

function BracketLine({ x1, y1, x2, y2, ls }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      className={ls.className}
      stroke={ls.stroke || undefined}/>
  );
}

function FlagCircle({ id, team, x, y, r, dimmed = false }) {
  const url = flagUrl(team);
  if (!team || !url) {
    return (
      <circle cx={x} cy={y} r={r} className="circle-node circle-node--slot"/>
    );
  }
  return (
    <g className={dimmed ? "circle-node--dimmed" : undefined}>
      <defs>
        <clipPath id={id}>
          <circle cx={x} cy={y} r={r - 0.5}/>
        </clipPath>
      </defs>
      <circle cx={x} cy={y} r={r} className="circle-node" strokeWidth={1.2}/>
      <image href={url} x={x - r} y={y - r} width={r * 2} height={r * 2}
        clipPath={`url(#${id})`} preserveAspectRatio="xMidYMid slice"/>
    </g>
  );
}

function TeamBadge({ team, x, y, size, dimmed = false }) {
  const url = badgeUrl(team);
  const half = size / 2;
  if (!team || !url) {
    return (
      <circle cx={x} cy={y} r={half * 0.7} className="circle-node circle-node--slot"/>
    );
  }
  return (
    <g className={dimmed ? "circle-node--dimmed" : undefined}>
      <image href={url} x={x - half} y={y - half} width={size} height={size}
        preserveAspectRatio="xMidYMid meet"/>
    </g>
  );
}

export function CircleView({ A, state }) {
  const ko = state.ko || [];
  const [hov, setHov] = useState(null);

  const bt = useMemo(
    () => buildBracketTeams(A.standings, ko),
    [A.standings, ko]
  );

  function mwinner(teams) {
    const { a, b } = teams || {};
    if (!a || !b) return null;
    const key = [a, b].sort().join("|");
    const m = ko.find(m => m.hs != null && [m.a, m.b].sort().join("|") === key);
    return m ? koWL(m)?.w : null;
  }

  const r32d = R32_IDS.map((id, k) => {
    const t = bt[id] || {};
    return { id, k, a: t.a||null, b: t.b||null, win: mwinner(t) };
  });
  const r16d = R16_DEF.map((d, k) => {
    const t = bt[d.id] || {};
    return { ...d, k, a: t.a||null, b: t.b||null, win: mwinner(t) };
  });
  const qfd = QF_DEF.map((d, k) => {
    const t = bt[d.id] || {};
    return { ...d, k, a: t.a||null, b: t.b||null, win: mwinner(t) };
  });
  const sfd = SF_DEF.map((d, k) => {
    const t = bt[d.id] || {};
    return { ...d, k, a: t.a||null, b: t.b||null, win: mwinner(t) };
  });
  const champ = mwinner(bt["m104"] || {});

  const seg = (srcTeam, destWin, destPlayed) => {
    if (!srcTeam) return lineStyle(null, null);
    const won = destPlayed ? (destWin === srcTeam) : null;
    return lineStyle(srcTeam, won);
  };

  const isOut = t => t ? !!A.teamOut[t] : false;

  const outerTeams = R32_IDS.flatMap((id, k) => {
    const { a, b } = bt[id] || {};
    return [
      { pos: 2*k,   team: a || null },
      { pos: 2*k+1, team: b || null },
    ];
  });

  return (
    <section className="circle-wrap">
      <div className="circle-hdr">
        <h2 className="display circle-title">Circle of Elimination</h2>
        <p className="circle-sub">
          Knockout bracket as a circle — national crests and flags advance inward round by round toward the trophy.
        </p>
      </div>

      <div className="circle-svg-wrap">
        <svg
          viewBox={`0 0 ${SZ} ${SZ}`}
          className="circle-svg"
          role="img"
          aria-label="Circular knockout bracket with national flags and crests"
        >
          <defs>
            <radialGradient id="circle-bg-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.14"/>
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="trophy-glow" cx="50%" cy="55%" r="50%">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0"/>
            </radialGradient>
          </defs>

          <circle cx={CX} cy={CY} r={R_CREST + CREST_SZ / 2 + 8} fill="url(#circle-bg-glow)"/>

          {[R_32, R_16, R_QF, R_SF].map(r => (
            <circle key={r} cx={CX} cy={CY} r={r} className="circle-ring-guide"/>
          ))}

          {/* Bracket lines */}
          {r32d.flatMap(({ id, k, a, b, win }) => {
            const r32p = pol(ang32(k), R_32);
            const played = win != null;
            return [
              { pos: 2*k,   team: a },
              { pos: 2*k+1, team: b },
            ].map(({ pos, team }) => {
              const tp = pol(angPos(pos), R_TM);
              const won = played ? (win === team) : null;
              const ls = lineStyle(team, won);
              return (
                <BracketLine key={`${id}-${pos}`}
                  x1={tp.x} y1={tp.y} x2={r32p.x} y2={r32p.y} ls={ls}/>
              );
            });
          })}

          {r16d.flatMap(({ k, ai, bi, win }) => {
            const r16p = pol(ang16(k), R_16);
            const played = win != null;
            return [ai, bi].map(r32k => {
              const r32p = pol(ang32(r32k), R_32);
              const src = r32d[r32k].win;
              const ls = seg(src, win, played);
              return (
                <BracketLine key={`r32-${r32k}-r16-${k}`}
                  x1={r32p.x} y1={r32p.y} x2={r16p.x} y2={r16p.y} ls={ls}/>
              );
            });
          })}

          {qfd.flatMap(({ k, ai, bi, win }) => {
            const qfp = pol(angQF(k), R_QF);
            const played = win != null;
            return [ai, bi].map(r16k => {
              const r16p = pol(ang16(r16k), R_16);
              const src = r16d[r16k].win;
              const ls = seg(src, win, played);
              return (
                <BracketLine key={`r16-${r16k}-qf-${k}`}
                  x1={r16p.x} y1={r16p.y} x2={qfp.x} y2={qfp.y} ls={ls}/>
              );
            });
          })}

          {sfd.flatMap(({ k, ai, bi, win }) => {
            const sfp = pol(angSF(k), R_SF);
            const played = win != null;
            return [ai, bi].map(qfk => {
              const qfp = pol(angQF(qfk), R_QF);
              const src = qfd[qfk].win;
              const ls = seg(src, win, played);
              return (
                <BracketLine key={`qf-${qfk}-sf-${k}`}
                  x1={qfp.x} y1={qfp.y} x2={sfp.x} y2={sfp.y} ls={ls}/>
              );
            });
          })}

          {sfd.map(({ k, win }) => {
            const sfp = pol(angSF(k), R_SF);
            const played = champ != null;
            const ls = seg(win, champ, played);
            return (
              <BracketLine key={`sf-${k}-final`}
                x1={sfp.x} y1={sfp.y} x2={CX} y2={CY} ls={ls}/>
            );
          })}

          {/* Inner round flags */}
          {r32d.map(({ id, k, win }) => {
            const p = pol(ang32(k), R_32);
            return (
              <FlagCircle key={`${id}-f`} id={`f32-${k}`} team={win}
                x={p.x} y={p.y} r={win ? 11 : 7} dimmed={win && isOut(win)}/>
            );
          })}

          {r16d.map(({ id, k, win }) => {
            const p = pol(ang16(k), R_16);
            return (
              <FlagCircle key={`${id}-f`} id={`f16-${k}`} team={win}
                x={p.x} y={p.y} r={win ? 13 : 9} dimmed={win && isOut(win)}/>
            );
          })}

          {qfd.map(({ id, k, win }) => {
            const p = pol(angQF(k), R_QF);
            return (
              <FlagCircle key={`${id}-f`} id={`fqf-${k}`} team={win}
                x={p.x} y={p.y} r={win ? 15 : 10} dimmed={win && isOut(win)}/>
            );
          })}

          {sfd.map(({ id, k, win }) => {
            const p = pol(angSF(k), R_SF);
            return (
              <FlagCircle key={`${id}-f`} id={`fsf-${k}`} team={win}
                x={p.x} y={p.y} r={win ? 17 : 12} dimmed={win && isOut(win)}/>
            );
          })}

          {/* Outer flags + crests */}
          {outerTeams.map(({ pos, team }) => {
            const a = angPos(pos);
            const fp = pol(a, R_TM);
            const cp = pol(a, R_CREST);
            const eliminated = isOut(team);
            const isHov = hov === team && team != null;
            return (
              <g key={`tm-${pos}`}
                onMouseEnter={() => team && setHov(team)}
                onMouseLeave={() => setHov(null)}
                style={{ cursor: team ? "pointer" : "default" }}>
                <TeamBadge team={team} x={cp.x} y={cp.y} size={CREST_SZ}
                  dimmed={eliminated}/>
                <g transform={isHov ? `translate(${fp.x},${fp.y}) scale(1.12) translate(${-fp.x},${-fp.y})` : undefined}>
                  <FlagCircle id={`out-${pos}`} team={team} x={fp.x} y={fp.y} r={FLAG_R}
                    dimmed={eliminated}/>
                </g>
                {isHov && (
                  <circle cx={fp.x} cy={fp.y} r={FLAG_R + 3} className="circle-hover-ring"/>
                )}
              </g>
            );
          })}

          {/* Centre trophy */}
          <circle cx={CX} cy={CY} r={78} fill="url(#trophy-glow)"/>
          <image href={TROPHY} x={CX - TROPHY_SZ / 2} y={CY - TROPHY_SZ / 2 - 10}
            width={TROPHY_SZ} height={TROPHY_SZ} preserveAspectRatio="xMidYMid meet"/>
          {champ && (
            <FlagCircle id="champ-flag" team={champ} x={CX} y={CY + 68} r={14}
              dimmed={isOut(champ)}/>
          )}
        </svg>
      </div>

      {hov && (() => {
        const owner = OWNER_OF[hov];
        const eliminated = isOut(hov);
        return (
          <div className="circle-tip">
            <img className="circle-tip-flag" src={flagUrl(hov)} alt="" width={20} height={20}/>
            {badgeUrl(hov) && (
              <img className="circle-tip-badge" src={badgeUrl(hov)} alt="" width={22} height={22}/>
            )}
            <span className="circle-tip-name">{hov}</span>
            {owner && (
              <span className="circle-tip-owner" style={{ color: OWNER_COLOR[owner] }}>
                · {owner}
              </span>
            )}
            {eliminated && <span className="circle-tip-out">Eliminated</span>}
          </div>
        );
      })()}

      <div className="circle-key">
        {[
          { code:"R32", label:"Round of 32" },
          { code:"R16", label:"Round of 16" },
          { code:"QF",  label:"Quarter-final" },
          { code:"SF",  label:"Semi-final" },
          { code:"F",   label:"Final" },
        ].map(({ code, label }) => (
          <span key={code} className="circle-key-item">
            <span className="circle-key-code">{code}</span>
            <span className="circle-key-desc">{label}</span>
          </span>
        ))}
      </div>

      <div className="circle-legend">
        <span className="circle-legend-item">
          <span className="circle-legend-line circle-legend-line--active"/>
          Advancing
        </span>
        <span className="circle-legend-item">
          <span className="circle-legend-line circle-legend-line--pending"/>
          Yet to play
        </span>
        <span className="circle-legend-item">
          <span className="circle-legend-line circle-legend-line--out"/>
          Eliminated
        </span>
      </div>
    </section>
  );
}
