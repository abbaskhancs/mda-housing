import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { SearchableSelect } from './ui/searchable-select';
import { CreatePersonModal } from './ui/create-person-modal';
import { CreatePlotModal } from './ui/create-plot-modal';
import { Button } from './ui/button';
import apiService, { Person, Plot } from '../services/api';

interface IntakeFormProps {
  onSuccess?: (applicationId: string) => void;
  onError?: (error: string) => void;
}

export const IntakeForm: React.FC<IntakeFormProps> = ({ onSuccess, onError }) => {
  const router = useRouter();
  const { token } = useAuth();
  
  // Form state
  const [seller, setSeller] = useState<Person | null>(null);
  const [buyer, setBuyer] = useState<Person | null>(null);
  const [attorney, setAttorney] = useState<Person | null>(null);
  const [plot, setPlot] = useState<Plot | null>(null);
  const [waterNocRequired, setWaterNocRequired] = useState(false);
  
  // Modal state
  const [showCreatePersonModal, setShowCreatePersonModal] = useState(false);
  const [showCreatePlotModal, setShowCreatePlotModal] = useState(false);
  const [createPersonType, setCreatePersonType] = useState<'seller' | 'buyer' | 'attorney'>('seller');
  
  // Loading and error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search functions
  const searchPersons = async (query: string): Promise<Person[]> => {
    try {
      const response = await apiService.searchPersons(query, 10);
      return response.success ? response.data?.persons || [] : [];
    } catch (error) {
      console.error('Error searching persons:', error);
      return [];
    }
  };

  const searchPlots = async (query: string): Promise<Plot[]> => {
    try {
      const response = await apiService.searchPlots(query, 10);
      return response.success ? response.data?.plots || [] : [];
    } catch (error) {
      console.error('Error searching plots:', error);
      return [];
    }
  };

  // Display functions
  const displayPerson = (person: Person): string => {
    return `${person.name} (${person.cnic})`;
  };

  const displayPlot = (plot: Plot): string => {
    const parts = [plot.plotNumber];
    if (plot.blockNumber) parts.push(`Block ${plot.blockNumber}`);
    if (plot.sectorNumber) parts.push(`Sector ${plot.sectorNumber}`);
    return parts.join(', ');
  };

  // Modal handlers
  const handleCreatePerson = (type: 'seller' | 'buyer' | 'attorney') => {
    setCreatePersonType(type);
    setShowCreatePersonModal(true);
  };

  const handlePersonCreated = (person: Person) => {
    switch (createPersonType) {
      case 'seller':
        setSeller(person);
        break;
      case 'buyer':
        setBuyer(person);
        break;
      case 'attorney':
        setAttorney(person);
        break;
    }
    setShowCreatePersonModal(false);
  };

  const handlePlotCreated = (plot: Plot) => {
    setPlot(plot);
    setShowCreatePlotModal(false);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!seller) {
      setError('Please select or create a seller');
      return;
    }
    if (!buyer) {
      setError('Please select or create a buyer');
      return;
    }
    if (!plot) {
      setError('Please select or create a plot');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:3001/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          sellerId: seller.id,
          buyerId: buyer.id,
          attorneyId: attorney?.id,
          plotId: plot.id,
          waterNocRequired
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to create application');
      }

      const result = await response.json();
      const applicationId = result?.application?.id;

      if (!applicationId) {
        throw new Error('Application ID missing in response');
      }

      if (onSuccess) {
        onSuccess(applicationId);
      } else {
        router.push(`/applications/${applicationId}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create application';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">New Application Intake</h2>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seller Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Seller Information</h3>
            <SearchableSelect
              value={seller}
              onChange={setSeller}
              onSearch={searchPersons}
              onCreateNew={() => handleCreatePerson('seller')}
              placeholder="Search seller by CNIC or name..."
              displayValue={displayPerson}
              displayKey={(person) => person.id}
              createNewText="Create New Seller"
              className="w-full"
            />
          </div>

          {/* Buyer Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Buyer Information</h3>
            <SearchableSelect
              value={buyer}
              onChange={setBuyer}
              onSearch={searchPersons}
              onCreateNew={() => handleCreatePerson('buyer')}
              placeholder="Search buyer by CNIC or name..."
              displayValue={displayPerson}
              displayKey={(person) => person.id}
              createNewText="Create New Buyer"
              className="w-full"
            />
          </div>

          {/* Attorney Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attorney Information (Optional)</h3>
            <SearchableSelect
              value={attorney}
              onChange={setAttorney}
              onSearch={searchPersons}
              onCreateNew={() => handleCreatePerson('attorney')}
              placeholder="Search attorney by CNIC or name..."
              displayValue={displayPerson}
              displayKey={(person) => person.id}
              createNewText="Create New Attorney"
              className="w-full"
            />
          </div>

          {/* Plot Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Plot Information</h3>
            <SearchableSelect
              value={plot}
              onChange={setPlot}
              onSearch={searchPlots}
              onCreateNew={() => setShowCreatePlotModal(true)}
              placeholder="Search plot by number, block, or sector..."
              displayValue={displayPlot}
              displayKey={(plot) => plot.id}
              createNewText="Create New Plot"
              className="w-full"
            />
          </div>

          {/* Water NOC Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Requirements</h3>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={waterNocRequired}
                onChange={(e) => setWaterNocRequired(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Water NOC Required</span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2"
            >
              {isSubmitting ? 'Creating Application...' : 'Create Application'}
            </Button>
          </div>
        </form>
      </div>

      {/* Modals */}
      <CreatePersonModal
        isOpen={showCreatePersonModal}
        onClose={() => setShowCreatePersonModal(false)}
        onPersonCreated={handlePersonCreated}
        title={`Create New ${createPersonType.charAt(0).toUpperCase() + createPersonType.slice(1)}`}
      />

      <CreatePlotModal
        isOpen={showCreatePlotModal}
        onClose={() => setShowCreatePlotModal(false)}
        onPlotCreated={handlePlotCreated}
      />
    </div>
  );
};
