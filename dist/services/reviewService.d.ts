export interface ReviewResult {
    review: any;
    autoTransition?: {
        fromStage: any;
        toStage: any;
        guard: string;
        guardResult: any;
    };
}
export declare const createReview: (applicationId: string, sectionId: string, reviewerId: string, remarks: string | null, status: "PENDING" | "APPROVED" | "REJECTED", autoTransition?: boolean) => Promise<ReviewResult>;
export declare const updateReview: (reviewId: string, reviewerId: string, remarks: string | null, status: "PENDING" | "APPROVED" | "REJECTED", autoTransition?: boolean) => Promise<ReviewResult>;
export declare const getReviewsByApplication: (applicationId: string) => Promise<({
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
    status: string;
    remarks: string | null;
    sectionId: string;
    applicationId: string;
    reviewerId: string;
    reviewedAt: Date | null;
})[]>;
export declare const getReviewById: (reviewId: string) => Promise<({
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
    status: string;
    remarks: string | null;
    sectionId: string;
    applicationId: string;
    reviewerId: string;
    reviewedAt: Date | null;
}) | null>;
export declare const getReviewsBySection: (applicationId: string, sectionCode: string) => Promise<({
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
    status: string;
    remarks: string | null;
    sectionId: string;
    applicationId: string;
    reviewerId: string;
    reviewedAt: Date | null;
})[]>;
