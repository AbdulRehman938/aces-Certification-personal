'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  required = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => {
    return options.find((o) => o.value === (value ?? ''));
  }, [options, value]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  const displayText =
    selectedOption?.label || (value ? String(value) : placeholder);
  const isPlaceholderActive = !selectedOption && !value && Boolean(placeholder);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-secondary mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTciIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxNyAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUuMjQ4NjEgNi4zNzQ3Nkw4LjUwNDM3IDkuNjMwNTFMMTEuNzYwMSA2LjM3NDc2TDEyLjc1NjggNy4zNzE0Mkw4LjUwNDM3IDExLjYyMzhMNC4yNTE5NSA3LjM3MTQyTDUuMjQ4NjEgNi4zNzQ3NloiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+Cg==')] bg-size-[17px_18px] bg-position-[right_1rem_center] bg-no-repeat pr-12 text-left flex items-center justify-between ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
        } border-zinc-200`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={isPlaceholderActive ? 'text-gray' : 'text-secondary'}>
          {displayText}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isSelected = option.value === (value ?? '');
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (!onChange) return;
                  const fakeEvent = { target: { value: option.value } } as unknown as React.ChangeEvent<HTMLSelectElement>;
                  onChange(fakeEvent);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 transition-colors flex items-center justify-between ${
                  isSelected ? 'bg-zinc-100 text-secondary font-medium' : 'text-gray'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-secondary"
                  >
                    <path
                      d="M13.3334 4L6.00002 11.3333L2.66669 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
