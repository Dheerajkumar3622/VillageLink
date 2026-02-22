import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  icon,
  className = '',
  size = 'md',
  ...props
}) => {
  const baseStyles = "relative inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-md backdrop-blur-sm";

  const sizes = {
    sm: "min-h-[32px] px-3 py-1.5 text-xs rounded-lg",
    md: "min-h-[48px] px-6 py-3 rounded-xl",
    lg: "min-h-[56px] px-8 py-4 text-lg rounded-2xl"
  };

  const variants = {
    primary: "bg-gradient-to-r from-[#BE5103] to-[#FFCE1B] text-white hover:shadow-[#BE5103]/40 hover:brightness-110 border border-transparent",
    secondary: "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-700 hover:shadow-lg border border-slate-200 dark:border-slate-700",
    outline: "bg-transparent border-2 border-[#BE5103] text-[#BE5103] dark:text-[#FFCE1B] hover:bg-[#BE5103]/10",
    danger: "bg-gradient-to-r from-[#b7410E] to-[#BE5103] text-white hover:shadow-[#b7410E]/30 border border-transparent",
    success: "bg-gradient-to-r from-[#069494] to-[#057A7A] text-white hover:shadow-[#069494]/30 border border-transparent",
    ghost: "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:shadow-none shadow-none",
  };

  return (
    <button
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      {children}
    </button>
  );
};