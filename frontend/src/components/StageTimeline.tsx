"use client";

import React, { useState } from 'react';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  action: string;
  fromStageId?: string;
  toStageId?: string;
  details?: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

interface StageTimelineProps {
  auditLogs: AuditLog[];
  className?: string;
}

export const StageTimeline: React.FC<StageTimelineProps> = ({
  auditLogs,
  className = ""
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Filter audit logs to show only stage transitions and important actions
  const timelineEvents = auditLogs.filter(log => 
    log.action === 'STAGE_TRANSITION' || 
    log.action === 'APPLICATION_CREATED' ||
    log.action === 'CLEARANCE_CREATED' ||
    log.action === 'PAYMENT_VERIFIED' ||
    log.action === 'DEED_FINALIZED' ||
    log.action === 'OWNERSHIP_TRANSFERRED'
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const toggleNodeExpansion = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getEventIcon = (action: string) => {
    switch (action) {
      case 'APPLICATION_CREATED':
        return <DocumentTextIcon className="h-5 w-5 text-blue-600" />;
      case 'STAGE_TRANSITION':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'CLEARANCE_CREATED':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'PAYMENT_VERIFIED':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'DEED_FINALIZED':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'OWNERSHIP_TRANSFERRED':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getEventTitle = (log: AuditLog) => {
    switch (log.action) {
      case 'APPLICATION_CREATED':
        return 'Application Submitted';
      case 'STAGE_TRANSITION':
        return log.details || 'Stage Transition';
      case 'CLEARANCE_CREATED':
        return 'Clearance Created';
      case 'PAYMENT_VERIFIED':
        return 'Payment Verified';
      case 'DEED_FINALIZED':
        return 'Transfer Deed Finalized';
      case 'OWNERSHIP_TRANSFERRED':
        return 'Ownership Transferred';
      default:
        return log.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getEventColor = (action: string) => {
    switch (action) {
      case 'APPLICATION_CREATED':
        return 'bg-blue-100 border-blue-200';
      case 'STAGE_TRANSITION':
        return 'bg-green-100 border-green-200';
      case 'CLEARANCE_CREATED':
        return 'bg-green-100 border-green-200';
      case 'PAYMENT_VERIFIED':
        return 'bg-green-100 border-green-200';
      case 'DEED_FINALIZED':
        return 'bg-green-100 border-green-200';
      case 'OWNERSHIP_TRANSFERRED':
        return 'bg-green-100 border-green-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'OWO': 'One Window Operator',
      'BCA': 'Building Control Authority',
      'HOUSING': 'Housing Department',
      'ACCOUNTS': 'Accounts Department',
      'WATER': 'Water Department',
      'APPROVER': 'Approver',
      'ADMIN': 'Administrator'
    };
    return roleMap[role] || role;
  };

  if (timelineEvents.length === 0) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Stage Timeline</h3>
        <div className="text-center py-8 text-gray-500">
          <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No timeline events found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-6">Stage Timeline</h3>
      
      <div className="flow-root">
        <ul className="-mb-8">
          {timelineEvents.map((event, eventIdx) => {
            const isExpanded = expandedNodes.has(event.id);
            const hasDetails = event.details && event.details.trim().length > 0;
            const { date, time } = formatDateTime(event.createdAt);
            
            return (
              <li key={event.id}>
                <div className="relative pb-8">
                  {eventIdx !== timelineEvents.length - 1 ? (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  ) : null}
                  
                  <div className="relative flex space-x-3">
                    {/* Timeline Node */}
                    <div className="relative">
                      <button
                        onClick={() => hasDetails && toggleNodeExpansion(event.id)}
                        className={`
                          flex h-8 w-8 items-center justify-center rounded-full border-2 
                          ${getEventColor(event.action)}
                          ${hasDetails ? 'cursor-pointer hover:shadow-md transition-shadow' : 'cursor-default'}
                        `}
                        title={hasDetails ? 'Click to view details' : undefined}
                      >
                        {getEventIcon(event.action)}
                      </button>
                      
                      {/* Expansion indicator */}
                      {hasDetails && (
                        <div className="absolute -bottom-1 -right-1">
                          {isExpanded ? (
                            <ChevronDownIcon className="h-3 w-3 text-gray-500" />
                          ) : (
                            <ChevronRightIcon className="h-3 w-3 text-gray-500" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {getEventTitle(event)}
                          </p>
                          
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center text-xs text-gray-500">
                              <UserIcon className="h-3 w-3 mr-1" />
                              <span className="font-medium">{event.user.username}</span>
                              <span className="ml-1">({getRoleDisplayName(event.user.role)})</span>
                            </div>
                            
                            <div className="flex items-center text-xs text-gray-500">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              <span>{date} at {time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      {hasDetails && isExpanded && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                          <h4 className="text-xs font-medium text-gray-700 mb-2">Audit Note:</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {event.details}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      
      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{timelineEvents.length} timeline events</span>
          <span>
            {timelineEvents.length > 0 && (
              <>Last updated: {formatDateTime(timelineEvents[timelineEvents.length - 1].createdAt).date}</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
