import React, { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  containerClassName?: string;
  overlayClassName?: string;
  id?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  children,
  containerClassName = "w-full max-w-lg",
  overlayClassName = "bg-stone-950/80 backdrop-blur-md",
  id
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Restore overflow safely; if original was 'hidden', reset to empty string so body scrolling is restored
      document.body.style.overflow = originalOverflow === 'hidden' ? '' : originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto" id={id}>
      {/* Safe Backdrop */}
      <div 
        className={`fixed inset-0 transition-opacity ${overlayClassName}`}
        onClick={onClose} 
      />
      
      {/* Centered Scrollable Container Wrapper */}
      <div className="min-h-full w-full flex items-center justify-center p-3 sm:p-6 pointer-events-none">
        <div className={`relative z-10 my-auto pointer-events-auto ${containerClassName}`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;

