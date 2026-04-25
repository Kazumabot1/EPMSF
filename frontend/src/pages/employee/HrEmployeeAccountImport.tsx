import { useRef, useState } from 'react';
import api from '../../services/api';
import './employee-ui.css';

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  warnings: string[];
};

const HrEmployeeAccountImport = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const chooseFile = () => {
    fileInputRef.current?.click();
  };

  const importFile = async () => {
    if (!file) {
      alert('Please click "Choose Excel / CSV File" first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      setResult(null);

      const response = await api.post<ImportResult>(
        '/hr/employee-accounts/import',
        formData
      );

      setResult(response.data);
      alert('Import completed');
    } catch (error) {
      console.error(error);
      alert('Import failed. Please check backend console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employee-container">
      <h2>Import Employee Accounts</h2>

      <p>Select your local Excel or CSV file, then click Import.</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => {
          const selectedFile = e.target.files?.[0] ?? null;
          setFile(selectedFile);
          setResult(null);
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '16px',
        }}
      >
        <button type="button" onClick={chooseFile}>
          Choose Excel / CSV File
        </button>

        <span style={{ minWidth: '220px' }}>
          {file ? file.name : 'No file selected'}
        </span>

        <button type="button" onClick={importFile} disabled={loading || !file}>
          {loading ? 'Importing...' : 'Import'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 20 }}>
          <h3>Import Result</h3>
          <p>Created: {result.created}</p>
          <p>Updated: {result.updated}</p>
          <p>Skipped: {result.skipped}</p>

          {result.warnings.length > 0 && (
            <>
              <h4>Warnings</h4>
              <ul>
                {result.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default HrEmployeeAccountImport;