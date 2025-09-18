"use client";

import React, { useState, useEffect } from 'react';
import { 
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface QueueFiltersProps {
  onFiltersChange: (filters: QueueFilterState) => void;
  userRole?: string;
  className?: string;
}

export interface QueueFilterState {
  stage: string;
  status: string;
  myPending: boolean;
  search: string;
}

interface WorkflowStage {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

interface WorkflowStatus {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

export const QueueFilters: React.FC<QueueFiltersProps> = ({
  onFiltersChange,
  userRole,
  className = ""
}) => {
  const [filters, setFilters] = useState<QueueFilterState>({
    stage: '',
    status: '',
    myPending: false,
    search: ''
  });
  
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load workflow stages and statuses
  useEffect(() => {
    const loadWorkflowData = async () => {
      try {
        setIsLoading(true);
        const [stagesResponse, statusesResponse] = await Promise.all([
          apiService.getWorkflowStages(),
          apiService.getWorkflowStatuses()
        ]);
        
        if (stagesResponse.success && stagesResponse.data) {
          setStages(stagesResponse.data.stages);
        }
        
        if (statusesResponse.success && statusesResponse.data) {
          setStatuses(statusesResponse.data.statuses);
        }
      } catch (error) {
        console.error('Error loading workflow data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflowData();
  }, []);

  // Notify parent when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = (key: keyof QueueFilterState, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      stage: '',
      status: '',
      myPending: false,
      search: ''
    });
  };

  const hasActiveFilters = filters.stage || filters.status || filters.myPending || filters.search;

  const getRelevantStages = () => {
    if (!userRole) return stages;
    
    // Filter stages relevant to user role
    const roleStageMap: Record<string, string[]> = {
      'BCA': ['SUBMITTED', 'SENT_TO_BCA_HOUSING'],
      'HOUSING': ['SUBMITTED', 'SENT_TO_BCA_HOUSING'],
      'ACCOUNTS': ['SENT_TO_ACCOUNTS', 'ACCOUNTS_CLEAR'],
      'APPROVER': ['APPROVED', 'POST_ENTRIES'],
      'OWO': ['BCA_HOUSING_CLEAR', 'ACCOUNTS_CLEAR', 'APPROVED'],
      'ADMIN': [] // Admin sees all stages
    };
    
    const relevantCodes = roleStageMap[userRole] || [];
    if (relevantCodes.length === 0) return stages; // Show all for admin or unknown roles
    
    return stages.filter(stage => relevantCodes.includes(stage.code));
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Filter Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Queue Filters</h3>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {[filters.stage, filters.status, filters.myPending ? 'My Pending' : '', filters.search].filter(Boolean).length} active
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
              >
                <XMarkIcon className="h-3 w-3 mr-1" />
                Clear
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronDownIcon className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateFilter('myPending', !filters.myPending)}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.myPending
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <UserIcon className="h-3 w-3 mr-1" />
            My Pending
          </button>
          
          <button
            onClick={() => updateFilter('status', filters.status === 'ACTIVE' ? '' : 'ACTIVE')}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.status === 'ACTIVE'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Active
          </button>
          
          <button
            onClick={() => updateFilter('status', filters.status === 'PENDING' ? '' : 'PENDING')}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.status === 'PENDING'
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <ClockIcon className="h-3 w-3 mr-1" />
            Pending
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="px-4 py-4 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search Applications
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="App No, Plot, CNIC, Name..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Stage Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Workflow Stage
            </label>
            <select
              value={filters.stage}
              onChange={(e) => updateFilter('stage', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              <option value="">All Stages</option>
              {getRelevantStages().map((stage) => (
                <option key={stage.id} value={stage.code}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Application Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.code}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
