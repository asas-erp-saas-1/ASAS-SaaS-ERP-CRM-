import { redirect } from 'next/navigation'
import { kernel } from '@/lib/kernel/core'
import { TeamManagementClient } from '@/modules/settings/components/TeamManagementClient'

export const dynamic = 'force-dynamic'

export default async function TeamSettingsPage() {
  let identity;
  let shouldRedirectTo: string | null = null;

  try {
    identity = await kernel.identity()
  } catch (err: any) {
    const errorMsg = err?.message || '';
    if (errorMsg.includes('Tenant isolation failure')) {
      shouldRedirectTo = '/onboarding';
    } else {
      shouldRedirectTo = '/login';
    }
  }

  if (shouldRedirectTo) {
    redirect(shouldRedirectTo);
  }

  if (!identity) {
    return null;
  }

  if (identity.role !== 'owner' && identity.role !== 'manager') {
    redirect('/dashboard/settings')
  }

  // Fetch profiles belonging to this tenant
  const profiles = await kernel.query('profiles', {
    filters: { agency_id: identity.tenantId },
    limit: 100
  })

  // Normalize profiles into an expected format
  const mappedProfiles = profiles.map((p: any) => ({
    id: p.id,
    full_name: p.full_name || 'Inconnu',
    email: p.email || '',
    role: p.role || 'agent',
    status: p.status || 'active',
    last_active: p.last_active || null
  }))

  return <TeamManagementClient initialProfiles={mappedProfiles} currentUserRole={identity.role} />
}
