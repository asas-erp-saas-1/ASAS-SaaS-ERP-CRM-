'use server'

import { kernel } from '@/lib/kernel/core'
import { revalidatePath } from 'next/cache'

interface CreateTaskInput {
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string | null
  lead_id?: string | null
  deal_id?: string | null
  assigned_to?: string | null
}

export async function createTaskAction(data: CreateTaskInput) {
  try {
    const identity = await kernel.identity()

    if (!identity.userId) {
      throw new Error('Non authentifié')
    }

    // Assign to the user creating the task if not explicitly assigned
    const assignee = data.assigned_to || identity.userId

    const task = await kernel.mutate<any>('tasks', 'INSERT', {
      agency_id: identity.tenantId, // Assuming tasks have agency_id like leads do
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      due_date: data.due_date || null,
      assigned_to: assignee,
      created_by: identity.userId,
      lead_id: data.lead_id || null,
      deal_id: data.deal_id || null,
      status: 'pending', // default status
      is_automated: false
    })

    revalidatePath('/dashboard/tasks')
    if (data.lead_id) revalidatePath(`/dashboard/leads`)
    if (data.deal_id) revalidatePath(`/dashboard/deals`)

    return { data: task, error: null }
  } catch (error: any) {
    console.error('Create task error:', error)
    return { data: null, error: error.message }
  }
}
