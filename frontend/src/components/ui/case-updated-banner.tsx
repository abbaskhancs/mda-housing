import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface CaseUpdatedBannerProps {
  isVisible: boolean;
  onReload: () => void;
  onDismiss: () => void;
  applicationNumber?: string;
  oldStage?: string;
  newStage?: string;
  updatedAt?: string;
}

export const CaseUpdatedBanner: React.FC<CaseUpdatedBannerProps> = ({
  isVisible,
  onReload,
  onDismiss,
  applicationNumber,
  oldStage,
  newStage,
  updatedAt
}) => {
  if (!isVisible) return null;

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-yellow-800">
                  <span className="font-semibold">Case updated</span>
                  {applicationNumber && (
                    <span className="ml-1">- Application {applicationNumber}</span>
                  )}
                </div>
                <div className="mt-1 text-sm text-yellow-700">
                  {oldStage && newStage && oldStage !== newStage ? (
                    <span>
                      Stage changed from <span className="font-medium">{oldStage}</span> to{' '}
                      <span className="font-medium">{newStage}</span>
                      {updatedAt && (
                        <span className="ml-2 text-yellow-600">
                          at {formatTime(updatedAt)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>
                      This application has been updated in another tab or window
                      {updatedAt && (
                        <span className="ml-2 text-yellow-600">
                          at {formatTime(updatedAt)}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onReload}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Reload
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex items-center p-1.5 border border-transparent rounded text-yellow-400 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                aria-label="Dismiss notification"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
