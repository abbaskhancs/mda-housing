'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import DataTable, { Column, SortConfig } from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Search, Download, Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { Application } from '@/types';
import { BulkActionsToolbar, BulkActionType, getBulkActionModalProps } from '@/components/BulkActionsToolbar';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { toast } from 'react-hot-toast';
import { QueueFilters, QueueFilterState } from '@/components/QueueFilters';

export default function BCAConsolePage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [clearanceDecision, setClearanceDecision] = useState<'CLEAR' | 'OBJECTION' | ''>('');
  const [remarks, setRemarks] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<QueueFilterState>({
    stage: '',
    status: '',
    myPending: false,
    search: ''
  });
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Bulk action states
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Application[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkActionType | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Load applications on component mount and when sorting changes
  useEffect(() => {
    loadApplications();
  }, [sortConfig]);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (sortConfig) {
        params.sortBy = sortConfig.key;
        params.sortOrder = sortConfig.direction;
      }
      const response = await api.getBCAPendingApplications(params);
      if (response.success) {
        setApplications(response.data.applications);
      } else {
        toast.error('Failed to load applications');
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters to applications
  useEffect(() => {
    let filtered = [...applications];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(app =>
        app.applicationNumber.toLowerCase().includes(searchTerm) ||
        app.seller.name.toLowerCase().includes(searchTerm) ||
        app.buyer.name.toLowerCase().includes(searchTerm) ||
        app.seller.cnic.toLowerCase().includes(searchTerm) ||
        app.buyer.cnic.toLowerCase().includes(searchTerm) ||
        app.plot.plotNumber.toLowerCase().includes(searchTerm) ||
        (app.attorney && app.attorney.cnic.toLowerCase().includes(searchTerm))
      );
    }

    // Apply stage filter
    if (filters.stage) {
      filtered = filtered.filter(app => app.currentStage.code === filters.stage);
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(app => app.status === filters.status);
    }

    // Apply "my pending" filter for BCA
    if (filters.myPending) {
      // For BCA, show applications in SENT_TO_BCA_HOUSING stage
      filtered = filtered.filter(app => app.currentStage.code === 'SENT_TO_BCA_HOUSING');
    }

    setFilteredApplications(filtered);
  }, [applications, filters]);

  const handleFiltersChange = (newFilters: QueueFilterState) => {
    setFilters(newFilters);
  };

  const handleSortChange = (sort: SortConfig | null) => {
    setSortConfig(sort);
  };

  const handleGeneratePdf = async () => {
    if (!selectedApplication) return;
    
    setIsGeneratingPdf(true);
    try {
      const response = await api.generateBCAClearancePDF(selectedApplication.id);
      if (response.success) {
        setPdfUrl(response.data.signedUrl);
        toast.success('PDF generated successfully');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSave = async () => {
    if (!selectedApplication || !clearanceDecision) return;
    
    // Validate required fields
    if (clearanceDecision === 'OBJECTION' && !remarks.trim()) {
      toast.error('Remarks are required for objections');
      return;
    }

    if (!pdfUrl) {
      toast.error('Please generate the clearance PDF first');
      return;
    }
    
    setIsSaving(true);
    try {
      // Get section and status IDs
      const [sectionsResponse, statusesResponse] = await Promise.all([
        api.get('/api/workflow/sections'),
        api.get('/api/workflow/statuses')
      ]);

      if (!sectionsResponse.success || !statusesResponse.success) {
        throw new Error('Failed to load workflow data');
      }

      const bcaSection = sectionsResponse.data.sections.find((s: any) => s.code === 'BCA');
      const status = statusesResponse.data.statuses.find((s: any) => s.code === clearanceDecision);

      if (!bcaSection || !status) {
        throw new Error('BCA section or status not found');
      }

      // Create clearance
      const response = await api.createClearance(
        selectedApplication.id,
        bcaSection.id,
        status.id,
        remarks.trim() || undefined,
        pdfUrl
      );

      if (response.success) {
        toast.success('Clearance saved successfully');
        
        // Reset form
        setClearanceDecision('');
        setRemarks('');
        setPdfUrl(null);
        setSelectedApplication(null);
        
        // Reload applications
        await loadApplications();
      } else {
        toast.error('Failed to save clearance');
      }
    } catch (error) {
      console.error('Error saving clearance:', error);
      toast.error('Failed to save clearance');
    } finally {
      setIsSaving(false);
    }
  };

  const getBCAStatus = (application: Application) => {
    const bcaClearance = application.clearances?.find(c => c.section.code === 'BCA');
    if (bcaClearance) {
      return bcaClearance.status.name;
    }
    return 'Pending';
  };

  const getBCAStatusColor = (application: Application) => {
    const status = getBCAStatus(application);
    switch (status) {
      case 'Clear': return 'bg-green-100 text-green-800';
      case 'Objection': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Bulk action handlers
  const handleSelectionChange = (selectedKeys: string[], selectedRows: Application[]) => {
    setSelectedRowKeys(selectedKeys);
    setSelectedRows(selectedRows);
  };

  const handleBulkAction = (action: BulkActionType) => {
    setBulkAction(action);
    setShowBulkModal(true);
  };

  const handleBulkConfirm = async (remarks?: string) => {
    if (!bulkAction || selectedRows.length === 0) return;

    setIsBulkProcessing(true);
    try {
      // Get section and status IDs
      const [sectionsResponse, statusesResponse] = await Promise.all([
        api.get('/api/workflow/sections'),
        api.get('/api/workflow/statuses')
      ]);

      if (!sectionsResponse.success || !statusesResponse.success) {
        throw new Error('Failed to load workflow data');
      }

      const bcaSection = sectionsResponse.data.sections.find((s: any) => s.code === 'BCA');
      const status = statusesResponse.data.statuses.find((s: any) => s.code === bulkAction);

      if (!bcaSection || !status) {
        throw new Error('BCA section or status not found');
      }

      // Perform bulk operation
      const response = await api.createBulkClearances(
        selectedRowKeys,
        bcaSection.id,
        status.id,
        remarks
      );

      if (response.success) {
        const { successful, failed, results } = response.data.summary;

        // Show success message
        toast.success(`Bulk operation completed: ${successful} successful, ${failed} failed`);

        // Show individual failures if any
        const failures = response.data.results.filter((r: any) => !r.success);
        if (failures.length > 0) {
          failures.forEach((failure: any) => {
            toast.error(`${failure.applicationNumber || failure.applicationId}: ${failure.error}`);
          });
        }

        // Reload applications and clear selection
        await loadApplications();
        setSelectedRowKeys([]);
        setSelectedRows([]);
      } else {
        throw new Error(response.error || 'Bulk operation failed');
      }
    } catch (error: any) {
      console.error('Bulk operation failed:', error);
      toast.error(error.message || 'Bulk operation failed');
    } finally {
      setIsBulkProcessing(false);
      setShowBulkModal(false);
      setBulkAction(null);
    }
  };

  const clearSelection = () => {
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  // Filter applications that can have BCA clearances
  const selectableRowFilter = (application: Application) => {
    const status = getBCAStatus(application);
    return status === 'Pending'; // Only pending applications can be bulk processed
  };

  // Define table columns
  const columns: Column<Application>[] = [
    {
      key: 'applicationNumber',
      title: 'Application No.',
      sortable: true,
      render: (value, record) => (
        <div className="font-medium text-blue-600 cursor-pointer hover:text-blue-800"
             onClick={() => setSelectedApplication(record)}>
          {value}
        </div>
      )
    },
    {
      key: 'seller',
      title: 'Seller',
      render: (value) => (
        <div>
          <div className="font-medium">{value.name}</div>
          <div className="text-xs text-gray-500">CNIC: {value.cnic}</div>
        </div>
      )
    },
    {
      key: 'buyer',
      title: 'Buyer',
      render: (value) => (
        <div>
          <div className="font-medium">{value.name}</div>
          <div className="text-xs text-gray-500">CNIC: {value.cnic}</div>
        </div>
      )
    },
    {
      key: 'plot',
      title: 'Plot',
      render: (value) => `${value.plotNumber}, ${value.blockNumber}`
    },
    {
      key: 'currentStage',
      title: 'Stage',
      render: (value) => (
        <Badge variant="outline" className="text-xs">
          {value.name}
        </Badge>
      )
    },
    {
      key: 'bcaStatus',
      title: 'BCA Status',
      render: (_, record) => {
        const status = getBCAStatus(record);
        return (
          <Badge className={`text-xs ${getBCAStatusColor(record)}`}>
            {status}
          </Badge>
        );
      }
    },
    {
      key: 'createdAt',
      title: 'Date',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString()
    }
  ];

  return (
    <AuthGuard allowedRoles={['BCA', 'ADMIN']}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">BCA Console</h1>
          <p className="text-gray-600 mt-2">Review and process BCA clearances for housing transfer applications</p>
        </div>

        {/* Queue Filters */}
        <div className="mb-6">
          <QueueFilters
            onFiltersChange={handleFiltersChange}
            userRole="BCA"
          />
        </div>

        {/* Bulk Actions Toolbar */}
        <BulkActionsToolbar
          selectedCount={selectedRowKeys.length}
          onAction={handleBulkAction}
          onClearSelection={clearSelection}
          availableActions={['CLEAR', 'OBJECTION']}
          disabled={isBulkProcessing}
        />

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              BCA Applications Queue ({filteredApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredApplications}
              loading={isLoading}
              rowKey="id"
              onRowClick={setSelectedApplication}
              selectedRowKey={selectedApplication?.id}
              multiSelect={true}
              selectedRowKeys={selectedRowKeys}
              onSelectionChange={handleSelectionChange}
              selectableRowFilter={selectableRowFilter}
              onSortChange={setSortConfig}
              emptyText="No applications found"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6">

          {/* Detail Panel */}
          <Card>
            <CardHeader>
              <CardTitle>BCA Clearance Processing</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedApplication ? (
                <div className="space-y-6">
                  {/* Application Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">{selectedApplication.applicationNumber}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Seller:</strong> {selectedApplication.seller.name}
                        <br />
                        <span className="text-gray-600">CNIC: {selectedApplication.seller.cnic}</span>
                      </div>
                      <div>
                        <strong>Buyer:</strong> {selectedApplication.buyer.name}
                        <br />
                        <span className="text-gray-600">CNIC: {selectedApplication.buyer.cnic}</span>
                      </div>
                      <div className="col-span-2">
                        <strong>Plot:</strong> {selectedApplication.plot.plotNumber}, {selectedApplication.plot.blockNumber}, {selectedApplication.plot.sectorNumber}
                      </div>
                    </div>
                  </div>

                  {/* Clearance Decision */}
                  <div>
                    <Label className="text-base font-semibold">BCA Decision</Label>
                    <RadioGroup
                      value={clearanceDecision}
                      onValueChange={(value) => setClearanceDecision(value as 'CLEAR' | 'OBJECTION')}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CLEAR" id="clear" />
                        <Label htmlFor="clear" className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Clear
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="OBJECTION" id="objection" />
                        <Label htmlFor="objection" className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          Objection
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Remarks */}
                  <div>
                    <Label htmlFor="remarks" className="text-base font-semibold">
                      Remarks {clearanceDecision === 'OBJECTION' && <span className="text-red-500">*</span>}
                    </Label>
                    <Textarea
                      id="remarks"
                      placeholder={clearanceDecision === 'OBJECTION' ? 'Please provide reason for objection...' : 'Optional remarks...'}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="mt-2"
                      rows={3}
                    />
                  </div>

                  {/* PDF Generation */}
                  <div>
                    <Label className="text-base font-semibold">Clearance Certificate</Label>
                    <div className="mt-2 space-y-2">
                      <Button
                        onClick={handleGeneratePdf}
                        disabled={isGeneratingPdf || !clearanceDecision}
                        variant="outline"
                        className="w-full"
                      >
                        {isGeneratingPdf ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        {isGeneratingPdf ? 'Generating PDF...' : 'Generate Clearance PDF'}
                      </Button>
                      {pdfUrl && (
                        <Button
                          onClick={() => window.open(pdfUrl, '_blank')}
                          variant="outline"
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          View Generated PDF
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={handleSave}
                    disabled={
                      !clearanceDecision ||
                      (clearanceDecision === 'OBJECTION' && !remarks.trim()) ||
                      !pdfUrl ||
                      isSaving
                    }
                    className="w-full"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Clearance'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select an application from the list to process BCA clearance</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bulk Action Confirmation Modal */}
        {bulkAction && (
          <ConfirmationModal
            isOpen={showBulkModal}
            onClose={() => {
              setShowBulkModal(false);
              setBulkAction(null);
            }}
            onConfirm={handleBulkConfirm}
            loading={isBulkProcessing}
            {...getBulkActionModalProps(bulkAction, selectedRowKeys.length)}
          />
        )}
      </div>
    </AuthGuard>
  );
}
