import { useState, useRef } from 'react';
import styles from './DataExportImportSection.module.css';

interface ImportResult {
  summary: {
    userUpdated: boolean;
    foodsInserted: number;
    foodsSkipped: number;
    foodLogInserted: number;
    foodLogSkipped: number;
    weightInserted: number;
    weightUpdated: number;
    importedIntakeDays: number;
  };
}

export default function DataExportImportSection() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    setExportSuccess(false);
    setResult(null);

    try {
      const res = await fetch('/api/import/export');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `food-tracker-export-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    setError(null);
    setResult(null);
    setExportSuccess(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import/data', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Import failed (${res.status})`);
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImport(file);
    e.target.value = '';
  }

  return (
    <div className={styles.section}>
      <div className={styles.row}>
        <div>
          <span className={styles.label}>Export All Data</span>
          <span className={styles.hint}>Download a JSON backup of all your data</span>
        </div>
        <button
          className={styles.btn}
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Download'}
        </button>
      </div>

      <div className={styles.row}>
        <div>
          <span className={styles.label}>Import Data</span>
          <span className={styles.hint}>Restore from a JSON backup file</span>
        </div>
        <button
          className={styles.btn}
          onClick={() => fileRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Importing...' : 'Choose File'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          hidden
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {exportSuccess && <div className={styles.status}>Export downloaded successfully.</div>}

      {result && (
        <div className={styles.result}>
          <span className={styles.resultTitle}>Import Complete</span>
          <ul className={styles.resultList}>
            {result.summary.userUpdated && <li>Profile settings updated</li>}
            <li>{result.summary.foodsInserted} foods added{result.summary.foodsSkipped > 0 ? ` (${result.summary.foodsSkipped} duplicates skipped)` : ''}</li>
            <li>{result.summary.foodLogInserted} food log entries{result.summary.foodLogSkipped > 0 ? ` (${result.summary.foodLogSkipped} skipped)` : ''}</li>
            <li>{result.summary.weightInserted} weight entries{result.summary.weightUpdated > 0 ? ` (${result.summary.weightUpdated} updated)` : ''}</li>
            {result.summary.importedIntakeDays > 0 && <li>{result.summary.importedIntakeDays} imported intake days</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
