import { enforceExecution } from '../enforcement/core';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

async function getSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              (cookieStore as any).set(name, value, options);
            });
          } catch (_) { /* Middleware handles actual cookie setting */ }
        },
      },
    }
  );
}

const kernelCore: IKernel = {
  identity: async (): Promise<KernelIdentity> => {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }
    
    // We should fetch the tenant from the profiles table using `agency_id` mapping.
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.agency_id) {
      throw new Error('Tenant isolation failure: User is not associated with any agency.');
    }

    return {
      userId: user.id,
      tenantId: profile.agency_id,
      role: profile.role || 'agent',
      sessionId: 'session',
      deviceId: 'server'
    };
  },
  query: async <T>(tableName: string, options?: QueryOptions): Promise<T[]> => {
    const supabase = await getSupabaseClient();
    let q = supabase.from(tableName).select(options?.select || '*');
    if (options?.filters) {
      for (const [k, v] of Object.entries(options.filters)) {
        if (v === null) {
          q = q.is(k, null);
        } else if (Array.isArray(v)) {
          q = q.in(k, v);
        } else {
          q = q.eq(k, v);
        }
      }
    }
    if (options?.orderBy) {
      q = q.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }
    if (options?.limit) {
      const from = options?.offset || 0;
      const to = from + options.limit - 1;
      q = q.range(from, to);
    }
    const { data, error } = await q;
    if (error) throw new Error(`Query failed on ${tableName}: ${error.message}`);
    return data as T[];
  },
  mutate: async <T>(
    tableName: string, 
    action: 'INSERT' | 'UPDATE' | 'DELETE', 
    data: any, 
    match?: Record<string, any>
  ): Promise<T> => {
    const supabase = await getSupabaseClient();
    let q = supabase.from(tableName);
    let result;
    
    if (action === 'INSERT') {
      result = await q.insert(data).select().single();
    } else if (action === 'UPDATE') {
      let u = q.update(data);
      if (match) {
        for (const [k, v] of Object.entries(match)) u = u.eq(k, v);
      }
      result = await u.select().single();
    } else if (action === 'DELETE') {
      let d = q.delete();
      if (match) {
        for (const [k, v] of Object.entries(match)) d = d.eq(k, v);
      }
      result = await d.select().single();
    }
    
    if (result?.error) throw new Error(`Mutation ${action} failed on ${tableName}: ${result.error.message}`);
    return result?.data as T;
  },
  transaction: async <T>(
    callback: (txKernel: Omit<IKernel, 'transaction'>) => Promise<T>
  ): Promise<T> => {
    // Supabase JS doesn't have true transactions over REST, so we run sequentially.
    return callback(kernelCore);
  }
};

export const kernel = enforceExecution(kernelCore);
