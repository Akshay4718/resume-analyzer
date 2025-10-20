import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      const fileType = selectedFile.type;
      
      // Check if file is PDF or TXT by extension or MIME type
      if (fileName.endsWith('.pdf') || fileName.endsWith('.txt') || 
          fileType === 'application/pdf' || fileType === 'text/plain') {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please upload a PDF or TXT file');
        setFile(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis(null);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await axios.post('https://resume-analyzer-gak7.onrender.com/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAnalysis(response.data.analysis);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze resume');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="App">
      <div className="container">
        <h1>Resume Analyzer</h1>
        <p className="subtitle">Upload your resume and get AI-powered feedback</p>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileChange}
              id="file-upload"
              className="file-input"
            />
            <label htmlFor="file-upload" className="file-label">
              {file ? file.name : 'Choose a file (PDF or TXT)'}
            </label>
          </div>
          <button type="submit" disabled={loading || !file} className="submit-btn">
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        {analysis && (
          <div className="results">
            <div className="score-card">
              <h2>Overall Score</h2>
              <div 
                className="score-circle" 
                style={{ borderColor: getScoreColor(analysis.overall_score) }}
              >
                <span style={{ color: getScoreColor(analysis.overall_score) }}>
                  {analysis.overall_score}
                </span>
                <span className="score-label">/100</span>
              </div>
            </div>

            <div className="summary-card">
              <h3>Summary</h3>
              <p>{analysis.summary}</p>
            </div>

            <div className="feedback-grid">
              <div className="feedback-card strengths">
                <h3>💪 Strengths</h3>
                <ul>
                  {analysis.strengths?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="feedback-card weaknesses">
                <h3>⚠️ Areas for Improvement</h3>
                <ul>
                  {analysis.weaknesses?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="feedback-card suggestions">
                <h3>💡 Suggestions</h3>
                <ul>
                  {analysis.suggestions?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="feedback-card keywords">
                <h3>🔑 Keywords to Add</h3>
                <ul>
                  {analysis.keywords_missing?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
