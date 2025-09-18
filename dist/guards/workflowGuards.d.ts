export interface GuardContext {
    applicationId: string;
    userId: string;
    userRole: string;
    fromStageId: string;
    toStageId: string;
    additionalData?: any;
}
export interface GuardResult {
    canTransition: boolean;
    reason?: string;
    metadata?: any;
}
export type GuardFunction = (context: GuardContext) => Promise<GuardResult>;
/**
 * GUARD_INTAKE_COMPLETE: Check if all required documents are uploaded and marked as original seen
 */
export declare const GUARD_INTAKE_COMPLETE: GuardFunction;
/**
 * GUARD_SCRUTINY_COMPLETE: Check if OWO has completed initial scrutiny
 */
export declare const GUARD_SCRUTINY_COMPLETE: GuardFunction;
/**
 * GUARD_BCA_CLEAR: Check if BCA clearance is obtained
 */
export declare const GUARD_BCA_CLEAR: GuardFunction;
/**
 * GUARD_BCA_OBJECTION: Check if BCA has raised an objection
 */
export declare const GUARD_BCA_OBJECTION: GuardFunction;
/**
 * GUARD_HOUSING_CLEAR: Check if Housing clearance is obtained
 */
export declare const GUARD_HOUSING_CLEAR: GuardFunction;
/**
 * GUARD_HOUSING_OBJECTION: Check if Housing has raised an objection
 */
export declare const GUARD_HOUSING_OBJECTION: GuardFunction;
/**
 * GUARD_CLEARANCES_COMPLETE: Check if both BCA and Housing clearances are obtained
 */
export declare const GUARD_CLEARANCES_COMPLETE: GuardFunction;
/**
 * GUARD_BCA_RESOLVED: Check if BCA objection has been resolved
 */
export declare const GUARD_BCA_RESOLVED: GuardFunction;
/**
 * GUARD_HOUSING_RESOLVED: Check if Housing objection has been resolved
 */
export declare const GUARD_HOUSING_RESOLVED: GuardFunction;
/**
 * GUARD_BCA_HOUSING_REVIEW: Check if BCA and Housing clearances are ready for OWO review
 */
export declare const GUARD_BCA_HOUSING_REVIEW: GuardFunction;
/**
 * GUARD_OWO_REVIEW_COMPLETE: Check if OWO review for BCA/Housing is complete
 */
export declare const GUARD_OWO_REVIEW_COMPLETE: GuardFunction;
/**
 * GUARD_ACCOUNTS_CALCULATED: Check if accounts breakdown has been calculated
 */
export declare const GUARD_ACCOUNTS_CALCULATED: GuardFunction;
/**
 * GUARD_PAYMENT_VERIFIED: Check if payment has been verified
 */
export declare const GUARD_PAYMENT_VERIFIED: GuardFunction;
/**
 * GUARD_ACCOUNTS_CLEAR: Check if payment has been verified and accounts clearance is complete
 */
export declare const GUARD_ACCOUNTS_CLEAR: GuardFunction;
/**
 * GUARD_APPROVAL_COMPLETE: Check if approval has been completed
 */
export declare const GUARD_APPROVAL_COMPLETE: GuardFunction;
/**
 * GUARD_APPROVAL_REJECTED: Check if approval has been rejected
 */
export declare const GUARD_APPROVAL_REJECTED: GuardFunction;
/**
 * GUARD_SENT_TO_ACCOUNTS: Create pending clearance for Accounts when transitioning to SENT_TO_ACCOUNTS
 */
export declare const GUARD_SENT_TO_ACCOUNTS: GuardFunction;
/**
 * GUARD_SENT_TO_BCA_HOUSING: Create pending clearances for BCA and Housing when transitioning to SENT_TO_BCA_HOUSING
 */
export declare const GUARD_SENT_TO_BCA_HOUSING: GuardFunction;
/**
 * GUARD_DEED_FINALIZED: Check if transfer deed has been finalized
 */
export declare const GUARD_DEED_FINALIZED: GuardFunction;
/**
 * GUARD_ACCOUNTS_REVIEWED: Check if accounts have been reviewed by OWO
 */
export declare const GUARD_ACCOUNTS_REVIEWED: GuardFunction;
/**
 * GUARD_OWO_ACCOUNTS_REVIEW_COMPLETE: Check if OWO review for Accounts is complete
 */
export declare const GUARD_OWO_ACCOUNTS_REVIEW_COMPLETE: GuardFunction;
/**
 * GUARDS map - Central registry of all workflow guards
 */
export declare const GUARDS: Record<string, GuardFunction>;
/**
 * Execute a guard function by name
 */
export declare const executeGuard: (guardName: string, context: GuardContext) => Promise<GuardResult>;
/**
 * Get all available guard names
 */
export declare const getAvailableGuards: () => string[];
/**
 * Validate guard context
 */
export declare const validateGuardContext: (context: GuardContext) => boolean;
/**
 * Get guard description by name
 */
export declare const getGuardDescription: (guardName: string) => string;
