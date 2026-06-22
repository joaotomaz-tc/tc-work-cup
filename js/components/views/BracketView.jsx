import { useRef, useState, useEffect } from 'react';
import { OWNER_OF, OWNER_COLOR } from '../../data/owners.js';
import { GROUP_OF, GROUP_LETTERS } from '../../data/tournament.js';
import { R32_SLOTS, BRACKET_TREE, FEED_COLORS } from '../../data/bracket.js';
import { buildBracketTeams, koWL, getKoResult, slotLabel } from '../../lib/knockout.js';
import { FlagDot } from '../ui/primitives.jsx';

const FILTER_KEY = 'tc-work-cup:bracketFilter';

const STAGES = [
  { key: 'group', label: 'Groups'      },
  { key: 'r32',   label: 'Round of 32' },
  { key: 'r16',   label: 'Round of 16' },
  { key: 'qf',    label: 'QF'          },
  { key: 'sf',    label: 'SF'          },
  { key: 'final', label: 'Final'       },
];

function stageIndex(key) {
  return STAGES.findIndex(s => s.key === key);
}

function GroupsCol({ A }) {
  return (
    <div className="wc-groups-col">
      <div className="wc-bracket-col-label">Groups</div>
      <div className="wc-groups-col-body">
        {GROUP_LETTERS.map(L => {
          const st = A.standings[L] || [];
          const done = A.complete[L];
          return (
            <div key={L} className="wc-gfeed-card">
              <div className="wc-gfeed-head">
                <span className="wc-gm-badge">{L}</span>
                {done && <span className="wc-gm-done">✓</span>}
              </div>
              <div className="wc-gfeed-rows">
                {[0, 1, 2].map(i => {
                  const s = st[i];
                  const typeKey = i === 0 ? "w" : i === 1 ? "ru" : "3rd";
                  return (
                    <div key={i} className={`wc-gfeed-row wc-gfeed-row--${typeKey}`} data-feed={`${L}-${i}`}>
                      <span className={`wc-gfeed-badge wc-gfeed-badge--${typeKey}`}>{i===0?"1st":i===1?"2nd":"3rd"}</span>
                      {s
                        ? <><FlagDot team={s.name}/><span className="wc-gfeed-name">{s.name}</span></>
                        : <span className="wc-gfeed-name wc-gfeed-name--tbd">TBD</span>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketTeamRow({ team, score, pen, winner, loser, isLive, slotDef, matchId, side }) {
  const owner = team ? OWNER_OF[team] : null;
  const dimmed = loser && !isLive;
  return (
    <div
      className={"wc-bm-row"+(winner?" is-winner":"")+(dimmed?" is-loser":"")}
      data-r32={matchId && slotDef ? `${matchId}-${side}` : undefined}
    >
      {team
        ? <><FlagDot team={team}/><span className="wc-bm-name">{team}</span>{owner && <span className="owntag wc-bm-owner" style={{ color:OWNER_COLOR[owner] }}>{owner}</span>}</>
        : <span className="wc-bm-label">{slotDef ? slotLabel(slotDef) : "TBD"}</span>
      }
      <span className="wc-bm-score">{score!=null?score:"–"}{pen!=null?<sup className="wc-pen"> ({pen})</sup>:null}</span>
    </div>
  );
}

function BracketMatch({ teamA, teamB, slotA, slotB, matchId, ko, liveMatchMap }) {
  const result = getKoResult(teamA, teamB, ko);
  const wl = result ? koWL(result) : null;
  const isLive = result?.src === "live";
  const lm = isLive && teamA && teamB ? liveMatchMap[[teamA, teamB].sort().join("|")] : null;
  return (
    <div className={"wc-bm"+(isLive?" is-live":"")}>
      {isLive && <div className="wc-bm-live-bar"><span className="wc-live-badge">Live</span>{lm?.clock && <span className="wc-fixture-clock" style={{ marginLeft:4 }}>{lm.clock}</span>}</div>}
      <BracketTeamRow team={teamA} score={result?result.hs:null} pen={result?.pa} winner={wl?.w===teamA} loser={wl?.l===teamA} isLive={isLive} slotDef={slotA} matchId={matchId} side="a"/>
      <div className="wc-bm-divider"/>
      <BracketTeamRow team={teamB} score={result?result.as:null} pen={result?.pb} winner={wl?.w===teamB} loser={wl?.l===teamB} isLive={isLive} slotDef={slotB} matchId={matchId} side="b"/>
    </div>
  );
}

// Base height in px for one R32 slot. All later rounds are multiples of this.
// Must be > card height (≈75px) + slot vertical padding (6px) = 81px minimum.
const SLOT_H = 90;

function BracketCol({ label, matches, slotH, hasConnector, ko, liveMatchMap }) {
  return (
    <div className="wc-bracket-col">
      <div className="wc-bracket-col-label">{label}</div>
      <div className="wc-bracket-matches">
        {matches.map((m, mi) => {
          const isEven = mi % 2 === 0;
          let connClass = "";
          if (hasConnector) connClass = isEven ? "connector-top" : "connector-bottom";
          return (
            <div key={m.id} className={"wc-bracket-slot "+connClass+(hasConnector?" has-connector":"")} style={{ height: slotH }}>
              <BracketMatch teamA={m.teamA} teamB={m.teamB} slotA={m.slotA} slotB={m.slotB} matchId={m.id} ko={ko} liveMatchMap={liveMatchMap}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketBody({ teams, ko, liveMatchMap, startRound }) {
  const startIdx = stageIndex(startRound);

  const makePairs = (slots, slotDefs) => slots.map((node, i) => ({
    id: node.id || node,
    teamA: teams[node.id || node]?.a,
    teamB: teams[node.id || node]?.b,
    slotA: slotDefs ? slotDefs[i]?.a : null,
    slotB: slotDefs ? slotDefs[i]?.b : null,
  }));

  const allCols = [
    { key:'r32',   label:"Round of 32", matches:makePairs(R32_SLOTS, R32_SLOTS), slotH: SLOT_H,      hasConnector:true  },
    { key:'r16',   label:"Round of 16", matches:makePairs(BRACKET_TREE.r16),     slotH: SLOT_H * 2,  hasConnector:true  },
    { key:'qf',    label:"QF",          matches:makePairs(BRACKET_TREE.qf),      slotH: SLOT_H * 4,  hasConnector:true  },
    { key:'sf',    label:"SF",          matches:makePairs(BRACKET_TREE.sf),      slotH: SLOT_H * 8,  hasConnector:true  },
    { key:'final', label:"Final",       matches:makePairs(BRACKET_TREE.final),   slotH: SLOT_H * 16, hasConnector:false },
  ];

  const cols = allCols.filter(c => stageIndex(c.key) >= startIdx);

  const thirdMatch = { id:"m103", teamA:teams["m103"]?.a, teamB:teams["m103"]?.b };

  return (
    <div className="wc-bracket">
      {cols.map(col => (
        <BracketCol
          key={col.key}
          label={col.label}
          matches={col.matches}
          slotH={col.slotH}
          hasConnector={col.hasConnector}
          ko={ko}
          liveMatchMap={liveMatchMap}
        />
      ))}
      <div className="wc-bracket-col wc-bracket-col--third">
        <div className="wc-bracket-col-label">3rd Place</div>
        <div className="wc-bracket-matches">
          <div className="wc-bracket-slot" style={{ height: SLOT_H * 16 }}>
            <BracketMatch teamA={thirdMatch.teamA} teamB={thirdMatch.teamB} slotA={null} slotB={null} matchId="m103" ko={ko} liveMatchMap={liveMatchMap}/>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BracketView({ A, state, liveMatchMap }) {
  const innerRef = useRef(null);
  const [lines, setLines] = useState([]);
  const [startRound, setStartRound] = useState(
    () => localStorage.getItem(FILTER_KEY) || 'group'
  );

  const ko = state.ko || [];
  const teams = buildBracketTeams(A.standings, ko);
  const safeLiveMatchMap = liveMatchMap || {};

  function handleFilter(key) {
    setStartRound(key);
    localStorage.setItem(FILTER_KEY, key);
  }

  const showGroups = startRound === 'group';

  useEffect(() => {
    if (!showGroups) {
      setLines([]);
      return;
    }
    const inner = innerRef.current;
    if (!inner) return;
    const tid = setTimeout(() => {
      const iRect = inner.getBoundingClientRect();
      function pos(el) {
        const r = el.getBoundingClientRect();
        return { rx: r.right - iRect.left, lx: r.left - iRect.left, cy: r.top - iRect.top + r.height / 2 };
      }
      const newLines = [];
      R32_SLOTS.forEach(slot => {
        [["a", slot.a], ["b", slot.b]].forEach(([side, slotDef]) => {
          let g = null, idx = null;
          if (slotDef.type === "W")        { g = slotDef.g; idx = 0; }
          else if (slotDef.type === "RU")  { g = slotDef.g; idx = 1; }
          else if (slotDef.type === "3rd") {
            const t = teams[slot.id]?.[side];
            if (t) { g = GROUP_OF[t]; idx = 2; }
          }
          if (g === null) return;
          const srcEl = inner.querySelector(`[data-feed="${g}-${idx}"]`);
          const tgtEl = inner.querySelector(`[data-r32="${slot.id}-${side}"]`);
          if (!srcEl || !tgtEl) return;
          const s = pos(srcEl), t2 = pos(tgtEl);
          newLines.push({ x1:s.rx, y1:s.cy, x2:t2.lx, y2:t2.cy, color:FEED_COLORS[idx], dash:idx===2 });
        });
      });
      setLines(newLines);
    }, 80);
    return () => clearTimeout(tid);
  }, [A.standings, ko.length, showGroups]);

  return (
    <div>
      <div className="wc-bracket-filter">
        {STAGES.map(s => (
          <button
            key={s.key}
            className={"wc-bracket-filter-btn"+(startRound===s.key?" is-on":"")}
            onClick={() => handleFilter(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="wc-bracket-scroll">
        <div className="wc-bracket-inner" ref={innerRef}>
          <svg className="wc-connector-svg" aria-hidden="true">
            {lines.map((l, i) => {
              const mx = (l.x1 + l.x2) / 2;
              return (
                <path key={i}
                  d={`M${l.x1},${l.y1} C${mx},${l.y1} ${mx},${l.y2} ${l.x2},${l.y2}`}
                  stroke={l.color} strokeWidth="1.5" fill="none" strokeOpacity="0.55"
                  strokeDasharray={l.dash ? "5 3" : undefined}
                />
              );
            })}
          </svg>
          {showGroups && <GroupsCol A={A}/>}
          {showGroups && <div className="wc-connector-gap"/>}
          <BracketBody teams={teams} ko={ko} liveMatchMap={safeLiveMatchMap} startRound={startRound}/>
        </div>
      </div>
    </div>
  );
}
