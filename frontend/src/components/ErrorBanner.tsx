"use client";

import React from 'react';
import { 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  ShieldExclamationIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export interface ErrorDetails {
  code?: string;
  guard?: string;
  reason?: string;
  metadata?: any;
  statusCode?: number;
}

export interface ErrorBannerProps {
  error: string;
  details?: ErrorDetails;
  onRetry?: () => void;
  onReload?: () => void;
  className?: string;
}

export default function ErrorBanner({ 
  error, 
  details, 
  onRetry, 
  onReload, 
  className = "" 
}: ErrorBannerProps) {
  
  // Determine error type and styling
  const getErrorType = () => {
    if (details?.code === 'TRANSITION_NOT_ALLOWED' || details?.statusCode === 403) {
      return {
        type: 'guard_failure',
        title: 'Action Blocked',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-400',
        textColor: 'text-yellow-800',
        icon: ShieldExclamationIcon
      };
    }
    
    if (details?.code === 'DUPLICATE_ENTRY' || details?.statusCode === 409) {
      return {
        type: 'conflict',
        title: 'Data Conflict',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-400',
        textColor: 'text-blue-800',
        icon: ClockIcon
      };
    }
    
    return {
      type: 'generic',
      title: 'Error',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-400',
      textColor: 'text-red-800',
      icon: ExclamationTriangleIcon
    };
  };

  const errorType = getErrorType();
  const Icon = errorType.icon;

  const renderGuardFailure = () => {
    if (errorType.type !== 'guard_failure') return null;
    
    return (
      <div className="mt-3 space-y-2">
        {details?.guard && (
          <div className="text-sm">
            <span className="font-medium text-yellow-900">Guard:</span>
            <span className="ml-2 font-mono text-yellow-700 bg-yellow-100 px-2 py-1 rounded text-xs">
              {details.guard}
            </span>
          </div>
        )}
        
        {details?.reason && (
          <div className="text-sm">
            <span className="font-medium text-yellow-900">Condition:</span>
            <span className="ml-2 text-yellow-700">{details.reason}</span>
          </div>
        )}
        
        {details?.metadata && Object.keys(details.metadata).length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-yellow-600 cursor-pointer hover:text-yellow-800 font-medium">
              View additional details
            </summary>
            <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
              <pre className="text-yellow-800 whitespace-pre-wrap">
                {JSON.stringify(details.metadata, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </div>
    );
  };

  const renderConflictError = () => {
    if (errorType.type !== 'conflict') return null;
    
    return (
      <div className="mt-3">
        <p className="text-sm text-blue-700">
          The data has been updated by another user or process. Please reload to see the latest changes.
        </p>
        {details?.metadata && (
          <div className="mt-2 text-xs text-blue-600">
            <span className="font-medium">Conflict details:</span>
            <span className="ml-2">{JSON.stringify(details.metadata)}</span>
          </div>
        )}
      </div>
    );
  };

  const renderActions = () => {
    const actions = [];
    
    if (errorType.type === 'conflict' && onReload) {
      actions.push(
        <button
          key="reload"
          onClick={onReload}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          <ArrowPathIcon className="h-4 w-4 mr-1" />
          Reload
        </button>
      );
    }
    
    if (onRetry && errorType.type !== 'conflict') {
      actions.push(
        <button
          key="retry"
          onClick={onRetry}
          className={`inline-flex items-center text-sm font-medium ${
            errorType.type === 'guard_failure' 
              ? 'text-yellow-600 hover:text-yellow-500' 
              : 'text-red-600 hover:text-red-500'
          }`}
        >
          <ArrowPathIcon className="h-4 w-4 mr-1" />
          Try again
        </button>
      );
    }
    
    return actions.length > 0 ? (
      <div className="mt-3 flex space-x-4">
        {actions}
      </div>
    ) : null;
  };

  return (
    <div className={`${errorType.bgColor} border ${errorType.borderColor} rounded-md p-4 ${className}`}>
      <div className="flex">
        <Icon className={`h-5 w-5 ${errorType.iconColor} flex-shrink-0`} />
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${errorType.textColor}`}>
            {errorType.title}
          </h3>
          <div className={`mt-1 text-sm ${errorType.textColor}`}>
            <p>{error}</p>
          </div>
          
          {renderGuardFailure()}
          {renderConflictError()}
          {renderActions()}
        </div>
      </div>
    </div>
  );
}
