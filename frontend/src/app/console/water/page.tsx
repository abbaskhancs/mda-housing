'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/AuthGuard';

type Application = {
  id: string;
  applicationNumber: string;
  seller: { name: string; cnic: string };
  buyer: { name: string; cnic: string };
  plot: { plotNumber: string; block: string; sector: string; size: string };
  currentStage: { code: string; name: string };
  submittedAt: string;
  clearances?: Array<{
    id: string;
    section: { code: string; name: string };
    status: { code: string; name: string };
    remarks?: string;
    createdAt: string;
  }>;
};

export default function WaterConsolePage() {
  const { token } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [actionType, setActionType] = useState<'CLEAR' | 'OBJECTION' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/applications?stages=WATER_PENDING&includeDetails=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load applications');
      }
      
      const data = await response.json();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedApp || !actionType || !token) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Get Water section and status
      const sectionsResponse = await fetch('http://localhost:3001/api/workflow/sections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const sectionsData = await sectionsResponse.json();
      const waterSection = sectionsData.sections.find((s: any) => s.code === 'WATER');
      
      const statusesResponse = await fetch('http://localhost:3001/api/workflow/statuses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statusesData = await statusesResponse.json();
      const status = statusesData.statuses.find((s: any) => s.code === actionType);
      
      if (!waterSection || !status) {
        throw new Error('Required section or status not found');
      }
      
      // Create clearance
      const response = await fetch(`http://localhost:3001/api/applications/${selectedApp.id}/clearances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sectionId: waterSection.id,
          statusId: status.id,
          remarks: remarks || (actionType === 'CLEAR' ? 'Water clearance approved' : 'Water objection raised')
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process clearance');
      }
      
      // Reset form and reload
      setSelectedApp(null);
      setActionType(null);
      setRemarks('');
      await loadApplications();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process action');
    } finally {
      setSubmitting(false);
    }
  };

  const openPDF = async (applicationId: string) => {
    if (!token) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/applications/${applicationId}/clearances/water/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        setError('Failed to generate PDF');
      }
    } catch (err) {
      setError('Failed to open PDF');
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p>Loading applications...</p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 20, color: '#2c5aa0' }}>
          Water Department Console / واٹر ڈیپارٹمنٹ کنسول
        </h1>
        
        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: 12, 
            borderRadius: 4, 
            marginBottom: 20,
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}
        
        <div style={{ marginBottom: 20 }}>
          <h2>Applications Pending Water Clearance ({applications.length})</h2>
        </div>
        
        {applications.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 40, 
            backgroundColor: '#f8f9fa', 
            borderRadius: 8,
            color: '#6c757d'
          }}>
            <p>No applications pending Water clearance</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>واٹر کلیئرنس کے لیے کوئی درخواست موجود نہیں</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {applications.map(app => (
              <div key={app.id} style={{ 
                border: '1px solid #dee2e6', 
                borderRadius: 8, 
                padding: 16,
                backgroundColor: '#fff'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
                  <div>
                    <h3 style={{ marginBottom: 8, color: '#495057' }}>
                      Application #{app.applicationNumber}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 14 }}>
                      <div>
                        <strong>Seller:</strong> {app.seller.name}<br />
                        <span style={{ color: '#6c757d' }}>CNIC: {app.seller.cnic}</span>
                      </div>
                      <div>
                        <strong>Buyer:</strong> {app.buyer.name}<br />
                        <span style={{ color: '#6c757d' }}>CNIC: {app.buyer.cnic}</span>
                      </div>
                      <div>
                        <strong>Plot:</strong> {app.plot.plotNumber}<br />
                        <span style={{ color: '#6c757d' }}>Block {app.plot.block}, Sector {app.plot.sector}</span>
                      </div>
                      <div>
                        <strong>Size:</strong> {app.plot.size} sq ft<br />
                        <span style={{ color: '#6c757d' }}>Submitted: {new Date(app.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                    <button
                      onClick={() => {
                        setSelectedApp(app);
                        setActionType('CLEAR');
                        setRemarks('');
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 14
                      }}
                    >
                      ✓ Clear
                    </button>
                    <button
                      onClick={() => {
                        setSelectedApp(app);
                        setActionType('OBJECTION');
                        setRemarks('');
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 14
                      }}
                    >
                      ✗ Object
                    </button>
                    <button
                      onClick={() => openPDF(app.id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 14
                      }}
                    >
                      📄 PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Action Modal */}
        {selectedApp && actionType && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: 24,
              borderRadius: 8,
              maxWidth: 500,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ marginBottom: 16 }}>
                {actionType === 'CLEAR' ? 'Clear Application' : 'Raise Objection'}
              </h3>
              <p style={{ marginBottom: 16, color: '#6c757d' }}>
                Application #{selectedApp.applicationNumber}
              </p>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                  Remarks / تبصرات:
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={actionType === 'CLEAR' ? 'Water clearance approved...' : 'Please specify the objection...'}
                  style={{
                    width: '100%',
                    minHeight: 100,
                    padding: 8,
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setSelectedApp(null);
                    setActionType(null);
                    setRemarks('');
                  }}
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: actionType === 'CLEAR' ? '#28a745' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Processing...' : (actionType === 'CLEAR' ? 'Clear' : 'Raise Objection')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
