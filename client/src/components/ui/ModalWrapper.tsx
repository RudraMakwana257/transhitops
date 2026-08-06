import type { ReactNode } from 'react'
import { Fragment } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from './ButtonWrapper'
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
  DialogHeader as ShadcnDialogHeader,
  DialogTitle as ShadcnDialogTitle,
  DialogDescription as ShadcnDialogDescription,
  DialogFooter as ShadcnDialogFooter,
} from './dialog'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
}

const sizes = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children, 
  footer,
  size = 'md'
}: ModalProps) {
  return (
    <ShadcnDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ShadcnDialogContent className={sizes[size]}>
        <ShadcnDialogHeader>
          <ShadcnDialogTitle>{title}</ShadcnDialogTitle>
          {description && <ShadcnDialogDescription>{description}</ShadcnDialogDescription>}
        </ShadcnDialogHeader>
        
        <div className="py-4">
          {children}
        </div>
        
        {footer && (
          <ShadcnDialogFooter>
            {footer}
          </ShadcnDialogFooter>
        )}
      </ShadcnDialogContent>
    </ShadcnDialog>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'danger' | 'primary' | 'secondary'
  loading?: boolean
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  loading = false
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-muted-foreground">{message}</p>
    </Modal>
  )
}

interface SlideOverProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: number
}

export function SlideOver({ isOpen, onClose, title, children, width = 360 }: SlideOverProps) {
  if (!isOpen) return null
  
  const content = (
    <Fragment>
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="fixed inset-y-0 right-0 z-50 flex max-w-full animate-slide-in-right">
        <div className="w-full bg-background border-l border-border flex flex-col h-full shadow-xl" style={{ maxWidth: width }}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    </Fragment>
  )
  
  if (typeof window === 'undefined') return null
  
  return createPortal(content, document.body)
}