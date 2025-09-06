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
 * GUARD_ACCOUNTS_CALCULATED: Check if accounts breakdown has been calculated
 */
export declare const GUARD_ACCOUNTS_CALCULATED: GuardFunction;
/**
 * GUARD_PAYMENT_VERIFIED: Check if payment has been verified
 */
export declare const GUARD_PAYMENT_VERIFIED: GuardFunction;
/**
 * GUARD_APPROVAL_COMPLETE: Check if approval has been completed
 */
export declare const GUARD_APPROVAL_COMPLETE: GuardFunction;
/**
 * GUARD_APPROVAL_REJECTED: Check if approval has been rejected
 */
export declare const GUARD_APPROVAL_REJECTED: GuardFunction;
/**
 * GUARD_DEED_FINALIZED: Check if transfer deed has been finalized
 */
export declare const GUARD_DEED_FINALIZED: GuardFunction;
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
