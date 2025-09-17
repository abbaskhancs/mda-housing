"use client";

import { useState, useEffect } from "react";
import AuthGuard from "../../../components/AuthGuard";
import { apiService } from "../../../services/api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Textarea } from "../../../components/ui/textarea";
import { Loader2, FileText, CheckCircle, Save } from "lucide-react";
import { Application } from "../../../types";

export default function OWOConsolePage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [remarks, setRemarks] = useState('');
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
      const response = await apiService.getOWOBCAHousingReviewApplications();
      if (response.success && response.data) {
        setApplications(response.data.applications);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!selectedApplication) return;

    try {
      setIsSaving(true);

      // Get OWO section ID
      const sectionsResponse = await apiService.getSections();
      if (!sectionsResponse.success || !sectionsResponse.data) {
        throw new Error('Failed to get sections');
      }

      const owoSection = sectionsResponse.data.sections.find(s => s.code === 'OWO');
      if (!owoSection) {
        throw new Error('OWO section not found');
      }

      // Create OWO review with auto-transition
      const reviewResponse = await apiService.createReview(
        selectedApplication.id,
        owoSection.id,
        remarks || 'BCA/Housing clearances reviewed and approved',
        'APPROVED',
        true // Enable auto-transition
      );

      if (reviewResponse.success) {
        // Reload applications to reflect changes
        await loadApplications();
        
        // Clear selection and form
        setSelectedApplication(null);
        setRemarks('');
        
        alert('Review completed successfully! Application moved to OWO Review - BCA & Housing stage.');
      } else {
        throw new Error(reviewResponse.error || 'Failed to create review');
      }
    } catch (error) {
      console.error('Error creating review:', error);
      alert('Error creating review: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const getBCAStatus = (application: Application) => {
    const bcaClearance = application.clearances?.find(c => c.section.code === 'BCA');
    return bcaClearance?.status.name || 'Pending';
  };

  const getHousingStatus = (application: Application) => {
    const housingClearance = application.clearances?.find(c => c.section.code === 'HOUSING');
    return housingClearance?.status.name || 'Pending';
  };

  const getBCAStatusColor = (application: Application) => {
    const status = getBCAStatus(application);
    switch (status) {
      case 'Clear': return 'bg-green-100 text-green-800';
      case 'Objection': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getHousingStatusColor = (application: Application) => {
    const status = getHousingStatus(application);
    switch (status) {
      case 'Clear': return 'bg-green-100 text-green-800';
      case 'Objection': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const hasExistingOWOReview = (application: Application) => {
    return application.reviews?.some(r => r.section.code === 'OWO' && r.status === 'APPROVED');
  };

  return (
    <AuthGuard allowedRoles={['OWO', 'ADMIN']}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">OWO Console - BCA & Housing Review</h1>
          <p className="text-gray-600 mt-2">Review applications with completed BCA and Housing clearances</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Applications List */}
          <Card>
            <CardHeader>
              <CardTitle>Applications Ready for Review</CardTitle>
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Search by application number, seller, or buyer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600">Loading applications...</span>
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No applications ready for OWO review</p>
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
                          {hasExistingOWOReview(application) && (
                            <Badge className="text-xs bg-green-100 text-green-800">
                              Reviewed
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        <p><strong>Seller:</strong> {application.seller.name}</p>
                        <p><strong>Buyer:</strong> {application.buyer.name}</p>
                        <p><strong>Plot:</strong> {application.plot.plotNumber}, {application.plot.sector}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={`text-xs ${getBCAStatusColor(application)}`}>
                          BCA: {getBCAStatus(application)}
                        </Badge>
                        <Badge className={`text-xs ${getHousingStatusColor(application)}`}>
                          Housing: {getHousingStatus(application)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Processing */}
          <Card>
            <CardHeader>
              <CardTitle>Mark BCA/Housing Reviewed</CardTitle>
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
                        <p><strong>Plot:</strong> {selectedApplication.plot.plotNumber}, {selectedApplication.plot.sector}</p>
                        <p><strong>Current Stage:</strong> {selectedApplication.currentStage.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Clearance Status */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Clearance Status</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Badge className={`${getBCAStatusColor(selectedApplication)}`}>
                          BCA: {getBCAStatus(selectedApplication)}
                        </Badge>
                      </div>
                      <div>
                        <Badge className={`${getHousingStatusColor(selectedApplication)}`}>
                          Housing: {getHousingStatus(selectedApplication)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Review Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Review Remarks (Optional)
                      </label>
                      <Textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter any additional remarks for this review..."
                        rows={3}
                      />
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={handleMarkReviewed}
                      disabled={isSaving || hasExistingOWOReview(selectedApplication)}
                      className="w-full"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      {hasExistingOWOReview(selectedApplication) 
                        ? 'Already Reviewed' 
                        : isSaving 
                          ? 'Processing...' 
                          : 'Mark BCA/Housing Reviewed'
                      }
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select an application from the list to review BCA/Housing clearances</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
