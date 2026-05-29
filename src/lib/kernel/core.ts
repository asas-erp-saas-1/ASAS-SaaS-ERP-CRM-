import { enforceExecution } from '../enforcement/core';
import { prisma } from '../db/prisma';
import { Prisma, PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';
import { JWTService } from '../auth/jwt';
import { ErrorTracker } from '../observability/errors';

export type KernelIdentity = {
  userId: string;
  tenantId: string;
  role: 'owner' | 'manager' | 'agent' | 'accountant';
  sessionId: string;
  deviceId: string;
};

type QueryOptions = {
  select?: string;
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
};

export interface IKernel {
  identity(): Promise<KernelIdentity>;
  query<T>(tableName: string, options?: QueryOptions): Promise<T[]>;
  mutate<T>(
    tableName: string, 
    action: 'INSERT' | 'UPDATE' | 'DELETE', 
    data: any, 
    match?: Record<string, any>
  ): Promise<T>;
  transaction<T>(
    callback: (txKernel: Omit<IKernel, 'transaction'>) => Promise<T>
  ): Promise<T>;
}

// -------------------------------------------------------------------------
// PRISMA TRANSLATOR INTERNAL UTILITIES
// -------------------------------------------------------------------------

/**
 * Maps legacy snake_case database tables to camelCase Prisma models.
 */
function mapTableToPrismaModel(tableName: string): string {
  const modelMapping: Record<string, string> = {
    'leads': 'lead',
    'deals': 'deal',
    'projects': 'project',
    'properties': 'property',
    'clients': 'client',
    'activities': 'activity',
    'documents': 'document',
    'tasks': 'task',
    'contractors': 'contractor',
    'developers': 'developer',
    'users': 'user',
    'tenants': 'tenant',
    'profiles': 'user',
    'kpi_snapshots': 'kpiSnapshot',
    'operational_alerts': 'operationalAlert',
    'deal_payments': 'dealPayment',
    'commission_payments': 'commissionPayment',
    'expenses': 'expense',
    'journal_entries': 'journalEntry',
    'journal_lines': 'journalLine',
    'ai_document_analyses': 'aiDocumentAnalysis',
    'finance_snapshot': 'financeSnapshot'
  };

  return modelMapping[tableName] || tableName;
}

/**
 * Normalizes query filters into Prisma's `where` input structure safely.
 */
function translateFiltersToWhere(filters?: Record<string, any>): any {
  if (!filters) return {};
  const where: any = {};
  
  for (const [k, v] of Object.entries(filters)) {
    const prismaKey = k === 'agency_id' ? 'tenantId' : k;
    if (v === null) {
      where[prismaKey] = null;
    } else if (Array.isArray(v)) {
      where[prismaKey] = { in: v };
    } else {
      where[prismaKey] = v;
    }
  }
  return where;
}

// -------------------------------------------------------------------------
// KERNEL IMPLEMENTATION
// -------------------------------------------------------------------------

class KernelCore implements IKernel {
  private client: typeof prisma | Prisma.TransactionClient;

  constructor(client: typeof prisma | Prisma.TransactionClient = prisma) {
    this.client = client;
  }

  async identity(): Promise<KernelIdentity> {
    const reqHeaders = await headers();
    let token = '';

    const authHeader = reqHeaders.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      // Fallback to cookie
      const cookieHeader = reqHeaders.get('cookie') || '';
      const match = cookieHeader.match(/asas_access_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (!token) {
      throw new Error('Unauthorized: Missing token');
    }

    const payload = await JWTService.verifyAccessToken(token);

    if (!payload || !payload.userId || !payload.tenantId) {
      throw new Error('Unauthorized: Token invalid or expired');
    }

    return {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: (payload.roles && payload.roles[0] as any) || 'agent',
      sessionId: payload.sessionId,
      deviceId: 'api-layer'
    };
  }

  async query<T>(tableName: string, options?: QueryOptions): Promise<T[]> {
    const modelName = mapTableToPrismaModel(tableName);
    const delegate = (this.client as any)[modelName];

    if (!delegate) {
      throw new Error(`Prisma model '${modelName}' not found. Cannot execute query.`);
    }

    const args: any = {
      where: translateFiltersToWhere(options?.filters),
    };

    if (options?.limit) {
      args.take = options.limit;
      if (options?.offset) {
        args.skip = options.offset;
      }
    }

    if (options?.orderBy) {
      args.orderBy = {
        [options.orderBy.column]: options.orderBy.ascending === false ? 'desc' : 'asc'
      };
    }

    // Attempting rudimentary selection parsing to preserve relational payloads
    // Example legacy select: '*, profiles(full_name)'
    if (options?.select && options.select !== '*') {
      // NOTE: We do not parse deep nested selects perfectly yet. 
      // If a route relies on strict relations here, they will fetch all scalars.
    }

    try {
      const data = await delegate.findMany(args);
      return data as T[];
    } catch (error: any) {
      ErrorTracker.captureError(error, { context: 'Prisma.query', model: modelName });
      throw new Error(`Prisma query failed on ${tableName}: ${error.message}`);
    }
  }

  async mutate<T>(
    tableName: string, 
    action: 'INSERT' | 'UPDATE' | 'DELETE', 
    data: any, 
    match?: Record<string, any>
  ): Promise<T> {
    const modelName = mapTableToPrismaModel(tableName);
    const delegate = (this.client as any)[modelName];

    if (!delegate) {
      throw new Error(`Prisma model '${modelName}' not found. Cannot execute mutate.`);
    }

    const where = translateFiltersToWhere(match);

    try {
      let result;
      switch (action) {
        case 'INSERT':
          result = await delegate.create({ data });
          break;
        case 'UPDATE':
          // We assume match will uniquely identify the row if possible, 
          // but updateMany allows bulk. If returning specific data is required:
          const updated = await delegate.updateMany({ where, data });
          
          // Mimic returning the row (Prisma updateMany returns { count }, 
          // so we attempt to fetch one back to preserve legacy contract)
          result = await delegate.findFirst({ where }); 
          break;
        case 'DELETE':
          await delegate.deleteMany({ where });
          result = { success: true };
          break;
      }
      
      return result as T;
    } catch (error: any) {
      ErrorTracker.captureError(error, { context: 'Prisma.mutate', model: modelName, action });
      throw new Error(`Prisma mutation ${action} failed on ${tableName}: ${error.message}`);
    }
  }

  async transaction<T>(
    callback: (txKernel: Omit<IKernel, 'transaction'>) => Promise<T>
  ): Promise<T> {
    // If we are already in a transaction, reuse it to avoid nested transaction errors natively.
    if ((this.client as any).$transaction === undefined) {
      // Recursive transaction fallback (already inside tx)
      return callback(this);
    }
    
    return (this.client as PrismaClient).$transaction(async (txClient) => {
      const txKernel = new KernelCore(txClient);
      const enforcedTxKernel = enforceExecution(txKernel as IKernel);
      return callback(enforcedTxKernel);
    });
  }
}

const kernelCore: IKernel = new KernelCore();

export const kernel = enforceExecution(kernelCore);
