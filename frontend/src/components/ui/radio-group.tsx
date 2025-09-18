import React from 'react';

interface RadioGroupProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

interface RadioGroupItemProps {
  value: string;
  id?: string;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ 
  children, 
  value, 
  onValueChange, 
  className = '' 
}) => {
  return (
    <div className={`grid gap-2 ${className}`} role="radiogroup">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...child.props,
            checked: child.props.value === value,
            onChange: () => onValueChange?.(child.props.value)
          });
        }
        return child;
      })}
    </div>
  );
};

export const RadioGroupItem: React.FC<RadioGroupItemProps> = ({ 
  value, 
  id, 
  className = '',
  ...props 
}) => {
  return (
    <input
      type="radio"
      value={value}
      id={id}
      className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${className}`}
      {...props}
    />
  );
};
