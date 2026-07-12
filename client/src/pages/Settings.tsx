import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { User, UserRole, Vehicle, VehicleType } from '../types'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { PageWrapper } from '../components/layout/PageWrapper'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/Badge'
import { Select } from '../components/ui/Input'
import { Users, Plus, Truck, Settings as SettingsIcon, Shield, AlertCircle, Edit2, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { format } from 'date-fns'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  role: z.enum(['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst']),
  is_active: z.boolean().default(true),
})

type UserForm = z.infer<typeof userSchema>

export function Settings() {
  const { hasRole } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', password: '', role: 'dispatcher', is_active: true },
  })
  
  const canManage = hasRole(['fleet_manager'])
  
  useEffect(() => {
    if (canManage) fetchUsers()
  }, [canManage])
  
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/settings/users')
      if (res.data.success) setUsers(res.data.data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = async (data: UserForm) => {
    setSubmitting(true)
    try {
      if (editingUser) {
        await api.put(`/settings/users/${editingUser.id}`, data)
      } else {
        await api.post('/settings/users', data)
      }
      setShowCreate(false)
      setEditingUser(null)
      form.reset({ name: '', email: '', password: '', role: 'dispatcher', is_active: true })
      fetchUsers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save user')
    } finally {
      setSubmitting(false)
    }
  }
  
  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.reset({ 
      name: user.name, 
      email: user.email, 
      password: '', 
      role: user.role, 
      is_active: user.is_active 
    })
    setShowCreate(true)
  }
  
  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return
    try {
      await api.delete(`/settings/users/${userId}`)
      fetchUsers()
    } catch (err) {
      alert('Failed to deactivate user')
    }
  }
  
  if (!canManage) return <div className="p-6 text-center text-[var(--text-secondary)]">Access denied</div>
  
  const columns = [
    { key: 'name', header: 'Name', accessor: 'name', sortable: true },
    { key: 'email', header: 'Email', accessor: 'email', sortable: true },
    { key: 'role', header: 'Role', accessor: 'role', sortable: true, render: (r: string) => r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) },
    { key: 'is_active', header: 'Status', render: (u: User) => u.is_active ? <StatusBadge status="Available" type="vehicle" /> : <StatusBadge status="Retired" type="vehicle" /> },
    { key: 'created_at', header: 'Created', accessor: 'created_at', sortable: true, render: (d: string) => format(new Date(d), 'MMM d, yyyy') },
  ]
  
  return (
    <PageWrapper title="Settings" description="Manage users and system configuration" headerActions={
      <Button onClick={() => { setEditingUser(null); form.reset({ name: '', email: '', password: '', role: 'dispatcher', is_active: true }); setShowCreate(true); }}><Plus className="w-4 h-4 mr-2" />Add User</Button>
    }>
      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingUser ? 'Edit User' : 'Add New User'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setEditingUser(null); form.reset({ name: '', email: '', password: '', role: 'dispatcher', is_active: true }); }}>
                <AlertCircle className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 md:grid md:grid-cols-2 md:gap-4">
              <Input {...form.register('name')} label="Full Name *" error={form.formState.errors.name?.message} placeholder="John Doe" required />
              <Input {...form.register('email')} label="Email *" type="email" error={form.formState.errors.email?.message} placeholder="user@company.com" required />
              <Input {...form.register('password')} label={editingUser ? 'New Password (leave blank to keep current)' : 'Password *'} type="password" error={form.formState.errors.password?.message} minLength={8} />
              <Select {...{ value: form.watch('role'), onChange: (e) => form.setValue('role', e.target.value) }} label="Role *" options={[
                { value: 'fleet_manager', label: 'Fleet Manager' },
                { value: 'dispatcher', label: 'Dispatcher' },
                { value: 'safety_officer', label: 'Safety Officer' },
                { value: 'financial_analyst', label: 'Financial Analyst' },
              ]} required />
              <div className="md:col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...form.register('is_active')} className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary-light)]" />
                  <span className="text-sm text-[var(--text-primary)]">Active</span>
                </label>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-4 border-t border-[var(--border-default)]">
                <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); setEditingUser(null); form.reset({ name: '', email: '', password: '', role: 'dispatcher', is_active: true }); }}>Cancel</Button>
                <Button type="submit" loading={submitting}>{editingUser ? 'Update' : 'Create'} User</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        onRowClick={handleEdit}
        emptyMessage="No users found"
        emptyAction={<Button onClick={() => { form.reset({ name: '', email: '', password: '', role: 'dispatcher', is_active: true }); setShowCreate(true); }}><Plus className="w-4 h-4 mr-2" />Add User</Button>}
      />
    </PageWrapper>
  )
}