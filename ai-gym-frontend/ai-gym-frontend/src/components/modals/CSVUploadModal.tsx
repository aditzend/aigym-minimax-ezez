import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, AlertTriangle, CheckCircle, X, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  onUploadComplete: () => void;
}

interface UploadResult {
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  created_users: Array<{
    email: string;
    first_name: string;
    last_name: string;
    temp_password: string;
  }>;
}

const CSVUploadModal: React.FC<CSVUploadModalProps> = ({
  isOpen,
  onClose,
  communityId,
  onUploadComplete
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);

  const downloadTemplate = useCallback(() => {
    const csvContent = 'firstName,lastName,email,tags\nJohn,Doe,john.doe@example.com,developer;senior\nJane,Smith,jane.smith@example.com,designer';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setSelectedFile(file);
    
    // Preview first few rows
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').slice(0, 6); // Preview first 6 lines
      const preview = lines.map(line => line.split(',').map(cell => cell.trim()));
      setCsvPreview(preview);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const processUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        
        const { data, error } = await supabase.functions.invoke('process-csv-upload', {
          body: {
            community_id: communityId,
            csv_data: csvData,
            file_name: selectedFile.name
          }
        });

        if (error) throw error;
        
        setUploadResult(data);
        
        if (data.successful_rows > 0) {
          onUploadComplete();
        }
      };
      reader.readAsText(selectedFile);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadResults = useCallback(() => {
    if (!uploadResult || !uploadResult.created_users) return;

    const csvContent = [
      'Email,First Name,Last Name,Temporary Password',
      ...uploadResult.created_users.map(user => 
        `${user.email},${user.first_name},${user.last_name},${user.temp_password}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'created_users_with_passwords.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [uploadResult]);

  const handleClose = () => {
    setSelectedFile(null);
    setCsvPreview([]);
    setUploadResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Bulk User Upload
          </h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {!uploadResult ? (
            <>
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Required headers: <code className="bg-blue-100 px-1 rounded">firstName</code>, <code className="bg-blue-100 px-1 rounded">lastName</code>, <code className="bg-blue-100 px-1 rounded">email</code></li>
                  <li>• Optional header: <code className="bg-blue-100 px-1 rounded">tags</code> (separate multiple tags with semicolons)</li>
                  <li>• Maximum 1000 users per upload</li>
                  <li>• Secure passwords will be auto-generated for each user</li>
                </ul>
                <button
                  onClick={downloadTemplate}
                  className="mt-3 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <Download size={16} className="mr-1" />
                  Download Template CSV
                </button>
              </div>

              {/* File Upload */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg text-gray-600 mb-2">
                  {selectedFile ? selectedFile.name : 'Drop your CSV file here, or click to browse'}
                </p>
                <p className="text-sm text-gray-500">
                  Supports .csv files up to 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* CSV Preview */}
              {csvPreview.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">File Preview (first 5 rows):</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {csvPreview[0]?.map((header, index) => (
                              <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {csvPreview.slice(1).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={handleClose}
                  disabled={isUploading}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processUpload}
                  disabled={!selectedFile || isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isUploading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isUploading ? 'Processing...' : 'Upload Users'}</span>
                </button>
              </div>
            </>
          ) : (
            /* Upload Results */
            <div>
              <div className="mb-6">
                <div className="flex items-center space-x-4 mb-4">
                  {uploadResult.failed_rows === 0 ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle size={24} className="mr-2" />
                      <span className="text-lg font-semibold">Upload Completed Successfully!</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-amber-600">
                      <AlertTriangle size={24} className="mr-2" />
                      <span className="text-lg font-semibold">Upload Completed with Some Errors</span>
                    </div>
                  )}
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{uploadResult.total_rows}</div>
                    <div className="text-sm text-blue-800">Total Rows</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{uploadResult.successful_rows}</div>
                    <div className="text-sm text-green-800">Successful</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{uploadResult.failed_rows}</div>
                    <div className="text-sm text-red-800">Failed</div>
                  </div>
                </div>
              </div>

              {/* Success Section */}
              {uploadResult.successful_rows > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Created Users</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 mb-3">
                      Successfully created {uploadResult.successful_rows} users with temporary passwords.
                    </p>
                    <button
                      onClick={downloadResults}
                      className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      <Download size={16} className="mr-2" />
                      Download User Credentials
                    </button>
                  </div>
                </div>
              )}

              {/* Errors Section */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Errors ({uploadResult.errors.length})</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {uploadResult.errors.map((error, index) => (
                      <div key={index} className="mb-2 text-sm">
                        <span className="font-medium text-red-800">Row {error.row}:</span>
                        <span className="text-red-700 ml-1">{error.email} - {error.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVUploadModal;