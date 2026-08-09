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
  containerClassName = "w-full max-w-lg max-h-[90vh] overflow-y-auto",
  overlayClassName = "bg-stone-950/80 backdrop-blur-md",
  id
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen) return;

    // Safely prevent background scroll while capturing scroll position
    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" id={id}>
      {/* Safe Backdrop */}
      <div 
        className={`fixed inset-0 transition-opacity ${overlayClassName}`}
        onClick={onClose} 
      />
      
      {/* Centered Modal Container */}
      <div className={`relative z-10 ${containerClassName}`}>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
