// src/app/api/foundation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Access, Audit, Documents, Communications, Tasks, Organization } from '@/domains/foundation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json({ error: 'Missing action query parameter.' }, { status: 400 });
    }

    // Resolve context to assert auth
    const context = await Access.resolveContext();

    if (action === 'context') {
      return NextResponse.json({
        userId: context.userId,
        email: context.email,
        agencyId: context.agencyId,
        role: context.role,
        activeBranch: context.activeBranch,
        permissions: Array.from(context.permissions),
        scopeLevel: context.scopeLevel
      });
    }

    if (action === 'audit_logs') {
      const logs = await Audit.searchVault();
      return NextResponse.json(logs);
    }

    if (action === 'branches') {
      const rawBranches = await Organization.listBranches();
      return NextResponse.json(rawBranches);
    }

    if (action === 'teams') {
      const teams = await Organization.listTeams();
      return NextResponse.json(teams);
    }

    if (action === 'tasks') {
      const assigneeFilter = searchParams.get('assignedTo');
      const filters: Record<string, any> = { agency_id: context.agencyId };
      if (assigneeFilter) {
        filters.assigned_to = assigneeFilter;
      }
      // Pull all tasks from table
      const taskRecords = await queryTaskTable(context.agencyId);
      return NextResponse.json(taskRecords);
    }

    if (action === 'documents') {
      const entityType = searchParams.get('entityType') || 'deal';
      const entityId = searchParams.get('entityId');
      if (!entityId) {
        return NextResponse.json({ error: 'Missing associated entityUuid.' }, { status: 400 });
      }
      const docs = await Documents.queryByEntity(entityType, entityId);
      return NextResponse.json(docs);
    }

    return NextResponse.json({ error: 'Unknown foundation query action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Foundation Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action property inside transmission payload.' }, { status: 400 });
    }

    const context = await Access.resolveContext();

    if (action === 'create_branch') {
      const { name, code, city, address, phone } = body;
      const record = await Organization.createBranch({ name, code, city, address, phone });
      return NextResponse.json(record);
    }

    if (action === 'create_team') {
      const { name, branchId, managerId } = body;
      const record = await Organization.createTeam({ name, branchId, managerId });
      return NextResponse.json(record);
    }

    if (action === 'create_task') {
      const { title, description, priority, assignedTo, dueDate, associatedEntityType, associatedEntityId } = body;
      const taskPayload: any = {
        branchId: context.activeBranch?.id,
        title,
        description,
        priority,
        dueDate,
        assignedTo,
        associatedEntityType,
        associatedEntityId,
        slaEscalationMarkerHours: 48
      };
      // Clean up optional undefined properties to satisfy exactOptionalPropertyTypes
      Object.keys(taskPayload).forEach(key => {
        if (taskPayload[key] === undefined) {
          delete taskPayload[key];
        }
      });
      const record = await Tasks.create(taskPayload);
      return NextResponse.json(record);
    }

    if (action === 'update_task_status') {
      const { taskId, targetStatus, notes } = body;
      const record = await Tasks.updateStatus(taskId, targetStatus, notes);
      return NextResponse.json(record);
    }

    if (action === 'escalate_task') {
      const { taskId, escalatedTo, justification } = body;
      const record = await Tasks.escalate(taskId, escalatedTo, justification);
      return NextResponse.json(record);
    }

    if (action === 'register_document') {
      const { title, category, storagePath, fileSize, mimeType, associatedEntityType, associatedEntityId } = body;
      const docPayload: any = {
        branchId: context.activeBranch?.id,
        title,
        category,
        storagePath,
        fileSize,
        mimeType,
        associatedEntityType,
        associatedEntityId
      };
      Object.keys(docPayload).forEach(key => {
        if (docPayload[key] === undefined) {
          delete docPayload[key];
        }
      });
      const record = await Documents.register(docPayload);
      return NextResponse.json(record);
    }

    if (action === 'verify_document') {
      const { documentId, state, notes } = body;
      const record = await Documents.updateState(documentId, state, notes);
      return NextResponse.json(record);
    }

    if (action === 'enqueue_comm') {
      const { recipientType, recipientId, recipientPhone, channel, messageContent, templateName, templateVariables } = body;
      const commPayload: any = {
        recipientType,
        recipientId,
        recipientPhone,
        channel,
        messageContent,
        whatsappTemplateName: templateName,
        whatsappTemplateVariables: templateVariables
      };
      Object.keys(commPayload).forEach(key => {
        if (commPayload[key] === undefined) {
          delete commPayload[key];
        }
      });
      const record = await Communications.enqueue(commPayload);
      return NextResponse.json(record);
    }

    if (action === 'mark_comm_dispatched') {
      const { logId, status, errorMessage } = body;
      const record = await Communications.markDispatched(logId, status, errorMessage);
      return NextResponse.json(record);
    }

    return NextResponse.json({ error: 'Unknown foundation mutator action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Foundation Error' }, { status: 500 });
  }
}

// Low-level helper access points
async function globalFetchBranches(agencyId: string) {
  try {
    const { kernel } = await import('@/lib/kernel/core');
    return await kernel.query('branches', {
      filters: { agency_id: agencyId }
    });
  } catch {
    return [];
  }
}

async function queryTaskTable(agencyId: string) {
  try {
    const { kernel } = await import('@/lib/kernel/core');
    return await kernel.query('foundation_tasks', {
      filters: { agency_id: agencyId },
      orderBy: { column: 'created_at', ascending: false }
    });
  } catch {
    return [];
  }
}
