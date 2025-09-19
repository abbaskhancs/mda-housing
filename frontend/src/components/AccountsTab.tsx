"use client";

import React, { useState, useEffect } from 'react';
import { CurrencyDollarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import apiService from '../services/api';
import { formatCurrency, formatCurrencyInWordsHelper } from '../utils/numberToWords';
import PrintControls, { PrintOption } from './PrintControls';

interface FeeHeads {
  arrears: number;
  surcharge: number;
  nonUser: number;
  transferFee: number;
  attorneyFee: number;
  water: number;
  suiGas: number;
  additional: number;
}

interface AccountsBreakdown {
  id: string;
  arrears: string;
  surcharge: string;
  nonUser: string;
  transferFee: string;
  attorneyFee: string;
  water: string;
  suiGas: string;
  additional: string;
  totalAmount: string;
  totalAmountWords: string;
  challanNo?: string;
  challanDate?: string;
  challanUrl?: string;
}

interface AccountsTabProps {
  applicationId: string;
}

const AccountsTab: React.FC<AccountsTabProps> = ({ applicationId }) => {
  const [accountsBreakdown, setAccountsBreakdown] = useState<AccountsBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [feeHeads, setFeeHeads] = useState<FeeHeads>({
    arrears: 0,
    surcharge: 0,
    nonUser: 0,
    transferFee: 0,
    attorneyFee: 0,
    water: 0,
    suiGas: 0,
    additional: 0
  });
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [calculatedWords, setCalculatedWords] = useState('');

  const getPrintOptions = (): PrintOption[] => {
    const options: PrintOption[] = [];

    // Add challan PDF if available
    if (accountsBreakdown?.challanUrl) {
      options.push({
        id: 'accounts-challan',
        label: 'Print Challan',
        type: 'server-pdf',
        pdfUrl: accountsBreakdown.challanUrl
      });
    }

    // Add fallback client print
    options.push({
      id: 'accounts-print',
      label: 'Print Accounts View',
      type: 'client-print',
      printElementId: 'accounts-content'
    });

    return options;
  };

  useEffect(() => {
    fetchAccountsBreakdown();
  }, [applicationId]);

  useEffect(() => {
    // Calculate total and words whenever fee heads change
    const total = Object.values(feeHeads).reduce((sum, amount) => sum + amount, 0);
    setCalculatedTotal(total);
    setCalculatedWords(formatCurrencyInWordsHelper(total));
  }, [feeHeads]);

  const fetchAccountsBreakdown = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAccountsBreakdown(applicationId);
      
      if (response.success && response.data?.accountsBreakdown) {
        const breakdown = response.data.accountsBreakdown;
        setAccountsBreakdown(breakdown);
        
        // Set fee heads for editing
        setFeeHeads({
          arrears: parseFloat(breakdown.arrears) || 0,
          surcharge: parseFloat(breakdown.surcharge) || 0,
          nonUser: parseFloat(breakdown.nonUser) || 0,
          transferFee: parseFloat(breakdown.transferFee) || 0,
          attorneyFee: parseFloat(breakdown.attorneyFee) || 0,
          water: parseFloat(breakdown.water) || 0,
          suiGas: parseFloat(breakdown.suiGas) || 0,
          additional: parseFloat(breakdown.additional) || 0
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts breakdown');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await apiService.updateAccountsBreakdown(applicationId, feeHeads);
      
      if (response.success) {
        await fetchAccountsBreakdown();
        setEditing(false);
      } else {
        setError(response.error || 'Failed to update accounts breakdown');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update accounts breakdown');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateChallan = async () => {
    try {
      setLoading(true);
      const response = await apiService.generateChallan(applicationId);
      
      if (response.success) {
        await fetchAccountsBreakdown();
      } else {
        setError(response.error || 'Failed to generate challan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate challan');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadChallan = async () => {
    try {
      const response = await apiService.downloadChallan(applicationId);
      
      if (response.success && response.data) {
        // Create blob and download
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `challan-${accountsBreakdown?.challanNo || applicationId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError(response.error || 'Failed to download challan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download challan');
    }
  };

  const handleFeeChange = (field: keyof FeeHeads, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFeeHeads(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-red-600">
          <p>Error: {error}</p>
          <button 
            onClick={() => { setError(null); fetchAccountsBreakdown(); }}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print Controls */}
      <div className="flex justify-end">
        <PrintControls
          applicationId={applicationId}
          tabId="accounts"
          options={getPrintOptions()}
        />
      </div>

      <div id="accounts-content" data-tab="accounts" className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Accounts Breakdown</h3>
        <div className="flex space-x-3">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              Edit Fees
            </button>
          )}
          {editing && (
            <>
              <button
                onClick={() => setEditing(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
              >
                Save
              </button>
            </>
          )}
          {accountsBreakdown && !accountsBreakdown.challanNo && (
            <button
              onClick={handleGenerateChallan}
              className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700"
            >
              Generate Challan
            </button>
          )}
          {accountsBreakdown?.challanNo && (
            <button
              onClick={handleDownloadChallan}
              className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 flex items-center"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Download Challan
            </button>
          )}
        </div>
      </div>

      {!accountsBreakdown && !editing ? (
        <div className="text-center py-8 text-gray-500">
          <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No accounts breakdown found</p>
          <button
            onClick={() => setEditing(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            Create Breakdown
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Fee Heads Table */}
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee Head / فیس ہیڈ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount / رقم
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[
                  { key: 'arrears', label: 'Arrears / بقایا' },
                  { key: 'surcharge', label: 'Surcharge / اضافی چارج' },
                  { key: 'nonUser', label: 'Non-User Fee / غیر صارف فیس' },
                  { key: 'transferFee', label: 'Transfer Fee / منتقلی فیس' },
                  { key: 'attorneyFee', label: 'Attorney Fee / وکیل فیس' },
                  { key: 'water', label: 'Water Fee / پانی کی فیس' },
                  { key: 'suiGas', label: 'Sui Gas Fee / سوئی گیس فیس' },
                  { key: 'additional', label: 'Additional Fee / اضافی فیس' }
                ].map(({ key, label }) => (
                  <tr key={key}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={feeHeads[key as keyof FeeHeads]}
                          onChange={(e) => handleFeeChange(key as keyof FeeHeads, e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      ) : (
                        formatCurrency(parseFloat(accountsBreakdown?.[key as keyof AccountsBreakdown] as string) || 0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-medium text-gray-900">Total Amount / کل رقم:</span>
              <span className="text-xl font-bold text-gray-900">
                {editing ? formatCurrency(calculatedTotal) : formatCurrency(parseFloat(accountsBreakdown?.totalAmount || '0'))}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <strong>Amount in Words / الفاظ میں رقم:</strong>
              <div className="mt-1 p-2 bg-white rounded border text-right" style={{ fontFamily: 'Noto Nastaliq Urdu, serif' }}>
                {editing ? calculatedWords : (accountsBreakdown?.totalAmountWords || 'صفر روپے only')}
              </div>
            </div>
          </div>

          {/* Challan Information */}
          {accountsBreakdown?.challanNo && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-md font-medium text-blue-900 mb-2">Challan Information / چالان کی معلومات</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Challan No / چالان نمبر:</span>
                  <span className="ml-2 text-blue-900">{accountsBreakdown.challanNo}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Date / تاریخ:</span>
                  <span className="ml-2 text-blue-900">
                    {accountsBreakdown.challanDate ? new Date(accountsBreakdown.challanDate).toLocaleDateString('ur-PK') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default AccountsTab;
