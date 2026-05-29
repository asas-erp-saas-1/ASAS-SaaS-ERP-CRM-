import { z } from 'zod';

export class ValidationError extends Error {
  constructor(public override message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BusinessRuleError extends Error {
  constructor(public override message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

export function parseAndValidate<T>(schema: z.ZodSchema<T>, data: unknown, contextName = ''): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      if (!firstError) throw error;
      throw new ValidationError(
        `${contextName ? contextName + ': ' : ''}${firstError.message}`,
        firstError.path.join('.')
      );
    }
    throw error;
  }
}

export const LeadCreateSchema = z.object({
  client_id: z.string().uuid('Client identifier is required'),
  assigned_agent: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  source: z.string().min(2, 'Source is too short').max(50),
  budget_min: z.number().min(0).optional(),
  budget_max: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

export const LeadUpdateSchema = LeadCreateSchema.partial();

export const ActivityCreateSchema = z.object({
  lead_id: z.string().uuid(),
  type: z.enum(['call', 'email', 'meeting', 'viewing', 'note', 'whatsapp']),
  notes: z.string().min(1, 'Notes are required').max(2000),
});

export const clientSchema = z.object({
  full_name: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Invalid email address').optional().nullable(),
  phone: z.string().min(8, 'Invalid phone number').max(20).optional().nullable(),
  type: z.enum(['buyer', 'seller', 'tenant', 'investor']),
  nationality: z.string().optional().nullable(),
});

export const dealSchema = z.object({
  client_id: z.string().uuid(),
  property_id: z.string().uuid(),
  agreed_price: z.number().positive('Price must be positive'),
  deal_type: z.enum(['sale', 'rental', 'resale']),
  closing_date: z.string().optional().nullable(),
  status: z.enum(['draft', 'active', 'negotiation', 'closed', 'cancelled']).default('draft'),
});

export const agencySchema = z.object({
  name: z.string().min(2, 'Agency name is required').max(100),
  slug: z.string().min(3, 'Slug is too short').max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name is required').max(100),
  role: z.enum(['admin', 'manager', 'agent']),
});

export const taskSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  due_date: z.string().datetime().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
});

export type TaskUpdateInput = z.infer<typeof taskSchema>;

export type LeadCreateInput = z.infer<typeof LeadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof LeadUpdateSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type DealInput = z.infer<typeof dealSchema>;
