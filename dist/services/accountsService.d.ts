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
export declare const upsertAccountsBreakdown: (applicationId: string, totalAmount: number, challanUrl: string | null, userId: string) => Promise<AccountsResult>;
export declare const verifyPayment: (applicationId: string, paidAmount: number, challanUrl: string | null, userId: string) => Promise<AccountsResult>;
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
    totalAmount: import("@prisma/client/runtime/library").Decimal;
    challanUrl: string | null;
    paidAmount: import("@prisma/client/runtime/library").Decimal;
    applicationId: string;
    remainingAmount: import("@prisma/client/runtime/library").Decimal;
    paymentVerified: boolean;
    verifiedAt: Date | null;
}) | null>;
