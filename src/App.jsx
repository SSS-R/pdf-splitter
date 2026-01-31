import { useState, useRef } from 'react';
import { Upload, FileText, Download, Scissors, X, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { splitPdf } from './utils/pdfHelpers';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);

  // State for dynamic ranges
  const [ranges, setRanges] = useState([
    { id: '1', value: '' },
    { id: '2', value: '' }
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [downloadBlobs, setDownloadBlobs] = useState([]); // Array of { blob, filename }
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    processFile(selectedFile);
  };

  const processFile = async (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }

    setError('');
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileBuffer(event.target.result);
    };
    reader.readAsArrayBuffer(selectedFile);

    setDownloadBlobs([]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    processFile(droppedFile);
  };

  // Range Management
  const addRange = () => {
    setRanges([...ranges, { id: Date.now().toString(), value: '' }]);
  };

  const removeRange = (id) => {
    if (ranges.length <= 1) return; // Keep at least one
    setRanges(ranges.filter(r => r.id !== id));
  };

  const updateRange = (id, newValue) => {
    setRanges(ranges.map(r => r.id === id ? { ...r, value: newValue } : r));
  };

  const handleSplit = async () => {
    const rangeValues = ranges.map(r => r.value).filter(v => v.trim() !== '');

    if (!fileBuffer || rangeValues.length === 0) {
      setError('Please select a file and define at least one range.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setDownloadBlobs([]);

    try {
      const pdfBytesArray = await splitPdf(fileBuffer, rangeValues);

      const newBlobs = pdfBytesArray.map((bytes, index) => {
        if (!bytes) return null;
        const blob = new Blob([bytes], { type: 'application/pdf' });
        return {
          blob,
          part: index + 1
        };
      }).filter(Boolean);

      setDownloadBlobs(newBlobs);

      if (newBlobs.length === 0) {
        setError('No valid pages were found in the specified ranges.');
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while splitting the PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (blobObj) => {
    if (!blobObj) return;

    let filename = 'split-document.pdf';
    if (file && file.name) {
      const nameWithoutExt = file.name.replace(/\.pdf$/i, '');
      filename = `${nameWithoutExt}-part${blobObj.part}.pdf`;
    }

    saveAs(blobObj.blob, filename);
  };

  const handleReset = () => {
    setFile(null);
    setFileBuffer(null);
    setRanges([
      { id: '1', value: '' },
      { id: '2', value: '' }
    ]);
    setDownloadBlobs([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>PDF Splitter</h1>
        <p>Securely split your PDF documents locally.</p>
      </header>

      <main className="card">
        {!file ? (
          <div
            className="dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="icon-large" />
            <h3>Drop your PDF here</h3>
            <p>or click to browse</p>
            <input
              type="file"
              accept=".pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
              hidden
            />
          </div>
        ) : (
          <div className="file-section">
            <div className="dropzone active">
              <div className="file-info">
                <FileText size={32} className="text-blue-500" />
                <span>{file.name}</span>
                <button onClick={(e) => { e.stopPropagation(); handleReset(); }} className="remove-btn">
                  <X size={20} />
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
                {error}
              </div>
            )}

            <div className="ranges-container">
              <div className="input-grid-dynamic">
                {ranges.map((range, index) => (
                  <div key={range.id} className="input-group dynamic">
                    <label>Part {index + 1}</label>
                    <div className="input-with-action">
                      <input
                        type="text"
                        placeholder="e.g. 1-5"
                        value={range.value}
                        onChange={(e) => updateRange(range.id, e.target.value)}
                      />
                      {ranges.length > 1 && (
                        <button className="icon-btn delete" onClick={() => removeRange(range.id)} title="Remove Range">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button className="add-range-btn" onClick={addRange}>
                <Plus size={16} /> Add Another Range
              </button>
            </div>

            <button
              className="action-btn"
              onClick={handleSplit}
              disabled={isProcessing || ranges.every(r => !r.value)}
            >
              {isProcessing ? 'Processing...' : (
                <>
                  <Scissors size={20} /> Split PDF
                </>
              )}
            </button>

            {downloadBlobs.length > 0 && (
              <div className="download-section">
                {downloadBlobs.map((blobObj) => (
                  <button key={blobObj.part} className="download-btn" onClick={() => handleDownload(blobObj)}>
                    <Download size={18} /> Part {blobObj.part}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
