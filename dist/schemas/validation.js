"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonSchemas = exports.querySchemas = exports.workflowSchemas = exports.transferDeedSchemas = exports.reviewSchemas = exports.accountsSchemas = exports.clearanceSchemas = exports.attachmentSchemas = exports.applicationSchemas = exports.plotSchemas = exports.personSchemas = exports.authSchemas = void 0;
const zod_1 = require("zod");
// Common validation patterns
const cnicSchema = zod_1.z.string().regex(/^\d{5}-\d{7}-\d{1}$/, 'CNIC must be in format 12345-1234567-1');
const phoneSchema = zod_1.z.string().regex(/^(\+92|0)?[0-9]{10}$/, 'Phone number must be a valid Pakistani number');
const emailSchema = zod_1.z.string().email('Invalid email format');
const positiveDecimalSchema = zod_1.z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
        throw new Error('Must be a positive number');
    }
    return num;
});
const nonNegativeDecimalSchema = zod_1.z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
        throw new Error('Must be a non-negative number');
    }
    return num;
});
// Auth schemas
exports.authSchemas = {
    login: zod_1.z.object({
        username: zod_1.z.string().min(1, 'Username is required'),
        password: zod_1.z.string().min(1, 'Password is required')
    }),
    register: zod_1.z.object({
        username: zod_1.z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long'),
        email: emailSchema,
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long'),
        role: zod_1.z.enum(['OWO', 'BCA', 'HOUSING', 'ACCOUNTS', 'WATER', 'APPROVER', 'ADMIN'])
    }),
    changePassword: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, 'Current password is required'),
        newPassword: zod_1.z.string().min(6, 'New password must be at least 6 characters').max(100, 'Password too long')
    }),
    updateProfile: zod_1.z.object({
        email: emailSchema.optional()
    })
};
// Person schemas
exports.personSchemas = {
    create: zod_1.z.object({
        cnic: cnicSchema,
        name: zod_1.z.string().min(1, 'Name is required').max(100, 'Name too long'),
        fatherName: zod_1.z.string().min(1, 'Father name is required').max(100, 'Father name too long'),
        address: zod_1.z.string().max(500, 'Address too long').optional(),
        phone: phoneSchema.optional(),
        email: emailSchema.optional()
    }),
    update: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
        fatherName: zod_1.z.string().min(1, 'Father name is required').max(100, 'Father name too long').optional(),
        address: zod_1.z.string().max(500, 'Address too long').optional(),
        phone: phoneSchema.optional(),
        email: emailSchema.optional()
    }),
    getById: zod_1.z.object({
        id: zod_1.z.string().cuid('Invalid person ID')
    })
};
// Plot schemas
exports.plotSchemas = {
    create: zod_1.z.object({
        plotNumber: zod_1.z.string().min(1, 'Plot number is required').max(50, 'Plot number too long'),
        blockNumber: zod_1.z.string().max(20, 'Block number too long').optional(),
        sectorNumber: zod_1.z.string().max(20, 'Sector number too long').optional(),
        area: positiveDecimalSchema.optional(),
        location: zod_1.z.string().max(200, 'Location too long').optional()
    }),
    update: zod_1.z.object({
        blockNumber: zod_1.z.string().max(20, 'Block number too long').optional(),
        sectorNumber: zod_1.z.string().max(20, 'Sector number too long').optional(),
        area: positiveDecimalSchema.optional(),
        location: zod_1.z.string().max(200, 'Location too long').optional()
    }),
    getById: zod_1.z.object({
        id: zod_1.z.string().cuid('Invalid plot ID')
    })
};
// Application schemas
exports.applicationSchemas = {
    create: zod_1.z.object({
        sellerId: zod_1.z.string().cuid('Invalid seller ID'),
        buyerId: zod_1.z.string().cuid('Invalid buyer ID'),
        attorneyId: zod_1.z.string().cuid('Invalid attorney ID').optional(),
        plotId: zod_1.z.string().cuid('Invalid plot ID'),
        waterNocRequired: zod_1.z.boolean().optional().default(false),
        // Attachments will be handled separately via multer
    }),
    update: zod_1.z.object({
        attorneyId: zod_1.z.string().cuid('Invalid attorney ID').optional()
    }),
    getById: zod_1.z.object({
        id: zod_1.z.string().cuid('Invalid application ID')
    }),
    getByStage: zod_1.z.object({
        stage: zod_1.z.string().min(1, 'Stage is required')
    }),
    transition: zod_1.z.object({
        toStageId: zod_1.z.string().cuid('Invalid stage ID'),
        remarks: zod_1.z.string().max(500, 'Remarks too long').optional()
    }),
    clearance: zod_1.z.object({
        sectionId: zod_1.z.string().cuid('Invalid section ID'),
        statusId: zod_1.z.string().cuid('Invalid status ID'),
        remarks: zod_1.z.string().max(500, 'Remarks too long').optional(),
        signedPdfUrl: zod_1.z.string().url('Invalid PDF URL').optional()
    })
};
// Attachment schemas
exports.attachmentSchemas = {
    upload: zod_1.z.object({
        docType: zod_1.z.enum([
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
        isOriginalSeen: zod_1.z.boolean().default(false)
    }),
    getById: zod_1.z.object({
        id: zod_1.z.string().cuid('Invalid attachment ID')
    }),
    markOriginalSeen: zod_1.z.object({
        isOriginalSeen: zod_1.z.boolean()
    }),
    update: zod_1.z.object({
        isOriginalSeen: zod_1.z.boolean()
    })
};
// Clearance schemas
exports.clearanceSchemas = {
    create: zod_1.z.object({
        sectionId: zod_1.z.string().cuid('Invalid section ID'),
        statusId: zod_1.z.string().cuid('Invalid status ID'),
        remarks: zod_1.z.string().max(500, 'Remarks too long').optional(),
        signedPdfUrl: zod_1.z.string().url('Invalid PDF URL').optional()
    }),
    update: zod_1.z.object({
        statusId: zod_1.z.string().cuid('Invalid status ID').optional(),
        remarks: zod_1.z.string().max(500, 'Remarks too long').optional(),
        signedPdfUrl: zod_1.z.string().url('Invalid PDF URL').optional()
    }),
    getById: zod_1.z.object({
        id: zod_1.z.string().cuid('Invalid clearance ID')
    })
};
// Accounts schemas
exports.accountsSchemas = {
    create: zod_1.z.object({
        arrears: nonNegativeDecimalSchema.optional(),
        surcharge: nonNegativeDecimalSchema.optional(),
        nonUser: nonNegativeDecimalSchema.optional(),
        transferFee: nonNegativeDecimalSchema.optional(),
        attorneyFee: nonNegativeDecimalSchema.optional(),
        water: nonNegativeDecimalSchema.optional(),
        suiGas: nonNegativeDecimalSchema.optional(),
        additional: nonNegativeDecimalSchema.optional()
    }),
    update: zod_1.z.object({
        arrears: nonNegativeDecimalSchema.optional(),
        surcharge: nonNegativeDecimalSchema.optional(),
        nonUser: nonNegativeDecimalSchema.optional(),
        transferFee: nonNegativeDecimalSchema.optional(),
        attorneyFee: nonNegativeDecimalSchema.optional(),
        water: nonNegativeDecimalSchema.optional(),
        suiGas: nonNegativeDecimalSchema.optional(),
        additional: nonNegativeDecimalSchema.optional(),
        paidAmount: positiveDecimalSchema.optional(),
        challanUrl: zod_1.z.string().url('Invalid challan URL').optional()
    }),
    verifyPayment: zod_1.z.object({
        paidAmount: positiveDecimalSchema,
        challanUrl: zod_1.z.string().url('Invalid challan URL').optional()
    }),
    getById: zod_1.z.object({
        id: zod_1.z.string().cuid('Invalid accounts breakdown ID')
    }),
    generateChallan: zod_1.z.object({
    // No additional parameters needed - uses existing breakdown
    })
};
// Review schemas
exports.reviewSchemas = {
    create: zod_1.z.object({
        sectionId: zod_1.z.string().cuid('Invalid section ID'),
        remarks: zod_1.z.string().max(500, 'Remarks too long').optional(),
        status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING')
    }),
    update: zod_1.z.object({
        remarks: zod_1.z.string().max(500, 'Remarks too long').optional(),
        status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional()
    }),
    getById: zod_1.z.object({
        id: zod_1.z.string().cuid('Invalid review ID')
    })
};
// Transfer Deed schemas
exports.transferDeedSchemas = {
    create: zod_1.z.object({
        witness1Id: zod_1.z.string().cuid('Invalid witness 1 ID'),
        witness2Id: zod_1.z.string().cuid('Invalid witness 2 ID'),
        deedContent: zod_1.z.string().max(10000, 'Deed content too long').optional()
    }),
    update: zod_1.z.object({
        witness1Id: zod_1.z.string().cuid('Invalid witness 1 ID').optional(),
        witness2Id: zod_1.z.string().cuid('Invalid witness 2 ID').optional(),
        deedContent: zod_1.z.string().max(10000, 'Deed content too long').optional()
    }),
    finalize: zod_1.z.object({
        witness1Signature: zod_1.z.string().min(1, 'Witness 1 signature is required'),
        witness2Signature: zod_1.z.string().min(1, 'Witness 2 signature is required'),
        finalPdfUrl: zod_1.z.string().url('Invalid final PDF URL').min(1, 'Final PDF URL is required')
    }),
    getById: zod_1.z.object({
        id: zod_1.z.string().cuid('Invalid transfer deed ID')
    })
};
// Workflow schemas
exports.workflowSchemas = {
    getTransitions: zod_1.z.object({
        from: zod_1.z.string().min(1, 'From stage is required').optional(),
        to: zod_1.z.string().min(1, 'To stage is required').optional(),
        applicationId: zod_1.z.string().cuid('Invalid application ID').optional(),
        dryRun: zod_1.z.enum(['true', 'false']).optional()
    }),
    getStages: zod_1.z.object({
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc')
    }),
    getSections: zod_1.z.object({
        group: zod_1.z.string().min(1, 'Group is required').optional()
    }),
    getStatuses: zod_1.z.object({
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc')
    })
};
// Query schemas for pagination and filtering
exports.querySchemas = {
    pagination: zod_1.z.object({
        page: zod_1.z.string().transform((val) => {
            const num = parseInt(val);
            return isNaN(num) || num < 1 ? 1 : num;
        }).default('1'),
        limit: zod_1.z.string().transform((val) => {
            const num = parseInt(val);
            return isNaN(num) || num < 1 || num > 100 ? 10 : num;
        }).default('10')
    }),
    search: zod_1.z.object({
        q: zod_1.z.string().min(1, 'Search query is required').max(100, 'Search query too long')
    }),
    dateRange: zod_1.z.object({
        startDate: zod_1.z.string().datetime('Invalid start date format').optional(),
        endDate: zod_1.z.string().datetime('Invalid end date format').optional()
    })
};
// Combined schemas for common operations
exports.commonSchemas = {
    idParam: zod_1.z.object({
        id: zod_1.z.string().cuid('Invalid ID')
    }),
    applicationIdParam: zod_1.z.object({
        applicationId: zod_1.z.string().cuid('Invalid application ID')
    }),
    paginationQuery: exports.querySchemas.pagination,
    searchQuery: exports.querySchemas.search,
    dateRangeQuery: exports.querySchemas.dateRange
};
