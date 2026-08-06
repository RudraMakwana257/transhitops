import { Modal } from '../ui/ModalWrapper'
import { Button } from '../ui/ButtonWrapper'
import { Textarea } from '../ui/InputWrapper'

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
        <p className="text-muted-foreground">{message}</p>
        {requireReason && (
          <Textarea 
            value={reason} 
            onChange={(e) => onReasonChange?.(e.target.value)} 
            placeholder={reasonPlaceholder} 
            label="Reason (required)" 

          />
        )}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading} disabled={requireReason && !reason?.trim()}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}