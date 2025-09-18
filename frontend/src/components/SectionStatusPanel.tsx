"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { apiService } from '../services/api';
import { 
  DocumentTextIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Clearance {
  id: string;
  section: {
    code: string;
    name: string;
  };
  status: {
    code: string;
    name: string;
  };
  remarks: string | null;
  signedPdfUrl: string | null;
  clearedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SectionStatusPanelProps {
  applicationId: string;
  className?: string;
}

export default function SectionStatusPanel({ applicationId, className = "" }: SectionStatusPanelProps) {
  const [clearances, setClearances] = useState<Clearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Define the sections we want to display
  const targetSections = ['BCA', 'HOUSING', 'ACCOUNTS'];

  useEffect(() => {
    loadClearances();
    
    // Set up polling for live updates every 30 seconds
    const interval = setInterval(loadClearances, 30000);
    
    return () => clearInterval(interval);
  }, [applicationId]);

  const loadClearances = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await apiService.get<{ clearances: Clearance[] }>(`/applications/${applicationId}/clearances`);
      
      if (response.success && response.data) {
        setClearances(response.data.clearances);
      } else {
        setError(response.error || 'Failed to load clearances');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadClearances(true);
  };

  const getStatusColor = (statusCode: string) => {
    switch (statusCode) {
      case 'CLEAR':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'OBJECTION':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PENDING_PAYMENT':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (statusCode: string) => {
    switch (statusCode) {
      case 'CLEAR':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'OBJECTION':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getSectionClearance = (sectionCode: string): Clearance | null => {
    return clearances.find(c => c.section.code === sectionCode) || null;
  };

  const handlePdfClick = async (clearance: Clearance) => {
    if (!clearance.signedPdfUrl) {
      // Generate PDF if it doesn't exist
      try {
        let templateType = '';
        switch (clearance.section.code) {
          case 'BCA':
            templateType = 'clearance-bca';
            break;
          case 'HOUSING':
            templateType = 'clearance-housing';
            break;
          case 'ACCOUNTS':
            templateType = 'clearance-accounts';
            break;
          default:
            return;
        }

        // Generate PDF
        const pdfResponse = await fetch(`/api/pdf/generate/${templateType}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            application: { id: applicationId },
            sectionName: clearance.section.code
          })
        });

        if (pdfResponse.ok) {
          const blob = await pdfResponse.blob();
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          window.URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    } else {
      // Open existing PDF
      window.open(clearance.signedPdfUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Section Status</h3>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        </div>
        <div className="text-center py-4 text-gray-500">Loading section status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Section Status</h3>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Section Status</h3>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={refreshing}
          title="Refresh status"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-4">
        {targetSections.map((sectionCode) => {
          const clearance = getSectionClearance(sectionCode);
          const hasStatus = clearance !== null;
          const statusCode = clearance?.status.code || 'PENDING';
          const statusName = clearance?.status.name || 'Pending';

          return (
            <div key={sectionCode} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getStatusIcon(statusCode)}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{sectionCode}</div>
                  {clearance?.remarks && (
                    <div className="text-sm text-gray-600 mt-1">
                      {clearance.remarks}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge 
                  className={`${getStatusColor(statusCode)} border`}
                  variant="outline"
                >
                  {statusName}
                </Badge>
                
                {hasStatus && (
                  <Button
                    onClick={() => handlePdfClick(clearance)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <DocumentTextIcon className="h-3 w-3 mr-1" />
                    PDF
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Last updated: {new Date().toLocaleTimeString()} • Auto-refreshes every 30s
      </div>
    </div>
  );
}
