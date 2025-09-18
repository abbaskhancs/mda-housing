import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { FileUpload } from './ui/file-upload';
import { CameraIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

interface PhotoSignatureData {
  sellerPhoto: File | null;
  buyerPhoto: File | null;
  witness1Photo: File | null;
  witness2Photo: File | null;
  sellerSignature: File | null;
  buyerSignature: File | null;
  witness1Signature: File | null;
  witness2Signature: File | null;
}

interface PhotoSignatureCaptureProps {
  applicationId: string;
  sellerName: string;
  buyerName: string;
  witness1Name?: string;
  witness2Name?: string;
  onDataChange: (data: PhotoSignatureData) => void;
  disabled?: boolean;
  existingData?: Partial<PhotoSignatureData>;
}

export const PhotoSignatureCapture: React.FC<PhotoSignatureCaptureProps> = ({
  applicationId,
  sellerName,
  buyerName,
  witness1Name,
  witness2Name,
  onDataChange,
  disabled = false,
  existingData = {}
}) => {
  const [data, setData] = useState<PhotoSignatureData>({
    sellerPhoto: null,
    buyerPhoto: null,
    witness1Photo: null,
    witness2Photo: null,
    sellerSignature: null,
    buyerSignature: null,
    witness1Signature: null,
    witness2Signature: null,
    ...existingData
  });

  const updateData = (field: keyof PhotoSignatureData, file: File | null) => {
    const newData = { ...data, [field]: file };
    setData(newData);
    onDataChange(newData);
  };

  const isComplete = () => {
    return !!(
      data.sellerPhoto &&
      data.buyerPhoto &&
      data.sellerSignature &&
      data.buyerSignature &&
      (!witness1Name || data.witness1Photo) &&
      (!witness1Name || data.witness1Signature) &&
      (!witness2Name || data.witness2Photo) &&
      (!witness2Name || data.witness2Signature)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CameraIcon className="h-5 w-5" />
          <span>Photo & Signature Capture</span>
          {isComplete() && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Complete
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Photos Section */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CameraIcon className="h-5 w-5 mr-2" />
            Photos
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUpload
              label={`${sellerName} (Seller) Photo`}
              accept="image/*"
              maxSize={5}
              type="photo"
              onFileSelect={(file) => updateData('sellerPhoto', file)}
              currentFile={data.sellerPhoto}
              disabled={disabled}
            />
            
            <FileUpload
              label={`${buyerName} (Buyer) Photo`}
              accept="image/*"
              maxSize={5}
              type="photo"
              onFileSelect={(file) => updateData('buyerPhoto', file)}
              currentFile={data.buyerPhoto}
              disabled={disabled}
            />
            
            {witness1Name && (
              <FileUpload
                label={`${witness1Name} (Witness 1) Photo`}
                accept="image/*"
                maxSize={5}
                type="photo"
                onFileSelect={(file) => updateData('witness1Photo', file)}
                currentFile={data.witness1Photo}
                disabled={disabled}
              />
            )}
            
            {witness2Name && (
              <FileUpload
                label={`${witness2Name} (Witness 2) Photo`}
                accept="image/*"
                maxSize={5}
                type="photo"
                onFileSelect={(file) => updateData('witness2Photo', file)}
                currentFile={data.witness2Photo}
                disabled={disabled}
              />
            )}
          </div>
        </div>

        {/* Signatures Section */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <PencilSquareIcon className="h-5 w-5 mr-2" />
            Signatures
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUpload
              label={`${sellerName} (Seller) Signature`}
              accept="image/*"
              maxSize={2}
              type="signature"
              onFileSelect={(file) => updateData('sellerSignature', file)}
              currentFile={data.sellerSignature}
              disabled={disabled}
            />
            
            <FileUpload
              label={`${buyerName} (Buyer) Signature`}
              accept="image/*"
              maxSize={2}
              type="signature"
              onFileSelect={(file) => updateData('buyerSignature', file)}
              currentFile={data.buyerSignature}
              disabled={disabled}
            />
            
            {witness1Name && (
              <FileUpload
                label={`${witness1Name} (Witness 1) Signature`}
                accept="image/*"
                maxSize={2}
                type="signature"
                onFileSelect={(file) => updateData('witness1Signature', file)}
                currentFile={data.witness1Signature}
                disabled={disabled}
              />
            )}
            
            {witness2Name && (
              <FileUpload
                label={`${witness2Name} (Witness 2) Signature`}
                accept="image/*"
                maxSize={2}
                type="signature"
                onFileSelect={(file) => updateData('witness2Signature', file)}
                currentFile={data.witness2Signature}
                disabled={disabled}
              />
            )}
          </div>
        </div>

        {/* Upload Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h5 className="text-sm font-medium text-blue-900 mb-2">Upload Guidelines:</h5>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Photos: Maximum 5MB, JPEG/PNG format recommended</li>
            <li>• Signatures: Maximum 2MB, clear image against white background</li>
            <li>• Ensure all images are clear and properly oriented</li>
            <li>• Files will be automatically validated for size and format</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
