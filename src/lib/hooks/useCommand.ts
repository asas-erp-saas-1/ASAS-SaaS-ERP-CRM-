// src/lib/hooks/useCommand.ts
'use client'

import { useState } from 'react'

export interface Command {
  commandId: string;
  aggregateId: string;
  type: string;
  expectedVersion: number;
  payload: any;
}

interface UseCommandOptions {
  onSuccess?: (data?: any) => void;
  onRollback?: (error: string) => void;
}

export function useCommandDispatch(options?: UseCommandOptions) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = async (command: Command) => {
    setIsExecuting(true);
    setError(null);

    try {
      // 1. You could execute an optimistic transition right here if you passed state up.
      
      // 2. Physical execution through standard Gateway
      const res = await fetch('/api/command-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // 409 conflict
        if (res.status === 409 || data.error?.includes('version mismatch')) {
           throw new Error('Version Conflict: The entity was modified by another user. Please refresh and try again.');
        }
        throw new Error(data.error || 'Command failed');
      }

      if (options?.onSuccess) {
        options.onSuccess(data.data);
      }
      return data;
    } catch (err: any) {
      setError(err.message);
      if (options?.onRollback) {
        options.onRollback(err.message);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  return { dispatch, isExecuting, error };
}
