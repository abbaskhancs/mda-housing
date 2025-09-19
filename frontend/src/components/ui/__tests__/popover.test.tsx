import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Popover } from '../popover';

describe('Popover', () => {
  const defaultProps = {
    trigger: <button>Trigger</button>,
    content: <div>Popover Content</div>
  };

  it('should render the trigger element', () => {
    render(<Popover {...defaultProps} />);
    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('should not show content initially', () => {
    render(<Popover {...defaultProps} />);
    expect(screen.queryByText('Popover Content')).not.toBeInTheDocument();
  });

  it('should show content when trigger is clicked', () => {
    render(<Popover {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Trigger'));
    
    expect(screen.getByText('Popover Content')).toBeInTheDocument();
  });

  it('should hide content when trigger is clicked again', () => {
    render(<Popover {...defaultProps} />);
    
    // Open popover
    fireEvent.click(screen.getByText('Trigger'));
    expect(screen.getByText('Popover Content')).toBeInTheDocument();
    
    // Close popover
    fireEvent.click(screen.getByText('Trigger'));
    expect(screen.queryByText('Popover Content')).not.toBeInTheDocument();
  });

  it('should close when clicking outside', () => {
    render(
      <div>
        <Popover {...defaultProps} />
        <div data-testid="outside">Outside</div>
      </div>
    );
    
    // Open popover
    fireEvent.click(screen.getByText('Trigger'));
    expect(screen.getByText('Popover Content')).toBeInTheDocument();
    
    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Popover Content')).not.toBeInTheDocument();
  });

  it('should close when pressing Escape key', () => {
    render(<Popover {...defaultProps} />);
    
    // Open popover
    fireEvent.click(screen.getByText('Trigger'));
    expect(screen.getByText('Popover Content')).toBeInTheDocument();
    
    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Popover Content')).not.toBeInTheDocument();
  });

  it('should not open when disabled', () => {
    render(<Popover {...defaultProps} disabled={true} />);
    
    fireEvent.click(screen.getByText('Trigger'));
    
    expect(screen.queryByText('Popover Content')).not.toBeInTheDocument();
  });

  it('should apply disabled styling when disabled', () => {
    render(<Popover {...defaultProps} disabled={true} />);
    
    const trigger = screen.getByText('Trigger').parentElement;
    expect(trigger).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('should support different placements', () => {
    const { rerender } = render(<Popover {...defaultProps} placement="top" />);
    
    fireEvent.click(screen.getByText('Trigger'));
    
    // Check that content has top placement classes
    const content = screen.getByText('Popover Content').parentElement?.parentElement;
    expect(content).toHaveClass('bottom-full', 'mb-2');
    
    // Test bottom placement
    rerender(<Popover {...defaultProps} placement="bottom" />);
    fireEvent.click(screen.getByText('Trigger'));
    
    const bottomContent = screen.getByText('Popover Content').parentElement?.parentElement;
    expect(bottomContent).toHaveClass('top-full', 'mt-2');
  });

  it('should apply custom className to container', () => {
    render(<Popover {...defaultProps} className="custom-class" />);
    
    const container = screen.getByText('Trigger').parentElement?.parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('should apply custom contentClassName to content', () => {
    render(<Popover {...defaultProps} contentClassName="custom-content-class" />);
    
    fireEvent.click(screen.getByText('Trigger'));
    
    const content = screen.getByText('Popover Content').parentElement?.parentElement;
    expect(content).toHaveClass('custom-content-class');
  });
});
