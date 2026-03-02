import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/layout/PageHeader';
import SettingsGroup from '../components/settings/SettingsGroup';
import SettingsField from '../components/settings/SettingsField';
import ImportSection from '../components/settings/ImportSection';
import { useTheme } from '../context/ThemeContext';
import { useApi, apiFetch } from '../hooks/useApi';
import styles from './SettingsView.module.css';
import viewStyles from './Views.module.css';

interface User {
  id: string;
  age: number;
  sex: string;
  heightInches: string;
  currentWeight: string;
  objective: string;
  activityLevel: string;
  calorieTarget: number;
  proteinTarget: number;
  fatTarget: number;
  carbTarget: number;
  tdeeSmoothingFactor: string;
}

export default function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { data: user, refetch } = useApi<User>('/user');
  const [form, setForm] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        age: user.age,
        sex: user.sex,
        heightInches: user.heightInches,
        currentWeight: user.currentWeight,
        objective: user.objective,
        activityLevel: user.activityLevel,
        calorieTarget: user.calorieTarget,
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

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await apiFetch('/user', { method: 'PUT', body: JSON.stringify(form) });
      refetch();
    } finally {
      setSaving(false);
    }
  }, [form, refetch]);

  const smoothVal = Number(form.tdeeSmoothingFactor || 0.1);

  return (
    <div className={viewStyles.view}>
      <PageHeader title="Settings" />
      <div className={styles.content}>
        <SettingsGroup title="Profile">
          <SettingsField label="Age">
            <input
              type="number"
              value={form.age ?? ''}
              onChange={(e) => updateField('age', parseInt(e.target.value) || 0)}
              onBlur={save}
            />
          </SettingsField>
          <SettingsField label="Sex">
            <select
              value={form.sex ?? 'male'}
              onChange={(e) => { updateField('sex', e.target.value); setTimeout(save, 0); }}
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
              onBlur={save}
            />
          </SettingsField>
          <SettingsField label="Weight" suffix="lbs">
            <input
              type="number"
              value={form.currentWeight ?? ''}
              onChange={(e) => updateField('currentWeight', e.target.value)}
              onBlur={save}
            />
          </SettingsField>
        </SettingsGroup>

        <SettingsGroup title="Goal">
          <SettingsField label="Objective">
            <select
              value={form.objective ?? 'maintain'}
              onChange={(e) => { updateField('objective', e.target.value); setTimeout(save, 0); }}
            >
              <option value="cut">Cut</option>
              <option value="maintain">Maintain</option>
              <option value="bulk">Bulk</option>
            </select>
          </SettingsField>
          <SettingsField label="Calorie Target" suffix="cal">
            <input
              type="number"
              value={form.calorieTarget ?? ''}
              onChange={(e) => updateField('calorieTarget', parseInt(e.target.value) || 0)}
              onBlur={save}
            />
          </SettingsField>
        </SettingsGroup>

        <SettingsGroup title="Macro Targets">
          <SettingsField label="Protein" suffix="g">
            <input
              type="number"
              value={form.proteinTarget ?? ''}
              onChange={(e) => updateField('proteinTarget', parseInt(e.target.value) || 0)}
              onBlur={save}
            />
          </SettingsField>
          <SettingsField label="Fat" suffix="g">
            <input
              type="number"
              value={form.fatTarget ?? ''}
              onChange={(e) => updateField('fatTarget', parseInt(e.target.value) || 0)}
              onBlur={save}
            />
          </SettingsField>
          <SettingsField label="Carbs" suffix="g">
            <input
              type="number"
              value={form.carbTarget ?? ''}
              onChange={(e) => updateField('carbTarget', parseInt(e.target.value) || 0)}
              onBlur={save}
            />
          </SettingsField>
        </SettingsGroup>

        <SettingsGroup title="Adaptive TDEE">
          <SettingsField label="Activity Level">
            <select
              value={form.activityLevel ?? '1.25'}
              onChange={(e) => { updateField('activityLevel', e.target.value); setTimeout(save, 0); }}
            >
              <option value="1.0">Sedentary (1.0)</option>
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
              onMouseUp={save}
              onTouchEnd={save}
            />
          </SettingsField>
        </SettingsGroup>

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

        <SettingsGroup title="Data">
          <ImportSection />
        </SettingsGroup>

        {saving && <div className={styles.saving}>Saving...</div>}
      </div>
    </div>
  );
}
