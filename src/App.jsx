import { useState, useRef } from 'react';
import {
  Upload, FileText, Download, Scissors, X, AlertCircle,
  Plus, Trash2, Merge, ShieldCheck, Zap, Lock, ChevronRight
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { splitPdf, mergePdfs } from './utils/pdfHelpers';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('split');

  // ── Split State ──
  const [splitFile, setSplitFile] = useState(null);
  const [splitBuffer, setSplitBuffer] = useState(null);
  const [ranges, setRanges] = useState([
    { id: '1', value: '' },
    { id: '2', value: '' }
  ]);
  const [splitProcessing, setSplitProcessing] = useState(false);
  const [splitError, setSplitError] = useState('');
  const [downloadBlobs, setDownloadBlobs] = useState([]);
  const splitInputRef = useRef(null);

  // ── Merge State ──
  const [mergeFiles, setMergeFiles] = useState([]); // { file, buffer }
  const [mergeProcessing, setMergeProcessing] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [mergeBlob, setMergeBlob] = useState(null);
  const mergeInputRef = useRef(null);

  // ═══════════════════════════════════════════
  //  SPLIT HANDLERS
  // ═══════════════════════════════════════════
  const handleSplitFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    processSplitFile(selectedFile);
  };

  const processSplitFile = async (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/pdf') {
      setSplitError('Please upload a valid PDF file.');
      return;
    }
    setSplitError('');
    setSplitFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => setSplitBuffer(event.target.result);
    reader.readAsArrayBuffer(selectedFile);
    setDownloadBlobs([]);
  };

  const handleSplitDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
  const handleSplitDrop = (e) => { e.preventDefault(); processSplitFile(e.dataTransfer.files?.[0]); };

  const addRange = () => setRanges([...ranges, { id: Date.now().toString(), value: '' }]);
  const removeRange = (id) => { if (ranges.length <= 1) return; setRanges(ranges.filter(r => r.id !== id)); };
  const updateRange = (id, newValue) => setRanges(ranges.map(r => r.id === id ? { ...r, value: newValue } : r));

  const handleSplit = async () => {
    const rangeValues = ranges.map(r => r.value).filter(v => v.trim() !== '');
    if (!splitBuffer || rangeValues.length === 0) {
      setSplitError('Please select a file and define at least one range.');
      return;
    }
    setSplitProcessing(true);
    setSplitError('');
    setDownloadBlobs([]);
    try {
      const pdfBytesArray = await splitPdf(splitBuffer, rangeValues);
      const newBlobs = pdfBytesArray.map((bytes, index) => {
        if (!bytes) return null;
        return { blob: new Blob([bytes], { type: 'application/pdf' }), part: index + 1 };
      }).filter(Boolean);
      setDownloadBlobs(newBlobs);
      if (newBlobs.length === 0) setSplitError('No valid pages were found in the specified ranges.');
    } catch (err) {
      console.error(err);
      setSplitError(err.message || 'An error occurred while splitting the PDF.');
    } finally {
      setSplitProcessing(false);
    }
  };

  const handleSplitDownload = (blobObj) => {
    if (!blobObj) return;
    let filename = 'split-document.pdf';
    if (splitFile?.name) {
      filename = `${splitFile.name.replace(/\.pdf$/i, '')}-part${blobObj.part}.pdf`;
    }
    saveAs(blobObj.blob, filename);
  };

  const resetSplit = () => {
    setSplitFile(null);
    setSplitBuffer(null);
    setRanges([{ id: '1', value: '' }, { id: '2', value: '' }]);
    setDownloadBlobs([]);
    setSplitError('');
    if (splitInputRef.current) splitInputRef.current.value = '';
  };

  // ═══════════════════════════════════════════
  //  MERGE HANDLERS
  // ═══════════════════════════════════════════
  const handleMergeFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    await addMergeFiles(files);
    if (mergeInputRef.current) mergeInputRef.current.value = '';
  };

  const addMergeFiles = async (files) => {
    setMergeError('');
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) { setMergeError('Please upload valid PDF files.'); return; }

    const currentCount = mergeFiles.length;
    const remaining = 3 - currentCount;
    if (remaining <= 0) { setMergeError('Maximum 3 files allowed. Remove one first.'); return; }

    const toAdd = pdfFiles.slice(0, remaining);
    const newEntries = [];

    for (const file of toAdd) {
      const buffer = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsArrayBuffer(file);
      });
      newEntries.push({ file, buffer, id: Date.now() + Math.random() });
    }

    setMergeFiles(prev => [...prev, ...newEntries]);
    setMergeBlob(null);
  };

  const handleMergeDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
  const handleMergeDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    await addMergeFiles(files);
  };

  const removeMergeFile = (id) => {
    setMergeFiles(prev => prev.filter(f => f.id !== id));
    setMergeBlob(null);
  };

  const handleMerge = async () => {
    if (mergeFiles.length < 2) { setMergeError('Please add at least 2 PDF files.'); return; }
    setMergeProcessing(true);
    setMergeError('');
    setMergeBlob(null);
    try {
      const buffers = mergeFiles.map(f => f.buffer);
      const mergedBytes = await mergePdfs(buffers);
      setMergeBlob(new Blob([mergedBytes], { type: 'application/pdf' }));
    } catch (err) {
      console.error(err);
      setMergeError(err.message || 'An error occurred while merging the PDFs.');
    } finally {
      setMergeProcessing(false);
    }
  };

  const handleMergeDownload = () => {
    if (!mergeBlob) return;
    saveAs(mergeBlob, 'merged-document.pdf');
  };

  const resetMerge = () => {
    setMergeFiles([]);
    setMergeBlob(null);
    setMergeError('');
    if (mergeInputRef.current) mergeInputRef.current.value = '';
  };

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════
  return (
    <>
      {/* ── SHADER GRADIENT BACKGROUND ── */}
      <ShaderGradientCanvas
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          pointerEvents: 'none',
        }}
        pixelDensity={1}
        fov={10}
      >
        <ShaderGradient
          animate="on"
          axesHelper="off"
          bgColor1="#020617"
          bgColor2="#020617"
          brightness={0.4}
          cAzimuthAngle={270}
          cDistance={14}
          cPolarAngle={180}
          cameraZoom={5}
          color1="#0a3d62"
          color2="#1a535c"
          color3="#1e3a5f"
          envPreset="city"
          grain="on"
          lightType="env"
          positionX={-0.1}
          positionY={0}
          positionZ={0}
          reflection={0.3}
          rotationX={0}
          rotationY={130}
          rotationZ={70}
          shader="defaults"
          type="sphere"
          uAmplitude={3.2}
          uDensity={0.8}
          uFrequency={5.5}
          uSpeed={0.08}
          uStrength={0.2}
          uTime={0}
          wireframe={false}
          zoomOut={true}
        />
      </ShaderGradientCanvas>

      <div className="app-container">

        {/* ── HERO ── */}
        <header className="hero">
          <div className="hero-badge">✨ 100% Free & Private</div>
          <h1>PDF <span className="gradient-text">Tools</span></h1>
          <p className="hero-subtitle">
            Split and merge your PDF documents instantly — right in your browser.
            No uploads, no servers, no sign-ups. Your files never leave your device.
          </p>
        </header>

        {/* ── FEATURES GRID ── */}
        <section className="features">
          <div className="feature-card">
            <div className="feature-icon split-icon"><Scissors size={22} /></div>
            <h3>Split PDFs</h3>
            <p>Extract specific pages or break a large document into smaller parts.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon merge-icon"><Merge size={22} /></div>
            <h3>Merge PDFs</h3>
            <p>Combine up to 3 PDF files into a single document in seconds.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon privacy-icon"><Lock size={22} /></div>
            <h3>Fully Private</h3>
            <p>All processing happens locally in your browser. Zero data leaves your device.</p>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="how-it-works">
          <h2>How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Upload Your PDF</h4>
                <p>Drag & drop or click to select your PDF file(s).</p>
              </div>
            </div>
            <div className="step-arrow"><ChevronRight size={20} /></div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Choose Your Action</h4>
                <p>Set page ranges to split, or select files to merge.</p>
              </div>
            </div>
            <div className="step-arrow"><ChevronRight size={20} /></div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Download Instantly</h4>
                <p>Get your processed PDFs — no waiting, no email needed.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── TOOL CARD ── */}
        <main className="card">
          {/* Tab Bar */}
          <div className="tab-bar">
            <button
              className={`tab-btn ${activeTab === 'split' ? 'active' : ''}`}
              onClick={() => setActiveTab('split')}
            >
              <Scissors size={16} /> Split
            </button>
            <button
              className={`tab-btn ${activeTab === 'merge' ? 'active' : ''}`}
              onClick={() => setActiveTab('merge')}
            >
              <Merge size={16} /> Merge
            </button>
          </div>

          {/* ── SPLIT TAB ── */}
          {activeTab === 'split' && (
            <div className="tab-content">
              {!splitFile ? (
                <div
                  className="dropzone"
                  onClick={() => splitInputRef.current?.click()}
                  onDragOver={handleSplitDragOver}
                  onDrop={handleSplitDrop}
                >
                  <Upload className="icon-large" />
                  <h3>Drop your PDF here</h3>
                  <p>or click to browse</p>
                  <input type="file" accept=".pdf" ref={splitInputRef} onChange={handleSplitFileChange} hidden />
                </div>
              ) : (
                <div className="file-section">
                  <div className="dropzone active">
                    <div className="file-info">
                      <FileText size={32} className="text-blue-500" />
                      <span>{splitFile.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); resetSplit(); }} className="remove-btn">
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  {splitError && (
                    <div className="error-message">
                      <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
                      {splitError}
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

                  <button className="action-btn" onClick={handleSplit} disabled={splitProcessing || ranges.every(r => !r.value)}>
                    {splitProcessing ? 'Processing...' : (<><Scissors size={20} /> Split PDF</>)}
                  </button>

                  {downloadBlobs.length > 0 && (
                    <div className="download-section">
                      {downloadBlobs.map((blobObj) => (
                        <button key={blobObj.part} className="download-btn" onClick={() => handleSplitDownload(blobObj)}>
                          <Download size={18} /> Part {blobObj.part}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── MERGE TAB ── */}
          {activeTab === 'merge' && (
            <div className="tab-content">
              <div
                className="dropzone"
                onClick={() => mergeInputRef.current?.click()}
                onDragOver={handleMergeDragOver}
                onDrop={handleMergeDrop}
              >
                <Upload className="icon-large" />
                <h3>Drop PDFs here</h3>
                <p>or click to browse (max 3 files)</p>
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  ref={mergeInputRef}
                  onChange={handleMergeFileChange}
                  hidden
                />
              </div>

              {mergeError && (
                <div className="error-message">
                  <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
                  {mergeError}
                </div>
              )}

              {mergeFiles.length > 0 && (
                <div className="merge-file-list">
                  {mergeFiles.map((entry, index) => (
                    <div key={entry.id} className="merge-file-item">
                      <div className="merge-file-order">{index + 1}</div>
                      <FileText size={20} />
                      <span className="merge-file-name">{entry.file.name}</span>
                      <span className="merge-file-size">
                        {(entry.file.size / 1024).toFixed(0)} KB
                      </span>
                      <button className="remove-btn" onClick={() => removeMergeFile(entry.id)}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {mergeFiles.length > 0 && (
                <div className="merge-actions">
                  <button className="action-btn" onClick={handleMerge} disabled={mergeProcessing || mergeFiles.length < 2}>
                    {mergeProcessing ? 'Merging...' : (<><Merge size={20} /> Merge PDFs</>)}
                  </button>
                  <button className="reset-btn" onClick={resetMerge}>Clear All</button>
                </div>
              )}

              {mergeBlob && (
                <div className="download-section">
                  <button className="download-btn full-width" onClick={handleMergeDownload}>
                    <Download size={18} /> Download Merged PDF
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── FOOTER ── */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <ShieldCheck size={18} />
              <span>Your files are processed entirely in your browser. Nothing is uploaded anywhere.</span>
            </div>
            <div className="footer-copy">
              © {new Date().getFullYear()} PDF Tools · Built with ❤️
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;
