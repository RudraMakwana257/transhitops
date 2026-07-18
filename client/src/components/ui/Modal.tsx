import type { ReactNode } from 'react'
import { Fragment } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { Button } from './Button'

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
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children, 
  footer,
  size = 'md',
  showCloseButton = true 
}: ModalProps) {
  if (!isOpen) return null
  
  const modalContent = (
    <Fragment>
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-up">
        <div className={clsx('w-full bg-[var(--bg-card)] rounded-xl shadow-xl border border-[var(--border-default)]', sizes[size])}>
          <div className="flex items-start justify-between p-6 border-b border-[var(--border-default)]">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
              {description && (
                <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="p-6">
            {children}
          </div>
          
          {footer && (
            <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--border-default)] bg-[var(--bg-sidebar)] rounded-b-xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Fragment>
  )
  
  if (typeof window === 'undefined') return null
  
  return createPortal(modalContent, document.body)
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
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-[var(--text-secondary)]">{message}</p>
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
        <div className="w-full bg-[var(--bg-card)] border-l border-[var(--border-default)] flex flex-col h-full shadow-xl" style={{ maxWidth: width }}>
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors lg:hidden"
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