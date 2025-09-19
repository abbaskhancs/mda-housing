// Document types and requirements for MDA Housing Transfer Application

export interface DocType {
  value: string;
  label: string;
  required: boolean;
  description?: string;
}

// All document types from the specification
export const ALL_DOC_TYPES: DocType[] = [
  { value: 'AllotmentLetter', label: 'Allotment Letter', required: true, description: 'Original allotment letter from MDA' },
  { value: 'PrevTransferDeed', label: 'Previous Transfer Deed', required: true, description: 'Previous transfer deed or sale deed' },
  { value: 'AttorneyDeed', label: 'Attorney Deed', required: false, description: 'Power of attorney deed (if applicable)' },
  { value: 'GiftDeed', label: 'Gift Deed', required: false, description: 'Gift deed (if applicable)' },
  { value: 'CNIC_Seller', label: 'CNIC - Seller', required: true, description: 'Copy of seller\'s CNIC' },
  { value: 'CNIC_Buyer', label: 'CNIC - Buyer', required: true, description: 'Copy of buyer\'s CNIC' },
  { value: 'CNIC_Attorney', label: 'CNIC - Attorney', required: false, description: 'Copy of attorney\'s CNIC (if applicable)' },
  { value: 'UtilityBill_Latest', label: 'Latest Utility Bill', required: true, description: 'Latest utility bill for the property' },
  { value: 'NOC_BuiltStructure', label: 'NOC - Built Structure', required: false, description: 'NOC for built structure (if applicable)' },
  { value: 'Photo_Seller', label: 'Photo - Seller', required: true, description: 'Passport size photo of seller' },
  { value: 'Photo_Buyer', label: 'Photo - Buyer', required: true, description: 'Passport size photo of buyer' },
  { value: 'PrevChallan', label: 'Previous Challan', required: false, description: 'Previous payment challan (if applicable)' },
  { value: 'NOC_Water', label: 'NOC - Water', required: false, description: 'NOC from water department (if applicable)' }
];

// Required document types for intake completion
export const REQUIRED_DOC_TYPES = ALL_DOC_TYPES.filter(docType => docType.required);

// Get required document type values only
export const REQUIRED_DOC_TYPE_VALUES = REQUIRED_DOC_TYPES.map(docType => docType.value);

// Helper function to get document type label
export const getDocTypeLabel = (docType: string): string => {
  const docTypeObj = ALL_DOC_TYPES.find(dt => dt.value === docType);
  return docTypeObj ? docTypeObj.label : docType;
};

// Helper function to check if document type is required
export const isDocTypeRequired = (docType: string): boolean => {
  const docTypeObj = ALL_DOC_TYPES.find(dt => dt.value === docType);
  return docTypeObj ? docTypeObj.required : false;
};

// Helper function to get missing required document types
export const getMissingRequiredDocTypes = (uploadedDocTypes: string[]): DocType[] => {
  return REQUIRED_DOC_TYPES.filter(docType => !uploadedDocTypes.includes(docType.value));
};
