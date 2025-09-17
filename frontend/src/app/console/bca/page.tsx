'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
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
import { toast } from 'sonner';

export default function BCAConsolePage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [clearanceDecision, setClearanceDecision] = useState<'CLEAR' | 'OBJECTION' | ''>('');
  const [remarks, setRemarks] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Load applications on component mount
  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const response = await api.getBCAPendingApplications();
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

  const filteredApplications = applications.filter(app =>
    app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.plot.plotNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <AuthGuard allowedRoles={['BCA', 'ADMIN']}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">BCA Console</h1>
          <p className="text-gray-600 mt-2">Review and process BCA clearances for housing transfer applications</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Applications List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pending Applications ({filteredApplications.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading applications...</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredApplications.map((application) => (
                    <div
                      key={application.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedApplication?.id === application.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedApplication(application)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-sm">{application.applicationNumber}</h3>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            {application.currentStage.name}
                          </Badge>
                          <Badge className={`text-xs ${getBCAStatusColor(application)}`}>
                            BCA: {getBCAStatus(application)}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div><strong>Seller:</strong> {application.seller.name}</div>
                        <div><strong>Buyer:</strong> {application.buyer.name}</div>
                        <div><strong>Plot:</strong> {application.plot.plotNumber}, {application.plot.blockNumber}</div>
                        <div><strong>Date:</strong> {new Date(application.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                  {filteredApplications.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-gray-500">
                      No applications found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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
      </div>
    </AuthGuard>
  );
}
