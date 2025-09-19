"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { apiService, ErrorDetails } from '../services/api';
import { Application } from '../types';
import ErrorBanner from './ErrorBanner';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentPlusIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface ObjectionLoopActionsProps {
  application: Application;
  onTransition?: () => void;
  className?: string;
}

interface ActionOption {
  id: string;
  label: string;
  description: string;
  toStageCode: string;
  guardName: string;
  icon: React.ReactNode;
  variant: 'default' | 'secondary' | 'destructive';
}

export default function ObjectionLoopActions({ 
  application, 
  onTransition,
  className = ""
}: ObjectionLoopActionsProps) {
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | undefined>(undefined);
  const [availableActions, setAvailableActions] = useState<ActionOption[]>([]);

  useEffect(() => {
    loadAvailableActions();
  }, [application.currentStage.code]);

  const loadAvailableActions = () => {
    const actions: ActionOption[] = [];

    if (application.currentStage.code === 'ON_HOLD_BCA') {
      actions.push(
        {
          id: 'fix-resubmit-bca',
          label: 'Fix & Resubmit',
          description: 'Send back to UNDER_SCRUTINY for major document fixes',
          toStageCode: 'UNDER_SCRUTINY',
          guardName: 'GUARD_FIX_AND_RESUBMIT_BCA',
          icon: <DocumentPlusIcon className="h-4 w-4" />,
          variant: 'secondary'
        },
        {
          id: 'resend-bca-housing',
          label: 'Resend to BCA & Housing',
          description: 'Re-dispatch to BCA & Housing after uploading missing documents',
          toStageCode: 'SENT_TO_BCA_HOUSING',
          guardName: 'GUARD_RESEND_TO_BCA_HOUSING',
          icon: <ArrowPathIcon className="h-4 w-4" />,
          variant: 'default'
        }
      );
    } else if (application.currentStage.code === 'ON_HOLD_ACCOUNTS') {
      actions.push(
        {
          id: 'fix-resubmit-accounts',
          label: 'Fix & Resubmit',
          description: 'Send back to UNDER_SCRUTINY for major document fixes',
          toStageCode: 'UNDER_SCRUTINY',
          guardName: 'GUARD_FIX_AND_RESUBMIT_ACCOUNTS',
          icon: <DocumentPlusIcon className="h-4 w-4" />,
          variant: 'secondary'
        },
        {
          id: 'resolve-accounts-objection',
          label: 'Resolve Objection',
          description: 'Return to ACCOUNTS_PENDING after fixing the objection',
          toStageCode: 'ACCOUNTS_PENDING',
          guardName: 'GUARD_ACCOUNTS_OBJECTION_RESOLVED',
          icon: <CheckCircleIcon className="h-4 w-4" />,
          variant: 'default'
        }
      );
    }

    setAvailableActions(actions);
  };

  const handleActionSubmit = async () => {
    if (!selectedAction || !remarks.trim()) {
      setError('Please select an action and provide remarks');
      return;
    }

    const action = availableActions.find(a => a.id === selectedAction);
    if (!action) {
      setError('Invalid action selected');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setErrorDetails(undefined);

    try {
      // Get the target stage ID
      const stagesResponse = await apiService.getWorkflowStages();
      if (!stagesResponse.success) {
        throw new Error('Failed to load workflow stages');
      }

      const targetStage = stagesResponse.data.stages.find(
        (stage: any) => stage.code === action.toStageCode
      );

      if (!targetStage) {
        throw new Error(`Target stage ${action.toStageCode} not found`);
      }

      // Execute the transition
      const response = await apiService.transitionApplication(
        application.id,
        targetStage.id,
        remarks.trim()
      );

      if (response.success) {
        // Clear form
        setSelectedAction('');
        setRemarks('');
        
        // Notify parent component
        if (onTransition) {
          onTransition();
        }
      } else {
        setError(response.error || 'Transition failed');
        setErrorDetails(response.errorDetails);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setErrorDetails(undefined);
    } finally {
      setIsProcessing(false);
    }
  };

  const getObjectionDetails = () => {
    if (application.currentStage.code === 'ON_HOLD_BCA') {
      const bcaObjection = application.clearances?.find(
        c => c.section.code === 'BCA' && c.status.code === 'OBJECTION'
      );
      return {
        section: 'BCA',
        reason: bcaObjection?.remarks || 'No objection details available',
        date: bcaObjection?.createdAt
      };
    } else if (application.currentStage.code === 'ON_HOLD_ACCOUNTS') {
      return {
        section: 'Accounts',
        reason: application.accountsBreakdown?.objectionReason || 'No objection details available',
        date: application.accountsBreakdown?.objectionDate
      };
    }
    return null;
  };

  const objectionDetails = getObjectionDetails();

  if (!objectionDetails || availableActions.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          Objection Loop Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Objection Details */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="destructive">{objectionDetails.section} Objection</Badge>
            {objectionDetails.date && (
              <span className="text-sm text-gray-500">
                {new Date(objectionDetails.date).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-sm text-red-800">{objectionDetails.reason}</p>
        </div>

        {/* Action Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Select Action</Label>
          {availableActions.map((action) => (
            <div
              key={action.id}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                selectedAction === action.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedAction(action.id)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="action"
                  value={action.id}
                  checked={selectedAction === action.id}
                  onChange={() => setSelectedAction(action.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {action.icon}
                    <span className="font-medium">{action.label}</span>
                  </div>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <Label htmlFor="remarks" className="text-base font-semibold">
            Remarks <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Provide details about the action being taken..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Error Display */}
        {error && (
          <ErrorBanner
            error={error}
            details={errorDetails}
            onRetry={() => {
              setError(null);
              setErrorDetails(undefined);
            }}
            onReload={() => {
              if (errorDetails?.statusCode === 409) {
                window.location.reload();
              } else {
                setError(null);
                setErrorDetails(undefined);
              }
            }}
          />
        )}

        {/* Submit Button */}
        <Button
          onClick={handleActionSubmit}
          disabled={!selectedAction || !remarks.trim() || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <CheckCircleIcon className="h-4 w-4 mr-2" />
          )}
          {isProcessing ? 'Processing...' : 'Execute Action'}
        </Button>
      </CardContent>
    </Card>
  );
}
