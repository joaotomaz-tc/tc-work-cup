import { OWNER_OF, OWNER_COLOR } from '../../data/owners.js';
import { FlagDot, ProvisionalBanner } from '../ui/primitives.jsx';

const ADVANCE_COUNT = 8; // Best 8 of 12 third-place teams advance to R32

export function BestThirdsView({ A, Aconf, liveActive }) {
  const thirdsRanked = A.thirdsRanked || [];
  const confThirdsRanked = (Aconf || A).thirdsRanked || [];
  const allComplete = A.allComplete;

  // Map confirmed ranks so we can show movement arrows during live matches
  const confRankMap = {};
  confThirdsRanked.forEach((t, i) => { confRankMap[t.name] = i + 1; });

  return (
    <div className="wc-stack">
      {liveActive && <ProvisionalBanner />}

      <div className="wc-card">
        <div className="wc-pad">
          <h2 className="wc-card-title" style={{ marginBottom: 8 }}>Best 3rd Places</h2>
          <p className="section-note" style={{ marginBottom: allComplete ? 0 : 10 }}>
            FIFA 2026 has 12 groups — the top 2 from each group (24 teams) plus the{' '}
            <strong>best 8 third-place finishers</strong> advance to the Round of 32.
            Teams are ranked by points, then goal difference, goals scored, wins, and FIFA strength.
          </p>
          {!allComplete && (
            <p className="wc-muted-sm">
              Rankings are provisional — will be confirmed once all 12 group stages are complete.
            </p>
          )}
        </div>

        <div className="wc-table-wrap" style={{ borderLeft: 'none', borderRight: 'none', borderRadius: 0, margin: 0 }}>
          <table className="grp">
            <thead>
              <tr>
                <th></th>
                <th style={{ textAlign: 'left' }}>Team</th>
                <th>Grp</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
                <th>GD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {thirdsRanked.map((s, i) => {
                const rank = i + 1;
                const advances = rank <= ADVANCE_COUNT;
                // Row 9 gets the cutoff border (first row that does NOT advance)
                const isCutoff = rank === ADVANCE_COUNT + 1;
                const confRank = confRankMap[s.name];
                const rankChanged = liveActive && confRank != null && confRank !== rank;
                const out = !advances && allComplete;

                return (
                  <tr
                    key={s.name}
                    className={[
                      advances ? 'wc-thirds-row--adv' : '',
                      isCutoff ? 'wc-thirds-cutoff' : '',
                      rankChanged ? 'is-changed' : '',
                    ].filter(Boolean).join(' ')}
                    style={{ opacity: out ? 0.5 : 1 }}
                  >
                    <td>
                      <span
                        className="rankdot"
                        style={{ background: advances ? 'var(--qualify)' : 'var(--live)' }}
                      >
                        {rank}
                      </span>
                      {rankChanged && (
                        <span
                          className={'wc-rank-delta ' + (rank < confRank ? 'wc-rank-delta--up' : 'wc-rank-delta--down')}
                          style={{ marginLeft: 3 }}
                        >
                          {rank < confRank ? '↑' : '↓'}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <FlagDot team={s.name} />
                        <span style={{ color: 'var(--text)' }}>{s.name}</span>
                        {OWNER_OF[s.name] && (
                          <span
                            className="owntag"
                            style={{
                              color: OWNER_COLOR[OWNER_OF[s.name]],
                              background: advances ? 'color-mix(in srgb, var(--surface) 65%, transparent)' : undefined,
                              padding: advances ? '1px 4px' : undefined,
                              borderRadius: advances ? 3 : undefined,
                            }}
                          >
                            {OWNER_OF[s.name]}
                          </span>
                        )}
                      </span>
                    </td>
                    <td>
                      <GroupBadge letter={s.group} />
                    </td>
                    <td>{s.p}</td>
                    <td>{s.w}</td>
                    <td>{s.d}</td>
                    <td>{s.l}</td>
                    <td>{s.gf}</td>
                    <td>{s.ga}</td>
                    <td>{s.gd >= 0 ? '+' : ''}{s.gd}</td>
                    <td><b style={{ color: 'var(--text)' }}>{s.pts}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="wc-legend">
        <i className="rankdot" style={{ background: 'var(--qualify)' }} /> Advances to R32 (best 8 of 12)
        <i className="rankdot" style={{ background: 'var(--live)' }} /> Eliminated
        {!allComplete && <span style={{ marginLeft: 2 }}>· Provisional until all groups complete</span>}
      </p>
    </div>
  );
}

function GroupBadge({ letter }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 22, borderRadius: 4,
      background: 'linear-gradient(135deg, var(--red), var(--navy))',
      color: '#fff',
      fontFamily: "'Barlow Condensed', sans-serif",
      fontWeight: 900, fontSize: 11,
    }}>
      {letter}
    </span>
  );
}
