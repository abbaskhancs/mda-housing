export interface ClearanceResult {
    clearance: any;
    autoTransition?: {
        fromStage: any;
        toStage: any;
        guard: string;
        guardResult: any;
    };
}
export declare const createClearance: (applicationId: string, sectionId: string, statusId: string, remarks: string | null, userId: string, signedPdfUrl?: string, userRole?: string) => Promise<ClearanceResult>;
export declare const getClearancesByApplication: (applicationId: string) => Promise<({
    status: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string;
        sortOrder: number;
    };
    section: {
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
    remarks: string | null;
    sectionId: string;
    statusId: string;
    signedPdfUrl: string | null;
    applicationId: string;
    clearedAt: Date | null;
})[]>;
export declare const getClearanceById: (clearanceId: string) => Promise<({
    status: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string;
        sortOrder: number;
    };
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
    section: {
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
    remarks: string | null;
    sectionId: string;
    statusId: string;
    signedPdfUrl: string | null;
    applicationId: string;
    clearedAt: Date | null;
}) | null>;
