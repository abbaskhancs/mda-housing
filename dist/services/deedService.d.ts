export interface DeedResult {
    transferDeed: any;
    stageTransition?: {
        fromStage: any;
        toStage: any;
        guard: string;
        guardResult: any;
    };
    autoTransition?: {
        fromStage: any;
        toStage: any;
        guard: string;
        guardResult: any;
    };
    ownershipTransferred?: boolean;
}
export declare const createDeedDraft: (applicationId: string, witness1Id: string, witness2Id: string, deedContent: string | null, userId: string) => Promise<DeedResult>;
export declare const finalizeDeed: (applicationId: string, witness1Signature: string, witness2Signature: string, finalPdfUrl: string, userId: string) => Promise<DeedResult>;
export declare const getTransferDeed: (applicationId: string) => Promise<({
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
    witness1: {
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
    witness2: {
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
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    witness1Id: string;
    witness2Id: string;
    deedContent: string | null;
    finalPdfUrl: string | null;
    applicationId: string;
    hashSha256: string | null;
    deedPdfUrl: string | null;
    isFinalized: boolean;
    finalizedAt: Date | null;
    sellerPhotoUrl: string | null;
    buyerPhotoUrl: string | null;
    witness1PhotoUrl: string | null;
    witness2PhotoUrl: string | null;
    sellerSignatureUrl: string | null;
    buyerSignatureUrl: string | null;
    witness1SignatureUrl: string | null;
    witness2SignatureUrl: string | null;
}) | null>;
export declare const updateDeedDraft: (applicationId: string, witness1Id: string | null, witness2Id: string | null, deedContent: string | null, userId: string) => Promise<DeedResult>;
