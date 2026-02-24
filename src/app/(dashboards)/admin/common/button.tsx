'use client'

import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'custom';
  style?: React.CSSProperties;
}

export default function Button({
  children,
  onClick,
  type = 'button',
  className = '',
  disabled = false,
  variant = 'primary',
  style,
}: ButtonProps) {
  const baseClasses = 'px-4 md:px-6 py-2 rounded-lg text-sm md:text-base font-medium transition-colors';
  
  const variantClasses = {
    primary: 'bg-black text-white shadow-lg',
    secondary: 'bg-white border border-black text-secondary hover:bg-zinc-50',
    custom: '',
  };

  const shadowStyle = variant === 'primary' ? {
    boxShadow:
      '0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)',
  } : {};

  const mergedStyle = variant === 'primary' 
    ? { ...shadowStyle, ...style }
    : style;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={mergedStyle}
    >
      {children}
    </button>
  );
}
