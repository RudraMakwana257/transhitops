import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Input'
import { ReactNode } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary' | 'secondary'
  requireReason?: boolean
  reason?: string
  onReasonChange?: (v: string) => void
  reasonPlaceholder?: string
}

export function ConfirmModal({ isOpen, onClose, onConfirm, loading, title, message, confirmLabel, confirmVariant, requireReason, reason, onReasonChange, reasonPlaceholder }: ConfirmModalProps) {
  if (!isOpen) return null
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <p className="text-[var(--text-secondary)]">{message}</p>
        {requireReason && (
          <Textarea 
            value={reason} 
            onChange={(e) => onReasonChange?.(e.target.value)} 
            placeholder={reasonPlaceholder} 
            label="Reason (required)" 
            rows={3} 
          />
        )}
        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-default)]">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading} disabled={requireReason && !reason?.trim()}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}