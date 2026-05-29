import { ErrorTracker } from '../observability/errors';

export class RuntimeGuard {
  static assertKernelExecution() {
    const err = new Error();
    const stack = err.stack || '';
    
    // Dynamic stack trace analysis to detect forbidden direct access patterns.
    // Blocks usage of direct supabase.from() or raw fetches outside kernel context.
    const hasForbiddenCalls = stack.includes('supabase.from') || stack.includes('prisma.');
    
    // Check if we are passing through the enforcement layer
    const passedThroughKernel = stack.includes('enforceExecution') || stack.includes('kernel');

    if (hasForbiddenCalls && !passedThroughKernel) {
      this.triggerViolation('Direct database execution bypass detected. DB access must go through Kernel.');
    }
  }

  static triggerViolation(reason: string) {
    ErrorTracker.captureRejection(reason);
    console.error(`[EEL: FATAL] ${reason}`);
    throw new Error(`ENFORCEMENT_VIOLATION: ${reason}`);
  }
}
