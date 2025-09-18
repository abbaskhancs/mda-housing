"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FileUpload } from './ui/file-upload';
import { apiService } from '../services/api';
import { 
  DocumentTextIcon, 
  EyeIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Attachment {
  id: string;
  docType: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  isOriginalSeen: boolean;
  verifiedById?: string;
  verifiedAt?: string;
  uploadedAt: string;
  verifiedBy?: {
    id: string;
    username: string;
    email: string;
  };
}

interface AttachmentsGridProps {
  applicationId: string;
  readonly?: boolean;
}

const DOC_TYPES = [
  { value: 'AllotmentLetter', label: 'Allotment Letter' },
  { value: 'PrevTransferDeed', label: 'Previous Transfer Deed' },
  { value: 'AttorneyDeed', label: 'Attorney Deed' },
  { value: 'GiftDeed', label: 'Gift Deed' },
  { value: 'CNIC_Seller', label: 'CNIC - Seller' },
  { value: 'CNIC_Buyer', label: 'CNIC - Buyer' },
  { value: 'CNIC_Attorney', label: 'CNIC - Attorney' },
  { value: 'UtilityBill_Latest', label: 'Latest Utility Bill' },
  { value: 'NOC_BuiltStructure', label: 'NOC - Built Structure' },
  { value: 'Photo_Seller', label: 'Photo - Seller' },
  { value: 'Photo_Buyer', label: 'Photo - Buyer' },
  { value: 'PrevChallan', label: 'Previous Challan' },
  { value: 'NOC_Water', label: 'NOC - Water' }
];

export const AttachmentsGrid: React.FC<AttachmentsGridProps> = ({
  applicationId,
  readonly = false
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAttachment, setNewAttachment] = useState<{
    docType: string;
    file: File | null;
    isOriginalSeen: boolean;
  }>({
    docType: '',
    file: null,
    isOriginalSeen: false
  });

  useEffect(() => {
    loadAttachments();
  }, [applicationId]);

  const loadAttachments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/applications/${applicationId}/attachments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      } else {
        setError('Failed to load attachments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleOriginalSeen = async (attachmentId: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}/attachments/${attachmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          isOriginalSeen: !currentValue
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(prev => 
          prev.map(att => 
            att.id === attachmentId ? data.attachment : att
          )
        );
      } else {
        setError('Failed to update attachment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/applications/${applicationId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setAttachments(prev => prev.filter(att => att.id !== attachmentId));
      } else {
        setError('Failed to delete attachment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const uploadNewAttachment = async () => {
    if (!newAttachment.file || !newAttachment.docType) {
      setError('Please select a file and document type');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('attachments', newAttachment.file);
      formData.append('docType', newAttachment.docType);
      formData.append(`isOriginalSeen_attachments`, newAttachment.isOriginalSeen.toString());

      const response = await fetch(`/api/applications/${applicationId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(prev => [...data.attachments, ...prev]);
        setShowAddForm(false);
        setNewAttachment({ docType: '', file: null, isOriginalSeen: false });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to upload attachment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocTypeLabel = (docType: string): string => {
    const docTypeObj = DOC_TYPES.find(dt => dt.value === docType);
    return docTypeObj ? docTypeObj.label : docType;
  };

  const openFile = (attachment: Attachment) => {
    // For now, just open the storage URL
    // In a production environment, you might want to generate a signed URL
    window.open(attachment.storageUrl, '_blank');
  };

  const canPreview = (mimeType: string): boolean => {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf';
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading attachments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Attachments</h3>
        {!readonly && (
          <Button
            onClick={() => setShowAddForm(true)}
            size="sm"
            className="flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Attachment</span>
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Add New Attachment Form */}
      {showAddForm && !readonly && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h4 className="text-md font-medium text-gray-900 mb-4">Add New Attachment</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <select
                value={newAttachment.docType}
                onChange={(e) => setNewAttachment(prev => ({ ...prev, docType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select document type</option>
                {DOC_TYPES.map(docType => (
                  <option key={docType.value} value={docType.value}>
                    {docType.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FileUpload
                label="Select File"
                accept="*/*"
                maxSize={10}
                onFileSelect={(file) => setNewAttachment(prev => ({ ...prev, file }))}
                currentFile={newAttachment.file}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              id="originalSeen"
              checked={newAttachment.isOriginalSeen}
              onChange={(e) => setNewAttachment(prev => ({ ...prev, isOriginalSeen: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="originalSeen" className="text-sm text-gray-700">
              Original document seen
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={uploadNewAttachment}
              disabled={uploading || !newAttachment.file || !newAttachment.docType}
              size="sm"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
            <Button
              onClick={() => {
                setShowAddForm(false);
                setNewAttachment({ docType: '', file: null, isOriginalSeen: false });
              }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Attachments Grid */}
      {attachments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No attachments found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Seen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attachments.map((attachment) => (
                <tr key={attachment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {getDocTypeLabel(attachment.docType)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{attachment.originalName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{formatFileSize(attachment.fileSize)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {!readonly ? (
                        <button
                          onClick={() => toggleOriginalSeen(attachment.id, attachment.isOriginalSeen)}
                          className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                            attachment.isOriginalSeen
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {attachment.isOriginalSeen ? (
                            <CheckCircleIcon className="h-3 w-3" />
                          ) : (
                            <XCircleIcon className="h-3 w-3" />
                          )}
                          <span>{attachment.isOriginalSeen ? 'Verified' : 'Not Verified'}</span>
                        </button>
                      ) : (
                        <Badge variant={attachment.isOriginalSeen ? 'default' : 'secondary'}>
                          {attachment.isOriginalSeen ? 'Verified' : 'Not Verified'}
                        </Badge>
                      )}
                      
                      {attachment.isOriginalSeen && attachment.verifiedBy && (
                        <div className="text-xs text-gray-500">
                          <div>by {attachment.verifiedBy.username}</div>
                          <div>{new Date(attachment.verifiedAt!).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {new Date(attachment.uploadedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => openFile(attachment)}
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        <EyeIcon className="h-3 w-3" />
                        <span>View</span>
                      </Button>
                      
                      {!readonly && (
                        <Button
                          onClick={() => deleteAttachment(attachment.id)}
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <TrashIcon className="h-3 w-3" />
                          <span>Delete</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
