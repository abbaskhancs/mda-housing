import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from './button';
import { Input } from './input';
import apiService, { Person } from '../../services/api';

interface CreatePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPersonCreated: (person: Person) => void;
  title?: string;
  initialCnic?: string;
}

export const CreatePersonModal: React.FC<CreatePersonModalProps> = ({
  isOpen,
  onClose,
  onPersonCreated,
  title = 'Create New Person',
  initialCnic = ''
}) => {
  const [formData, setFormData] = useState({
    cnic: initialCnic,
    name: '',
    fatherName: '',
    address: '',
    phone: '',
    email: ''
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
    
    if (!formData.cnic.trim() || !formData.name.trim()) {
      setError('CNIC and Name are required');
      return;
    }

    // Validate CNIC format
    const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicPattern.test(formData.cnic.trim())) {
      setError('CNIC must be in format 12345-1234567-1');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.createPerson({
        cnic: formData.cnic.trim(),
        name: formData.name.trim(),
        fatherName: formData.fatherName.trim() || undefined,
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined
      });

      if (response.success && response.data?.person) {
        onPersonCreated(response.data.person);
        handleClose();
      } else {
        setError(response.error || 'Failed to create person');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create person');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      cnic: '',
      name: '',
      fatherName: '',
      address: '',
      phone: '',
      email: ''
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
              CNIC *
            </label>
            <Input
              type="text"
              value={formData.cnic}
              onChange={handleInputChange('cnic')}
              placeholder="12345-1234567-1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="Full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Father's Name
            </label>
            <Input
              type="text"
              value={formData.fatherName}
              onChange={handleInputChange('fatherName')}
              placeholder="Father's name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <Input
              type="text"
              value={formData.address}
              onChange={handleInputChange('address')}
              placeholder="Complete address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <Input
              type="text"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              placeholder="Phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="Email address"
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
              {isLoading ? 'Creating...' : 'Create Person'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
