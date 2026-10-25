import React, { useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { modalBackdropVariants, modalPanelVariants } from "./AnimationWrapper";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  containerClassName?: string;
  overlayClassName?: string;
  id?: string;
  originCoords?: { x: number; y: number } | null;
}

export const Modal = ({
  isOpen,
  onClose,
  children,
  containerClassName = "w-full max-w-lg",
  overlayClassName = "bg-[#0F0F10]/80",
  id,
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow === "hidden" ? "" : originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" id={id}>
          {/* Smooth 0px -> 4px Backdrop Blur & Fade Physics */}
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed inset-0 ${overlayClassName}`}
            onClick={onClose}
          />

          {/* Centered Scrollable Container Wrapper with Scale-Up & Exit Physics */}
          <div className="min-h-full w-full flex items-center justify-center p-3 sm:p-6 pointer-events-none">
            <motion.div
              variants={modalPanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`relative z-10 my-auto pointer-events-auto ${containerClassName}`}
            >
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
