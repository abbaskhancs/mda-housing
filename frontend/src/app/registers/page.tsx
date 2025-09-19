"use client";

import React, { useState, useEffect } from 'react';
import AuthGuard from "../../components/AuthGuard";
import DataTable, { Column, SortConfig, PaginationConfig } from "../../components/DataTable";
import { useAuth } from "../../contexts/AuthContext";
import { apiService, Application } from "../../services/api";
import {
  DocumentTextIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  EyeIcon
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
  const [pageSize, setPageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
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
    { code: 'POST_ENTRIES', name: 'Post-Entries' },
    { code: 'CLOSED', name: 'Closed' },
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
  }, [currentPage, pageSize, filters, sortConfig]);

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
      if (sortConfig) {
        params.sortBy = sortConfig.key;
        params.sortOrder = sortConfig.direction;
      }

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

  const handlePaginationChange = (page: number, newPageSize: number) => {
    setCurrentPage(page);
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
    }
  };

  const handleSortChange = (sort: SortConfig | null) => {
    setSortConfig(sort);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const exportToCSV = () => {
    if (applications.length === 0) return;

    const headers = [
      'Application Number',
      'Current Stage',
      'Plot Number',
      'Sector',
      'Plot Size',
      'Current Owner',
      'Current Owner CNIC',
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
      app.plot.currentOwner?.name || 'No current owner',
      app.plot.currentOwner?.cnic || '',
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

  const exportToPDF = async () => {
    if (applications.length === 0) return;

    try {
      const response = await apiService.exportRegistersPDF(filters);

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `applications_register_${new Date().toISOString().split('T')[0]}.pdf`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setError('Failed to export PDF');
    }
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
      case 'POST_ENTRIES':
        return 'bg-indigo-100 text-indigo-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
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

  const columns: Column<Application>[] = [
    {
      key: 'applicationNumber',
      title: 'Application',
      sortable: true,
      render: (value, record) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">ID: {record.id.slice(-8)}</div>
        </div>
      )
    },
    {
      key: 'plot',
      title: 'Plot Details',
      render: (value, record) => (
        <div>
          <div className="text-sm text-gray-900">Plot {record.plot.plotNumber}</div>
          <div className="text-sm text-gray-500">{record.plot.sector} • {record.plot.size}</div>
        </div>
      )
    },
    {
      key: 'currentOwner',
      title: 'Current Owner',
      render: (value, record) => (
        record.plot.currentOwner ? (
          <div>
            <div className="text-sm font-medium text-green-600">{record.plot.currentOwner.name}</div>
            <div className="text-sm text-gray-500">{record.plot.currentOwner.cnic}</div>
          </div>
        ) : (
          <span className="text-sm text-gray-400">No owner</span>
        )
      )
    },
    {
      key: 'parties',
      title: 'Parties',
      render: (value, record) => (
        <div className="space-y-1">
          <div className="text-xs">
            <span className="font-medium text-blue-600">Seller:</span> {record.seller.name}
          </div>
          <div className="text-xs">
            <span className="font-medium text-green-600">Buyer:</span> {record.buyer.name}
          </div>
        </div>
      )
    },
    {
      key: 'currentStage',
      title: 'Stage',
      sortable: true,
      render: (value, record) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(record.currentStage.code)}`}>
          {record.currentStage.name}
        </span>
      )
    },
    {
      key: 'createdAt',
      title: 'Dates',
      sortable: true,
      render: (value, record) => (
        <div className="text-xs text-gray-500">
          <div><strong>Created:</strong> {new Date(record.createdAt).toLocaleDateString()}</div>
          <div><strong>Updated:</strong> {new Date(record.updatedAt).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value, record) => (
        <Link
          href={`/applications/${record.id}`}
          className="text-blue-600 hover:text-blue-900 flex items-center"
        >
          <EyeIcon className="h-4 w-4 mr-1" />
          View
        </Link>
      )
    }
  ];

  const paginationConfig: PaginationConfig = {
    current: currentPage,
    pageSize: pageSize,
    total: total,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100]
  };

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
                <button
                  onClick={exportToPDF}
                  disabled={applications.length === 0}
                  className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export PDF
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



          {/* Applications Table */}
          <DataTable
            columns={columns}
            data={applications}
            loading={loading}
            pagination={paginationConfig}
            onPaginationChange={handlePaginationChange}
            onSortChange={handleSortChange}
            rowKey="id"
            emptyText={error ? `Error: ${error}` : "No applications found"}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
