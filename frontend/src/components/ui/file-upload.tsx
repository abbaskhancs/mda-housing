import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Label } from './label';
import { CameraIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  label: string;
  accept?: string;
  maxSize?: number; // in MB
  onFileSelect: (file: File | null) => void;
  currentFile?: File | null;
  currentUrl?: string | null;
  disabled?: boolean;
  className?: string;
  type?: 'photo' | 'signature' | 'document';
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = 'image/*',
  maxSize = 10,
  onFileSelect,
  currentFile,
  currentUrl,
  disabled = false,
  className = '',
  type = 'document'
}) => {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);

    if (!file) {
      setPreview(null);
      onFileSelect(null);
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    if (accept && !file.type.match(accept.replace('*', '.*'))) {
      setError(`Invalid file type. Please select a ${accept} file.`);
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    onFileSelect(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'photo':
        return <CameraIcon className="h-5 w-5" />;
      case 'signature':
        return <DocumentIcon className="h-5 w-5" />;
      default:
        return <DocumentIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      
      <div className="space-y-2">
        {/* File Input */}
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex items-center space-x-2"
          >
            {getIcon()}
            <span>Choose File</span>
          </Button>
          
          {(currentFile || preview) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="text-red-600 hover:text-red-700"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* File Info */}
        {currentFile && (
          <div className="text-sm text-gray-600">
            <p>Selected: {currentFile.name}</p>
            <p>Size: {(currentFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="mt-2">
            <img
              src={preview}
              alt="Preview"
              className="max-w-xs max-h-32 object-contain border border-gray-300 rounded"
            />
          </div>
        )}
      </div>
    </div>
  );
};
