import { useState, useRef } from 'react';
import styles from './ImportSection.module.css';

const CSV_TEMPLATE = 'name,category,emoji,servingLabel,servingGrams,calories,protein,fat,carbs\n';

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export default function CsvImportSection() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDownloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'food-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setResult(data);
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
          <span className={styles.label}>Import from CSV</span>
          <span className={styles.hint}>Upload a .csv file with food data</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className={styles.btn} onClick={handleDownloadTemplate}>
            Template
          </button>
          <button
            className={styles.btn}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Importing...' : 'Choose File'}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          hidden
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.result}>
          <span className={styles.resultTitle}>Import Complete</span>
          <ul className={styles.resultList}>
            <li>{result.imported} foods imported</li>
            {result.skipped > 0 && <li>{result.skipped} rows skipped</li>}
          </ul>
          {result.errors.length > 0 && (
            <details style={{ marginTop: 'var(--space-sm)' }}>
              <summary style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                Show errors
              </summary>
              <ul className={styles.resultList} style={{ marginTop: 'var(--space-xs)' }}>
                {result.errors.map((err, i) => (
                  <li key={i} style={{ color: 'var(--text-tertiary)' }}>
                    Row {err.row}: {err.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
