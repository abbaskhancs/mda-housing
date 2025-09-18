import { z } from 'zod';
export declare const authSchemas: {
    login: z.ZodObject<{
        username: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        username: string;
        password: string;
    }, {
        username: string;
        password: string;
    }>;
    register: z.ZodObject<{
        username: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
        role: z.ZodEnum<["OWO", "BCA", "HOUSING", "ACCOUNTS", "WATER", "APPROVER", "ADMIN"]>;
    }, "strip", z.ZodTypeAny, {
        username: string;
        email: string;
        password: string;
        role: "OWO" | "BCA" | "HOUSING" | "ACCOUNTS" | "WATER" | "APPROVER" | "ADMIN";
    }, {
        username: string;
        email: string;
        password: string;
        role: "OWO" | "BCA" | "HOUSING" | "ACCOUNTS" | "WATER" | "APPROVER" | "ADMIN";
    }>;
    changePassword: z.ZodObject<{
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        currentPassword: string;
        newPassword: string;
    }, {
        currentPassword: string;
        newPassword: string;
    }>;
    updateProfile: z.ZodObject<{
        email: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email?: string | undefined;
    }, {
        email?: string | undefined;
    }>;
};
export declare const personSchemas: {
    create: z.ZodObject<{
        cnic: z.ZodString;
        name: z.ZodString;
        fatherName: z.ZodString;
        address: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        cnic: string;
        fatherName: string;
        email?: string | undefined;
        address?: string | undefined;
        phone?: string | undefined;
    }, {
        name: string;
        cnic: string;
        fatherName: string;
        email?: string | undefined;
        address?: string | undefined;
        phone?: string | undefined;
    }>;
    update: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        fatherName: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email?: string | undefined;
        name?: string | undefined;
        fatherName?: string | undefined;
        address?: string | undefined;
        phone?: string | undefined;
    }, {
        email?: string | undefined;
        name?: string | undefined;
        fatherName?: string | undefined;
        address?: string | undefined;
        phone?: string | undefined;
    }>;
    getById: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
};
export declare const plotSchemas: {
    create: z.ZodObject<{
        plotNumber: z.ZodString;
        blockNumber: z.ZodOptional<z.ZodString>;
        sectorNumber: z.ZodOptional<z.ZodString>;
        area: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        location: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        plotNumber: string;
        blockNumber?: string | undefined;
        sectorNumber?: string | undefined;
        area?: number | undefined;
        location?: string | undefined;
    }, {
        plotNumber: string;
        blockNumber?: string | undefined;
        sectorNumber?: string | undefined;
        area?: string | undefined;
        location?: string | undefined;
    }>;
    update: z.ZodObject<{
        blockNumber: z.ZodOptional<z.ZodString>;
        sectorNumber: z.ZodOptional<z.ZodString>;
        area: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        location: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        blockNumber?: string | undefined;
        sectorNumber?: string | undefined;
        area?: number | undefined;
        location?: string | undefined;
    }, {
        blockNumber?: string | undefined;
        sectorNumber?: string | undefined;
        area?: string | undefined;
        location?: string | undefined;
    }>;
    getById: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
};
export declare const applicationSchemas: {
    create: z.ZodObject<{
        sellerId: z.ZodString;
        buyerId: z.ZodString;
        attorneyId: z.ZodOptional<z.ZodString>;
        plotId: z.ZodString;
        waterNocRequired: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        sellerId: string;
        buyerId: string;
        plotId: string;
        waterNocRequired: boolean;
        attorneyId?: string | undefined;
    }, {
        sellerId: string;
        buyerId: string;
        plotId: string;
        attorneyId?: string | undefined;
        waterNocRequired?: boolean | undefined;
    }>;
    update: z.ZodObject<{
        attorneyId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        attorneyId?: string | undefined;
    }, {
        attorneyId?: string | undefined;
    }>;
    getById: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    getByStage: z.ZodObject<{
        stage: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        stage: string;
    }, {
        stage: string;
    }>;
    transition: z.ZodObject<{
        toStageId: z.ZodString;
        remarks: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        toStageId: string;
        remarks?: string | undefined;
    }, {
        toStageId: string;
        remarks?: string | undefined;
    }>;
    clearance: z.ZodObject<{
        sectionId: z.ZodString;
        statusId: z.ZodString;
        remarks: z.ZodOptional<z.ZodString>;
        signedPdfUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sectionId: string;
        statusId: string;
        remarks?: string | undefined;
        signedPdfUrl?: string | undefined;
    }, {
        sectionId: string;
        statusId: string;
        remarks?: string | undefined;
        signedPdfUrl?: string | undefined;
    }>;
};
export declare const attachmentSchemas: {
    upload: z.ZodObject<{
        docType: z.ZodEnum<["AllotmentLetter", "PrevTransferDeed", "AttorneyDeed", "GiftDeed", "CNIC_Seller", "CNIC_Buyer", "CNIC_Attorney", "UtilityBill_Latest", "NOC_BuiltStructure", "Photo_Seller", "Photo_Buyer", "PrevChallan", "NOC_Water"]>;
        isOriginalSeen: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        docType: "AllotmentLetter" | "PrevTransferDeed" | "AttorneyDeed" | "GiftDeed" | "CNIC_Seller" | "CNIC_Buyer" | "CNIC_Attorney" | "UtilityBill_Latest" | "NOC_BuiltStructure" | "Photo_Seller" | "Photo_Buyer" | "PrevChallan" | "NOC_Water";
        isOriginalSeen: boolean;
    }, {
        docType: "AllotmentLetter" | "PrevTransferDeed" | "AttorneyDeed" | "GiftDeed" | "CNIC_Seller" | "CNIC_Buyer" | "CNIC_Attorney" | "UtilityBill_Latest" | "NOC_BuiltStructure" | "Photo_Seller" | "Photo_Buyer" | "PrevChallan" | "NOC_Water";
        isOriginalSeen?: boolean | undefined;
    }>;
    getById: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    markOriginalSeen: z.ZodObject<{
        isOriginalSeen: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        isOriginalSeen: boolean;
    }, {
        isOriginalSeen: boolean;
    }>;
    update: z.ZodObject<{
        isOriginalSeen: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        isOriginalSeen: boolean;
    }, {
        isOriginalSeen: boolean;
    }>;
};
export declare const clearanceSchemas: {
    create: z.ZodObject<{
        sectionId: z.ZodString;
        statusId: z.ZodString;
        remarks: z.ZodOptional<z.ZodString>;
        signedPdfUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sectionId: string;
        statusId: string;
        remarks?: string | undefined;
        signedPdfUrl?: string | undefined;
    }, {
        sectionId: string;
        statusId: string;
        remarks?: string | undefined;
        signedPdfUrl?: string | undefined;
    }>;
    update: z.ZodObject<{
        statusId: z.ZodOptional<z.ZodString>;
        remarks: z.ZodOptional<z.ZodString>;
        signedPdfUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        remarks?: string | undefined;
        statusId?: string | undefined;
        signedPdfUrl?: string | undefined;
    }, {
        remarks?: string | undefined;
        statusId?: string | undefined;
        signedPdfUrl?: string | undefined;
    }>;
    getById: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
};
export declare const accountsSchemas: {
    create: z.ZodObject<{
        arrears: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        surcharge: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        nonUser: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        transferFee: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        attorneyFee: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        water: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        suiGas: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        additional: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
    }, "strip", z.ZodTypeAny, {
        arrears?: number | undefined;
        surcharge?: number | undefined;
        nonUser?: number | undefined;
        transferFee?: number | undefined;
        attorneyFee?: number | undefined;
        water?: number | undefined;
        suiGas?: number | undefined;
        additional?: number | undefined;
    }, {
        arrears?: string | undefined;
        surcharge?: string | undefined;
        nonUser?: string | undefined;
        transferFee?: string | undefined;
        attorneyFee?: string | undefined;
        water?: string | undefined;
        suiGas?: string | undefined;
        additional?: string | undefined;
    }>;
    update: z.ZodObject<{
        arrears: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        surcharge: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        nonUser: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        transferFee: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        attorneyFee: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        water: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        suiGas: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        additional: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        paidAmount: z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
        challanUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        arrears?: number | undefined;
        surcharge?: number | undefined;
        nonUser?: number | undefined;
        transferFee?: number | undefined;
        attorneyFee?: number | undefined;
        water?: number | undefined;
        suiGas?: number | undefined;
        additional?: number | undefined;
        paidAmount?: number | undefined;
        challanUrl?: string | undefined;
    }, {
        arrears?: string | undefined;
        surcharge?: string | undefined;
        nonUser?: string | undefined;
        transferFee?: string | undefined;
        attorneyFee?: string | undefined;
        water?: string | undefined;
        suiGas?: string | undefined;
        additional?: string | undefined;
        paidAmount?: string | undefined;
        challanUrl?: string | undefined;
    }>;
    verifyPayment: z.ZodObject<{
        paidAmount: z.ZodEffects<z.ZodString, number, string>;
        challanUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        paidAmount: number;
        challanUrl?: string | undefined;
    }, {
        paidAmount: string;
        challanUrl?: string | undefined;
    }>;
    getById: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    generateChallan: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
};
export declare const reviewSchemas: {
    create: z.ZodObject<{
        sectionId: z.ZodString;
        remarks: z.ZodOptional<z.ZodString>;
        status: z.ZodDefault<z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>>;
    }, "strip", z.ZodTypeAny, {
        status: "APPROVED" | "REJECTED" | "PENDING";
        sectionId: string;
        remarks?: string | undefined;
    }, {
        sectionId: string;
        status?: "APPROVED" | "REJECTED" | "PENDING" | undefined;
        remarks?: string | undefined;
    }>;
    update: z.ZodObject<{
        remarks: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>>;
    }, "strip", z.ZodTypeAny, {
        status?: "APPROVED" | "REJECTED" | "PENDING" | undefined;
        remarks?: string | undefined;
    }, {
        status?: "APPROVED" | "REJECTED" | "PENDING" | undefined;
        remarks?: string | undefined;
    }>;
    getById: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
};
export declare const transferDeedSchemas: {
    create: z.ZodObject<{
        witness1Id: z.ZodString;
        witness2Id: z.ZodString;
        deedContent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        witness1Id: string;
        witness2Id: string;
        deedContent?: string | undefined;
    }, {
        witness1Id: string;
        witness2Id: string;
        deedContent?: string | undefined;
    }>;
    update: z.ZodObject<{
        witness1Id: z.ZodOptional<z.ZodString>;
        witness2Id: z.ZodOptional<z.ZodString>;
        deedContent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        witness1Id?: string | undefined;
        witness2Id?: string | undefined;
        deedContent?: string | undefined;
    }, {
        witness1Id?: string | undefined;
        witness2Id?: string | undefined;
        deedContent?: string | undefined;
    }>;
    finalize: z.ZodObject<{
        witness1Signature: z.ZodString;
        witness2Signature: z.ZodString;
        finalPdfUrl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        witness1Signature: string;
        witness2Signature: string;
        finalPdfUrl: string;
    }, {
        witness1Signature: string;
        witness2Signature: string;
        finalPdfUrl: string;
    }>;
    getById: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
};
export declare const workflowSchemas: {
    getTransitions: z.ZodObject<{
        from: z.ZodOptional<z.ZodString>;
        to: z.ZodOptional<z.ZodString>;
        applicationId: z.ZodOptional<z.ZodString>;
        dryRun: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
    }, "strip", z.ZodTypeAny, {
        from?: string | undefined;
        to?: string | undefined;
        applicationId?: string | undefined;
        dryRun?: "true" | "false" | undefined;
    }, {
        from?: string | undefined;
        to?: string | undefined;
        applicationId?: string | undefined;
        dryRun?: "true" | "false" | undefined;
    }>;
    getStages: z.ZodObject<{
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        sortOrder: "asc" | "desc";
    }, {
        sortOrder?: "asc" | "desc" | undefined;
    }>;
    getSections: z.ZodObject<{
        group: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        group?: string | undefined;
    }, {
        group?: string | undefined;
    }>;
    getStatuses: z.ZodObject<{
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        sortOrder: "asc" | "desc";
    }, {
        sortOrder?: "asc" | "desc" | undefined;
    }>;
};
export declare const querySchemas: {
    pagination: z.ZodObject<{
        page: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
        limit: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
    }, {
        page?: string | undefined;
        limit?: string | undefined;
    }>;
    search: z.ZodObject<{
        q: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        q: string;
    }, {
        q: string;
    }>;
    dateRange: z.ZodObject<{
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        startDate?: string | undefined;
        endDate?: string | undefined;
    }, {
        startDate?: string | undefined;
        endDate?: string | undefined;
    }>;
};
export declare const commonSchemas: {
    idParam: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    applicationIdParam: z.ZodObject<{
        applicationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        applicationId: string;
    }, {
        applicationId: string;
    }>;
    paginationQuery: z.ZodObject<{
        page: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
        limit: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
    }, {
        page?: string | undefined;
        limit?: string | undefined;
    }>;
    searchQuery: z.ZodObject<{
        q: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        q: string;
    }, {
        q: string;
    }>;
    dateRangeQuery: z.ZodObject<{
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        startDate?: string | undefined;
        endDate?: string | undefined;
    }, {
        startDate?: string | undefined;
        endDate?: string | undefined;
    }>;
};
