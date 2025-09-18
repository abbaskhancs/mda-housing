"use client";

import React, { useState, useEffect } from 'react';
import AuthGuard from "../../../components/AuthGuard";
import WorkflowActions from "../../../components/WorkflowActions";
import { PhotoSignatureCapture } from "../../../components/PhotoSignatureCapture";
import { useAuth } from "../../../contexts/AuthContext";
import { apiService, Application } from "../../../services/api";
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface TransferDeed {
  id: string;
  applicationId: string;
  witness1Id: string;
  witness2Id: string;
  deedContent: string | null;
  finalPdfUrl: string | null;
  isFinalized: boolean;
  hashSha256: string | null;
  witness1Signature: string | null;
  witness2Signature: string | null;
  createdAt: string;
  finalizedAt: string | null;
  witness1: {
    id: string;
    name: string;
    cnic: string;
  };
  witness2: {
    id: string;
    name: string;
    cnic: string;
  };
}

interface DeedFormData {
  witness1Id: string;
  witness2Id: string;
  deedContent: string;
  witness1Signature: string;
  witness2Signature: string;
  finalPdfUrl: string;
}

interface PhotoSignatureData {
  sellerPhoto: File | null;
  buyerPhoto: File | null;
  witness1Photo: File | null;
  witness2Photo: File | null;
  sellerSignature: File | null;
  buyerSignature: File | null;
  witness1Signature: File | null;
  witness2Signature: File | null;
}

