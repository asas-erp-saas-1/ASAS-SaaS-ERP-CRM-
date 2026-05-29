// src/domains/foundation/tasks.ts

import { kernel } from '@/lib/kernel/core';
import { FoundationTask } from './types';
import { Audit } from './audit';

export class TaskEngine {
  /**
   * Spawns a physical task with active SLA constraints and assigns it to appropriate staff profiles.
   */
  public static async create(
    task: Omit<FoundationTask, 'id' | 'agencyId' | 'taskStatus' | 'escalationCount' | 'completedAt'>
  ): Promise<any> {
    const identity = await kernel.identity();
    
    const payload = {
      agency_id: identity.tenantId,
      branch_id: task.branchId || null,
      title: task.title,
      description: task.description || null,
      priority: task.priority || 'medium',
      task_status: task.assignedTo ? 'assigned' : 'pending',
      due_date: task.dueDate || null,
      assigned_to: task.assignedTo || null,
      created_by: identity.userId,
      associated_entity_type: task.associatedEntityType || null,
      associated_entity_id: task.associatedEntityId || null,
      sla_escalation_marker_hours: task.slaEscalationMarkerHours || 48,
      escalation_count: 0
    };

    const record = await kernel.mutate<any>('foundation_tasks', 'INSERT', payload);

    await Audit.log({
      operationType: 'TASK_CREATED',
      entityType: 'task',
      entityId: record.id,
      newValues: { title: task.title, assignee: task.assignedTo, priority: task.priority }
    });

    return record;
  }

  /**
   * Progresses task status along standard execution state machines
   */
  public static async updateStatus(
    taskId: string,
    targetStatus: 'in_progress' | 'completed' | 'cancelled' | 'overdue',
    resolvingNotes?: string
  ): Promise<any> {
    const existing = await kernel.query('foundation_tasks', {
      filters: { id: taskId }
    });

    const taskObj = existing[0] as any;
    if (!taskObj) {
      throw new Error('Task entity not found.');
    }

    const payload: Record<string, any> = {
      task_status: targetStatus,
      updated_at: new Date().toISOString()
    };

    if (targetStatus === 'completed') {
      payload.completed_at = new Date().toISOString();
    }

    const updated = await kernel.mutate<any>('foundation_tasks', 'UPDATE', payload, { id: taskId });

    await Audit.log({
      operationType: `TASK_STATE_${targetStatus.toUpperCase()}`,
      entityType: 'task',
      entityId: taskId,
      oldValues: { previousStatus: taskObj.task_status },
      newValues: { currentStatus: targetStatus, notes: resolvingNotes }
    });

    return updated;
  }

  /**
   * Force locks a task and escalates it to a supervisor or higher authority (SLA breaching trigger)
   */
  public static async escalate(
    taskId: string,
    escalatedToUserId: string,
    justification: string
  ): Promise<any> {
    const existing = await kernel.query('foundation_tasks', {
      filters: { id: taskId }
    });

    const taskObj = existing[0] as any;
    if (!taskObj) {
      throw new Error('Task entity not found.');
    }

    const payload = {
      task_status: 'escalated',
      escalation_count: (taskObj.escalation_count || 0) + 1,
      escalated_to: escalatedToUserId,
      updated_at: new Date().toISOString()
    };

    const updated = await kernel.mutate<any>('foundation_tasks', 'UPDATE', payload, { id: taskId });

    await Audit.log({
      operationType: 'TASK_SLA_BREACH_ESCALATED',
      entityType: 'task',
      entityId: taskId,
      oldValues: { previousAssignee: taskObj.assigned_to, count: taskObj.escalation_count },
      newValues: { escalatedTo: escalatedToUserId, count: payload.escalation_count, justification }
    });

    return updated;
  }
}
export const Tasks = TaskEngine;
