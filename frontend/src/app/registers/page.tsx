"use client";

import React, { useState, useEffect } from 'react';
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../contexts/AuthContext";
import { apiService, Application } from "../../services/api";
import { 
  DocumentTextIcon, 
  FunnelIcon, 
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface FilterState {
  stage: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  section: string;
}

export default function RegistersPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    stage: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    section: ''
  });

  const stages = [
    { code: '', name: 'All Stages' },
    { code: 'SUBMITTED', name: 'Submitted' },
    { code: 'UNDER_SCRUTINY', name: 'Under Scrutiny' },
    { code: 'BCA_PENDING', name: 'BCA Pending' },
    { code: 'HOUSING_PENDING', name: 'Housing Pending' },
    { code: 'BCA_HOUSING_CLEAR', name: 'BCA/Housing Clear' },
    { code: 'ACCOUNTS_PENDING', name: 'Accounts Pending' },
    { code: 'READY_FOR_APPROVAL', name: 'Ready for Approval' },
    { code: 'APPROVED', name: 'Approved' },
    { code: 'COMPLETED', name: 'Completed' },
    { code: 'ON_HOLD_BCA', name: 'On Hold (BCA)' },
    { code: 'ON_HOLD_HOUSING', name: 'On Hold (Housing)' },
    { code: 'ON_HOLD_ACCOUNTS', name: 'On Hold (Accounts)' }
  ];

  const sections = [
    { code: '', name: 'All Sections' },
    { code: 'BCA', name: 'Building Control Authority' },
    { code: 'HOUSING', name: 'Housing Department' },
    { code: 'ACCOUNTS', name: 'Accounts Department' },
    { code: 'WATER', name: 'Water Department' }
  ];

  useEffect(() => {
    loadApplications();
  }, [currentPage, filters]);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      };

      if (filters.stage) params.stage = filters.stage;
      if (filters.section) params.section = filters.section;
      if (filters.search) params.search = filters.search;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const response = await apiService.getApplications(params);

      if (response.success && response.data) {
        setApplications(response.data.applications);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Failed to load applications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      stage: '',
      dateFrom: '',
      dateTo: '',
      search: '',
      section: ''
    });
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    if (applications.length === 0) return;

    const headers = [
      'Application Number',
      'Current Stage',
      'Plot Number',
      'Sector',
      'Plot Size',
      'Seller Name',
      'Seller CNIC',
      'Buyer Name',
      'Buyer CNIC',
      'Created Date',
      'Updated Date'
    ];

    const csvData = applications.map(app => [
      app.applicationNumber,
      app.currentStage.name,
      app.plot.plotNumber,
      app.plot.sector,
      app.plot.size,
      app.seller.name,
      app.seller.cnic,
      app.buyer.name,
      app.buyer.cnic,
      new Date(app.createdAt).toLocaleDateString(),
      new Date(app.updatedAt).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `applications_register_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStageColor = (stageCode: string) => {
    switch (stageCode) {
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'UNDER_SCRUTINY':
        return 'bg-yellow-100 text-yellow-800';
      case 'BCA_PENDING':
      case 'HOUSING_PENDING':
      case 'ACCOUNTS_PENDING':
        return 'bg-orange-100 text-orange-800';
      case 'BCA_HOUSING_CLEAR':
        return 'bg-green-100 text-green-800';
      case 'READY_FOR_APPROVAL':
        return 'bg-purple-100 text-purple-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'ON_HOLD_BCA':
      case 'ON_HOLD_HOUSING':
      case 'ON_HOLD_ACCOUNTS':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AuthGuard>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Application Registers</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Read-only view of all applications with filtering and export capabilities
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 flex items-center"
                >
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Filters
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={applications.length === 0}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stage</label>
                  <select
                    value={filters.stage}
                    onChange={(e) => handleFilterChange('stage', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {stages.map(stage => (
                      <option key={stage.code} value={stage.code}>{stage.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Section</label>
                  <select
                    value={filters.section}
                    onChange={(e) => handleFilterChange('section', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {sections.map(section => (
                      <option key={section.code} value={section.code}>{section.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">From Date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">To Date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Search</label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      placeholder="Application number, CNIC..."
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pl-10"
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2" />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">
                  Showing {applications.length} of {total} applications
                  {currentPage > 1 && ` (Page ${currentPage} of ${totalPages})`}
                </span>
              </div>
              {totalPages > 1 && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading applications...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <BuildingOfficeIcon className="h-8 w-8 text-red-400 mx-auto" />
                <p className="mt-2 text-sm text-red-600">{error}</p>
                <button
                  onClick={loadApplications}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-500 underline"
                >
                  Try again
                </button>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-6 text-center">
                <DocumentTextIcon className="h-8 w-8 text-gray-400 mx-auto" />
                <p className="mt-2 text-sm text-gray-500">No applications found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Application
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plot Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parties
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {app.applicationNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {app.id.slice(-8)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            Plot {app.plot.plotNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {app.plot.sector} • {app.plot.size}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <div>Seller: {app.seller.name}</div>
                            <div>Buyer: {app.buyer.name}</div>
                          </div>
                          <div className="text-sm text-gray-500">
                            <div>{app.seller.cnic}</div>
                            <div>{app.buyer.cnic}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(app.currentStage.code)}`}>
                            {app.currentStage.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>Created: {new Date(app.createdAt).toLocaleDateString()}</div>
                          <div>Updated: {new Date(app.updatedAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/applications/${app.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
