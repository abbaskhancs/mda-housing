import React, { useState, useEffect } from 'react';
import { Popover } from './ui/popover';
import { apiService, WorkflowTransition } from '../services/api';
import { 
  QuestionMarkCircleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface TransitionPreviewProps {
  applicationId: string;
  currentStageCode: string;
  className?: string;
}

export const TransitionPreview: React.FC<TransitionPreviewProps> = ({
  applicationId,
  currentStageCode,
  className = ''
}) => {
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransitions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getWorkflowTransitions(currentStageCode, applicationId);
      
      if (response.success && response.data) {
        setTransitions(response.data);
      } else {
        setError(response.error || 'Failed to load transitions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId && currentStageCode) {
      loadTransitions();
    }
  }, [applicationId, currentStageCode]);

  const getTransitionIcon = (transition: WorkflowTransition) => {
    if (transition.canTransition) {
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircleIcon className="h-4 w-4 text-red-500" />;
    }
  };

  const getTransitionStatus = (transition: WorkflowTransition) => {
    if (transition.canTransition) {
      return 'Available';
    } else {
      return 'Blocked';
    }
  };

  const renderTransitionContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-4">
          <ClockIcon className="h-5 w-5 text-gray-400 animate-spin mr-2" />
          <span className="text-sm text-gray-600">Loading transitions...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-4">
          <div className="text-sm text-red-600 mb-2">Error loading transitions</div>
          <div className="text-xs text-gray-500">{error}</div>
        </div>
      );
    }

    if (transitions.length === 0) {
      return (
        <div className="py-4 text-center">
          <div className="text-sm text-gray-600 mb-1">No transitions available</div>
          <div className="text-xs text-gray-500">This stage may be a terminal state</div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-900 mb-3">
          Available Next Steps
        </div>
        
        {transitions.map((transition) => (
          <div
            key={transition.id}
            className={`
              flex items-start space-x-3 p-3 rounded-lg border
              ${transition.canTransition 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
              }
            `}
          >
            {/* Status Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {getTransitionIcon(transition)}
            </div>

            {/* Transition Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {transition.toStage.name}
                </span>
                <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                <span className={`
                  text-xs px-2 py-1 rounded-full font-medium
                  ${transition.canTransition 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                  }
                `}>
                  {getTransitionStatus(transition)}
                </span>
              </div>

              {/* Reason/Description */}
              {transition.reason && (
                <div className="text-xs text-gray-600 mt-1">
                  {transition.reason}
                </div>
              )}

              {/* Guard Name (for debugging/admin) */}
              {transition.guardName && (
                <div className="text-xs text-gray-400 mt-1 font-mono">
                  Guard: {transition.guardName}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Footer Note */}
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
          This preview shows potential next steps based on current application state.
          Actual transitions may require additional actions or approvals.
        </div>
      </div>
    );
  };

  const triggerButton = (
    <button
      className={`
        inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800
        hover:bg-blue-50 px-2 py-1 rounded transition-colors
        ${className}
      `}
      title="View available next steps"
    >
      <QuestionMarkCircleIcon className="h-4 w-4" />
      <span>What's next?</span>
    </button>
  );

  return (
    <Popover
      trigger={triggerButton}
      content={renderTransitionContent()}
      placement="bottom"
      contentClassName="w-96"
    />
  );
};
