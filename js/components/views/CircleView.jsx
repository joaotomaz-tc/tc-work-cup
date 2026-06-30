import { useMemo, useState } from 'react';
import { OWNER_OF, OWNER_COLOR } from '../../data/owners.js';
import { buildBracketTeams, koWL } from '../../lib/knockout.js';

/* ── Team abbreviations ─────────────────────────────────────────── */
const ABBR = {
  "United States":"USA","Bosnia & Herzegovina":"BiH",
  "Saudi Arabia":"KSA","South Africa":"RSA","South Korea":"KOR",
  "DR Congo":"DRC","New Zealand":"NZL","Cape Verde":"CPV",
  "Ivory Coast":"CIV","Netherlands":"NED","Trinidad & Tobago":"T&T",
  "Curaçao":"CUR",
};
const ta = name => !name ? "?" : (ABBR[name] || name.slice(0,3).toUpperCase());
const ownerCol = team => team ? (OWNER_COLOR[OWNER_OF[team]] || null) : null;

// Return dark or white text colour for good contrast against a hex background
function contrastText(hex) {
  if (!hex || hex[0] !== '#') return '#ffffff';
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  // Perceived luminance formula
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  return lum > 0.52 ? '#1a1a2e' : '#ffffff';
}

/* ── SVG geometry ─────────────────────────────────────────────── */
const SZ = 760, CX = 380, CY = 380;
// Radii for each elimination round (outer → inner)
const R_TM = 320; // team circles (outer ring)
const R_32 = 263; // R32 result nodes
const R_16 = 204; // R16 result nodes
const R_QF = 145; // QF result nodes
const R_SF =  86; // SF result nodes
// champion sits at (CX, CY)

const TM_R = 23;   // team circle radius
const TM_FONT = 9; // team label font size (viewBox units)

const N = 32, STEP = (2 * Math.PI) / N, A0 = -Math.PI / 2; // start at 12 o'clock

// Angle functions (all clockwise from top)
const angPos = pos => A0 + pos * STEP;
const ang32  = k   => A0 + (2*k + 0.5) * STEP;
const ang16  = k   => A0 + (4*k + 1.5) * STEP;
const angQF  = k   => A0 + (8*k + 3.5) * STEP;
const angSF  = k   => A0 + (16*k + 7.5) * STEP;
const pol    = (a, r) => ({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) });

/* ── Circular match ordering ──────────────────────────────────── */
// 16 R32 match IDs placed clockwise from 12 o'clock.
// Indices 0–7  → feed SF m101 (top-right quarter-circle)
// Indices 8–15 → feed SF m102 (bottom-left quarter-circle)
// This embedding means the two finalists sit near 12 o'clock and 6 o'clock.
const R32_IDS = [
  "m74","m77","m73","m75","m83","m84","m81","m82",
  "m86","m88","m85","m87","m76","m78","m79","m80",
];

// R16: each entry pairs two consecutive R32 circular indices → one R16 node
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

/* ── Line styling helpers ─────────────────────────────────────── */
// won: true = won the match at the downstream node
//      false = lost that match (eliminated there)
//      null = match not played yet (team is present but waiting)
function lineStyle(team, won) {
  if (!team) return { stroke:"var(--line)", opacity:0.14, strokeWidth:1 };
  const c = ownerCol(team) || "var(--muted)";
  if (won === true)  return { stroke:c, opacity:0.92, strokeWidth:2.8 };
  if (won === false) return { stroke:"var(--line-2)", opacity:0.25, strokeWidth:1 };
  return { stroke:c, opacity:0.42, strokeWidth:1.6 }; // pending
}

