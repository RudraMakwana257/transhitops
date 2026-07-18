import { useState } from 'react';
import type { FormEvent } from 'react'
import { api } from '../../api/client'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { toast } from '../../store/toastStore'

interface CompleteTripModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  startOdometer: number
  tripId: string
}

export function CompleteTripModal({ isOpen, onClose, onComplete, startOdometer, tripId }: CompleteTripModalProps) {
  const [form, setForm] = useState({ end_odometer: '', fuel_consumed_l: '', revenue: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  if (!isOpen) return null
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.put(`/trips/${tripId}/complete`, {
        end_odometer: Number(form.end_odometer),
        fuel_consumed_l: Number(form.fuel_consumed_l),
        revenue: Number(form.revenue) || 0,
        notes: form.notes,
      })
      setForm({ end_odometer: '', fuel_consumed_l: '', revenue: '', notes: '' })
      onComplete()
      onClose()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to complete', 'error')
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Trip" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input {...{ value: form.end_odometer, onChange: (e) => setForm({...form, end_odometer: e.target.value}) }} label="End Odometer (km) *" type="number" min={startOdometer + 1} placeholder={`${startOdometer + 1}`} required />
          <Input {...{ value: form.fuel_consumed_l, onChange: (e) => setForm({...form, fuel_consumed_l: e.target.value}) }} label="Fuel Consumed (L) *" type="number" min="0.01" step="0.01" required />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input {...{ value: form.revenue, onChange: (e) => setForm({...form, revenue: e.target.value}) }} label="Revenue (₹)" type="number" min="0" step="1" />
        </div>
        <Input {...{ value: form.notes, onChange: (e) => setForm({...form, notes: e.target.value}) }} label="Notes" placeholder="Additional notes..." />
        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-default)]">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting}>Complete Trip</Button>
        </div>
      </form>
    </Modal>
  )
}