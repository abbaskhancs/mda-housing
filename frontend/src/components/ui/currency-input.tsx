import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '0',
  disabled = false,
  min = 0,
  max
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Format number with thousand separators for display
  const formatDisplayValue = (num: number): string => {
    if (num === 0) return '';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  // Parse display value to number, removing formatting
  const parseDisplayValue = (str: string): number => {
    if (!str || str.trim() === '') return 0;
    // Remove commas and parse
    const cleaned = str.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Update display value when prop value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatDisplayValue(value));
    }
  }, [value, isFocused]);

  // Handle input change with validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty input
    if (inputValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // More strict validation: digits, properly placed commas, and one decimal point
    // Allow patterns like: 1234, 1,234, 12,345, 123,456, 1,234.56, etc.
    const validPattern = /^(\d{1,3}(,\d{3})*|\d+)(\.\d{0,2})?$/;
    if (!validPattern.test(inputValue)) {
      return; // Reject invalid input
    }

    // Parse the value
    const numericValue = parseDisplayValue(inputValue);

    // Validate range
    if (numericValue < min) {
      return; // Reject values below minimum
    }

    if (max !== undefined && numericValue > max) {
      return; // Reject values above maximum
    }

    // Update display and notify parent
    setDisplayValue(inputValue);
    onChange(numericValue);
  };

  // Handle focus - show raw number for editing
  const handleFocus = () => {
    setIsFocused(true);
    // Show unformatted value for easier editing
    if (value > 0) {
      setDisplayValue(value.toString());
    } else {
      setDisplayValue('');
    }
  };

  // Handle blur - format for display
  const handleBlur = () => {
    setIsFocused(false);
    const numericValue = parseDisplayValue(displayValue);
    
    // Ensure the value is valid and within bounds
    let finalValue = numericValue;
    if (finalValue < min) finalValue = min;
    if (max !== undefined && finalValue > max) finalValue = max;
    
    // Update both display and parent if value changed
    if (finalValue !== numericValue) {
      onChange(finalValue);
    }
    
    setDisplayValue(formatDisplayValue(finalValue));
  };

  // Handle key press to prevent invalid characters
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const char = e.key;
    const currentValue = displayValue;
    
    // Allow control keys
    if (char === 'Backspace' || char === 'Delete' || char === 'Tab' || 
        char === 'ArrowLeft' || char === 'ArrowRight' || char === 'Home' || char === 'End') {
      return;
    }
    
    // Allow digits
    if (/\d/.test(char)) {
      return;
    }
    
    // Allow one decimal point
    if (char === '.' && !currentValue.includes('.')) {
      return;
    }
    
    // Prevent all other characters
    e.preventDefault();
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleInputChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyPress}
      placeholder={placeholder}
      disabled={disabled}
      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${className}`}
      inputMode="decimal"
      autoComplete="off"
    />
  );
};
