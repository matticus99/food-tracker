import { useState, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import styles from './ImportSection.module.css';

interface ImportStatus {
  hasImportedData: boolean;
}

interface ImportResult {
  summary: {
    dailyIntakeCount: number;
    weightLogCount: number;
    tdeeHistoryCount: number;
    favoriteFoodsCount: number;
    historyFoodsCount: number;
  };
}

export default function ImportSection() {
  const { data: status, refetch: refetchStatus } = useApi<ImportStatus>('/import/status');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import/macrofactor', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setResult(data);
      refetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  }

  return (
    <div className={styles.section}>
      <div className={styles.row}>
        <div>
          <span className={styles.label}>Import from MacroFactor</span>
          <span className={styles.hint}>Upload your .xlsx export file</span>
        </div>
        <button
          className={styles.btn}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Importing...' : 'Choose File'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          hidden
        />
      </div>

      {status?.hasImportedData && !result && (
        <div className={styles.status}>Previously imported data exists.</div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.result}>
          <span className={styles.resultTitle}>Import Complete</span>
          <ul className={styles.resultList}>
            <li>{result.summary.dailyIntakeCount} days of intake</li>
            <li>{result.summary.weightLogCount} weight entries</li>
            <li>{result.summary.tdeeHistoryCount} TDEE entries</li>
            <li>{result.summary.favoriteFoodsCount} foods with macros</li>
            <li>{result.summary.historyFoodsCount} food names</li>
          </ul>
        </div>
      )}
    </div>
  );
}
