"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import { useAuth } from "../../../contexts/AuthContext";
import Link from "next/link";
import { 
  DocumentTextIcon,
  PaperClipIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  DocumentIcon,
  ClipboardDocumentListIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/outline";

const tabs = [
  { id: 'summary', name: 'Summary', icon: DocumentTextIcon },
  { id: 'attachments', name: 'Attachments', icon: PaperClipIcon },
  { id: 'clearances', name: 'Clearances', icon: CheckCircleIcon },
  { id: 'accounts', name: 'Accounts', icon: CurrencyDollarIcon },
  { id: 'deed', name: 'Deed', icon: DocumentIcon },
  { id: 'audit', name: 'Audit', icon: ClipboardDocumentListIcon },
];

// Mock data for demonstration
const mockApplicationData = {
  id: 'A001',
  applicationNumber: 'APP-2024-001',
  status: 'Under Review',
  submittedAt: '2024-01-15T10:30:00Z',
  currentStage: 'BCA Clearance',
  seller: {
    name: 'Ahmed Ali',
    cnic: '12345-1234567-1',
    phone: '+92-300-1234567',
    address: '123 Main Street, Karachi'
  },
  buyer: {
    name: 'Fatima Khan',
    cnic: '12345-7654321-2',
    phone: '+92-301-7654321',
    address: '456 Park Avenue, Karachi'
  },
  plot: {
    number: '123',
    block: 'A',
    sector: '5',
    area: '500 sq ft',
    location: 'Gulberg, Lahore'
  }
};

const mockAttachments = [
  { id: 1, name: 'CNIC Copy - Seller', type: 'CNIC', uploadedAt: '2024-01-15', originalSeen: true },
  { id: 2, name: 'CNIC Copy - Buyer', type: 'CNIC', uploadedAt: '2024-01-15', originalSeen: false },
  { id: 3, name: 'Property Documents', type: 'PROPERTY', uploadedAt: '2024-01-15', originalSeen: true },
  { id: 4, name: 'Power of Attorney', type: 'LEGAL', uploadedAt: '2024-01-16', originalSeen: false },
];

const mockClearances = [
  { section: 'BCA', status: 'Pending', remarks: 'Awaiting building plan approval', clearedAt: null },
  { section: 'Housing', status: 'Approved', remarks: 'All requirements met', clearedAt: '2024-01-20' },
  { section: 'Accounts', status: 'Pending', remarks: 'Payment verification in progress', clearedAt: null },
];

const mockAccounts = {
  totalAmount: 50000,
  paidAmount: 25000,
  remainingAmount: 25000,
  challanNumber: 'CH-2024-001',
  paymentVerified: false,
  breakdown: [
    { item: 'Transfer Fee', amount: 30000 },
    { item: 'Processing Fee', amount: 10000 },
    { item: 'Miscellaneous', amount: 10000 }
  ]
};

const mockDeed = {
  status: 'Not Generated',
  witness1: 'Muhammad Hassan',
  witness2: 'Ali Raza',
  generatedAt: null,
  finalizedAt: null
};

const mockAuditLog = [
  { action: 'Application Submitted', user: 'Ahmed Ali', timestamp: '2024-01-15T10:30:00Z', details: 'Initial application submitted' },
  { action: 'Document Uploaded', user: 'Ahmed Ali', timestamp: '2024-01-15T11:15:00Z', details: 'CNIC copy uploaded' },
  { action: 'Housing Clearance', user: 'Housing Officer', timestamp: '2024-01-20T14:30:00Z', details: 'Housing clearance approved' },
  { action: 'Payment Submitted', user: 'Ahmed Ali', timestamp: '2024-01-22T09:45:00Z', details: 'Challan submitted for verification' },
];

export default function ApplicationDetail() {
  const { user } = useAuth();
  const params = useParams();
  const [activeTab, setActiveTab] = useState('summary');

  const applicationId = params.id as string;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Application Information</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Application Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.applicationNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {mockApplicationData.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Current Stage</dt>
                  <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.currentStage}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Submitted At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(mockApplicationData.submittedAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Seller Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.seller.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">CNIC</dt>
                    <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.seller.cnic}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.seller.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.seller.address}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Buyer Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.buyer.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">CNIC</dt>
                    <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.buyer.cnic}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.buyer.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.buyer.address}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Property Information</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Plot Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.plot.number}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Block</dt>
                  <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.plot.block}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Sector</dt>
                  <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.plot.sector}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Area</dt>
                  <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.plot.area}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Location</dt>
                  <dd className="mt-1 text-sm text-gray-900">{mockApplicationData.plot.location}</dd>
                </div>
              </dl>
            </div>
          </div>
        );

      case 'attachments':
        return (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Attachments</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Documents uploaded with this application
              </p>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {mockAttachments.map((attachment) => (
                  <li key={attachment.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <PaperClipIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {attachment.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Type: {attachment.type} • Uploaded: {new Date(attachment.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          attachment.originalSeen 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {attachment.originalSeen ? 'Original Seen' : 'Pending Review'}
                        </span>
                        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                          View
                        </button>
                        <button className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700">
                          Download
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'clearances':
        return (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Clearances</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Department clearances and approvals
              </p>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {mockClearances.map((clearance, index) => (
                  <li key={index} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <CheckCircleIcon className={`h-8 w-8 ${
                            clearance.status === 'Approved' ? 'text-green-500' : 'text-yellow-500'
                          }`} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {clearance.section} Clearance
                          </div>
                          <div className="text-sm text-gray-500">
                            {clearance.remarks}
                          </div>
                          {clearance.clearedAt && (
                            <div className="text-sm text-gray-500">
                              Cleared: {new Date(clearance.clearedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          clearance.status === 'Approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {clearance.status}
                        </span>
                        {clearance.status === 'Pending' && (
                          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'accounts':
        return (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Summary</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">₹{mockAccounts.totalAmount.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Paid Amount</dt>
                  <dd className="mt-1 text-2xl font-semibold text-green-600">₹{mockAccounts.paidAmount.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Remaining</dt>
                  <dd className="mt-1 text-2xl font-semibold text-red-600">₹{mockAccounts.remainingAmount.toLocaleString()}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Breakdown</h3>
              <div className="space-y-3">
                {mockAccounts.breakdown.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm text-gray-900">{item.item}</span>
                    <span className="text-sm font-medium text-gray-900">₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Status</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Challan Number: {mockAccounts.challanNumber}</p>
                  <p className="text-sm text-gray-500">Verification Status: 
                    <span className={`ml-1 ${
                      mockAccounts.paymentVerified ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {mockAccounts.paymentVerified ? 'Verified' : 'Pending'}
                    </span>
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                    View Challan
                  </button>
                  {!mockAccounts.paymentVerified && (
                    <button className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
                      Verify Payment
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'deed':
        return (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Transfer Deed Information</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {mockDeed.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Witness 1</dt>
                  <dd className="mt-1 text-sm text-gray-900">{mockDeed.witness1}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Witness 2</dt>
                  <dd className="mt-1 text-sm text-gray-900">{mockDeed.witness2}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Generated At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {mockDeed.generatedAt ? new Date(mockDeed.generatedAt).toLocaleDateString() : 'Not generated'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
              <div className="flex space-x-4">
                <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                  Generate Deed
                </button>
                <button className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
                  Finalize Deed
                </button>
                <button className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700">
                  Download Deed
                </button>
              </div>
            </div>
          </div>
        );

      case 'audit':
        return (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Audit Log</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Complete history of actions performed on this application
              </p>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {mockAuditLog.map((log, index) => (
                  <li key={index} className="px-4 py-4 sm:px-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <ClipboardDocumentListIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{log.action}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">By: {log.user}</p>
                        <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AuthGuard>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Link
                  href="/applications"
                  className="mr-4 p-2 text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Application {applicationId}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    {mockApplicationData.applicationNumber} • {mockApplicationData.status}
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                  Print
                </button>
                <button className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700">
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
