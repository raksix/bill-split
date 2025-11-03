import React, { useState, useRef } from 'react';

interface FileUploadWithProgressProps {
  onFileSelect?: (file: File) => void;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // MB
  className?: string;
}

const FileUploadWithProgress: React.FC<FileUploadWithProgressProps> = ({
  onFileSelect,
  onUploadComplete,
  onUploadError,
  accept = "image/*",
  maxSize = 5, // 5MB default
  className = ""
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // File size check
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Dosya boyutu ${maxSize}MB'dan büyük olamaz`);
      return;
    }

    // File type check
    if (accept && !file.type.match(accept.replace('*', '.*'))) {
      setError('Desteklenmeyen dosya formatı');
      return;
    }

    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Hazırlanıyor...');
    setError(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('image', selectedFile);

      setUploadProgress(10);
      setUploadStatus('Resim CDN\'e yükleniyor...');

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 80) {
            return prev + Math.random() * 10;
          }
          return prev;
        });
      }, 200);

      // Upload to server
      const response = await fetch('/api/bills/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload başarısız');
      }

      setUploadProgress(100);
      setUploadStatus('Yükleme tamamlandı!');

      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);

      if (onUploadComplete) {
        onUploadComplete(result);
      }

    } catch (err: any) {
      setError(err.message || 'Upload hatası');
      setUploadProgress(0);
      setUploadStatus('');
      
      if (onUploadError) {
        onUploadError(err.message || 'Upload hatası');
      }
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus('');
    setError(null);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Input */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        {!selectedFile ? (
          <div>
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fatura Resmi Seç
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              PNG, JPG, JPEG (max {maxSize}MB)
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">Dosya seçildi</span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>

            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={uploadFile}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Yükleniyor...' : 'Yükle'}
              </button>
              
              <button
                type="button"
                onClick={resetUpload}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Yükleniyor</span>
            <span className="text-sm text-blue-700">{Math.round(uploadProgress)}%</span>
          </div>
          
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          
          {uploadStatus && (
            <p className="text-xs text-blue-700 mt-2">{uploadStatus}</p>
          )}
        </div>
      )}

      {/* Success Message */}
      {uploadProgress === 100 && !uploading && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-900">Yükleme başarılı!</span>
          </div>
          <p className="text-xs text-green-700 mt-1">Fatura analizi arka planda devam ediyor...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-red-900">Hata</span>
          </div>
          <p className="text-xs text-red-700 mt-1">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploadWithProgress;