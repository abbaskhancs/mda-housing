import { z } from 'zod';

// Common validation patterns
const cnicSchema = z.string().regex(/^\d{5}-\d{7}-\d{1}$/, 'CNIC must be in format 12345-1234567-1');
const phoneSchema = z.string().regex(/^(\+92|0)?[0-9]{10}$/, 'Phone number must be a valid Pakistani number');
const emailSchema = z.string().email('Invalid email format');
const positiveDecimalSchema = z.string().transform((val) => {
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) {
    throw new Error('Must be a positive number');
  }
  return num;
});

// Auth schemas
export const authSchemas = {
  login: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required')
  }),

  register: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long'),
    email: emailSchema,
    password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long'),
    role: z.enum(['OWO', 'BCA', 'HOUSING', 'ACCOUNTS', 'WATER', 'APPROVER', 'ADMIN'])
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100, 'Password too long')
  }),

  updateProfile: z.object({
    email: emailSchema.optional()
  })
};

// Person schemas
export const personSchemas = {
  create: z.object({
    cnic: cnicSchema,
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    fatherName: z.string().min(1, 'Father name is required').max(100, 'Father name too long'),
    address: z.string().max(500, 'Address too long').optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional()
  }),

  update: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
    fatherName: z.string().min(1, 'Father name is required').max(100, 'Father name too long').optional(),
    address: z.string().max(500, 'Address too long').optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional()
  }),

  getById: z.object({
    id: z.string().cuid('Invalid person ID')
  })
};

// Plot schemas
export const plotSchemas = {
  create: z.object({
    plotNumber: z.string().min(1, 'Plot number is required').max(50, 'Plot number too long'),
    blockNumber: z.string().max(20, 'Block number too long').optional(),
    sectorNumber: z.string().max(20, 'Sector number too long').optional(),
    area: positiveDecimalSchema.optional(),
    location: z.string().max(200, 'Location too long').optional()
  }),

  update: z.object({
    blockNumber: z.string().max(20, 'Block number too long').optional(),
    sectorNumber: z.string().max(20, 'Sector number too long').optional(),
    area: positiveDecimalSchema.optional(),
    location: z.string().max(200, 'Location too long').optional()
  }),

  getById: z.object({
    id: z.string().cuid('Invalid plot ID')
  })
};

// Application schemas
export const applicationSchemas = {
  create: z.object({
    sellerId: z.string().cuid('Invalid seller ID'),
    buyerId: z.string().cuid('Invalid buyer ID'),
    attorneyId: z.string().cuid('Invalid attorney ID').optional(),
    plotId: z.string().cuid('Invalid plot ID'),
    // Attachments will be handled separately via multer
  }),

  update: z.object({
    attorneyId: z.string().cuid('Invalid attorney ID').optional()
  }),

  getById: z.object({
    id: z.string().cuid('Invalid application ID')
  }),

  getByStage: z.object({
    stage: z.string().min(1, 'Stage is required')
  }),

  transition: z.object({
    toStageId: z.string().cuid('Invalid stage ID'),
    remarks: z.string().max(500, 'Remarks too long').optional()
  }),

  clearance: z.object({
    sectionId: z.string().cuid('Invalid section ID'),
    statusId: z.string().cuid('Invalid status ID'),
    remarks: z.string().max(500, 'Remarks too long').optional(),
    signedPdfUrl: z.string().url('Invalid PDF URL').optional()
  })
};

// Attachment schemas
export const attachmentSchemas = {
  upload: z.object({
    docType: z.enum([
      'AllotmentLetter',
      'PrevTransferDeed',
      'AttorneyDeed',
      'GiftDeed',
      'CNIC_Seller',
      'CNIC_Buyer',
      'CNIC_Attorney',
      'UtilityBill_Latest',
      'NOC_BuiltStructure',
      'Photo_Seller',
      'Photo_Buyer',
      'PrevChallan',
      'NOC_Water'
    ]),
    isOriginalSeen: z.boolean().default(false)
  }),

  getById: z.object({
    id: z.string().cuid('Invalid attachment ID')
  }),

  markOriginalSeen: z.object({
    isOriginalSeen: z.boolean()
  }),

  update: z.object({
    isOriginalSeen: z.boolean()
  })
};

// Clearance schemas
export const clearanceSchemas = {
  create: z.object({
    sectionId: z.string().cuid('Invalid section ID'),
    statusId: z.string().cuid('Invalid status ID'),
    remarks: z.string().max(500, 'Remarks too long').optional(),
    signedPdfUrl: z.string().url('Invalid PDF URL').optional()
  }),

  update: z.object({
    statusId: z.string().cuid('Invalid status ID').optional(),
    remarks: z.string().max(500, 'Remarks too long').optional(),
    signedPdfUrl: z.string().url('Invalid PDF URL').optional()
  }),

  getById: z.object({
    id: z.string().cuid('Invalid clearance ID')
  })
};

