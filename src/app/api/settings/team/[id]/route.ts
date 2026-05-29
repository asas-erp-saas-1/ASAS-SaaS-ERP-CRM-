import { NextResponse } from 'next/server'
import { kernel } from '@/lib/kernel/core'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const targetUserId = params.id

    const identity = await kernel.identity()
    if (identity.role !== 'owner' && identity.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action, role, status } = await request.json()

    // Check if the target user actually belongs to the caller's tenant
    const targetProfiles = await kernel.query<any>('profiles', { filters: { id: targetUserId, agency_id: identity.tenantId } })
    if (!targetProfiles || targetProfiles.length === 0) {
      return NextResponse.json({ error: 'Not found or permission denied' }, { status: 404 })
    }

    const targetProfile = targetProfiles[0]

    // Owners cannot be modified by managers
    if (targetProfile.role === 'owner' && identity.userId !== targetUserId) {
        return NextResponse.json({ error: 'Cannot modify owner' }, { status: 403 })
    }

    let payload: any = {}
    if (action === 'change_role') {
       if (identity.role !== 'owner') return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 })
       payload.role = role
    } else if (action === 'change_status') {
       if (identity.role !== 'owner') return NextResponse.json({ error: 'Only owners can suspend' }, { status: 403 })
       payload.status = status
    }

    if (Object.keys(payload).length > 0) {
       await kernel.mutate('profiles', 'UPDATE', payload, { id: targetUserId })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
