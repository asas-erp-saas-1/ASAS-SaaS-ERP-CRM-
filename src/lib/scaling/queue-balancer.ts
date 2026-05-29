import { redis } from '../cache/redis';

export interface JobConfig {
  tenantId: string;
  queueName: string;
  payload: any;
}

export class QueueBalancer {
  static async enqueueFair(config: JobConfig) {
    const depthKey = `queue_depth:${config.tenantId}`;
    const currentDepth = await redis.get<number>(depthKey) || 0;
    
    // Adaptive priority to prevent "Noisy Neighbor" starvation
    let priorityClass = 'high_priority_lane';
    
    if (currentDepth > 100) {
       priorityClass = 'standard_lane';
    }
    if (currentDepth > 1000) {
       priorityClass = 'throttled_lane';
    }
    
    // Increment depth counter
    await redis.set(depthKey, currentDepth + 1, { ex: 300 });
    
    return {
      success: true,
      assignedLane: priorityClass,
      jobData: config.payload
    };
  }
  
  static async acknowledgeCompletion(tenantId: string) {
    const depthKey = `queue_depth:${tenantId}`;
    const currentDepth = await redis.get<number>(depthKey) || 0;
    if (currentDepth > 0) {
      await redis.set(depthKey, currentDepth - 1, { ex: 300 });
    }
  }
}
