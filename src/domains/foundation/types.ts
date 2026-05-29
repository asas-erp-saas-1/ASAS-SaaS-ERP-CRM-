// src/domains/foundation/types.ts

export interface BranchScope {
  id: string;
  name: string;
  code: string;
  city: string;
}

export type ScopeLevel = 'self' | 'team' | 'department' | 'branch' | 'region' | 'global';

export interface IdentityContext {
  userId: string;
  email: string;
  agencyId: string;
  role: string; // fallback flat role name like owner, manager, agent, accountant
  activeBranch?: BranchScope | undefined;
  permissions: Set<string>; // set of actions, e.g. "leads.read", "deals.override"
  scopeLevel: ScopeLevel;
}

export interface SecuritySession {
  id: string;
  userId: string;
  deviceId?: string;
  status: 'active' | 'revoked' | 'expired';
  ipAddress?: string;
  lastHeartbeat: Date;
}

export interface AuditTrailLog {
  correlationId: string;
  actorId: string;
  agencyId: string;
  branchId?: string;
  operationType: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  requestIp?: string;
  deviceSignature?: string;
}

export interface DocumentRecord {
  id: string;
  agencyId: string;
  branchId?: string;
  title: string;
  category: 'contract' | 'notary_promesse' | 'payment_receipt' | 'plan' | 'identity_proof';
  storagePath: string;
  fileSize?: number;
  mimeType?: string;
  lifecycleState: 'draft' | 'uploaded' | 'verified' | 'approved' | 'archived' | 'rejected';
  associatedEntityType: 'deal' | 'lead' | 'project' | 'supplier';
  associatedEntityId: string;
  uploadedBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  hashSignature?: string;
  rejectionReason?: string;
}

export interface CommunicationLog {
  id: string;
  recipientType: 'client' | 'staff' | 'external';
  recipientId: string;
  recipientPhone: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'internal';
  messageContent: string;
  whatsappTemplateName?: string;
  whatsappTemplateVariables?: Record<string, any>;
  deliveryStatus: 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'retrying';
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  sendAfter: string;
  sentAt?: string;
}

export interface FoundationTask {
  id: string;
  agencyId: string;
  branchId?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  taskStatus: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'overdue' | 'escalated';
  dueDate?: string;
  assignedTo?: string;
  createdBy?: string;
  associatedEntityType?: string;
  associatedEntityId?: string;
  slaEscalationMarkerHours: number;
  escalationCount: number;
  escalatedTo?: string;
  completedAt?: string;
}
