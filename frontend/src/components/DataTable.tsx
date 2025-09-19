"use client";

import React, { useState, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface Column<T> {
  key: string;
  title: string;
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationConfig;
  onPaginationChange?: (page: number, pageSize: number) => void;
  onSortChange?: (sort: SortConfig | null) => void;
  rowKey: string | ((record: T) => string);
  onRowClick?: (record: T) => void;
  selectedRowKey?: string;
  emptyText?: string;
  className?: string;
  // Multi-select props
  multiSelect?: boolean;
  selectedRowKeys?: string[];
  onSelectionChange?: (selectedKeys: string[], selectedRows: T[]) => void;
  selectableRowFilter?: (record: T) => boolean;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  onPaginationChange,
  onSortChange,
  rowKey,
  onRowClick,
  selectedRowKey,
  emptyText = "No data available",
  className = "",
  multiSelect = false,
  selectedRowKeys = [],
  onSelectionChange,
  selectableRowFilter
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  // Multi-select logic
  const selectableData = multiSelect && selectableRowFilter
    ? data.filter(selectableRowFilter)
    : data;

  const isRowSelectable = (record: T): boolean => {
    return !selectableRowFilter || selectableRowFilter(record);
  };

  const isAllSelectableSelected = multiSelect && selectableData.length > 0 &&
    selectableData.every(record => selectedRowKeys.includes(getRowKey(record, 0)));

  const isSomeSelectableSelected = multiSelect && selectedRowKeys.length > 0 &&
    selectedRowKeys.length < selectableData.length;

  const handleSelectAll = (checked: boolean) => {
    if (!multiSelect || !onSelectionChange) return;

    if (checked) {
      const allSelectableKeys = selectableData.map((record, index) => getRowKey(record, index));
      const newSelectedKeys = [...new Set([...selectedRowKeys, ...allSelectableKeys])];
      const selectedRows = data.filter((record, index) =>
        newSelectedKeys.includes(getRowKey(record, index))
      );
      onSelectionChange(newSelectedKeys, selectedRows);
    } else {
      const selectableKeys = selectableData.map((record, index) => getRowKey(record, index));
      const newSelectedKeys = selectedRowKeys.filter(key => !selectableKeys.includes(key));
      const selectedRows = data.filter((record, index) =>
        newSelectedKeys.includes(getRowKey(record, index))
      );
      onSelectionChange(newSelectedKeys, selectedRows);
    }
  };

  const handleRowSelect = (record: T, index: number, checked: boolean) => {
    if (!multiSelect || !onSelectionChange) return;

    const key = getRowKey(record, index);
    let newSelectedKeys: string[];

    if (checked) {
      newSelectedKeys = [...selectedRowKeys, key];
    } else {
      newSelectedKeys = selectedRowKeys.filter(k => k !== key);
    }

    const selectedRows = data.filter((record, index) =>
      newSelectedKeys.includes(getRowKey(record, index))
    );
    onSelectionChange(newSelectedKeys, selectedRows);
  };

  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    let newSortConfig: SortConfig | null = null;
    
    if (!sortConfig || sortConfig.key !== columnKey) {
      newSortConfig = { key: columnKey, direction: 'asc' };
    } else if (sortConfig.direction === 'asc') {
      newSortConfig = { key: columnKey, direction: 'desc' };
    } else {
      newSortConfig = null;
    }

    setSortConfig(newSortConfig);
    onSortChange?.(newSortConfig);
  };

  const handlePageChange = (page: number) => {
    if (pagination && onPaginationChange) {
      onPaginationChange(page, pagination.pageSize);
    }
  };

  const handlePageSizeChange = (pageSize: number) => {
    if (pagination && onPaginationChange) {
      onPaginationChange(1, pageSize);
    }
  };

  const renderSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronUpIcon className="h-4 w-4 text-gray-300" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4 text-blue-600" />
      : <ChevronDownIcon className="h-4 w-4 text-blue-600" />;
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;
  const startRecord = pagination ? (pagination.current - 1) * pagination.pageSize + 1 : 1;
  const endRecord = pagination ? Math.min(pagination.current * pagination.pageSize, pagination.total) : data.length;

  return (
    <div className={`bg-white shadow overflow-hidden sm:rounded-md ${className}`}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {multiSelect && (
                <th className="px-6 py-3 text-left" style={{ width: '50px' }}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={isAllSelectableSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeSelectableSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={selectableData.length === 0}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (multiSelect ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (multiSelect ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="text-sm text-gray-500">{emptyText}</div>
                </td>
              </tr>
            ) : (
              data.map((record, index) => {
                const key = getRowKey(record, index);
                const isSelected = selectedRowKey === key;
                const isRowSelected = multiSelect && selectedRowKeys.includes(key);
                const selectable = isRowSelectable(record);

                return (
                  <tr
                    key={key}
                    className={`hover:bg-gray-50 ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${isSelected ? 'bg-blue-50 border-blue-200' : ''} ${
                      isRowSelected ? 'bg-blue-50' : ''
                    }`}
                    onClick={(e) => {
                      // Don't trigger row click if clicking on checkbox
                      if (multiSelect && (e.target as HTMLElement).type === 'checkbox') {
                        return;
                      }
                      onRowClick?.(record);
                    }}
                  >
                    {multiSelect && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={isRowSelected}
                          disabled={!selectable}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleRowSelect(record, index, e.target.checked);
                          }}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                        {column.render
                          ? column.render(record[column.key], record)
                          : <span className="text-sm text-gray-900">{record[column.key]}</span>
                        }
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startRecord}</span> to{' '}
                <span className="font-medium">{endRecord}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> results
              </p>
              
              {pagination.showSizeChanger && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700">Show:</label>
                  <select
                    value={pagination.pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {(pagination.pageSizeOptions || [10, 20, 50, 100]).map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-700">per page</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.current - 1)}
                disabled={pagination.current === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.current <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.current >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = pagination.current - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === pagination.current
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(pagination.current + 1)}
                disabled={pagination.current === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
