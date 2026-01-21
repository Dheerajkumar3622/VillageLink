
import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  isLoading?: boolean;
  hideFooter?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, onConfirm, title, children, confirmLabel = "Confirm", isLoading, hideFooter = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden animate-fade-in transform transition-all scale-100">
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
            aria-label="Close Modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>

        {!hideFooter && (
          <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 flex gap-3">
            <Button variant="secondary" onClick={onClose} fullWidth>Cancel</Button>
            <Button variant="primary" onClick={onConfirm} fullWidth disabled={isLoading}>
              {isLoading ? 'Processing...' : confirmLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
