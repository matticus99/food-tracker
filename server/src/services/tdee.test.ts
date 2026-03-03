import { describe, it, expect } from 'vitest';
import {
  calculateTdeeHistory,
  calculateBMR,
  smoothWeightTrend,
  type TdeeDataPoint,
} from './tdee.js';

// ---------------------------------------------------------------------------
// Helper: generate consecutive-day data points starting from a given date
// ---------------------------------------------------------------------------
function makePoints(
  startDate: string,
  entries: { weight: number; calories: number }[],
): TdeeDataPoint[] {
  const start = new Date(startDate);
  return entries.map((e, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      weight: e.weight,
      calories: e.calories,
    };
  });
}

// ---------------------------------------------------------------------------
// calculateTdeeHistory
// ---------------------------------------------------------------------------
describe('calculateTdeeHistory', () => {
  // -- Empty / single point ------------------------------------------------

  it('returns empty array for empty input', () => {
    expect(calculateTdeeHistory([])).toEqual([]);
  });

  it('returns initial values for a single data point (defaults to calories as TDEE)', () => {
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 180, calories: 2200 },
    ];
    const result = calculateTdeeHistory(data);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: '2025-01-01',
      tdeeEstimate: 2200,
      caloriesConsumed: 2200,
      weightUsed: 180,
    });
  });

  it('uses provided initialTdee for the first point instead of calories', () => {
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 180, calories: 2200 },
      { date: '2025-01-02', weight: 180, calories: 2200 },
    ];
    const result = calculateTdeeHistory(data, 0.1, 2500);

    // First point should show the initialTdee, not the calories
    expect(result[0]!.tdeeEstimate).toBe(2500);
    // Second point: calculatedTdee = 2200 + (180-180)*3500/1 = 2200
    // smoothed = 0.1 * 2200 + 0.9 * 2500 = 220 + 2250 = 2470
    expect(result[1]!.tdeeEstimate).toBe(2470);
  });

  // -- Stable weight (TDEE should converge toward intake) ------------------

  it('converges TDEE toward intake when weight is stable', () => {
    // 10 days, weight stable at 180, intake constant at 2200
    const entries = Array.from({ length: 10 }, () => ({
      weight: 180,
      calories: 2200,
    }));
    const data = makePoints('2025-01-01', entries);
    const result = calculateTdeeHistory(data, 0.1);

    // First point: TDEE = 2200 (seeded from calories)
    expect(result[0]!.tdeeEstimate).toBe(2200);

    // With no weight change, calculatedTdee equals calories each day.
    // EMA of a constant series equals that constant, so all should be 2200.
    for (const r of result) {
      expect(r.tdeeEstimate).toBe(2200);
    }
  });

  // -- Weight loss scenario (TDEE > intake) --------------------------------

  it('estimates TDEE > intake during weight loss', () => {
    // Losing 0.5 lb/day while eating 2000 cal → calculated TDEE ~ 2000 + 1750 = 3750
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 200, calories: 2000 },
      { date: '2025-01-02', weight: 199.5, calories: 2000 },
      { date: '2025-01-03', weight: 199, calories: 2000 },
    ];
    const result = calculateTdeeHistory(data, 0.1);

    // Day 2: calc = 2000 + (200-199.5)*3500/1 = 2000 + 1750 = 3750
    //         smoothed = 0.1*3750 + 0.9*2000 = 375 + 1800 = 2175
    expect(result[1]!.tdeeEstimate).toBe(2175);

    // Day 3: calc = 2000 + (199.5-199)*3500/1 = 3750
    //         smoothed = 0.1*3750 + 0.9*2175 = 375 + 1957.5 = 2332.5
    expect(result[2]!.tdeeEstimate).toBe(2332.5);

    // All TDEE estimates should be above intake (2000) since weight is dropping
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.tdeeEstimate).toBeGreaterThan(2000);
    }
  });

  // -- Weight gain scenario (TDEE < intake) --------------------------------

  it('estimates TDEE < intake during weight gain', () => {
    // Gaining 0.5 lb/day while eating 3000 cal → calculated TDEE ~ 3000 - 1750 = 1250
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 180, calories: 3000 },
      { date: '2025-01-02', weight: 180.5, calories: 3000 },
      { date: '2025-01-03', weight: 181, calories: 3000 },
    ];
    const result = calculateTdeeHistory(data, 0.1);

    // Day 2: calc = 3000 + (180-180.5)*3500/1 = 3000 - 1750 = 1250
    //         smoothed = 0.1*1250 + 0.9*3000 = 125 + 2700 = 2825
    expect(result[1]!.tdeeEstimate).toBe(2825);

    // Day 3: calc = 3000 + (180.5-181)*3500/1 = 3000 - 1750 = 1250
    //         smoothed = 0.1*1250 + 0.9*2825 = 125 + 2542.5 = 2667.5
    expect(result[2]!.tdeeEstimate).toBe(2667.5);

    // TDEE should be below intake since weight is rising
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.tdeeEstimate).toBeLessThan(3000);
    }
  });

  // -- Custom smoothing factors -------------------------------------------

  it('responds faster with higher smoothing factor (0.3)', () => {
    // Sudden jump: day 1 at 2000 cal, day 2 at 2000 cal with weight drop
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 200, calories: 2000 },
      { date: '2025-01-02', weight: 199, calories: 2000 },
    ];

    const slow = calculateTdeeHistory(data, 0.1);
    const fast = calculateTdeeHistory(data, 0.3);

    // Both start at 2000
    expect(slow[0]!.tdeeEstimate).toBe(2000);
    expect(fast[0]!.tdeeEstimate).toBe(2000);

    // Day 2: calc = 2000 + (200-199)*3500 = 5500
    // slow: 0.1*5500 + 0.9*2000 = 550+1800 = 2350
    // fast: 0.3*5500 + 0.7*2000 = 1650+1400 = 3050
    expect(slow[1]!.tdeeEstimate).toBe(2350);
    expect(fast[1]!.tdeeEstimate).toBe(3050);

    // Higher smoothing factor moves the estimate further from the initial value
    expect(Math.abs(fast[1]!.tdeeEstimate - 2000)).toBeGreaterThan(
      Math.abs(slow[1]!.tdeeEstimate - 2000),
    );
  });

  it('responds slower with lower smoothing factor (0.05)', () => {
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 200, calories: 2000 },
      { date: '2025-01-02', weight: 199, calories: 2000 },
    ];

    const normal = calculateTdeeHistory(data, 0.1);
    const sluggish = calculateTdeeHistory(data, 0.05);

    // Day 2: calc = 5500
    // normal:   0.1*5500 + 0.9*2000 = 2350
    // sluggish: 0.05*5500 + 0.95*2000 = 275 + 1900 = 2175
    expect(normal[1]!.tdeeEstimate).toBe(2350);
    expect(sluggish[1]!.tdeeEstimate).toBe(2175);

    // Lower factor means less movement
    expect(Math.abs(sluggish[1]!.tdeeEstimate - 2000)).toBeLessThan(
      Math.abs(normal[1]!.tdeeEstimate - 2000),
    );
  });

  // -- Multi-day gaps between measurements --------------------------------

  it('handles multi-day gaps by dividing weight change across days', () => {
    // 3-day gap: lost 3 lbs over 3 days eating 2000
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 200, calories: 2000 },
      { date: '2025-01-04', weight: 197, calories: 2000 }, // 3 days later
    ];
    const result = calculateTdeeHistory(data, 0.1);

    // daysBetween = 3
    // weightChange = 200 - 197 = 3 lbs
    // caloriesFromWeightChange = 3 * 3500 / 3 = 3500
    // calculatedTdee = 2000 + 3500 = 5500
    // smoothed = 0.1 * 5500 + 0.9 * 2000 = 550 + 1800 = 2350
    expect(result[1]!.tdeeEstimate).toBe(2350);
  });

  it('treats same-day measurements (0-day gap) as 1-day gap', () => {
    // Two entries on the same date (daysBetween would be 0, clamped to 1)
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 200, calories: 2000 },
      { date: '2025-01-01', weight: 199, calories: 2000 },
    ];
    const result = calculateTdeeHistory(data, 0.1);

    // daysBetween = max(1, 0) = 1
    // calc = 2000 + (200-199)*3500/1 = 5500
    // smoothed = 0.1*5500 + 0.9*2000 = 2350
    expect(result[1]!.tdeeEstimate).toBe(2350);
  });

  it('handles 7-day gap correctly', () => {
    // 7-day gap: lost 2 lbs over a week
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 200, calories: 2000 },
      { date: '2025-01-08', weight: 198, calories: 2000 }, // 7 days later
    ];
    const result = calculateTdeeHistory(data, 0.1);

    // daysBetween = 7
    // weightChange = 200 - 198 = 2 lbs
    // caloriesFromWeightChange = 2 * 3500 / 7 = 1000
    // calculatedTdee = 2000 + 1000 = 3000
    // smoothed = 0.1 * 3000 + 0.9 * 2000 = 300 + 1800 = 2100
    expect(result[1]!.tdeeEstimate).toBe(2100);
  });

  // -- Longer series convergence -------------------------------------------

  it('converges toward actual TDEE over many data points', () => {
    // Simulate someone with a true TDEE of 2500, eating 2000/day, losing weight
    // Weight loss rate: (2500 - 2000) / 3500 = ~0.143 lbs/day
    const entries: { weight: number; calories: number }[] = [];
    let weight = 200;
    for (let i = 0; i < 30; i++) {
      entries.push({ weight, calories: 2000 });
      weight -= 500 / 3500; // ~0.143 lbs/day
    }
    const data = makePoints('2025-01-01', entries);
    const result = calculateTdeeHistory(data, 0.1);

    // After 30 days, TDEE should be approaching 2500
    const lastTdee = result[result.length - 1]!.tdeeEstimate;
    expect(lastTdee).toBeGreaterThan(2400);
    expect(lastTdee).toBeLessThan(2600);
  });

  // -- Preserves calorie and weight data pass-through ----------------------

  it('correctly passes through caloriesConsumed and weightUsed', () => {
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 185.5, calories: 2100 },
      { date: '2025-01-02', weight: 185.2, calories: 1950 },
      { date: '2025-01-03', weight: 184.8, calories: 2300 },
    ];
    const result = calculateTdeeHistory(data);

    expect(result[0]!.caloriesConsumed).toBe(2100);
    expect(result[0]!.weightUsed).toBe(185.5);
    expect(result[1]!.caloriesConsumed).toBe(1950);
    expect(result[1]!.weightUsed).toBe(185.2);
    expect(result[2]!.caloriesConsumed).toBe(2300);
    expect(result[2]!.weightUsed).toBe(184.8);
  });

  it('preserves date strings exactly', () => {
    const data: TdeeDataPoint[] = [
      { date: '2025-06-15', weight: 170, calories: 2000 },
      { date: '2025-06-16', weight: 170, calories: 2000 },
    ];
    const result = calculateTdeeHistory(data);
    expect(result[0]!.date).toBe('2025-06-15');
    expect(result[1]!.date).toBe('2025-06-16');
  });

  // -- Rounding behavior ---------------------------------------------------

  it('rounds tdeeEstimate to one decimal place', () => {
    // Create a scenario that produces a non-round number
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 200, calories: 2111 },
      { date: '2025-01-02', weight: 199.7, calories: 2111 },
    ];
    const result = calculateTdeeHistory(data, 0.1);

    // calc = 2111 + 0.3*3500 = 2111 + 1050 = 3161
    // smoothed = 0.1*3161 + 0.9*2111 = 316.1 + 1899.9 = 2216
    const tdee = result[1]!.tdeeEstimate;
    // Check it's rounded to at most 1 decimal place
    expect(tdee).toBe(Math.round(tdee * 10) / 10);
  });

  // -- Edge cases: zero and unusual values ---------------------------------

  it('handles zero calories', () => {
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 200, calories: 0 },
      { date: '2025-01-02', weight: 200, calories: 0 },
    ];
    const result = calculateTdeeHistory(data, 0.1);

    // First point: TDEE = 0 (calories)
    expect(result[0]!.tdeeEstimate).toBe(0);
    // Day 2: calc = 0 + (200-200)*3500 = 0, smoothed = 0.1*0 + 0.9*0 = 0
    expect(result[1]!.tdeeEstimate).toBe(0);
  });

  it('handles zero weight (mathematically degenerate but should not crash)', () => {
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 0, calories: 2000 },
      { date: '2025-01-02', weight: 0, calories: 2000 },
    ];
    const result = calculateTdeeHistory(data, 0.1);

    // No weight change → calculatedTdee = 2000
    expect(result).toHaveLength(2);
    expect(result[0]!.tdeeEstimate).toBe(2000);
    expect(result[1]!.tdeeEstimate).toBe(2000);
  });

  it('handles very large weight swings without crashing', () => {
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 200, calories: 2000 },
      { date: '2025-01-02', weight: 195, calories: 2000 }, // 5 lb drop in 1 day
    ];
    const result = calculateTdeeHistory(data, 0.1);

    // calc = 2000 + 5*3500 = 19500
    // smoothed = 0.1*19500 + 0.9*2000 = 1950 + 1800 = 3750
    expect(result[1]!.tdeeEstimate).toBe(3750);
  });

  it('handles negative weight change (weight increase) producing negative calculated TDEE', () => {
    // Big weight gain → calculated TDEE could go negative
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 180, calories: 500 },
      { date: '2025-01-02', weight: 185, calories: 500 }, // +5 lbs in 1 day
    ];
    const result = calculateTdeeHistory(data, 0.1);

    // calc = 500 + (180-185)*3500 = 500 - 17500 = -17000
    // smoothed = 0.1*(-17000) + 0.9*500 = -1700 + 450 = -1250
    expect(result[1]!.tdeeEstimate).toBe(-1250);
  });

  // -- Smoothing factor of 1.0 means no smoothing --------------------------

  it('with smoothingFactor=1.0, TDEE equals raw calculated value', () => {
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 200, calories: 2000 },
      { date: '2025-01-02', weight: 199, calories: 2000 },
      { date: '2025-01-03', weight: 198.5, calories: 2100 },
    ];
    const result = calculateTdeeHistory(data, 1.0);

    // Day 2: calc = 2000 + 1*3500 = 5500, smoothed = 1.0*5500 + 0*2000 = 5500
    expect(result[1]!.tdeeEstimate).toBe(5500);
    // Day 3: calc = 2100 + 0.5*3500 = 3850, smoothed = 1.0*3850 + 0*5500 = 3850
    expect(result[2]!.tdeeEstimate).toBe(3850);
  });

  // -- Smoothing factor of 0.0 means TDEE never changes --------------------

  it('with smoothingFactor=0.0, TDEE stays at initial value forever', () => {
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 200, calories: 2000 },
      { date: '2025-01-02', weight: 190, calories: 3000 },
      { date: '2025-01-03', weight: 180, calories: 4000 },
    ];
    const result = calculateTdeeHistory(data, 0.0);

    // All values should stay at the initial TDEE of 2000
    expect(result[0]!.tdeeEstimate).toBe(2000);
    expect(result[1]!.tdeeEstimate).toBe(2000);
    expect(result[2]!.tdeeEstimate).toBe(2000);
  });

  // -- Varying calorie intake ----------------------------------------------

  it('handles varying daily calorie intake', () => {
    const data: TdeeDataPoint[] = [
      { date: '2025-01-01', weight: 180, calories: 1800 },
      { date: '2025-01-02', weight: 180, calories: 2500 },
      { date: '2025-01-03', weight: 180, calories: 1500 },
    ];
    const result = calculateTdeeHistory(data, 0.1);

    // Stable weight → calculated TDEE equals calorie intake each day
    // Day 1: TDEE = 1800
    expect(result[0]!.tdeeEstimate).toBe(1800);
    // Day 2: calc = 2500, smoothed = 0.1*2500 + 0.9*1800 = 250 + 1620 = 1870
    expect(result[1]!.tdeeEstimate).toBe(1870);
    // Day 3: calc = 1500, smoothed = 0.1*1500 + 0.9*1870 = 150 + 1683 = 1833
    expect(result[2]!.tdeeEstimate).toBe(1833);
  });
});

