"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import { Loader2, Search, FileText, Download, Save } from "lucide-react";
import AuthGuard from "../../../components/AuthGuard";
import { useAuth } from "../../../contexts/AuthContext";
import { api } from "../../../services/api";
import { Application } from "../../../types";

export default function HousingConsolePage() {
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
    setIsLoading(true);
    try {
      const response = await api.getHousingPendingApplications();
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

  const handleGeneratePdf = async () => {
    if (!selectedApplication) return;

    setIsGeneratingPdf(true);
    try {
      const response = await api.generateHousingClearancePDF(selectedApplication.id);
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
    if (!selectedApplication || !clearanceDecision || !pdfUrl) {
      toast.error('Please complete all required fields');
      return;
    }

    if (clearanceDecision === 'OBJECTION' && !remarks.trim()) {
      toast.error('Remarks are required for objections');
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

      const housingSection = sectionsResponse.data.sections.find((s: any) => s.code === 'HOUSING');
      const status = statusesResponse.data.statuses.find((s: any) => s.code === clearanceDecision);

      if (!housingSection || !status) {
        throw new Error('Housing section or status not found');
      }

      // Create clearance
      const response = await api.createClearance(
        selectedApplication.id,
        housingSection.id,
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

  const getHousingStatus = (application: Application) => {
    const housingClearance = application.clearances?.find(c => c.section.code === 'HOUSING');
    if (housingClearance) {
      return housingClearance.status.name;
    }
    return 'Pending';
  };

  const getHousingStatusColor = (application: Application) => {
    const status = getHousingStatus(application);
    switch (status) {
      case 'Clear': return 'bg-green-100 text-green-800';
      case 'Objection': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <AuthGuard allowedRoles={['HOUSING', 'ADMIN']}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Housing Console</h1>
          <p className="text-gray-600 mt-2">Review and process Housing clearances for housing transfer applications</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Applications List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Pending Applications</span>
                <Badge variant="secondary">{applications.length}</Badge>
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
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading applications...</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {applications.filter(app =>
                    app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    app.seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    app.buyer.name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((application) => (
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
                          <Badge className={`text-xs ${getHousingStatusColor(application)}`}>
                            Housing: {getHousingStatus(application)}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        <p><strong>Seller:</strong> {application.seller.name}</p>
                        <p><strong>Buyer:</strong> {application.buyer.name}</p>
                        <p><strong>Plot:</strong> {application.plot.plotNumber}</p>
                      </div>
                    </div>
                  ))}
                  {applications.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No pending applications found</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clearance Processing */}
          <Card>
            <CardHeader>
              <CardTitle>Process Housing Clearance</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedApplication ? (
                <div className="space-y-6">
                  {/* Application Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">{selectedApplication.applicationNumber}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Seller:</strong> {selectedApplication.seller.name}</p>
                        <p><strong>CNIC:</strong> {selectedApplication.seller.cnic}</p>
                      </div>
                      <div>
                        <p><strong>Buyer:</strong> {selectedApplication.buyer.name}</p>
                        <p><strong>CNIC:</strong> {selectedApplication.buyer.cnic}</p>
                      </div>
                      <div className="col-span-2">
                        <p><strong>Plot:</strong> {selectedApplication.plot.plotNumber} - {selectedApplication.plot.location}</p>
                        <p><strong>Current Stage:</strong> {selectedApplication.currentStage.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Clearance Decision */}
                  <div>
                    <Label className="text-base font-semibold">Clearance Decision</Label>
                    <RadioGroup
                      value={clearanceDecision}
                      onValueChange={(value) => setClearanceDecision(value as 'CLEAR' | 'OBJECTION')}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CLEAR" id="clear" />
                        <Label htmlFor="clear" className="text-green-700 font-medium">Clear - No Objections</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="OBJECTION" id="objection" />
                        <Label htmlFor="objection" className="text-red-700 font-medium">Objection - Issues Found</Label>
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
                      placeholder={clearanceDecision === 'OBJECTION'
                        ? "Please specify the objections and required actions..."
                        : "Optional remarks about the clearance..."}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="mt-2"
                      rows={4}
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
                  <p>Select an application from the list to process Housing clearance</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
