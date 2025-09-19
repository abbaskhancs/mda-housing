import React from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  TrashIcon 
} from '@heroicons/react/24/outline';

export type BulkActionType = 'PENDING' | 'CLEAR' | 'OBJECTION';

interface BulkAction {
  type: BulkActionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  hoverColor: string;
  requireRemarks?: boolean;
}

interface BulkActionsToolbarProps {
  selectedCount: number;
  onAction: (action: BulkActionType) => void;
  onClearSelection: () => void;
  availableActions?: BulkActionType[];
  disabled?: boolean;
  className?: string;
}

const BULK_ACTIONS: Record<BulkActionType, BulkAction> = {
  PENDING: {
    type: 'PENDING',
    label: 'Set Pending',
    icon: ClockIcon,
    color: 'bg-yellow-600 text-white',
    hoverColor: 'hover:bg-yellow-700',
    requireRemarks: false
  },
  CLEAR: {
    type: 'CLEAR',
    label: 'Set Clear',
    icon: CheckCircleIcon,
    color: 'bg-green-600 text-white',
    hoverColor: 'hover:bg-green-700',
    requireRemarks: false
  },
  OBJECTION: {
    type: 'OBJECTION',
    label: 'Set Objection',
    icon: XCircleIcon,
    color: 'bg-red-600 text-white',
    hoverColor: 'hover:bg-red-700',
    requireRemarks: true
  }
};

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onAction,
  onClearSelection,
  availableActions = ['PENDING', 'CLEAR', 'OBJECTION'],
  disabled = false,
  className = ''
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={`
      bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 
      flex items-center justify-between
      ${className}
    `}>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-blue-700">Bulk actions:</span>
          {availableActions.map((actionType) => {
            const action = BULK_ACTIONS[actionType];
            const IconComponent = action.icon;
            
            return (
              <button
                key={actionType}
                onClick={() => onAction(actionType)}
                disabled={disabled}
                className={`
                  inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md
                  ${action.color} ${action.hoverColor}
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                `}
                title={action.requireRemarks ? `${action.label} (requires remarks)` : action.label}
              >
                <IconComponent className="h-4 w-4 mr-1" />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onClearSelection}
        disabled={disabled}
        className="
          inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 
          hover:text-blue-900 hover:bg-blue-100 rounded-md
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
        "
        title="Clear selection"
      >
        <TrashIcon className="h-4 w-4 mr-1" />
        Clear
      </button>
    </div>
  );
};

// Helper function to get action details
export const getBulkActionDetails = (actionType: BulkActionType): BulkAction => {
  return BULK_ACTIONS[actionType];
};

// Helper function to get confirmation modal props for an action
export const getBulkActionModalProps = (
  actionType: BulkActionType, 
  selectedCount: number
) => {
  const action = BULK_ACTIONS[actionType];
  
  return {
    title: `Confirm ${action.label}`,
    message: `Are you sure you want to ${action.label.toLowerCase()} ${selectedCount} selected item${selectedCount !== 1 ? 's' : ''}?`,
    confirmText: action.label,
    type: actionType === 'OBJECTION' ? 'danger' as const : 
          actionType === 'CLEAR' ? 'success' as const : 'warning' as const,
    requireRemarks: action.requireRemarks,
    remarksLabel: action.requireRemarks ? 'Objection Remarks' : 'Remarks',
    remarksPlaceholder: action.requireRemarks 
      ? 'Please provide detailed reasons for the objection...' 
      : 'Optional remarks...'
  };
};