// ---------------------------------------------------------------------------
// calculateBMR
// ---------------------------------------------------------------------------
describe('calculateBMR', () => {
  // -- Standard male -------------------------------------------------------

  it('calculates BMR for a standard male', () => {
    // 180 lbs, 70 inches (5'10"), 30 years old, male
    const bmr = calculateBMR(180, 70, 30, 'male');

    // 180 lbs = 81.6466 kg, 70 in = 177.8 cm
    // 10 * 81.6466 + 6.25 * 177.8 - 5 * 30 + 5
    // = 816.466 + 1111.25 - 150 + 5 = 1782.716
    expect(bmr).toBeCloseTo(1782.716, 1);
  });

  // -- Standard female -----------------------------------------------------

  it('calculates BMR for a standard female', () => {
    // 140 lbs, 64 inches (5'4"), 28 years old, female
    const bmr = calculateBMR(140, 64, 28, 'female');

    // 140 lbs = 63.50288 kg, 64 in = 162.56 cm
    // 10 * 63.50288 + 6.25 * 162.56 - 5 * 28 - 161
    // = 635.0288 + 1016 - 140 - 161 = 1350.0288
    expect(bmr).toBeCloseTo(1350.029, 1);
  });

  // -- Male BMR should be higher than female for same stats ----------------

  it('male BMR is higher than female BMR for identical stats', () => {
    const maleBmr = calculateBMR(170, 68, 35, 'male');
    const femaleBmr = calculateBMR(170, 68, 35, 'female');

    // Difference should be exactly 166 (5 - (-161))
    expect(maleBmr - femaleBmr).toBeCloseTo(166, 5);
    expect(maleBmr).toBeGreaterThan(femaleBmr);
  });

  // -- Known reference values (Mifflin-St Jeor verified) -------------------

  it('matches known Mifflin-St Jeor reference for 154 lb, 5\'9" male, age 25', () => {
    // 154 lbs = 69.853 kg, 69 in = 175.26 cm
    // 10 * 69.853 + 6.25 * 175.26 - 5 * 25 + 5
    // = 698.53 + 1095.375 - 125 + 5 = 1673.905
    const bmr = calculateBMR(154, 69, 25, 'male');
    expect(bmr).toBeCloseTo(1673.905, 0);
  });

  it('matches known Mifflin-St Jeor reference for 130 lb, 5\'4" female, age 30', () => {
    // 130 lbs = 58.9670 kg, 64 in = 162.56 cm
    // 10 * 58.9670 + 6.25 * 162.56 - 5 * 30 - 161
    // = 589.670 + 1016.0 - 150 - 161 = 1294.670
    const bmr = calculateBMR(130, 64, 30, 'female');
    expect(bmr).toBeCloseTo(1294.670, 0);
  });

  // -- BMR increases with weight -------------------------------------------

  it('BMR increases with weight (all else equal)', () => {
    const bmrLight = calculateBMR(150, 70, 30, 'male');
    const bmrHeavy = calculateBMR(200, 70, 30, 'male');
    expect(bmrHeavy).toBeGreaterThan(bmrLight);
  });

  // -- BMR increases with height -------------------------------------------

  it('BMR increases with height (all else equal)', () => {
    const bmrShort = calculateBMR(170, 62, 30, 'male');
    const bmrTall = calculateBMR(170, 74, 30, 'male');
    expect(bmrTall).toBeGreaterThan(bmrShort);
  });

  // -- BMR decreases with age ---------------------------------------------

  it('BMR decreases with age (all else equal)', () => {
    const bmrYoung = calculateBMR(170, 70, 20, 'male');
    const bmrOld = calculateBMR(170, 70, 60, 'male');
    expect(bmrYoung).toBeGreaterThan(bmrOld);

    // The difference should be exactly 5 * (60-20) = 200
    expect(bmrYoung - bmrOld).toBeCloseTo(200, 5);
  });

  // -- Edge cases ----------------------------------------------------------

  it('handles very low weight', () => {
    const bmr = calculateBMR(50, 60, 25, 'female');
    // 50 lbs = 22.6796 kg, 60 in = 152.4 cm
    // 10 * 22.6796 + 6.25 * 152.4 - 5 * 25 - 161
    // = 226.796 + 952.5 - 125 - 161 = 893.296
    expect(bmr).toBeCloseTo(893.296, 1);
    expect(bmr).toBeGreaterThan(0);
  });

  it('handles very high weight', () => {
    const bmr = calculateBMR(400, 75, 40, 'male');
    // 400 lbs = 181.437 kg, 75 in = 190.5 cm
    // 10 * 181.437 + 6.25 * 190.5 - 5 * 40 + 5
    // = 1814.37 + 1190.625 - 200 + 5 = 2809.995
    expect(bmr).toBeCloseTo(2809.995, 1);
  });

  it('returns a positive number for typical human inputs', () => {
    // Typical male
    expect(calculateBMR(180, 70, 30, 'male')).toBeGreaterThan(0);
    // Typical female
    expect(calculateBMR(140, 65, 30, 'female')).toBeGreaterThan(0);
  });

  it('handles age 0 (newborn-like, just a math check)', () => {
    const bmr = calculateBMR(100, 60, 0, 'male');
    // 100 lbs = 45.3592 kg, 60 in = 152.4 cm
    // 10 * 45.3592 + 6.25 * 152.4 - 0 + 5 = 453.592 + 952.5 + 5 = 1411.092
    expect(bmr).toBeCloseTo(1411.092, 1);
  });
});