/* ── Component ────────────────────────────────────────────────── */
export function CircleView({ A, state }) {
  const ko = state.ko || [];
  const [hov, setHov] = useState(null);

  const bt = useMemo(
    () => buildBracketTeams(A.standings, ko),
    [A.standings, ko]
  );

  // Winner of a match given its {a, b} teams object
  function mwinner(teams) {
    const { a, b } = teams || {};
    if (!a || !b) return null;
    const key = [a, b].sort().join("|");
    const m = ko.find(m => m.hs != null && [m.a, m.b].sort().join("|") === key);
    return m ? koWL(m)?.w : null;
  }

  // Build round data arrays
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

  // Line props: from a source team flowing into a downstream match
  const seg = (srcTeam, destWin, destPlayed) => {
    if (!srcTeam) return lineStyle(null, null);
    const won = destPlayed ? (destWin === srcTeam) : null;
    return lineStyle(srcTeam, won);
  };

  const isOut = t => t ? !!A.teamOut[t] : false;

  // Node color
  const nc = (win, fallback = "var(--surface-2)") =>
    win ? (ownerCol(win) || "var(--muted)") : fallback;

  return (
    <section className="circle-wrap">
      <div className="circle-hdr">
        <h2 className="display circle-title">Circle of Elimination</h2>
        <p className="circle-sub">
          Knockout bracket as a circle — teams advance inward round by round. The champion reaches the centre.
        </p>
      </div>

      <div className="circle-svg-wrap">
        <svg
          viewBox={`0 0 ${SZ} ${SZ}`}
          className="circle-svg"
          role="img"
          aria-label="Circular knockout bracket"
        >
          {/* ── Decorative background rings ─────────────────── */}
          <circle cx={CX} cy={CY} r={R_TM + TM_R + 4} fill="none"
            stroke="var(--line)" strokeWidth={1.5} opacity={0.28}/>
          {[R_32, R_16, R_QF, R_SF].map(r => (
            <circle key={r} cx={CX} cy={CY} r={r} fill="none"
              stroke="var(--line)" strokeWidth={0.8}
              strokeDasharray="4 6" opacity={0.2}/>
          ))}

          {/* ── Lines: outer team nodes → R32 match nodes ─── */}
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
                <line key={`${id}-${pos}`}
                  x1={tp.x} y1={tp.y} x2={r32p.x} y2={r32p.y}
                  stroke={ls.stroke} strokeWidth={ls.strokeWidth} opacity={ls.opacity}/>
              );
            });
          })}

          {/* ── Lines: R32 nodes → R16 nodes ─────────────── */}
          {r16d.flatMap(({ id, k, ai, bi, win }) => {
            const r16p = pol(ang16(k), R_16);
            const played = win != null;
            return [ai, bi].map(r32k => {
              const r32p = pol(ang32(r32k), R_32);
              const src = r32d[r32k].win;
              const ls = seg(src, win, played);
              return (
                <line key={`r32-${r32k}-r16-${k}`}
                  x1={r32p.x} y1={r32p.y} x2={r16p.x} y2={r16p.y}
                  stroke={ls.stroke} strokeWidth={ls.strokeWidth} opacity={ls.opacity}/>
              );
            });
          })}

          {/* ── Lines: R16 nodes → QF nodes ──────────────── */}
          {qfd.flatMap(({ id, k, ai, bi, win }) => {
            const qfp = pol(angQF(k), R_QF);
            const played = win != null;
            return [ai, bi].map(r16k => {
              const r16p = pol(ang16(r16k), R_16);
              const src = r16d[r16k].win;
              const ls = seg(src, win, played);
              return (
                <line key={`r16-${r16k}-qf-${k}`}
                  x1={r16p.x} y1={r16p.y} x2={qfp.x} y2={qfp.y}
                  stroke={ls.stroke} strokeWidth={ls.strokeWidth} opacity={ls.opacity}/>
              );
            });
          })}

          {/* ── Lines: QF nodes → SF nodes ───────────────── */}
          {sfd.flatMap(({ id, k, ai, bi, win }) => {
            const sfp = pol(angSF(k), R_SF);
            const played = win != null;
            return [ai, bi].map(qfk => {
              const qfp = pol(angQF(qfk), R_QF);
              const src = qfd[qfk].win;
              const ls = seg(src, win, played);
              return (
                <line key={`qf-${qfk}-sf-${k}`}
                  x1={qfp.x} y1={qfp.y} x2={sfp.x} y2={sfp.y}
                  stroke={ls.stroke} strokeWidth={ls.strokeWidth} opacity={ls.opacity}/>
              );
            });
          })}

          {/* ── Lines: SF nodes → centre (Final) ─────────── */}
          {sfd.map(({ k, win }) => {
            const sfp = pol(angSF(k), R_SF);
            const played = champ != null;
            const ls = seg(win, champ, played);
            return (
              <line key={`sf-${k}-final`}
                x1={sfp.x} y1={sfp.y} x2={CX} y2={CY}
                stroke={ls.stroke} strokeWidth={ls.strokeWidth} opacity={ls.opacity}/>
            );
          })}

          {/* ── R32 result nodes ─────────────────────────── */}
          {r32d.map(({ id, k, win }) => {
            const p = pol(ang32(k), R_32);
            return (
              <circle key={`${id}-nd`}
                cx={p.x} cy={p.y} r={win ? 7 : 5}
                fill={nc(win)} stroke="var(--surface)" strokeWidth={1.5}/>
            );
          })}

          {/* ── R16 result nodes ─────────────────────────── */}
          {r16d.map(({ id, k, win }) => {
            const p = pol(ang16(k), R_16);
            const fill = nc(win);
            const txt = win ? contrastText(ownerCol(win) || "#888") : "#fff";
            return (
              <g key={`${id}-nd`}>
                <circle cx={p.x} cy={p.y} r={win ? 10 : 7}
                  fill={fill} stroke="var(--surface)" strokeWidth={2}/>
                {win && (
                  <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                    fontSize="6" fontWeight="700" fill={txt}>{ta(win)}</text>
                )}
              </g>
            );
          })}

          {/* ── QF result nodes ──────────────────────────── */}
          {qfd.map(({ id, k, win }) => {
            const p = pol(angQF(k), R_QF);
            const fill = nc(win);
            const txt = win ? contrastText(ownerCol(win) || "#888") : "#fff";
            return (
              <g key={`${id}-nd`}>
                <circle cx={p.x} cy={p.y} r={win ? 13 : 9}
                  fill={fill} stroke="var(--surface)" strokeWidth={2}/>
                {win && (
                  <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                    fontSize="6.5" fontWeight="700" fill={txt}>{ta(win)}</text>
                )}
              </g>
            );
          })}

          {/* ── SF result nodes ───────────────────────────── */}
          {sfd.map(({ id, k, win }) => {
            const p = pol(angSF(k), R_SF);
            const fill = nc(win);
            const txt = win ? contrastText(ownerCol(win) || "#888") : "#fff";
            return (
              <g key={`${id}-nd`}>
                <circle cx={p.x} cy={p.y} r={win ? 16 : 11}
                  fill={fill} stroke="var(--surface)" strokeWidth={2}/>
                {win && (
                  <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                    fontSize="7" fontWeight="700" fill={txt}>{ta(win)}</text>
                )}
              </g>
            );
          })}

          {/* ── Outer team circles (rendered last = on top) ─ */}
          {R32_IDS.flatMap((id, k) => {
            const { a, b } = bt[id] || {};
            return [
              { pos: 2*k,   team: a || null },
              { pos: 2*k+1, team: b || null },
            ];
          }).map(({ pos, team }) => {
            const p = pol(angPos(pos), R_TM);
            const eliminated = isOut(team);
            const isHov = hov === team && team != null;
            const fillColor = ownerCol(team) || "var(--line-2)";
            const txtColor  = ownerCol(team) ? contrastText(ownerCol(team)) : "#999";
            return (
              <g key={`tm-${pos}`}
                onMouseEnter={() => team && setHov(team)}
                onMouseLeave={() => setHov(null)}
                style={{ cursor: team ? "pointer" : "default" }}>
                <circle
                  cx={p.x} cy={p.y} r={isHov ? TM_R + 2 : TM_R}
                  fill={fillColor}
                  opacity={eliminated ? 0.3 : 1}
                  stroke={isHov ? "#fff" : "var(--surface)"}
                  strokeWidth={isHov ? 3 : 2.5}/>
                {/* Abbreviated country code, contrast-coloured */}
                <text
                  x={p.x} y={p.y}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={TM_FONT} fontWeight="800" fill={txtColor}
                  opacity={eliminated ? 0.6 : 1}
                  letterSpacing="-0.3">
                  {ta(team)}
                </text>
              </g>
            );
          })}

          {/* ── Champion at centre ────────────────────────── */}
          <g>
            <circle cx={CX} cy={CY} r={34}
              fill={champ ? (ownerCol(champ) || "var(--muted)") : "var(--surface)"}
              stroke={champ ? "#F5C518" : "var(--line)"}
              strokeWidth={champ ? 3.5 : 1.5}/>
            {champ ? (
              <>
                <text x={CX} y={CY - 9} textAnchor="middle" dominantBaseline="central"
                  fontSize="10" fontWeight="800"
                  fill={contrastText(ownerCol(champ) || "#888")}
                  letterSpacing="-0.3">
                  {ta(champ)}
                </text>
                <text x={CX} y={CY + 11} textAnchor="middle" dominantBaseline="central"
                  fontSize="16">🏆</text>
              </>
            ) : (
              <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central"
                fontSize="26">🏆</text>
            )}
          </g>
        </svg>
      </div>

      {/* ── Hover tooltip ─────────────────────────────────── */}
      {hov && (() => {
        const owner = OWNER_OF[hov];
        const eliminated = isOut(hov);
        return (
          <div className="circle-tip">
            <span className="circle-tip-dot" style={{ background: ownerCol(hov) || "var(--muted)" }}/>
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

      {/* ── Round key ────────────────────────────────────── */}
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

      {/* ── Legend ───────────────────────────────────────── */}
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
