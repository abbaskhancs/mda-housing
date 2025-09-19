"use client";

import React, { useState, useEffect } from 'react';
import { apiService, WorkflowTransition, ErrorDetails } from '../services/api';
import { ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import ErrorBanner from './ErrorBanner';

interface WorkflowActionsProps {
  applicationId: string;
  currentStage: string;
  onTransition?: (transition: WorkflowTransition) => void;
  className?: string;
}

interface ActionButton {
  transition: WorkflowTransition;
  canTransition: boolean;
  reason: string;
  metadata?: any;
}

export default function WorkflowActions({ 
  applicationId, 
  currentStage, 
  onTransition,
  className = ""
}: WorkflowActionsProps) {
  const [actions, setActions] = useState<ActionButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | undefined>(undefined);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableActions();
  }, [applicationId, currentStage]);

  const loadAvailableActions = async () => {
    setLoading(true);
    setError(null);
    setErrorDetails(undefined);

    try {
      // Get available transitions for current stage
      const transitionsResponse = await apiService.getWorkflowTransitions(currentStage, applicationId);
      
      if (!transitionsResponse.success) {
        setError(transitionsResponse.error || 'Failed to load transitions');
        setErrorDetails(transitionsResponse.errorDetails);
        return;
      }

      const transitions = transitionsResponse.data || [];
      const actionButtons: ActionButton[] = [];

      // For each transition, check if guard allows it
      for (const transition of transitions) {
        if (transition.guardResult) {
          // Guard result included from dry-run
          actionButtons.push({
            transition,
            canTransition: transition.guardResult.canTransition,
            reason: transition.guardResult.reason || 'No reason provided',
            metadata: transition.guardResult.metadata
          });
        } else if (transition.canTransition !== undefined) {
          // Legacy format - guard result already included directly
          actionButtons.push({
            transition,
            canTransition: transition.canTransition,
            reason: transition.reason || 'No reason provided',
            metadata: transition.metadata
          });
        } else {
          // Test guard separately if not included
          const guardResponse = await apiService.testGuard(applicationId, transition.toStageId);

          if (guardResponse.success && guardResponse.data) {
            actionButtons.push({
              transition,
              canTransition: guardResponse.data.guardResult.canTransition,
              reason: guardResponse.data.guardResult.reason || 'No reason provided',
              metadata: guardResponse.data.guardResult.metadata
            });
          } else {
            // If guard test fails, assume transition not allowed
            actionButtons.push({
              transition,
              canTransition: false,
              reason: 'Unable to verify transition requirements'
            });
          }
        }
      }

      setActions(actionButtons);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setErrorDetails(undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleTransition = async (action: ActionButton) => {
    // Prevent any action if transition is not allowed or already transitioning
    if (!action.canTransition || transitioning) {
      return;
    }

    setTransitioning(action.transition.id);

    try {
      const response = await apiService.transitionApplication(
        applicationId,
        action.transition.toStageId,
        `Transitioned to ${action.transition.toStage.name}`
      );

      if (response.success) {
        // Notify parent component
        if (onTransition) {
          onTransition(action.transition);
        }

        // Reload actions for new stage
        await loadAvailableActions();
      } else {
        setError(response.error || 'Transition failed');
        setErrorDetails(response.errorDetails);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transition failed');
      setErrorDetails(undefined);
    } finally {
      setTransitioning(null);
    }
  };

  const getButtonStyle = (action: ActionButton) => {
    if (!action.canTransition) {
      return "bg-gray-300 text-gray-500 cursor-not-allowed";
    }
    
    // Color based on transition type
    const stageName = action.transition.toStage.name.toLowerCase();
    if (stageName.includes('clear') || stageName.includes('approved')) {
      return "bg-green-600 text-white hover:bg-green-700";
    } else if (stageName.includes('objection') || stageName.includes('hold')) {
      return "bg-red-600 text-white hover:bg-red-700";
    } else if (stageName.includes('pending')) {
      return "bg-yellow-600 text-white hover:bg-yellow-700";
    } else {
      return "bg-blue-600 text-white hover:bg-blue-700";
    }
  };

  const getStatusIcon = (action: ActionButton) => {
    if (!action.canTransition) {
      return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
    
    const stageName = action.transition.toStage.name.toLowerCase();
    if (stageName.includes('clear') || stageName.includes('approved')) {
      return <CheckCircleIcon className="h-4 w-4" />;
    } else {
      return <ClockIcon className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Actions</h3>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-500">Loading actions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const handleReload = () => {
      // For 409 conflicts, reload the entire page to get fresh data
      if (errorDetails?.statusCode === 409) {
        window.location.reload();
      } else {
        loadAvailableActions();
      }
    };

    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Actions</h3>
        <ErrorBanner
          error={error}
          details={errorDetails}
          onRetry={loadAvailableActions}
          onReload={handleReload}
        />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Actions</h3>
        <p className="text-sm text-gray-500">No actions available for current stage.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Available Actions</h3>
      
      <div className="space-y-3">
        {actions.map((action) => {
          const isTransitioning = transitioning === action.transition.id;
          const isDisabled = !action.canTransition || !!transitioning;

          return (
            <div key={action.transition.id} className="flex items-start space-x-3">
              <div className="relative group">
                <button
                  onClick={() => handleTransition(action)}
                  disabled={isDisabled}
                  className={`flex items-center px-4 py-2 rounded text-sm font-medium transition-colors ${getButtonStyle(action)} ${
                    isTransitioning ? 'opacity-50' : ''
                  }`}
                  title={action.canTransition ? `Click to ${action.transition.toStage.name}` : `Blocked: ${action.reason}`}
                  aria-label={action.canTransition ? `Transition to ${action.transition.toStage.name}` : `Cannot transition: ${action.reason}`}
                >
                  {isTransitioning ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  ) : (
                    <span className="mr-2">{getStatusIcon(action)}</span>
                  )}
                  {action.transition.toStage.name}
                </button>

                {/* Enhanced tooltip for disabled buttons */}
                {!action.canTransition && (
                  <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-red-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                    <div className="font-medium">Action Blocked</div>
                    <div>{action.reason}</div>
                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-900"></div>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${action.canTransition ? 'text-green-600' : 'text-red-600'}`}>
                  {action.canTransition ? '✓ Ready' : '✗ Blocked'}
                </p>
                <p className={`text-sm ${action.canTransition ? 'text-gray-600' : 'text-red-600'}`}>
                  {action.reason}
                </p>
                {action.metadata && Object.keys(action.metadata).length > 0 && (
                  <details className="mt-1">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                      Additional details
                    </summary>
                    <pre className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(action.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