// ---------------------------------------------------------------------------
// smoothWeightTrend
// ---------------------------------------------------------------------------
describe('smoothWeightTrend', () => {
  // -- Empty / single point ------------------------------------------------

  it('returns empty array for empty input', () => {
    expect(smoothWeightTrend([])).toEqual([]);
  });

  it('returns initial weight as trend for a single data point', () => {
    const weights = [{ date: '2025-01-01', weight: 180 }];
    const result = smoothWeightTrend(weights);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: '2025-01-01',
      weight: 180,
      trend: 180,
    });
  });

  // -- Stable weight (trend should equal weight) ---------------------------

  it('trend equals weight when weight is constant', () => {
    const weights = Array.from({ length: 7 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      weight: 180,
    }));
    const result = smoothWeightTrend(weights);

    for (const r of result) {
      expect(r.trend).toBe(180);
      expect(r.weight).toBe(180);
    }
  });

  // -- Downward linear trend -----------------------------------------------

  it('trend lags behind during steady weight loss', () => {
    // Losing exactly 0.2 lbs/day
    const weights = Array.from({ length: 10 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      weight: 200 - i * 0.2,
    }));
    const result = smoothWeightTrend(weights, 0.1);

    // Trend should lag behind (be higher than) the actual dropping weight
    // (except possibly the first point where they're equal)
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.trend).toBeGreaterThan(result[i]!.weight);
    }

    // Trend should still be decreasing (or equal on consecutive days due to rounding)
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.trend).toBeLessThanOrEqual(result[i - 1]!.trend);
    }

    // Overall direction must be downward
    expect(result[result.length - 1]!.trend).toBeLessThan(result[0]!.trend);
  });

  // -- Upward linear trend -------------------------------------------------

  it('trend lags behind during steady weight gain', () => {
    const weights = Array.from({ length: 10 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      weight: 170 + i * 0.3,
    }));
    const result = smoothWeightTrend(weights, 0.1);

    // Trend should lag behind (be lower than) the rising weight
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.trend).toBeLessThan(result[i]!.weight);
    }

    // Trend should still be increasing (or equal on consecutive days due to rounding)
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.trend).toBeGreaterThanOrEqual(result[i - 1]!.trend);
    }

    // Overall direction must be upward
    expect(result[result.length - 1]!.trend).toBeGreaterThan(result[0]!.trend);
  });

  // -- Volatile weight (trend should be smoother) --------------------------

  it('trend is smoother than volatile weight data', () => {
    // Alternating up/down by 2 lbs around 180
    const weights = [
      { date: '2025-01-01', weight: 180 },
      { date: '2025-01-02', weight: 182 },
      { date: '2025-01-03', weight: 178 },
      { date: '2025-01-04', weight: 183 },
      { date: '2025-01-05', weight: 177 },
      { date: '2025-01-06', weight: 182 },
      { date: '2025-01-07', weight: 178 },
    ];
    const result = smoothWeightTrend(weights, 0.1);

    // Calculate variance of weights vs variance of trends
    const avgWeight =
      weights.reduce((s, w) => s + w.weight, 0) / weights.length;
    const avgTrend = result.reduce((s, r) => s + r.trend, 0) / result.length;

    const weightVariance =
      weights.reduce((s, w) => s + (w.weight - avgWeight) ** 2, 0) /
      weights.length;
    const trendVariance =
      result.reduce((s, r) => s + (r.trend - avgTrend) ** 2, 0) /
      result.length;

    // Trend variance should be much smaller than weight variance
    expect(trendVariance).toBeLessThan(weightVariance);
  });

  it('all trend values stay within the range of observed weights for volatile data', () => {
    const weights = [
      { date: '2025-01-01', weight: 180 },
      { date: '2025-01-02', weight: 184 },
      { date: '2025-01-03', weight: 176 },
      { date: '2025-01-04', weight: 183 },
      { date: '2025-01-05', weight: 177 },
    ];
    const result = smoothWeightTrend(weights, 0.1);

    const minWeight = Math.min(...weights.map((w) => w.weight));
    const maxWeight = Math.max(...weights.map((w) => w.weight));

    for (const r of result) {
      expect(r.trend).toBeGreaterThanOrEqual(minWeight);
      expect(r.trend).toBeLessThanOrEqual(maxWeight);
    }
  });

  // -- Custom smoothing factor ----------------------------------------------

  it('higher smoothing factor tracks weight more closely', () => {
    const weights = [
      { date: '2025-01-01', weight: 180 },
      { date: '2025-01-02', weight: 185 }, // big spike
    ];

    const slow = smoothWeightTrend(weights, 0.1);
    const fast = smoothWeightTrend(weights, 0.5);

    // Both start at 180
    expect(slow[0]!.trend).toBe(180);
    expect(fast[0]!.trend).toBe(180);

    // After the spike, fast should be closer to 185 than slow
    // slow: 0.1*185 + 0.9*180 = 18.5 + 162 = 180.5
    // fast: 0.5*185 + 0.5*180 = 92.5 + 90 = 182.5
    expect(slow[1]!.trend).toBe(180.5);
    expect(fast[1]!.trend).toBe(182.5);

    expect(fast[1]!.trend).toBeGreaterThan(slow[1]!.trend);
  });

  // -- smoothingFactor = 1.0 means trend = weight --------------------------

  it('with smoothingFactor=1.0, trend exactly equals weight', () => {
    const weights = [
      { date: '2025-01-01', weight: 180 },
      { date: '2025-01-02', weight: 175 },
      { date: '2025-01-03', weight: 185 },
    ];
    const result = smoothWeightTrend(weights, 1.0);

    for (let i = 0; i < result.length; i++) {
      expect(result[i]!.trend).toBe(result[i]!.weight);
    }
  });

  // -- smoothingFactor = 0.0 means trend never changes ---------------------

  it('with smoothingFactor=0.0, trend stays at first weight forever', () => {
    const weights = [
      { date: '2025-01-01', weight: 180 },
      { date: '2025-01-02', weight: 200 },
      { date: '2025-01-03', weight: 160 },
    ];
    const result = smoothWeightTrend(weights, 0.0);

    for (const r of result) {
      expect(r.trend).toBe(180);
    }
  });

  // -- Rounding behavior ---------------------------------------------------

  it('rounds trend to one decimal place', () => {
    const weights = [
      { date: '2025-01-01', weight: 180 },
      { date: '2025-01-02', weight: 181.3 },
    ];
    const result = smoothWeightTrend(weights, 0.1);

    // trend = 0.1 * 181.3 + 0.9 * 180 = 18.13 + 162 = 180.13 → rounded to 180.1
    expect(result[1]!.trend).toBe(180.1);
    // Verify rounding
    for (const r of result) {
      expect(r.trend).toBe(Math.round(r.trend * 10) / 10);
    }
  });

  // -- Preserves original weight data --------------------------------------

  it('preserves original weight and date values in output', () => {
    const weights = [
      { date: '2025-03-15', weight: 175.4 },
      { date: '2025-03-16', weight: 176.1 },
      { date: '2025-03-17', weight: 174.9 },
    ];
    const result = smoothWeightTrend(weights);

    for (let i = 0; i < weights.length; i++) {
      expect(result[i]!.date).toBe(weights[i]!.date);
      expect(result[i]!.weight).toBe(weights[i]!.weight);
    }
  });

  // -- First point trend always equals first weight ------------------------

  it('first point trend always equals first weight regardless of smoothing factor', () => {
    const weights = [
      { date: '2025-01-01', weight: 192.7 },
      { date: '2025-01-02', weight: 190 },
    ];

    for (const alpha of [0.01, 0.1, 0.3, 0.5, 0.9, 1.0]) {
      const result = smoothWeightTrend(weights, alpha);
      expect(result[0]!.trend).toBe(192.7);
    }
  });

  // -- Manual EMA calculation verification ---------------------------------

  it('matches manual EMA calculation for 4-point series', () => {
    const weights = [
      { date: '2025-01-01', weight: 200 },
      { date: '2025-01-02', weight: 198 },
      { date: '2025-01-03', weight: 201 },
      { date: '2025-01-04', weight: 199 },
    ];
    const alpha = 0.2;
    const result = smoothWeightTrend(weights, alpha);

    // Manual calculation:
    // t0: trend = 200
    let trend = 200;
    expect(result[0]!.trend).toBe(Math.round(trend * 10) / 10);

    // t1: trend = 0.2*198 + 0.8*200 = 39.6 + 160 = 199.6
    trend = alpha * 198 + (1 - alpha) * trend;
    expect(result[1]!.trend).toBe(Math.round(trend * 10) / 10);

    // t2: trend = 0.2*201 + 0.8*199.6 = 40.2 + 159.68 = 199.88 → 199.9
    trend = alpha * 201 + (1 - alpha) * trend;
    expect(result[2]!.trend).toBe(Math.round(trend * 10) / 10);

    // t3: trend = 0.2*199 + 0.8*199.88 = 39.8 + 159.904 = 199.704 → 199.7
    trend = alpha * 199 + (1 - alpha) * trend;
    expect(result[3]!.trend).toBe(Math.round(trend * 10) / 10);
  });

  // -- Edge: zero weight ---------------------------------------------------

  it('handles zero weight entries without crashing', () => {
    const weights = [
      { date: '2025-01-01', weight: 0 },
      { date: '2025-01-02', weight: 0 },
    ];
    const result = smoothWeightTrend(weights, 0.1);

    expect(result).toHaveLength(2);
    expect(result[0]!.trend).toBe(0);
    expect(result[1]!.trend).toBe(0);
  });
});
