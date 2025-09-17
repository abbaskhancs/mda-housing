export interface WorkflowTransitionResult {
    success: boolean;
    error?: string;
    application?: any;
    transition?: {
        fromStage: any;
        toStage: any;
        guard: string;
        guardResult: any;
    };
}
/**
 * Execute a workflow transition for an application
 */
export declare const executeWorkflowTransition: (applicationId: string, toStageCode: string, userId: string, userRole: string, additionalData?: Record<string, any>) => Promise<WorkflowTransitionResult>;
/**
 * Get available transitions for an application
 */
export declare const getAvailableTransitions: (applicationId: string) => Promise<any[]>;
/**
 * Check if a specific transition is available for an application
 */
export declare const isTransitionAvailable: (applicationId: string, toStageCode: string, userId: string, userRole: string) => Promise<boolean>;
