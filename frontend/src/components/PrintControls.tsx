"use client";

import React, { useState } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import apiService from '../services/api';

export interface PrintOption {
  id: string;
  label: string;
  type: 'server-pdf' | 'client-print';
  endpoint?: string;
  pdfUrl?: string;
  printElementId?: string;
}

interface PrintControlsProps {
  applicationId: string;
  tabId: string;
  options: PrintOption[];
  className?: string;
}

const PrintControls: React.FC<PrintControlsProps> = ({
  applicationId,
  tabId,
  options,
  className = ''
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handlePrint = async (option: PrintOption) => {
    setLoading(option.id);
    setError(null);

    try {
      if (option.type === 'server-pdf') {
        if (option.pdfUrl) {
          // Open existing PDF
          window.open(option.pdfUrl, '_blank');
        } else if (option.endpoint) {
          // Generate and download PDF
          const response = await fetch(option.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ applicationId })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.signedUrl) {
              window.open(result.signedUrl, '_blank');
            } else {
              // Handle direct PDF response
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              window.open(url, '_blank');
              window.URL.revokeObjectURL(url);
            }
          } else {
            throw new Error('Failed to generate PDF');
          }
        }
      } else if (option.type === 'client-print') {
        // Client-side print
        if (option.printElementId) {
          printElement(option.printElementId);
        } else {
          // Print current tab content
          printCurrentTab();
        }
      }
    } catch (err) {
      console.error('Print error:', err);
      setError(err instanceof Error ? err.message : 'Failed to print');
    } finally {
      setLoading(null);
    }
  };

  const printElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      setError('Print content not found');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Unable to open print window');
      return;
    }

    const printContent = element.innerHTML;
    const printStyles = `
      <style>
        @page {
          size: A4;
          margin: 20mm 15mm;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 12pt;
          line-height: 1.4;
          color: #000;
          background: white;
          margin: 0;
          padding: 0;
        }
        
        .print-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        
        .print-header h1 {
          font-size: 18pt;
          margin: 0 0 5px 0;
          font-weight: bold;
        }
        
        .print-header h2 {
          font-size: 14pt;
          margin: 0;
          color: #666;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .section-title {
          font-size: 14pt;
          font-weight: bold;
          margin: 20px 0 10px 0;
          color: #333;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .info-item {
          padding: 5px 0;
        }
        
        .info-label {
          font-weight: bold;
          color: #555;
        }
        
        .info-value {
          margin-top: 2px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .status-clear {
          background-color: #d4edda;
          color: #155724;
        }
        
        .status-pending {
          background-color: #fff3cd;
          color: #856404;
        }
        
        .status-objection {
          background-color: #f8d7da;
          color: #721c24;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .no-print {
            display: none !important;
          }
          
          .page-break {
            page-break-before: always;
          }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print - Application ${applicationId}</title>
          ${printStyles}
        </head>
        <body>
          <div class="print-header">
            <h1>MDA Housing Transfer Application</h1>
            <h2>Application ID: ${applicationId}</h2>
          </div>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const printCurrentTab = () => {
    // Create a print-friendly version of the current tab
    const tabContent = document.querySelector(`[data-tab="${tabId}"]`);
    if (!tabContent) {
      setError('Tab content not found');
      return;
    }

    printElement(tabContent.id || `tab-${tabId}`);
  };

  if (options.length === 0) {
    return null;
  }

  return (
    <div className={`print-controls ${className}`}>
      {options.length === 1 ? (
        // Single print option - show as button
        <button
          onClick={() => handlePrint(options[0])}
          disabled={loading === options[0].id}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <PrinterIcon className="h-4 w-4 mr-2" />
          {loading === options[0].id ? 'Printing...' : options[0].label}
        </button>
      ) : (
        // Multiple print options - show as dropdown
        <div className="relative inline-block text-left">
          <div>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              id="print-menu-button"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
              <svg className="-mr-1 ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {dropdownOpen && (
            <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="print-menu-button">
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      handlePrint(option);
                      setDropdownOpen(false);
                    }}
                    disabled={loading === option.id}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                    role="menuitem"
                  >
                    {loading === option.id ? 'Printing...' : option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

export default PrintControls;
