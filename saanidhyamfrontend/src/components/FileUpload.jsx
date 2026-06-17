import React, { useState } from 'react';
import { uploadService } from '../services/api';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please select an Excel file (.xlsx or .xls)');
      }
    }
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please select an Excel file (.xlsx or .xls)');
      }
    }
  };

  // Upload file
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress({}); // reset progress before upload

    try {
      // Updated: Proper progress handling and error display
      const response = await uploadService.uploadFile(file, (event) => {
        const percent = Math.round((100 * event.loaded) / event.total);
        setProgress((prev) => ({ ...prev, progress_percentage: percent }));
      });

      console.log("Upload Success:", response);
      setJobId(response.job.id);
      pollProgress(response.job.id);

    } catch (err) {
  console.error("Upload error details:", err);

  let message;

  if (err.response) {
    const { status, data } = err.response;
    const detail = data?.detail || data?.message || data?.error || err.response.statusText;
    message = `Upload Failed: ${status} - ${detail}`;
  } else if (err.request) {
    // Request was sent, but response handling is messy (often CORS / mimetype / timeout)
    message = `Upload issue: ${err.message || "Request sent but response not handled cleanly"}`;
  } else {
    message = `Upload error: ${err.message}`;
  }

  setError(message);
  setUploading(false);
}
  };

  // Poll for progress
  const pollProgress = async (id) => {
    const interval = setInterval(async () => {
      try {
        const progressData = await uploadService.getProgress(id);
        setProgress(progressData);

        if (progressData.status === 'completed' || progressData.status === 'failed') {
          clearInterval(interval);
          setUploading(false);
        }
      } catch (err) {
        console.error('Progress polling error:', err);
        clearInterval(interval);
        setUploading(false);
        setError('Failed to fetch progress');
      }
    }, 2000); // Poll every 2 seconds
  };

  // Reset form
  const resetUpload = () => {
    setFile(null);
    setJobId(null);
    setProgress(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">
          Old Age Home Data Upload
        </h1>
        <p className="text-gray-600 mb-6">
          Upload your Excel file to import old age home data
        </p>

        {/* File Dropzone */}
        {!jobId && (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
              ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div>
                <svg className="mx-auto h-16 w-16 text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-700">{file.name}</p>
                <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            ) : (
              <div>
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg mb-2 text-gray-700">
                  {dragActive ? 'Drop the file here' : 'Drag & drop an Excel file here'}
                </p>
                <p className="text-sm text-gray-500">or click to select file</p>
                <p className="text-xs text-gray-400 mt-2">Supports .xlsx and .xls files</p>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Upload Button */}
        {file && !jobId && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium
                hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                transition-colors flex items-center justify-center"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing
                </>
              ) : (
                'Upload & Process'
              )}
            </button>
            <button
              onClick={resetUpload}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Progress Display */}
        {progress && (
  <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
    {progress.status === "failed" ? (
      <div className="text-red-700 font-medium">
        Upload failed: {progress.error_count || "Unknown error"}
      </div>
    ) : progress.status === "completed" ? (
      <div className="text-green-700 font-medium">
        Upload completed! {progress.inserted_count || 0} inserted, {progress.updated_count || 0} updated.
      </div>
    ) : (
      <div>
        <div className="flex justify-between text-sm text-gray-700 mb-2">
          <span>Processing data...</span>
          <span>{progress.progress_percentage || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress.progress_percentage || 0}%` }}
          />
        </div>
      </div>
    )}
  </div>
)}
      </div>

      {/* Instructions */}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Upload Instructions:
        </h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Upload Excel files (.xlsx or .xls) with old age home data</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>The system will automatically clean and validate all data</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Duplicate entries will be automatically updated</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Processing happens in chunks for large files</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;
