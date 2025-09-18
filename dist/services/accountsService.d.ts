export interface AccountsResult {
    accountsBreakdown: any;
    autoTransition?: {
        fromStage: any;
        toStage: any;
        guard: string;
        guardResult: any;
    };
    clearanceCreated?: any;
}
export interface FeeHeads {
    arrears: number;
    surcharge: number;
    nonUser: number;
    transferFee: number;
    attorneyFee: number;
    water: number;
    suiGas: number;
    additional: number;
}
export declare const upsertAccountsBreakdown: (applicationId: string, feeHeads: FeeHeads, challanNo?: string, challanDate?: Date, userId?: string) => Promise<AccountsResult>;
export declare const verifyPayment: (applicationId: string, paidAmount: number, challanUrl: string | null, userId: string) => Promise<AccountsResult>;
export declare const generateChallan: (applicationId: string, userId: string) => Promise<{
    accountsBreakdown: any;
    challanNo: string;
    challanDate: Date;
}>;
export declare const getAccountsBreakdown: (applicationId: string) => Promise<({
    application: {
        seller: {
            id: string;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            cnic: string;
            fatherName: string | null;
            address: string | null;
            phone: string | null;
        };
        buyer: {
            id: string;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            cnic: string;
            fatherName: string | null;
            address: string | null;
            phone: string | null;
        };
        plot: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            plotNumber: string;
            blockNumber: string | null;
            sectorNumber: string | null;
            area: import("@prisma/client/runtime/library").Decimal | null;
            location: string | null;
            currentOwnerId: string | null;
        };
        currentStage: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            sortOrder: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        sellerId: string;
        buyerId: string;
        attorneyId: string | null;
        plotId: string;
        applicationNumber: string;
        currentStageId: string;
        previousStageId: string | null;
        submittedAt: Date;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    arrears: import("@prisma/client/runtime/library").Decimal;
    surcharge: import("@prisma/client/runtime/library").Decimal;
    nonUser: import("@prisma/client/runtime/library").Decimal;
    transferFee: import("@prisma/client/runtime/library").Decimal;
    attorneyFee: import("@prisma/client/runtime/library").Decimal;
    water: import("@prisma/client/runtime/library").Decimal;
    suiGas: import("@prisma/client/runtime/library").Decimal;
    additional: import("@prisma/client/runtime/library").Decimal;
    paidAmount: import("@prisma/client/runtime/library").Decimal;
    challanUrl: string | null;
    applicationId: string;
    verifiedAt: Date | null;
    totalAmount: import("@prisma/client/runtime/library").Decimal;
    totalAmountWords: string | null;
    remainingAmount: import("@prisma/client/runtime/library").Decimal;
    challanNo: string | null;
    challanDate: Date | null;
    paymentVerified: boolean;
    accountsStatus: string | null;
    objectionReason: string | null;
    objectionDate: Date | null;
    resolvedDate: Date | null;
}) | null>;