export default function ApprovalConsole() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [transferDeed, setTransferDeed] = useState<TransferDeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deedForm, setDeedForm] = useState<DeedFormData>({
    witness1Id: '',
    witness2Id: '',
    deedContent: '',
    witness1Signature: '',
    witness2Signature: '',
    finalPdfUrl: ''
  });
  const [photoSignatureData, setPhotoSignatureData] = useState<PhotoSignatureData>({
    sellerPhoto: null,
    buyerPhoto: null,
    witness1Photo: null,
    witness2Photo: null,
    sellerSignature: null,
    buyerSignature: null,
    witness1Signature: null,
    witness2Signature: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get applications ready for approval
      const response = await apiService.getApplications({
        stage: 'READY_FOR_APPROVAL',
        limit: 50
      });

      if (response.success && response.data) {
        setApplications(response.data.applications);
      } else {
        setError(response.error || 'Failed to load applications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadTransferDeed = async (applicationId: string) => {
    try {
      const response = await apiService.get<TransferDeed>(`/api/applications/${applicationId}/transfer-deed`);

      if (response.success && response.data) {
        setTransferDeed(response.data);
        setDeedForm({
          witness1Id: response.data.witness1Id,
          witness2Id: response.data.witness2Id,
          deedContent: response.data.deedContent || '',
          witness1Signature: response.data.witness1Signature || '',
          witness2Signature: response.data.witness2Signature || '',
          finalPdfUrl: response.data.finalPdfUrl || ''
        });
      } else {
        setTransferDeed(null);
        setDeedForm({
          witness1Id: '',
          witness2Id: '',
          deedContent: '',
          witness1Signature: '',
          witness2Signature: '',
          finalPdfUrl: ''
        });
      }
    } catch (err) {
      console.error('Error loading transfer deed:', err);
      setTransferDeed(null);
    }
  };

  const handleApplicationSelect = async (app: Application) => {
    setSelectedApp(app);
    await loadTransferDeed(app.id);
  };

  const handleCreateDeedDraft = async () => {
    if (!selectedApp || !deedForm.witness1Id || !deedForm.witness2Id) return;

    setSubmitting(true);
    try {
      const response = await apiService.post(`/api/applications/${selectedApp.id}/transfer-deed/draft`, {
        witness1Id: deedForm.witness1Id,
        witness2Id: deedForm.witness2Id,
        deedContent: deedForm.deedContent
      });

      if (response.success) {
        await loadTransferDeed(selectedApp.id);
        alert('Deed draft created successfully!');
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadPhotosSignatures = async () => {
    if (!selectedApp || !transferDeed) return;

    // Check if we have at least some files to upload
    const hasFiles = Object.values(photoSignatureData).some(file => file !== null);
    if (!hasFiles) {
      alert('Please select at least one photo or signature to upload.');
      return;
    }

    setUploadingPhotos(true);
    try {
      const formData = new FormData();

      // Add all selected files to form data
      Object.entries(photoSignatureData).forEach(([key, file]) => {
        if (file) {
          formData.append(key, file);
        }
      });

      const response = await fetch(`/api/applications/${selectedApp.id}/transfer-deed/photos-signatures`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData
      });

      if (response.ok) {
        await loadTransferDeed(selectedApp.id);
        alert('Photos and signatures uploaded successfully!');
        // Reset the form
        setPhotoSignatureData({
          sellerPhoto: null,
          buyerPhoto: null,
          witness1Photo: null,
          witness2Photo: null,
          sellerSignature: null,
          buyerSignature: null,
          witness1Signature: null,
          witness2Signature: null
        });
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Upload failed'}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleFinalizeDeed = async () => {
    if (!selectedApp || !transferDeed || !deedForm.witness1Signature || !deedForm.witness2Signature || !deedForm.finalPdfUrl) return;

    setSubmitting(true);
    try {
      const response = await apiService.post(`/api/applications/${selectedApp.id}/transfer-deed/finalize`, {
        witness1Signature: deedForm.witness1Signature,
        witness2Signature: deedForm.witness2Signature,
        finalPdfUrl: deedForm.finalPdfUrl
      });

      if (response.success) {
        await loadTransferDeed(selectedApp.id);
        await loadApplications(); // Refresh applications list
        alert('Deed finalized successfully! Ownership has been transferred.');
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (stage: string) => {
    switch (stage) {
      case 'READY_FOR_APPROVAL':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'APPROVED':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'COMPLETED':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <AuthGuard allowedRoles={['ADMIN', 'APPROVER']}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900">Approval Console</h1>
            <p className="mt-1 text-sm text-gray-500">
              Transfer deed capture, approval, and finalization
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Applications List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Applications Ready for Approval
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Applications that have completed all clearances and are ready for deed processing
                </p>
              </div>

              <div className="border-t border-gray-200">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading applications...</p>
                  </div>
                ) : error ? (
                  <div className="p-6 text-center">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-400 mx-auto" />
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                    <button
                      onClick={loadApplications}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-500 underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="p-6 text-center">
                    <DocumentTextIcon className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">No applications ready for approval</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {applications.map((app) => (
                      <li key={app.id} className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              {getStatusIcon(app.currentStage.code)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {app.applicationNumber}
                              </div>
                              <div className="text-sm text-gray-500">
                                Plot {app.plot.plotNumber}, {app.plot.sector}
                              </div>
                              <div className="text-xs text-gray-400">
                                {app.seller.name} → {app.buyer.name}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Link
                              href={`/applications/${app.id}`}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleApplicationSelect(app)}
                              className={`px-3 py-1 rounded text-sm ${
                                selectedApp?.id === app.id
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-600 text-white hover:bg-gray-700'
                              }`}
                            >
                              {selectedApp?.id === app.id ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Deed Processing Panel */}
            <div className="space-y-6">
              {selectedApp ? (
                <>
                  {/* Application Info */}
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Selected Application: {selectedApp.applicationNumber}
                    </h3>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Plot</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {selectedApp.plot.plotNumber}, {selectedApp.plot.sector}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Size</dt>
                        <dd className="mt-1 text-sm text-gray-900">{selectedApp.plot.size}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Seller</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {selectedApp.seller.name} ({selectedApp.seller.cnic})
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Buyer</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {selectedApp.buyer.name} ({selectedApp.buyer.cnic})
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Transfer Deed Form */}
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Transfer Deed {transferDeed ? (transferDeed.isFinalized ? '(Finalized)' : '(Draft)') : '(New)'}
                    </h3>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Witness 1 ID
                          </label>
                          <input
                            type="text"
                            value={deedForm.witness1Id}
                            onChange={(e) => setDeedForm({...deedForm, witness1Id: e.target.value})}
                            disabled={transferDeed?.isFinalized}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter witness 1 person ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Witness 2 ID
                          </label>
                          <input
                            type="text"
                            value={deedForm.witness2Id}
                            onChange={(e) => setDeedForm({...deedForm, witness2Id: e.target.value})}
                            disabled={transferDeed?.isFinalized}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter witness 2 person ID"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Deed Content
                        </label>
                        <textarea
                          value={deedForm.deedContent}
                          onChange={(e) => setDeedForm({...deedForm, deedContent: e.target.value})}
                          disabled={transferDeed?.isFinalized}
                          rows={4}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Enter deed content (optional)"
                        />
                      </div>

                      {transferDeed && !transferDeed.isFinalized && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Final PDF URL
                            </label>
                            <input
                              type="url"
                              value={deedForm.finalPdfUrl}
                              onChange={(e) => setDeedForm({...deedForm, finalPdfUrl: e.target.value})}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="Enter final PDF URL"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Witness 1 Signature
                              </label>
                              <input
                                type="text"
                                value={deedForm.witness1Signature}
                                onChange={(e) => setDeedForm({...deedForm, witness1Signature: e.target.value})}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Enter witness 1 signature"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Witness 2 Signature
                              </label>
                              <input
                                type="text"
                                value={deedForm.witness2Signature}
                                onChange={(e) => setDeedForm({...deedForm, witness2Signature: e.target.value})}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Enter witness 2 signature"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {transferDeed?.isFinalized && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                          <div className="flex">
                            <CheckCircleIcon className="h-5 w-5 text-green-400" />
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-green-800">
                                Deed Finalized
                              </h3>
                              <div className="mt-2 text-sm text-green-700">
                                <p>Hash: <code className="bg-green-100 px-1 rounded">{transferDeed.hashSha256}</code></p>
                                {transferDeed.finalPdfUrl && (
                                  <p>Final PDF: <a href={transferDeed.finalPdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">View Document</a></p>
                                )}
                                <p>Finalized: {new Date(transferDeed.finalizedAt!).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-3">
                        {!transferDeed ? (
                          <button
                            onClick={handleCreateDeedDraft}
                            disabled={submitting || !deedForm.witness1Id || !deedForm.witness2Id}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                          >
                            {submitting ? 'Creating...' : 'Create Deed Draft'}
                          </button>
                        ) : !transferDeed.isFinalized ? (
                          <button
                            onClick={handleFinalizeDeed}
                            disabled={submitting || !deedForm.witness1Signature || !deedForm.witness2Signature || !deedForm.finalPdfUrl}
                            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                            title={!deedForm.finalPdfUrl ? 'Final PDF URL is required' : !deedForm.witness1Signature || !deedForm.witness2Signature ? 'Witness signatures are required' : 'Approve & Lock Deed'}
                          >
                            {submitting ? 'Finalizing...' : 'Approve & Lock Deed'}
                          </button>
                        ) : (
                          <span className="text-green-600 font-medium">✓ Deed Finalized</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Photo & Signature Capture */}
                  {transferDeed && !transferDeed.isFinalized && (
                    <div className="bg-white shadow rounded-lg p-6">
                      <PhotoSignatureCapture
                        applicationId={selectedApp.id}
                        sellerName={selectedApp.seller.name}
                        buyerName={selectedApp.buyer.name}
                        witness1Name={transferDeed.witness1?.name}
                        witness2Name={transferDeed.witness2?.name}
                        onDataChange={setPhotoSignatureData}
                        disabled={uploadingPhotos}
                      />

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handleUploadPhotosSignatures}
                          disabled={uploadingPhotos}
                          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {uploadingPhotos ? 'Uploading...' : 'Upload Photos & Signatures'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Workflow Actions */}
                  <WorkflowActions
                    applicationId={selectedApp.id}
                    currentStage={selectedApp.currentStage.code}
                    onTransition={() => {
                      loadApplications();
                      setSelectedApp(null);
                      setTransferDeed(null);
                    }}
                  />
                </>
              ) : (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="text-center">
                    <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Application Selected</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Select an application from the list to process its transfer deed
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
