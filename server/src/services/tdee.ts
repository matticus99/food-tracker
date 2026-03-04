/**
 * TDEE Engine — Exponential Moving Average
 *
 * For each day with weight + intake data:
 *   calculated_tdee = intake + (prev_weight - current_weight) * 3500 / days_between
 *   smoothed_tdee = α * calculated_tdee + (1 - α) * prev_smoothed_tdee
 *
 * Where α = user's smoothing_factor (default 0.1)
 * Lower α = smoother/slower adaptation
 * Higher α = more responsive/noisier
 */

export interface TdeeDataPoint {
  date: string;
  weight: number;
  calories: number;
}

export interface TdeeResult {
  date: string;
  tdeeEstimate: number;
  caloriesConsumed: number;
  weightUsed: number;
}

/**
 * Calculate TDEE using Exponential Moving Average.
 * Data must be sorted by date ascending.
 */
export function calculateTdeeHistory(
  data: TdeeDataPoint[],
  smoothingFactor: number = 0.1,
  initialTdee?: number,
): TdeeResult[] {
  if (data.length === 0) return [];

  const results: TdeeResult[] = [];

  // Use initial TDEE or estimate from first data point
  let prevSmoothedTdee = initialTdee ?? data[0]!.calories;
  let prevWeight = data[0]!.weight;
  let prevDate = new Date(data[0]!.date);

  for (let i = 0; i < data.length; i++) {
    const point = data[i]!;
    const currentDate = new Date(point.date);

    if (i === 0) {
      results.push({
        date: point.date,
        tdeeEstimate: prevSmoothedTdee,
        caloriesConsumed: point.calories,
        weightUsed: point.weight,
      });
      continue;
    }

    // Days between measurements
    const daysBetween = Math.max(
      1,
      (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Weight change in lbs → caloric equivalent
    // ~3500 calories per pound of body weight
    const weightChangeLbs = prevWeight - point.weight;
    const caloriesFromWeightChange = (weightChangeLbs * 3500) / daysBetween;

    // Calculated TDEE for this period
    const calculatedTdee = point.calories + caloriesFromWeightChange;

    // Apply EMA smoothing
    const smoothedTdee =
      smoothingFactor * calculatedTdee + (1 - smoothingFactor) * prevSmoothedTdee;

    results.push({
      date: point.date,
      tdeeEstimate: Math.round(smoothedTdee * 10) / 10,
      caloriesConsumed: point.calories,
      weightUsed: point.weight,
    });

    prevSmoothedTdee = smoothedTdee;
    prevWeight = point.weight;
    prevDate = currentDate;
  }

  return results;
}

/**
 * Calculate BMR using the Mifflin-St Jeor equation.
 */
export function calculateBMR(
  weightLbs: number,
  heightInches: number,
  age: number,
  sex: 'male' | 'female',
): number {
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;

  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

/**
 * Apply EMA smoothing to a series of weight values.
 */
export function smoothWeightTrend(
  weights: { date: string; weight: number }[],
  smoothingFactor: number = 0.1,
): { date: string; weight: number; trend: number }[] {
  if (weights.length === 0) return [];

  const results: { date: string; weight: number; trend: number }[] = [];
  let trend = weights[0]!.weight;

  for (const w of weights) {
    trend = smoothingFactor * w.weight + (1 - smoothingFactor) * trend;
    results.push({
      date: w.date,
      weight: w.weight,
      trend: Math.round(trend * 10) / 10,
    });
  }

  return results;
}

/**
 * Compute calorie target from TDEE + objective + pace.
 * goalPace is the daily calorie adjustment (e.g. 500 = ~1 lb/wk).
 */
export interface CalorieTargetResult {
  calorieTarget: number;
  tdeeUsed: number;
  tdeeSource: 'adaptive' | 'estimated';
  objectiveOffset: number;
  objective: string;
  goalPace: number;
}

export function computeCalorieTarget(params: {
  latestAdaptiveTdee: number | null;
  estimatedTdee: number | null;
  objective: 'cut' | 'maintain' | 'bulk';
  goalPace: number;
}): CalorieTargetResult | null {
  const { latestAdaptiveTdee, estimatedTdee, objective, goalPace } = params;

  const tdeeUsed = latestAdaptiveTdee ?? estimatedTdee;
  if (tdeeUsed == null) return null;

  const tdeeSource: 'adaptive' | 'estimated' = latestAdaptiveTdee != null ? 'adaptive' : 'estimated';
  let objectiveOffset = 0;
  if (objective === 'cut') objectiveOffset = -goalPace;
  else if (objective === 'bulk') objectiveOffset = goalPace;

  return {
    calorieTarget: Math.max(1200, Math.round(tdeeUsed + objectiveOffset)),
    tdeeUsed: Math.round(tdeeUsed),
    tdeeSource,
    objectiveOffset,
    objective,
    goalPace,
  };
}
