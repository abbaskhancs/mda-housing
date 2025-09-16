"use client";

import React, { useState, useEffect } from 'react';
import { apiService, WorkflowTransition } from '../services/api';
import { ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

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
  const [transitioning, setTransitioning] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableActions();
  }, [applicationId, currentStage]);

  const loadAvailableActions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get available transitions for current stage
      const transitionsResponse = await apiService.getWorkflowTransitions(currentStage, applicationId);
      
      if (!transitionsResponse.success) {
        setError(transitionsResponse.error || 'Failed to load transitions');
        return;
      }

      const transitions = transitionsResponse.data || [];
      const actionButtons: ActionButton[] = [];

      // For each transition, check if guard allows it
      for (const transition of transitions) {
        if (transition.canTransition !== undefined) {
          // Guard result already included from dry-run
          actionButtons.push({
            transition,
            canTransition: transition.canTransition,
            reason: transition.reason || '',
            metadata: transition.metadata
          });
        } else {
          // Test guard separately if not included
          const guardResponse = await apiService.testGuard(applicationId, transition.toStageId);
          
          if (guardResponse.success && guardResponse.data) {
            actionButtons.push({
              transition,
              canTransition: guardResponse.data.guardResult.canTransition,
              reason: guardResponse.data.guardResult.reason,
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
    } finally {
      setLoading(false);
    }
  };

  const handleTransition = async (action: ActionButton) => {
    if (!action.canTransition || transitioning) return;

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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transition failed');
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
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Actions</h3>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Actions</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadAvailableActions}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
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
        {actions.map((action) => (
          <div key={action.transition.id} className="flex items-start space-x-3">
            <button
              onClick={() => handleTransition(action)}
              disabled={!action.canTransition || transitioning === action.transition.id}
              className={`flex items-center px-4 py-2 rounded text-sm font-medium transition-colors ${getButtonStyle(action)} ${
                transitioning === action.transition.id ? 'opacity-50' : ''
              }`}
              title={action.reason}
            >
              {transitioning === action.transition.id ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              ) : (
                <span className="mr-2">{getStatusIcon(action)}</span>
              )}
              {action.transition.toStage.name}
            </button>
            
            <div className="flex-1 min-w-0">
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
        ))}
      </div>
    </div>
  );
}
