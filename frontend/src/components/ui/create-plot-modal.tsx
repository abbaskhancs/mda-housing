import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from './button';
import { Input } from './input';
import apiService, { Plot } from '../../services/api';

interface CreatePlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlotCreated: (plot: Plot) => void;
  title?: string;
  initialPlotNumber?: string;
}

export const CreatePlotModal: React.FC<CreatePlotModalProps> = ({
  isOpen,
  onClose,
  onPlotCreated,
  title = 'Create New Plot',
  initialPlotNumber = ''
}) => {
  const [formData, setFormData] = useState({
    plotNumber: initialPlotNumber,
    blockNumber: '',
    sectorNumber: '',
    area: '',
    location: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.plotNumber.trim()) {
      setError('Plot Number is required');
      return;
    }

    // Validate area if provided
    if (formData.area && (isNaN(Number(formData.area)) || Number(formData.area) <= 0)) {
      setError('Area must be a positive number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.createPlot({
        plotNumber: formData.plotNumber.trim(),
        blockNumber: formData.blockNumber.trim() || undefined,
        sectorNumber: formData.sectorNumber.trim() || undefined,
        area: formData.area ? Number(formData.area) : undefined,
        location: formData.location.trim() || undefined
      });

      if (response.success && response.data?.plot) {
        onPlotCreated(response.data.plot);
        handleClose();
      } else {
        setError(response.error || 'Failed to create plot');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plot');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      plotNumber: '',
      blockNumber: '',
      sectorNumber: '',
      area: '',
      location: ''
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plot Number *
            </label>
            <Input
              type="text"
              value={formData.plotNumber}
              onChange={handleInputChange('plotNumber')}
              placeholder="e.g., 123"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Block Number
            </label>
            <Input
              type="text"
              value={formData.blockNumber}
              onChange={handleInputChange('blockNumber')}
              placeholder="e.g., A, B, 1, 2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sector Number
            </label>
            <Input
              type="text"
              value={formData.sectorNumber}
              onChange={handleInputChange('sectorNumber')}
              placeholder="e.g., G-11, F-8"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area (Marla)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.area}
              onChange={handleInputChange('area')}
              placeholder="e.g., 5, 10, 20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <Input
              type="text"
              value={formData.location}
              onChange={handleInputChange('location')}
              placeholder="Complete location description"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Plot'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
