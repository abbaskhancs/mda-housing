"use client";

import { useState, useEffect } from "react";
import AuthGuard from "../../../../components/AuthGuard";
import { apiService } from "../../../../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Loader2, FileText, ExclamationTriangleIcon } from "lucide-react";
import { Application } from "../../../../types";
import ObjectionLoopActions from "../../../../components/ObjectionLoopActions";
import AttachmentsGrid from "../../../../components/AttachmentsGrid";

export default function OWOObjectionLoopPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      
      // Get applications in ON_HOLD_BCA and ON_HOLD_ACCOUNTS stages
      const response = await apiService.getApplications({
        stages: ['ON_HOLD_BCA', 'ON_HOLD_ACCOUNTS'],
        includeDetails: true
      });
      
      if (response.success && response.data) {
        setApplications(response.data.applications || []);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransition = async () => {
    // Reload applications and clear selection
    await loadApplications();
    setSelectedApplication(null);
  };

  const getStageColor = (stageCode: string) => {
    switch (stageCode) {
      case 'ON_HOLD_BCA':
        return 'bg-red-100 text-red-800';
      case 'ON_HOLD_ACCOUNTS':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getObjectionSummary = (application: Application) => {
    if (application.currentStage.code === 'ON_HOLD_BCA') {
      const bcaObjection = application.clearances?.find(
        c => c.section.code === 'BCA' && c.status.code === 'OBJECTION'
      );
      return {
        section: 'BCA',
        reason: bcaObjection?.remarks || 'No details available'
      };
    } else if (application.currentStage.code === 'ON_HOLD_ACCOUNTS') {
      return {
        section: 'Accounts',
        reason: application.accountsBreakdown?.objectionReason || 'No details available'
      };
    }
    return null;
  };

  const filteredApplications = applications.filter(app =>
    app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.buyer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AuthGuard allowedRoles={['OWO', 'ADMIN']}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">OWO Console - Objection Loop</h1>
          <p className="text-gray-600 mt-2">
            Handle applications on hold due to BCA or Accounts objections
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Applications List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                Applications on Hold ({filteredApplications.length})
              </CardTitle>
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
              ) : filteredApplications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No applications on hold</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredApplications.map((application) => {
                    const objectionSummary = getObjectionSummary(application);
                    return (
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
                          <Badge className={`text-xs ${getStageColor(application.currentStage.code)}`}>
                            {application.currentStage.name}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-gray-600 space-y-1 mb-2">
                          <div><strong>Seller:</strong> {application.seller.name}</div>
                          <div><strong>Buyer:</strong> {application.buyer.name}</div>
                          <div><strong>Plot:</strong> {application.plot.plotNumber}, {application.plot.blockNumber}</div>
                        </div>

                        {objectionSummary && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                            <div className="text-xs font-medium text-red-800 mb-1">
                              {objectionSummary.section} Objection:
                            </div>
                            <div className="text-xs text-red-700 line-clamp-2">
                              {objectionSummary.reason}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Application Details and Actions */}
          <div className="space-y-6">
            {selectedApplication ? (
              <>
                {/* Application Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Application Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium">Application Number:</span>
                        <span className="ml-2">{selectedApplication.applicationNumber}</span>
                      </div>
                      <div>
                        <span className="font-medium">Current Stage:</span>
                        <Badge className={`ml-2 ${getStageColor(selectedApplication.currentStage.code)}`}>
                          {selectedApplication.currentStage.name}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Seller:</span>
                        <span className="ml-2">{selectedApplication.seller.name}</span>
                      </div>
                      <div>
                        <span className="font-medium">Buyer:</span>
                        <span className="ml-2">{selectedApplication.buyer.name}</span>
                      </div>
                      <div>
                        <span className="font-medium">Plot:</span>
                        <span className="ml-2">
                          {selectedApplication.plot.plotNumber}, {selectedApplication.plot.blockNumber}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Objection Loop Actions */}
                <ObjectionLoopActions
                  application={selectedApplication}
                  onTransition={handleTransition}
                />

                {/* Attachments */}
                <Card>
                  <CardHeader>
                    <CardTitle>Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AttachmentsGrid
                      applicationId={selectedApplication.id}
                      attachments={selectedApplication.attachments || []}
                      onAttachmentChange={loadApplications}
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select an application from the list to view details and actions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
