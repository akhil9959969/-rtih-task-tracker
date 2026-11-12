import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

/**
 * Accessible dialog (Radix primitive handles focus trap, Escape and
 * aria wiring) with a short Motion entrance. Respects reduced motion
 * through the global CSS rule.
 */
export function Dialog({ open, onOpenChange, title, description, children, wide }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </DialogPrimitive.Overlay>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <DialogPrimitive.Content asChild>
                <motion.div
                  className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'} rounded-3xl bg-surface p-7 shadow-2xl`}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="mb-1 flex items-start justify-between">
                    <DialogPrimitive.Title className="font-serif text-2xl font-normal text-ink">
                      {title}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Close className="rounded-lg p-1.5 text-sub transition-colors hover:bg-accent-soft/50 hover:text-ink" aria-label="Close">
                      <X size={18} />
                    </DialogPrimitive.Close>
                  </div>
                  {description && (
                    <DialogPrimitive.Description className="mb-4 text-[13px] text-sub">
                      {description}
                    </DialogPrimitive.Description>
                  )}
                  {children}
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
