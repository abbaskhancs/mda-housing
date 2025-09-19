"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import WorkflowActions from "../../../components/WorkflowActions";
import SectionStatusPanel from "../../../components/SectionStatusPanel";
import { AttachmentsGrid } from "../../../components/AttachmentsGrid";
import { StageTimeline } from "../../../components/StageTimeline";
import E2EDemoButton from "../../../components/E2EDemoButton";
import { useAuth } from "../../../contexts/AuthContext";
import { apiService } from "../../../services/api";
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
import AccountsTab from "../../../components/AccountsTab";
import PrintControls, { PrintOption } from "../../../components/PrintControls";

const tabs = [
  { id: 'summary', name: 'Summary', icon: DocumentTextIcon },
  { id: 'attachments', name: 'Attachments', icon: PaperClipIcon },
  { id: 'clearances', name: 'Clearances', icon: CheckCircleIcon },
  { id: 'accounts', name: 'Accounts', icon: CurrencyDollarIcon },
  { id: 'deed', name: 'Deed', icon: DocumentIcon },
  { id: 'audit', name: 'Audit', icon: ClipboardDocumentListIcon },
];



interface Application {
  id: string;
  applicationNumber: string;
  seller: { name: string; cnic: string };
  buyer: { name: string; cnic: string };
  attorney?: { name: string; cnic: string };
  plot: { plotNumber: string; sector: string };
  currentStage: { code: string; name: string };
  status: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  auditLogs?: Array<{
    id: string;
    action: string;
    fromStageId?: string;
    toStageId?: string;
    details?: string;
    createdAt: string;
    user: {
      id: string;
      username: string;
      role: string;
    };
  }>;
}

