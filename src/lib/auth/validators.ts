import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantId: z.string().uuid().optional(),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  tenantName: z.string().min(2),
});

export const SessionPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  roles: z.array(z.string()),
});

export type SessionPayload = z.infer<typeof SessionPayloadSchema>;
