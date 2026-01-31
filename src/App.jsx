import { useState, useRef } from 'react';
import { Upload, FileText, Download, Scissors, X, AlertCircle } from 'lucide-react';
import { saveAs } from 'file-saver';
import { splitPdf } from './utils/pdfHelpers';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [range1, setRange1] = useState('');
  const [range2, setRange2] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrls, setDownloadUrls] = useState({ part1: null, part2: null });
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

    // Read file as ArrayBuffer
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileBuffer(event.target.result);
    };
    reader.readAsArrayBuffer(selectedFile);

    // Reset previous state
    setDownloadUrls({ part1: null, part2: null });
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

  const handleSplit = async () => {
    if (!fileBuffer || !range1 || !range2) {
      setError('Please select a file and define both ranges.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const { pdf1, pdf2 } = await splitPdf(fileBuffer, range1, range2);

      const blob1 = new Blob([pdf1], { type: 'application/pdf' });
      const blob2 = new Blob([pdf2], { type: 'application/pdf' });

      setDownloadUrls({
        part1: URL.createObjectURL(blob1),
        part2: URL.createObjectURL(blob2)
      });
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while splitting the PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (blobUrl, suffix) => {
    // We need the actual blob, but we only stored the URL.
    // Let's refactor to store blobs or fetch the blob from the URL.
    // Actually, simpler: just update `handleSplit` to store blobs or pass them directly.
    // For now, let's fetch the blob from the URL since we have it.
    if (!blobUrl) return;

    fetch(blobUrl)
      .then(res => res.blob())
      .then(blob => {
        let filename = 'split-document.pdf';
        if (file && file.name) {
          const nameWithoutExt = file.name.replace(/\.pdf$/i, '');
          filename = `${nameWithoutExt}-${suffix}.pdf`;
        }
        saveAs(blob, filename);
      });
  };

  const handleReset = () => {
    setFile(null);
    setFileBuffer(null);
    setRange1('');
    setRange2('');
    setDownloadUrls({ part1: null, part2: null });
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

            <div className="input-grid">
              <div className="input-group">
                <label>First Part Pages</label>
                <input
                  type="text"
                  placeholder="e.g. 1-5"
                  value={range1}
                  onChange={(e) => setRange1(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Second Part Pages</label>
                <input
                  type="text"
                  placeholder="e.g. 6-end"
                  value={range2}
                  onChange={(e) => setRange2(e.target.value)}
                />
              </div>
            </div>

            <button
              className="action-btn"
              onClick={handleSplit}
              disabled={isProcessing || !range1 || !range2}
            >
              {isProcessing ? 'Processing...' : (
                <>
                  <Scissors size={20} /> Split PDF
                </>
              )}
            </button>

            {(downloadUrls.part1 || downloadUrls.part2) && (
              <div className="download-section">
                <button className="download-btn" onClick={() => handleDownload(downloadUrls.part1, 'part1')}>
                  <Download size={18} /> Part 1
                </button>
                <button className="download-btn" onClick={() => handleDownload(downloadUrls.part2, 'part2')}>
                  <Download size={18} /> Part 2
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
