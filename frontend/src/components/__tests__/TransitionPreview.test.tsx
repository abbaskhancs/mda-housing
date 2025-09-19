import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TransitionPreview } from '../TransitionPreview';
import { apiService } from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    getWorkflowTransitions: jest.fn(),
  }
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('TransitionPreview', () => {
  const defaultProps = {
    applicationId: 'test-app-id',
    currentStageCode: 'SUBMITTED'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the "What\'s next?" trigger button', () => {
    mockApiService.getWorkflowTransitions.mockResolvedValue({
      success: true,
      data: []
    });

    render(<TransitionPreview {...defaultProps} />);

    expect(screen.getByText("What's next?")).toBeInTheDocument();
    expect(screen.getByTitle('View available next steps')).toBeInTheDocument();
  });

  it('should show loading state when fetching transitions', async () => {
    mockApiService.getWorkflowTransitions.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100))
    );

    render(<TransitionPreview {...defaultProps} />);

    // Click the trigger to open popover
    fireEvent.click(screen.getByText("What's next?"));

    await waitFor(() => {
      expect(screen.getByText('Loading transitions...')).toBeInTheDocument();
    });
  });

  it('should display available transitions with enabled state', async () => {
    const mockTransitions = [
      {
        id: '1',
        fromStageId: 'stage1',
        toStageId: 'stage2',
        guardName: 'GUARD_TEST',
        fromStage: { id: 'stage1', code: 'SUBMITTED', name: 'Submitted' },
        toStage: { id: 'stage2', code: 'UNDER_SCRUTINY', name: 'Under Scrutiny' },
        canTransition: true,
        reason: 'All requirements met'
      },
      {
        id: '2',
        fromStageId: 'stage1',
        toStageId: 'stage3',
        guardName: 'GUARD_TEST_2',
        fromStage: { id: 'stage1', code: 'SUBMITTED', name: 'Submitted' },
        toStage: { id: 'stage3', code: 'REJECTED', name: 'Rejected' },
        canTransition: true,
        reason: 'Can reject if issues found'
      }
    ];

    mockApiService.getWorkflowTransitions.mockResolvedValue({
      success: true,
      data: mockTransitions
    });

    render(<TransitionPreview {...defaultProps} />);

    // Click the trigger to open popover
    fireEvent.click(screen.getByText("What's next?"));

    await waitFor(() => {
      expect(screen.getByText('Available Next Steps')).toBeInTheDocument();
      expect(screen.getByText('Under Scrutiny')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
      expect(screen.getAllByText('Available')).toHaveLength(2);
    });

    // Check that reasons are displayed
    expect(screen.getByText('All requirements met')).toBeInTheDocument();
    expect(screen.getByText('Can reject if issues found')).toBeInTheDocument();
  });

  it('should display blocked transitions with reasons', async () => {
    const mockTransitions = [
      {
        id: '1',
        fromStageId: 'stage1',
        toStageId: 'stage2',
        guardName: 'GUARD_INTAKE_COMPLETE',
        fromStage: { id: 'stage1', code: 'SUBMITTED', name: 'Submitted' },
        toStage: { id: 'stage2', code: 'UNDER_SCRUTINY', name: 'Under Scrutiny' },
        canTransition: false,
        reason: 'Missing required documents: AllotmentLetter, CNIC_Seller'
      }
    ];

    mockApiService.getWorkflowTransitions.mockResolvedValue({
      success: true,
      data: mockTransitions
    });

    render(<TransitionPreview {...defaultProps} />);

    // Click the trigger to open popover
    fireEvent.click(screen.getByText("What's next?"));

    await waitFor(() => {
      expect(screen.getByText('Available Next Steps')).toBeInTheDocument();
      expect(screen.getByText('Under Scrutiny')).toBeInTheDocument();
      expect(screen.getByText('Blocked')).toBeInTheDocument();
    });

    // Check that the blocking reason is displayed
    expect(screen.getByText('Missing required documents: AllotmentLetter, CNIC_Seller')).toBeInTheDocument();
  });

  it('should show error state when API call fails', async () => {
    mockApiService.getWorkflowTransitions.mockResolvedValue({
      success: false,
      error: 'Failed to fetch transitions'
    });

    render(<TransitionPreview {...defaultProps} />);

    // Click the trigger to open popover
    fireEvent.click(screen.getByText("What's next?"));

    await waitFor(() => {
      expect(screen.getByText('Error loading transitions')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch transitions')).toBeInTheDocument();
    });
  });

  it('should show no transitions message when no transitions are available', async () => {
    mockApiService.getWorkflowTransitions.mockResolvedValue({
      success: true,
      data: []
    });

    render(<TransitionPreview {...defaultProps} />);

    // Click the trigger to open popover
    fireEvent.click(screen.getByText("What's next?"));

    await waitFor(() => {
      expect(screen.getByText('No transitions available')).toBeInTheDocument();
      expect(screen.getByText('This stage may be a terminal state')).toBeInTheDocument();
    });
  });

  it('should call API with correct parameters', async () => {
    mockApiService.getWorkflowTransitions.mockResolvedValue({
      success: true,
      data: []
    });

    render(<TransitionPreview {...defaultProps} />);

    await waitFor(() => {
      expect(mockApiService.getWorkflowTransitions).toHaveBeenCalledWith(
        'SUBMITTED',
        'test-app-id'
      );
    });
  });

  it('should display guard names for debugging', async () => {
    const mockTransitions = [
      {
        id: '1',
        fromStageId: 'stage1',
        toStageId: 'stage2',
        guardName: 'GUARD_INTAKE_COMPLETE',
        fromStage: { id: 'stage1', code: 'SUBMITTED', name: 'Submitted' },
        toStage: { id: 'stage2', code: 'UNDER_SCRUTINY', name: 'Under Scrutiny' },
        canTransition: true,
        reason: 'All requirements met'
      }
    ];

    mockApiService.getWorkflowTransitions.mockResolvedValue({
      success: true,
      data: mockTransitions
    });

    render(<TransitionPreview {...defaultProps} />);

    // Click the trigger to open popover
    fireEvent.click(screen.getByText("What's next?"));

    await waitFor(() => {
      expect(screen.getByText('Guard: GUARD_INTAKE_COMPLETE')).toBeInTheDocument();
    });
  });

  it('should close popover when clicking outside', async () => {
    mockApiService.getWorkflowTransitions.mockResolvedValue({
      success: true,
      data: []
    });

    render(
      <div>
        <TransitionPreview {...defaultProps} />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    // Click the trigger to open popover
    fireEvent.click(screen.getByText("What's next?"));

    await waitFor(() => {
      expect(screen.getByText('No transitions available')).toBeInTheDocument();
    });

    // Click outside to close popover
    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('No transitions available')).not.toBeInTheDocument();
    });
  });

  it('should reload transitions when applicationId or currentStageCode changes', async () => {
    mockApiService.getWorkflowTransitions.mockResolvedValue({
      success: true,
      data: []
    });

    const { rerender } = render(<TransitionPreview {...defaultProps} />);

    expect(mockApiService.getWorkflowTransitions).toHaveBeenCalledTimes(1);

    // Change applicationId
    rerender(<TransitionPreview {...defaultProps} applicationId="new-app-id" />);

    await waitFor(() => {
      expect(mockApiService.getWorkflowTransitions).toHaveBeenCalledTimes(2);
      expect(mockApiService.getWorkflowTransitions).toHaveBeenLastCalledWith(
        'SUBMITTED',
        'new-app-id'
      );
    });

    // Change currentStageCode
    rerender(<TransitionPreview {...defaultProps} applicationId="new-app-id" currentStageCode="UNDER_SCRUTINY" />);

    await waitFor(() => {
      expect(mockApiService.getWorkflowTransitions).toHaveBeenCalledTimes(3);
      expect(mockApiService.getWorkflowTransitions).toHaveBeenLastCalledWith(
        'UNDER_SCRUTINY',
        'new-app-id'
      );
    });
  });
});