export default function ApplicationDetail() {
  const { user } = useAuth();
  const params = useParams();
  const [activeTab, setActiveTab] = useState('summary');
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPacket, setExportingPacket] = useState(false);

  const applicationId = params.id as string;

  useEffect(() => {
    loadApplication();
  }, [applicationId]);

  const loadApplication = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getApplication(applicationId);

      if (response.success && response.data) {
        setApplication(response.data);
      } else {
        setError(response.error || 'Failed to load application');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPacket = async () => {
    if (!application) return;

    setExportingPacket(true);
    try {
      const response = await apiService.exportCasePacket(applicationId);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Case_Packet_${application.applicationNumber || applicationId}_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to export case packet');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export case packet');
    } finally {
      setExportingPacket(false);
    }
  };

  const getPrintOptions = (tabId: string): PrintOption[] => {
    if (!application) return [];

    switch (tabId) {
      case 'summary':
        return [{
          id: 'summary-print',
          label: 'Print Summary',
          type: 'client-print',
          printElementId: 'summary-content'
        }];

      case 'clearances':
        const clearanceOptions: PrintOption[] = [];
        // Add server PDF options for available clearances
        if (application.clearances) {
          application.clearances.forEach(clearance => {
            if (clearance.signedPdfUrl) {
              clearanceOptions.push({
                id: `clearance-${clearance.section.code}`,
                label: `Print ${clearance.section.code} Clearance`,
                type: 'server-pdf',
                pdfUrl: clearance.signedPdfUrl
              });
            }
          });
        }
        // Add fallback client print
        clearanceOptions.push({
          id: 'clearances-print',
          label: 'Print Clearances View',
          type: 'client-print',
          printElementId: 'clearances-content'
        });
        return clearanceOptions;

      case 'accounts':
        const accountsOptions: PrintOption[] = [];
        // Add challan PDF if available
        if (application.accountsBreakdown?.challanUrl) {
          accountsOptions.push({
            id: 'accounts-challan',
            label: 'Print Challan',
            type: 'server-pdf',
            pdfUrl: application.accountsBreakdown.challanUrl
          });
        }
        // Add accounts clearance PDF if available
        const accountsClearance = application.clearances?.find(c => c.section.code === 'ACCOUNTS');
        if (accountsClearance?.signedPdfUrl) {
          accountsOptions.push({
            id: 'accounts-clearance',
            label: 'Print Accounts Clearance',
            type: 'server-pdf',
            pdfUrl: accountsClearance.signedPdfUrl
          });
        }
        // Add fallback client print
        accountsOptions.push({
          id: 'accounts-print',
          label: 'Print Accounts View',
          type: 'client-print',
          printElementId: 'accounts-content'
        });
        return accountsOptions;

      case 'attachments':
        return [{
          id: 'attachments-print',
          label: 'Print Attachments List',
          type: 'client-print',
          printElementId: 'attachments-content'
        }];

      case 'deed':
        const deedOptions: PrintOption[] = [];
        // Add deed PDF if available
        if (application.transferDeed?.deedPdfUrl) {
          deedOptions.push({
            id: 'deed-pdf',
            label: 'Print Transfer Deed',
            type: 'server-pdf',
            pdfUrl: application.transferDeed.deedPdfUrl
          });
        }
        // Add fallback client print
        deedOptions.push({
          id: 'deed-print',
          label: 'Print Deed View',
          type: 'client-print',
          printElementId: 'deed-content'
        });
        return deedOptions;

      case 'audit':
        return [{
          id: 'audit-print',
          label: 'Print Audit Timeline',
          type: 'client-print',
          printElementId: 'audit-content'
        }];

      default:
        return [];
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        if (!application) {
          return (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center py-8 text-gray-500">
                {loading ? 'Loading application...' : 'Application not found'}
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {/* Print Controls */}
            <div className="flex justify-end">
              <PrintControls
                applicationId={applicationId}
                tabId="summary"
                options={getPrintOptions('summary')}
              />
            </div>

            <div id="summary-content" data-tab="summary" className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Application Information</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Application Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{application.applicationNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {application.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Current Stage</dt>
                  <dd className="mt-1 text-sm text-gray-900">{application.currentStage.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Submitted At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(application.submittedAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Section Status Panel */}
            <SectionStatusPanel applicationId={applicationId} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Seller Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{application.seller.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">CNIC</dt>
                    <dd className="mt-1 text-sm text-gray-900">{application.seller.cnic}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Buyer Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{application.buyer.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">CNIC</dt>
                    <dd className="mt-1 text-sm text-gray-900">{application.buyer.cnic}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Property Information</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Plot Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{application.plot.plotNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Sector</dt>
                  <dd className="mt-1 text-sm text-gray-900">{application.plot.sector}</dd>
                </div>
              </dl>
            </div>

              {/* Workflow Actions - Only show if user has relevant role */}
              {user && (user.role === 'OWO' || user.role === 'BCA' || user.role === 'HOUSING' || user.role === 'ACCOUNTS' || user.role === 'APPROVER' || user.role === 'ADMIN') && (
                <WorkflowActions
                  applicationId={applicationId}
                  currentStage={application.currentStage.code}
                  onTransition={loadApplication}
                />
              )}
            </div>
          </div>
        );

      case 'attachments':
        return (
          <div className="space-y-6">
            {/* Print Controls */}
            <div className="flex justify-end">
              <PrintControls
                applicationId={applicationId}
                tabId="attachments"
                options={getPrintOptions('attachments')}
              />
            </div>

            <div id="attachments-content" data-tab="attachments">
              <AttachmentsGrid applicationId={applicationId} />
            </div>
          </div>
        );

      case 'clearances':
        return (
          <div className="space-y-6">
            {/* Print Controls */}
            <div className="flex justify-end">
              <PrintControls
                applicationId={applicationId}
                tabId="clearances"
                options={getPrintOptions('clearances')}
              />
            </div>

            <div id="clearances-content" data-tab="clearances" className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Clearances</h3>

              {/* Section Status Panel for Clearances */}
              <SectionStatusPanel applicationId={applicationId} />

              <div className="mt-6 text-center py-8 text-gray-500">
                <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Use the Summary tab to view section status with live updates</p>
                <p className="text-sm mt-2">Available clearance PDFs can be printed using the Print button above</p>
              </div>
            </div>
          </div>
        );

      case 'accounts':
        return <AccountsTab applicationId={application.id} />;

      case 'deed':
        return (
          <div className="space-y-6">
            {/* Print Controls */}
            <div className="flex justify-end">
              <PrintControls
                applicationId={applicationId}
                tabId="deed"
                options={getPrintOptions('deed')}
              />
            </div>

            <div id="deed-content" data-tab="deed" className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Transfer Deed</h3>
              <div className="text-center py-8 text-gray-500">
                <DocumentIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Transfer deed functionality coming soon</p>
                <p className="text-sm mt-2">Generated deed PDFs can be printed using the Print button above</p>
              </div>
            </div>
          </div>
        );

      case 'audit':
        return application ? (
          <div className="space-y-6">
            {/* Print Controls */}
            <div className="flex justify-end">
              <PrintControls
                applicationId={applicationId}
                tabId="audit"
                options={getPrintOptions('audit')}
              />
            </div>

            <div id="audit-content" data-tab="audit">
              <StageTimeline auditLogs={application.auditLogs || []} />
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center py-8 text-gray-500">
              <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Loading audit log...</p>
            </div>
          </div>
        );





      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading application...</span>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-lg font-medium text-red-800 mb-2">Error Loading Application</h2>
                <p className="text-red-600">{error}</p>
                <button
                  onClick={loadApplication}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!application) {
    return (
      <AuthGuard>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center py-8 text-gray-500">
                Application not found
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

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
                    Application {application.applicationNumber}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    {application.currentStage.name} • {application.status}
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                {/* E2E Demo Button - Developer only (ADMIN) */}
                <E2EDemoButton
                  applicationId={applicationId}
                  currentStage={application.currentStage.code}
                  onTransition={loadApplication}
                />

                {/* Export Packet - Only show for ADMIN and APPROVER */}
                {user && (user.role === 'ADMIN' || user.role === 'APPROVER') && (
                  <button
                    onClick={handleExportPacket}
                    disabled={exportingPacket || !application}
                    className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {exportingPacket ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <span>Export Case Packet</span>
                    )}
                  </button>
                )}
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
