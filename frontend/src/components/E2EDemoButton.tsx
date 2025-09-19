"use client";

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { PlayIcon, StopIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface E2EDemoButtonProps {
  applicationId: string;
  currentStage: string;
  onTransition: () => void;
}

interface DemoStep {
  stage: string;
  name: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

const DEMO_WORKFLOW_STEPS: Omit<DemoStep, 'status'>[] = [
  { stage: 'UNDER_SCRUTINY', name: 'Under Scrutiny', action: 'Complete intake review' },
  { stage: 'SENT_TO_BCA_HOUSING', name: 'Sent to BCA & Housing', action: 'Send for clearances' },
  { stage: 'BCA_HOUSING_CLEAR', name: 'BCA & Housing Clear', action: 'Generate clearance PDFs' },
  { stage: 'OWO_REVIEW_BCA_HOUSING', name: 'OWO Review - BCA & Housing', action: 'Review clearances' },
  { stage: 'SENT_TO_ACCOUNTS', name: 'Sent to Accounts', action: 'Send to accounts' },
  { stage: 'ACCOUNTS_CLEAR', name: 'Accounts Clear', action: 'Calculate fees and verify payment' },
  { stage: 'OWO_REVIEW_ACCOUNTS', name: 'OWO Review - Accounts', action: 'Review accounts' },
  { stage: 'READY_FOR_APPROVAL', name: 'Ready for Approval', action: 'Prepare for approval' },
  { stage: 'APPROVED', name: 'Approved', action: 'Approve application' },
  { stage: 'POST_ENTRIES', name: 'Post-Entries', action: 'Create transfer deed' },
  { stage: 'CLOSED', name: 'Closed', action: 'Close case' },
];

export default function E2EDemoButton({ applicationId, currentStage, onTransition }: E2EDemoButtonProps) {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [steps, setSteps] = useState<DemoStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // Only show for ADMIN users
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const initializeSteps = () => {
    // Find the current stage index and create steps from there
    const currentIndex = DEMO_WORKFLOW_STEPS.findIndex(step => step.stage === currentStage);
    const remainingSteps = currentIndex >= 0 
      ? DEMO_WORKFLOW_STEPS.slice(currentIndex + 1)
      : DEMO_WORKFLOW_STEPS;

    return remainingSteps.map(step => ({
      ...step,
      status: 'pending' as const
    }));
  };

  const updateStepStatus = (index: number, status: DemoStep['status'], error?: string) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status, error } : step
    ));
  };

  const generatePlaceholderData = async (stage: string) => {
    // Generate placeholder data based on stage requirements
    switch (stage) {
      case 'SENT_TO_BCA_HOUSING':
        // No specific data needed, just transition
        break;

      case 'BCA_HOUSING_CLEAR':
        // Generate BCA and Housing clearance PDFs
        try {
          await apiService.generateBCAClearancePDF(applicationId);
          await apiService.generateHousingClearancePDF(applicationId);
        } catch (error) {
          console.warn('Could not generate clearance PDFs:', error);
        }
        break;

      case 'SENT_TO_ACCOUNTS':
        // No specific data needed, just transition
        break;

      case 'ACCOUNTS_CLEAR':
        // Generate accounts breakdown and challan
        try {
          // Create a basic fee structure
          const feeHeads = {
            transferFee: { amount: 5000, description: 'Transfer Fee' },
            processingFee: { amount: 2000, description: 'Processing Fee' },
            stampDuty: { amount: 10000, description: 'Stamp Duty' }
          };
          await apiService.updateAccountsBreakdown(applicationId, feeHeads);
          await apiService.generateChallan(applicationId);

          // Simulate payment verification
          await apiService.verifyPayment(applicationId, `CH${Date.now()}`, 17000, 'E2E Demo Payment');
        } catch (error) {
          console.warn('Could not generate accounts data:', error);
        }
        break;

      case 'APPROVED':
        // Create transfer deed with placeholder witnesses and signatures
        try {
          // Create deed draft with placeholder witnesses
          await apiService.createDeedDraft(
            applicationId,
            'witness1-placeholder',
            'witness2-placeholder',
            'Auto-generated transfer deed content for E2E demo'
          );

          // Finalize deed with placeholder signatures
          await apiService.finalizeDeed(
            applicationId,
            'placeholder-witness1-signature',
            'placeholder-witness2-signature'
          );
        } catch (error) {
          console.warn('Could not create transfer deed:', error);
        }
        break;

      default:
        // No specific data needed for other stages
        break;
    }
  };

  const executeStep = async (stepIndex: number): Promise<boolean> => {
    const step = steps[stepIndex];
    updateStepStatus(stepIndex, 'running');

    try {
      // Generate placeholder data first
      await generatePlaceholderData(step.stage);

      // Get the stage ID
      const stagesResponse = await apiService.getWorkflowStages();
      if (!stagesResponse.success || !stagesResponse.data) {
        throw new Error('Could not fetch workflow stages');
      }

      const targetStage = stagesResponse.data.stages.find(s => s.code === step.stage);
      if (!targetStage) {
        throw new Error(`Stage ${step.stage} not found`);
      }

      // Execute the transition
      const transitionResponse = await apiService.transitionApplication(
        applicationId, 
        targetStage.id, 
        `E2E Demo: ${step.action}`
      );

      if (!transitionResponse.success) {
        throw new Error(transitionResponse.error || 'Transition failed');
      }

      updateStepStatus(stepIndex, 'completed');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateStepStatus(stepIndex, 'failed', errorMessage);
      return false;
    }
  };

  const runDemo = async () => {
    if (isRunning) return;

    const demoSteps = initializeSteps();
    if (demoSteps.length === 0) {
      alert('Application is already at the final stage or no steps available.');
      return;
    }

    setSteps(demoSteps);
    setIsRunning(true);
    setShowModal(true);
    setCurrentStepIndex(0);

    // Execute steps sequentially
    for (let i = 0; i < demoSteps.length; i++) {
      setCurrentStepIndex(i);
      
      // Add delay between steps for better UX
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const success = await executeStep(i);
      
      if (!success) {
        // Stop on first failure
        break;
      }

      // Refresh application data after each successful step
      onTransition();
      
      // Add delay after successful step
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    setCurrentStepIndex(-1);
  };

  const stopDemo = () => {
    setIsRunning(false);
    setCurrentStepIndex(-1);
  };

  const closeModal = () => {
    if (!isRunning) {
      setShowModal(false);
      setSteps([]);
    }
  };

  return (
    <>
      <button
        onClick={runDemo}
        disabled={isRunning}
        className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        title="Developer Only: Run complete E2E workflow demo"
      >
        {isRunning ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Running E2E Demo...</span>
          </>
        ) : (
          <>
            <PlayIcon className="h-4 w-4" />
            <span>Run E2E Demo</span>
          </>
        )}
      </button>

      {/* Demo Progress Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                E2E Workflow Demo Progress
              </h3>
              <div className="flex space-x-2">
                {isRunning && (
                  <button
                    onClick={stopDemo}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center space-x-1"
                  >
                    <StopIcon className="h-4 w-4" />
                    <span>Stop</span>
                  </button>
                )}
                <button
                  onClick={closeModal}
                  disabled={isRunning}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {steps.map((step, index) => (
                <div
                  key={step.stage}
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${
                    index === currentStepIndex
                      ? 'bg-blue-50 border-blue-200'
                      : step.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : step.status === 'failed'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {step.status === 'running' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    ) : step.status === 'completed' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : step.status === 'failed' ? (
                      <XCircleIcon className="h-5 w-5 text-red-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{step.name}</p>
                    <p className="text-sm text-gray-500">{step.action}</p>
                    {step.error && (
                      <p className="text-sm text-red-600 mt-1">{step.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {steps.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <PlayIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Click "Run E2E Demo" to start the automated workflow</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