// Accounts schemas
export const accountsSchemas = {
  create: z.object({
    arrears: positiveDecimalSchema.optional(),
    surcharge: positiveDecimalSchema.optional(),
    nonUser: positiveDecimalSchema.optional(),
    transferFee: positiveDecimalSchema.optional(),
    attorneyFee: positiveDecimalSchema.optional(),
    water: positiveDecimalSchema.optional(),
    suiGas: positiveDecimalSchema.optional(),
    additional: positiveDecimalSchema.optional()
  }),

  update: z.object({
    arrears: positiveDecimalSchema.optional(),
    surcharge: positiveDecimalSchema.optional(),
    nonUser: positiveDecimalSchema.optional(),
    transferFee: positiveDecimalSchema.optional(),
    attorneyFee: positiveDecimalSchema.optional(),
    water: positiveDecimalSchema.optional(),
    suiGas: positiveDecimalSchema.optional(),
    additional: positiveDecimalSchema.optional(),
    paidAmount: positiveDecimalSchema.optional(),
    challanUrl: z.string().url('Invalid challan URL').optional()
  }),

  verifyPayment: z.object({
    paidAmount: positiveDecimalSchema,
    challanUrl: z.string().url('Invalid challan URL').optional()
  }),

  getById: z.object({
    id: z.string().cuid('Invalid accounts breakdown ID')
  }),

  generateChallan: z.object({
    // No additional parameters needed - uses existing breakdown
  })
};

// Review schemas
export const reviewSchemas = {
  create: z.object({
    sectionId: z.string().cuid('Invalid section ID'),
    remarks: z.string().max(500, 'Remarks too long').optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING')
  }),

  update: z.object({
    remarks: z.string().max(500, 'Remarks too long').optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional()
  }),

  getById: z.object({
    id: z.string().cuid('Invalid review ID')
  })
};

// Transfer Deed schemas
export const transferDeedSchemas = {
  create: z.object({
    witness1Id: z.string().cuid('Invalid witness 1 ID'),
    witness2Id: z.string().cuid('Invalid witness 2 ID'),
    deedContent: z.string().max(10000, 'Deed content too long').optional()
  }),

  update: z.object({
    witness1Id: z.string().cuid('Invalid witness 1 ID').optional(),
    witness2Id: z.string().cuid('Invalid witness 2 ID').optional(),
    deedContent: z.string().max(10000, 'Deed content too long').optional()
  }),

  finalize: z.object({
    witness1Signature: z.string().min(1, 'Witness 1 signature is required'),
    witness2Signature: z.string().min(1, 'Witness 2 signature is required'),
    finalPdfUrl: z.string().url('Invalid final PDF URL').min(1, 'Final PDF URL is required')
  }),

  getById: z.object({
    id: z.string().cuid('Invalid transfer deed ID')
  })
};

// Workflow schemas
export const workflowSchemas = {
  getTransitions: z.object({
    from: z.string().min(1, 'From stage is required').optional(),
    to: z.string().min(1, 'To stage is required').optional(),
    applicationId: z.string().cuid('Invalid application ID').optional(),
    dryRun: z.enum(['true', 'false']).optional()
  }),

  getStages: z.object({
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  }),

  getSections: z.object({
    group: z.string().min(1, 'Group is required').optional()
  }),

  getStatuses: z.object({
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  })
};

// Query schemas for pagination and filtering
export const querySchemas = {
  pagination: z.object({
    page: z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) || num < 1 ? 1 : num;
    }).default('1'),
    limit: z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) || num < 1 || num > 100 ? 10 : num;
    }).default('10')
  }),

  search: z.object({
    q: z.string().min(1, 'Search query is required').max(100, 'Search query too long')
  }),

  dateRange: z.object({
    startDate: z.string().datetime('Invalid start date format').optional(),
    endDate: z.string().datetime('Invalid end date format').optional()
  })
};

// Combined schemas for common operations
export const commonSchemas = {
  idParam: z.object({
    id: z.string().cuid('Invalid ID')
  }),

  applicationIdParam: z.object({
    applicationId: z.string().cuid('Invalid application ID')
  }),

  paginationQuery: querySchemas.pagination,
  searchQuery: querySchemas.search,
  dateRangeQuery: querySchemas.dateRange
};
