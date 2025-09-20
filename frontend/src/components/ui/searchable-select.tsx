import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchableSelectProps<T> {
  value?: T;
  onChange: (value: T | null) => void;
  onSearch: (query: string) => Promise<T[]>;
  onCreateNew?: () => void;
  placeholder?: string;
  displayValue: (item: T) => string;
  displayKey: (item: T) => string;
  noResultsText?: string;
  createNewText?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect<T>({
  value,
  onChange,
  onSearch,
  onCreateNew,
  placeholder = 'Search...',
  displayValue,
  displayKey,
  noResultsText = 'No results found',
  createNewText = 'Create New',
  className = '',
  disabled = false
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < (onCreateNew ? results.length : results.length - 1) ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => prev > -1 ? prev - 1 : prev);
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex === results.length && onCreateNew) {
            handleCreateNew();
          } else if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setQuery('');
          setSelectedIndex(-1);
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, results, selectedIndex, onCreateNew]);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await onSearch(searchQuery);
      setResults(searchResults);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      performSearch(newQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleSelect = (item: T) => {
    onChange(item);
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
      setIsOpen(false);
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
    }
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      if (query.length >= 2) {
        performSearch(query);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value ? displayValue(value) : query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md 
            leading-5 bg-white placeholder-gray-500 focus:outline-none 
            focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 
            focus:border-blue-500 text-sm
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
          `}
        />

        {value && !disabled && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Searching...
            </div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              {noResultsText}
            </div>
          ) : query.length < 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Type at least 2 characters to search
            </div>
          ) : (
            <>
              {results.map((item, index) => (
                <div
                  key={displayKey(item)}
                  onClick={() => handleSelect(item)}
                  className={`
                    cursor-pointer px-4 py-2 hover:bg-gray-50 
                    ${selectedIndex === index ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
                  `}
                >
                  {displayValue(item)}
                </div>
              ))}
              
              {onCreateNew && (
                <div
                  onClick={handleCreateNew}
                  className={`
                    cursor-pointer px-4 py-2 hover:bg-gray-50 border-t border-gray-100
                    flex items-center gap-2 text-blue-600 font-medium
                    ${selectedIndex === results.length ? 'bg-blue-50' : ''}
                  `}
                >
                  <PlusIcon className="h-4 w-4" />
                  {createNewText}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
