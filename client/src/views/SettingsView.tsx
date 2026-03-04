import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/layout/PageHeader';
import SettingsGroup from '../components/settings/SettingsGroup';
import SettingsField from '../components/settings/SettingsField';
import ImportSection from '../components/settings/ImportSection';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../context/ThemeContext';
import { useApi, apiFetch } from '../hooks/useApi';
import styles from './SettingsView.module.css';
import viewStyles from './Views.module.css';

interface ComputedCalorieTarget {
  calorieTarget: number;
  tdeeUsed: number;
  tdeeSource: 'adaptive' | 'estimated';
  objectiveOffset: number;
  objective: string;
  goalPace: number;
}

interface User {
  id: string;
  age: number;
  sex: string;
  heightInches: string;
  currentWeight: string;
  objective: string;
  activityLevel: string;
  goalPace: number;
  proteinTarget: number;
  fatTarget: number;
  carbTarget: number;
  tdeeSmoothingFactor: string;
  computedCalorieTarget: ComputedCalorieTarget | null;
}

export default function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { data: user, loading, refetch } = useApi<User>('/user');
  const [form, setForm] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setForm({
        age: user.age,
        sex: user.sex,
        heightInches: user.heightInches,
        currentWeight: user.currentWeight,
        objective: user.objective,
        activityLevel: user.activityLevel,
        goalPace: user.goalPace,
        proteinTarget: user.proteinTarget,
        fatTarget: user.fatTarget,
        carbTarget: user.carbTarget,
        tdeeSmoothingFactor: user.tdeeSmoothingFactor,
      });
    }
  }, [user]);

  const updateField = useCallback((field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const save = useCallback(async (overrides?: Partial<User>) => {
    setSaving(true);
    try {
      await apiFetch('/user', { method: 'PUT', body: JSON.stringify({ ...form, ...overrides }) });
      refetch();
      toast('Settings saved', 'success');
    } catch {
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }, [form, refetch, toast]);

  const smoothVal = Number(form.tdeeSmoothingFactor || 0.1);

  const isLoading = loading && !user;

  return (
    <div className={viewStyles.view}>
      <PageHeader title="Settings" />
      <div className={styles.content}>
        {isLoading ? (
          <>
            <SkeletonCard lines={4} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={3} />
          </>
        ) : (
          <>
            <div className={viewStyles.staggerIn}>
              <SettingsGroup title="Profile">
                <SettingsField label="Age">
                  <input
                    type="number"
                    value={form.age ?? ''}
                    onChange={(e) => updateField('age', parseInt(e.target.value) || 0)}
                    onBlur={() => save()}
                  />
                </SettingsField>
                <SettingsField label="Sex">
                  <select
                    value={form.sex ?? 'male'}
                    onChange={(e) => { updateField('sex', e.target.value); save({ sex: e.target.value }); }}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </SettingsField>
                <SettingsField label="Height" suffix="in">
                  <input
                    type="number"
                    value={form.heightInches ?? ''}
                    onChange={(e) => updateField('heightInches', e.target.value)}
                    onBlur={() => save()}
                  />
                </SettingsField>
                <SettingsField label="Weight" suffix="lbs">
                  <input
                    type="number"
                    value={form.currentWeight ?? ''}
                    onChange={(e) => updateField('currentWeight', e.target.value)}
                    onBlur={() => save()}
                  />
                </SettingsField>
              </SettingsGroup>
            </div>

            <div className={viewStyles.staggerIn} style={{ animationDelay: '60ms' }}>
              <SettingsGroup title="Goal">
                <SettingsField label="Objective">
                  <select
                    value={form.objective ?? 'maintain'}
                    onChange={(e) => { updateField('objective', e.target.value); save({ objective: e.target.value }); }}
                  >
                    <option value="cut">Cut</option>
                    <option value="maintain">Maintain</option>
                    <option value="bulk">Bulk</option>
                  </select>
                </SettingsField>
                <SettingsField label="Rate">
                  <select
                    value={String((form.goalPace ?? 500) / 500)}
                    onChange={(e) => {
                      const pace = Math.round(Number(e.target.value) * 500);
                      updateField('goalPace', pace);
                      save({ goalPace: pace } as Partial<User>);
                    }}
                  >
                    <option value="0.5">0.5 lb / week</option>
                    <option value="1">1 lb / week</option>
                    <option value="1.5">1.5 lb / week</option>
                    <option value="2">2 lb / week</option>
                  </select>
                </SettingsField>
                <SettingsField label="Calorie Target">
                  <div className={styles.readOnlyValue}>
                    {user?.computedCalorieTarget
                      ? `${user.computedCalorieTarget.calorieTarget} cal`
                      : '—'}
                  </div>
                </SettingsField>
                {user?.computedCalorieTarget && (
                  <div className={styles.targetBreakdown}>
                    {user.computedCalorieTarget.tdeeSource === 'adaptive' ? 'Adaptive' : 'Est.'} TDEE {user.computedCalorieTarget.tdeeUsed}
                    {user.computedCalorieTarget.objectiveOffset !== 0 && (
                      <> {user.computedCalorieTarget.objectiveOffset > 0 ? '+' : '−'} {Math.abs(user.computedCalorieTarget.objectiveOffset)} {user.computedCalorieTarget.objective}</>
                    )}
                    {' = '}{user.computedCalorieTarget.calorieTarget}
                  </div>
                )}
              </SettingsGroup>
            </div>

            <div className={viewStyles.staggerIn} style={{ animationDelay: '120ms' }}>
              <SettingsGroup title="Macro Targets">
                <SettingsField label="Protein" suffix="g">
                  <input
                    type="number"
                    value={form.proteinTarget ?? ''}
                    onChange={(e) => updateField('proteinTarget', parseInt(e.target.value) || 0)}
                    onBlur={() => save()}
                  />
                </SettingsField>
                <SettingsField label="Fat" suffix="g">
                  <input
                    type="number"
                    value={form.fatTarget ?? ''}
                    onChange={(e) => updateField('fatTarget', parseInt(e.target.value) || 0)}
                    onBlur={() => save()}
                  />
                </SettingsField>
                <SettingsField label="Carbs" suffix="g">
                  <input
                    type="number"
                    value={form.carbTarget ?? ''}
                    onChange={(e) => updateField('carbTarget', parseInt(e.target.value) || 0)}
                    onBlur={() => save()}
                  />
                </SettingsField>
              </SettingsGroup>
            </div>

            <div className={viewStyles.staggerIn} style={{ animationDelay: '180ms' }}>
              <SettingsGroup title="Adaptive TDEE">
                <SettingsField label="Activity Level">
                  <select
                    value={String(parseFloat(form.activityLevel || '1.25'))}
                    onChange={(e) => { updateField('activityLevel', e.target.value); save({ activityLevel: e.target.value }); }}
                  >
                    <option value="1">Sedentary (1.0)</option>
                    <option value="1.15">Light (1.15)</option>
                    <option value="1.25">Moderate (1.25)</option>
                    <option value="1.4">Active (1.4)</option>
                    <option value="1.55">Very Active (1.55)</option>
                  </select>
                </SettingsField>
                <SettingsField label="Smoothing" suffix={smoothVal.toFixed(2)}>
                  <input
                    type="range"
                    min="0.05"
                    max="0.30"
                    step="0.01"
                    value={smoothVal}
                    onChange={(e) => updateField('tdeeSmoothingFactor', e.target.value)}
                    onMouseUp={() => save()}
                    onTouchEnd={() => save()}
                  />
                </SettingsField>
              </SettingsGroup>
            </div>

            <div className={viewStyles.staggerIn} style={{ animationDelay: '240ms' }}>
              <SettingsGroup title="Appearance">
                <SettingsField label="Theme">
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </SettingsField>
              </SettingsGroup>
            </div>

            <div className={viewStyles.staggerIn} style={{ animationDelay: '300ms' }}>
              <SettingsGroup title="Data">
                <ImportSection />
              </SettingsGroup>
            </div>
          </>
        )}

        {saving && <div className={styles.saving}>Saving...</div>}
      </div>
    </div>
  );
}
