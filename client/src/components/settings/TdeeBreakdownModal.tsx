import { useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import styles from './TdeeBreakdownModal.module.css';

interface BmrDetails {
  weightLbs: number;
  weightKg: number;
  heightInches: number;
  heightCm: number;
  age: number;
  sex: 'male' | 'female';
  bmr: number;
  activityLevel: number;
  activityLabel: string;
  estimatedTdee: number;
}

interface AdaptiveDetails {
  latestValue: number;
  latestDate: string;
  dataPoints: number;
  dateRange: { from: string; to: string };
  smoothingFactor: number;
}

interface CalorieTarget {
  calorieTarget: number;
  tdeeUsed: number;
  tdeeSource: 'adaptive' | 'estimated';
  objectiveOffset: number;
  objective: string;
  goalPace: number;
}

interface TdeeTimelinePoint {
  date: string;
  tdeeEstimate: number;
}

interface BreakdownData {
  bmr: BmrDetails | null;
  adaptive: AdaptiveDetails | null;
  tdeeTimeline: TdeeTimelinePoint[];
  target: CalorieTarget | null;
  weightSummary: { entries: number; latest: number; earliest: number; dateRange: { from: string; to: string } } | null;
  intakeSummary: { entries: number; avgCalories: number } | null;
  objective: string;
  goalPace: number;
}

interface Props {
  onClose: () => void;
}

const STEP_COLORS = {
  bmr: '#06B6D4',       // cyan
  activity: '#8B5CF6',  // violet
  adaptive: '#10B981',  // emerald
  source: '#F97316',    // orange
  goal: '#F43F5E',      // rose
  result: '#6366F1',    // indigo
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TdeeBreakdownModal({ onClose }: Props) {
  const { data, loading } = useApi<BreakdownData>('/analytics/tdee-breakdown');

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const bmr = data?.bmr;
  const adaptive = data?.adaptive;
  const target = data?.target;
  const timeline = data?.tdeeTimeline ?? [];

  // Mini chart bounds
  const chartValues = timeline.map(t => t.tdeeEstimate);
  const chartMin = chartValues.length > 0 ? Math.min(...chartValues) * 0.95 : 0;
  const chartMax = chartValues.length > 0 ? Math.max(...chartValues) * 1.05 : 1;
  const chartRange = chartMax - chartMin || 1;

  // Show last 30 points max for the chart
  const chartData = timeline.slice(-30);

  const objectiveLabel = target?.objective === 'cut' ? 'Cut' : target?.objective === 'bulk' ? 'Bulk' : 'Maintain';
  const paceLabel = target ? `${(target.goalPace / 500).toFixed(1)} lb/week` : '';

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>TDEE Breakdown</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {loading && !data ? (
          <div className={styles.noData}>Loading...</div>
        ) : !target ? (
          <div className={styles.noData}>
            <div className={styles.noDataIcon}>&#x1F4CA;</div>
            <p>Not enough data to compute your TDEE yet. Add your profile details in Settings and log some food &amp; weight entries.</p>
          </div>
        ) : (
          <>
            {/* Hero card — final calorie target */}
            <div className={styles.heroCard}>
              <div className={styles.heroLabel}>Your Daily Calorie Target</div>
              <div className={styles.heroValue}>{target.calorieTarget}</div>
              <div className={styles.heroUnit}>calories / day</div>
            </div>

            <div className={styles.steps}>
              {/* Step 1 — BMR */}
              {bmr && (
                <div className={styles.step} style={{ animationDelay: '0.1s' }}>
                  <div className={styles.stepHeader}>
                    <div className={styles.stepNumber} style={{ background: STEP_COLORS.bmr }}>1</div>
                    <div className={styles.stepTitle}>Basal Metabolic Rate (BMR)</div>
                  </div>
                  <div className={styles.stepBody}>
                    <div className={styles.stepDesc}>
                      Your BMR is the number of calories your body burns at rest, calculated using the Mifflin-St Jeor equation.
                    </div>
                    <div className={styles.dataRows}>
                      <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Weight</span>
                        <span className={styles.dataValue}>{bmr.weightLbs} lbs ({bmr.weightKg} kg)</span>
                      </div>
                      <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Height</span>
                        <span className={styles.dataValue}>{bmr.heightInches}" ({bmr.heightCm} cm)</span>
                      </div>
                      <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Age</span>
                        <span className={styles.dataValue}>{bmr.age} years</span>
                      </div>
                      <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Sex</span>
                        <span className={styles.dataValue}>{bmr.sex === 'male' ? 'Male' : 'Female'}</span>
                      </div>
                    </div>
                    <div className={styles.formula}>
                      <span className={styles.formulaHighlight}>Mifflin-St Jeor:</span><br />
                      {bmr.sex === 'male'
                        ? `(10 × ${bmr.weightKg}) + (6.25 × ${bmr.heightCm}) − (5 × ${bmr.age}) + 5`
                        : `(10 × ${bmr.weightKg}) + (6.25 × ${bmr.heightCm}) − (5 × ${bmr.age}) − 161`
                      }
                    </div>
                    <div className={styles.resultRow} style={{ background: `${STEP_COLORS.bmr}12` }}>
                      <span className={styles.resultLabel}>BMR</span>
                      <span className={styles.resultValue} style={{ color: STEP_COLORS.bmr }}>
                        {bmr.bmr} cal
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — Activity Level → Estimated TDEE */}
              {bmr && (
                <div className={styles.step} style={{ animationDelay: '0.2s' }}>
                  <div className={styles.stepHeader}>
                    <div className={styles.stepNumber} style={{ background: STEP_COLORS.activity }}>2</div>
                    <div className={styles.stepTitle}>Estimated TDEE</div>
                  </div>
                  <div className={styles.stepBody}>
                    <div className={styles.stepDesc}>
                      Multiply BMR by your activity level to estimate Total Daily Energy Expenditure.
                    </div>
                    <div className={styles.dataRows}>
                      <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Activity Level</span>
                        <span className={styles.dataValue}>
                          {bmr.activityLabel} ({bmr.activityLevel}x)
                        </span>
                      </div>
                    </div>
                    <div className={styles.equation}>
                      <div className={styles.equationParts}>
                        <div className={styles.eqBlock}>
                          <span className={styles.eqValue} style={{ color: STEP_COLORS.bmr }}>
                            {bmr.bmr}
                          </span>
                          <span className={styles.eqLabel}>BMR</span>
                        </div>
                        <span className={styles.eqOperator}>&times;</span>
                        <div className={styles.eqBlock}>
                          <span className={styles.eqValue} style={{ color: STEP_COLORS.activity }}>
                            {bmr.activityLevel}
                          </span>
                          <span className={styles.eqLabel}>Activity</span>
                        </div>
                        <span className={styles.eqOperator}>=</span>
                        <div className={styles.eqBlock}>
                          <span className={styles.eqValue} style={{ color: STEP_COLORS.activity }}>
                            {bmr.estimatedTdee}
                          </span>
                          <span className={styles.eqLabel}>Est. TDEE</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 — Adaptive TDEE */}
              <div className={styles.step} style={{ animationDelay: '0.3s' }}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber} style={{ background: STEP_COLORS.adaptive }}>3</div>
                  <div className={styles.stepTitle}>Adaptive TDEE</div>
                </div>
                <div className={styles.stepBody}>
                  <div className={styles.stepDesc}>
                    Your real TDEE is learned over time by comparing what you eat with how your weight changes, using an Exponential Moving Average (EMA) for smooth, noise-resistant tracking.
                  </div>
                  {adaptive ? (
                    <>
                      <div className={styles.dataRows}>
                        <div className={styles.dataRow}>
                          <span className={styles.dataLabel}>Data Points</span>
                          <span className={styles.dataValue}>{adaptive.dataPoints} days</span>
                        </div>
                        <div className={styles.dataRow}>
                          <span className={styles.dataLabel}>Date Range</span>
                          <span className={styles.dataValue}>
                            {formatDate(adaptive.dateRange.from)} — {formatDate(adaptive.dateRange.to)}
                          </span>
                        </div>
                        <div className={styles.dataRow}>
                          <span className={styles.dataLabel}>Smoothing Factor</span>
                          <span className={styles.dataValue}>{adaptive.smoothingFactor.toFixed(2)} (alpha)</span>
                        </div>
                      </div>
                      {data?.weightSummary && (
                        <div className={styles.dataRows} style={{ marginTop: '4px' }}>
                          <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Weight Entries</span>
                            <span className={styles.dataValue}>{data.weightSummary.entries}</span>
                          </div>
                          <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Weight Change</span>
                            <span className={styles.dataValue}>
                              {data.weightSummary.earliest} → {data.weightSummary.latest} lbs
                              ({(data.weightSummary.latest - data.weightSummary.earliest) > 0 ? '+' : ''}
                              {(data.weightSummary.latest - data.weightSummary.earliest).toFixed(1)})
                            </span>
                          </div>
                        </div>
                      )}
                      {data?.intakeSummary && (
                        <div className={styles.dataRows} style={{ marginTop: '4px' }}>
                          <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Avg Daily Intake</span>
                            <span className={styles.dataValue}>{data.intakeSummary.avgCalories} cal</span>
                          </div>
                        </div>
                      )}
                      <div className={styles.formula}>
                        <span className={styles.formulaHighlight}>EMA Formula:</span><br />
                        TDEE = {adaptive.smoothingFactor} &times; calculated + {(1 - adaptive.smoothingFactor).toFixed(2)} &times; previous<br />
                        <span style={{ opacity: 0.7 }}>where calculated = intake + (weight_change &times; 3500)</span>
                      </div>
                      {/* Mini chart */}
                      {chartData.length > 2 && (
                        <>
                          <div className={styles.miniChart}>
                            {chartData.map((pt, i) => {
                              const height = ((pt.tdeeEstimate - chartMin) / chartRange) * 100;
                              return (
                                <div
                                  key={pt.date}
                                  className={styles.chartBar}
                                  style={{
                                    height: `${Math.max(6, height)}%`,
                                    background: i === chartData.length - 1
                                      ? STEP_COLORS.adaptive
                                      : `${STEP_COLORS.adaptive}60`,
                                    animationDelay: `${0.3 + i * 0.02}s`,
                                  }}
                                  title={`${formatDate(pt.date)}: ${Math.round(pt.tdeeEstimate)} cal`}
                                />
                              );
                            })}
                          </div>
                          <div className={styles.chartLabels}>
                            <span className={styles.chartDate}>{formatDate(chartData[0]!.date)}</span>
                            <span className={styles.chartDate}>{formatDate(chartData[chartData.length - 1]!.date)}</span>
                          </div>
                        </>
                      )}
                      <div className={styles.resultRow} style={{ background: `${STEP_COLORS.adaptive}12` }}>
                        <span className={styles.resultLabel}>Adaptive TDEE</span>
                        <span className={styles.resultValue} style={{ color: STEP_COLORS.adaptive }}>
                          {adaptive.latestValue} cal
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className={styles.infoNote}>
                      <span className={styles.infoIcon}>&#x2139;&#xFE0F;</span>
                      <span className={styles.infoText}>
                        Not enough data yet. Log food and weight consistently for at least 7–14 days to unlock adaptive TDEE. Until then, the estimated TDEE (from BMR) is used.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4 — TDEE Source Selection */}
              <div className={styles.step} style={{ animationDelay: '0.4s' }}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber} style={{ background: STEP_COLORS.source }}>4</div>
                  <div className={styles.stepTitle}>TDEE Source</div>
                </div>
                <div className={styles.stepBody}>
                  <div className={styles.stepDesc}>
                    {target.tdeeSource === 'adaptive'
                      ? 'Adaptive TDEE is being used because you have enough weight and intake data for personalized tracking.'
                      : 'Estimated TDEE is being used as a fallback. Log more food and weight data to unlock adaptive tracking.'
                    }
                  </div>
                  <div style={{ display: 'flex', gap: '8px', padding: '0 16px', flexWrap: 'wrap' }}>
                    <span className={`${styles.sourceBadge} ${target.tdeeSource === 'adaptive' ? styles.adaptive : styles.estimated}`}>
                      <span className={`${styles.dot} ${target.tdeeSource === 'adaptive' ? styles.adaptive : styles.estimated}`} />
                      {target.tdeeSource === 'adaptive' ? 'Adaptive' : 'Estimated'} — Active
                    </span>
                  </div>
                  {bmr && adaptive && (
                    <div className={styles.comparisonBar}>
                      <span className={styles.barLabel}>Est: {bmr.estimatedTdee}</span>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{
                            width: `${Math.min(100, (Math.min(bmr.estimatedTdee, adaptive.latestValue) / Math.max(bmr.estimatedTdee, adaptive.latestValue)) * 100)}%`,
                            background: `linear-gradient(90deg, ${STEP_COLORS.activity}, ${STEP_COLORS.adaptive})`,
                          }}
                        />
                      </div>
                      <span className={styles.barLabel}>Adpt: {adaptive.latestValue}</span>
                    </div>
                  )}
                  <div className={styles.resultRow} style={{ background: `${STEP_COLORS.source}12` }}>
                    <span className={styles.resultLabel}>TDEE Used</span>
                    <span className={styles.resultValue} style={{ color: STEP_COLORS.source }}>
                      {target.tdeeUsed} cal
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 5 — Goal Adjustment */}
              <div className={styles.step} style={{ animationDelay: '0.5s' }}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber} style={{ background: STEP_COLORS.goal }}>5</div>
                  <div className={styles.stepTitle}>Goal Adjustment</div>
                </div>
                <div className={styles.stepBody}>
                  <div className={styles.stepDesc}>
                    {target.objective === 'maintain'
                      ? 'You are maintaining, so no calorie adjustment is applied.'
                      : `A ${objectiveLabel.toLowerCase()} at ${paceLabel} requires a daily ${target.objective === 'cut' ? 'deficit' : 'surplus'} of ${Math.abs(target.objectiveOffset)} calories. (${paceLabel} = ~${Math.abs(target.objectiveOffset)} cal/day, since 1 lb = 3500 cal)`
                    }
                  </div>
                  <div className={styles.dataRows}>
                    <div className={styles.dataRow}>
                      <span className={styles.dataLabel}>Objective</span>
                      <span className={styles.dataValue}>{objectiveLabel}</span>
                    </div>
                    {target.objective !== 'maintain' && (
                      <>
                        <div className={styles.dataRow}>
                          <span className={styles.dataLabel}>Rate</span>
                          <span className={styles.dataValue}>{paceLabel}</span>
                        </div>
                        <div className={styles.dataRow}>
                          <span className={styles.dataLabel}>Daily {target.objective === 'cut' ? 'Deficit' : 'Surplus'}</span>
                          <span className={styles.dataValue}>{Math.abs(target.objectiveOffset)} cal</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className={styles.equation}>
                    <div className={styles.equationParts}>
                      <div className={styles.eqBlock}>
                        <span className={styles.eqValue} style={{ color: STEP_COLORS.source }}>
                          {target.tdeeUsed}
                        </span>
                        <span className={styles.eqLabel}>TDEE</span>
                      </div>
                      {target.objectiveOffset !== 0 && (
                        <>
                          <span className={styles.eqOperator}>
                            {target.objectiveOffset > 0 ? '+' : '−'}
                          </span>
                          <div className={styles.eqBlock}>
                            <span className={styles.eqValue} style={{ color: STEP_COLORS.goal }}>
                              {Math.abs(target.objectiveOffset)}
                            </span>
                            <span className={styles.eqLabel}>{objectiveLabel}</span>
                          </div>
                          <span className={styles.eqOperator}>=</span>
                        </>
                      )}
                      {target.objectiveOffset === 0 && (
                        <span className={styles.eqOperator}>=</span>
                      )}
                      <div className={styles.eqBlock}>
                        <span className={styles.eqValue} style={{ color: STEP_COLORS.result }}>
                          {target.calorieTarget}
                        </span>
                        <span className={styles.eqLabel}>Target</span>
                      </div>
                    </div>
                  </div>
                  {target.calorieTarget === 1200 && (
                    <div className={styles.infoNote}>
                      <span className={styles.infoIcon}>&#x26A0;&#xFE0F;</span>
                      <span className={styles.infoText}>
                        Your target was clamped to the minimum safe threshold of 1200 cal/day.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
