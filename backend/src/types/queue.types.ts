export interface QueueMessage {
  id: string;
  payload: any;
  enqueuedAt: string;
  dequeuedAt?: string;
}

export interface QueueInfo {
  name: string;
  depth: number;
  stats: {
    totalEnqueued: number;
    totalDequeued: number;
    oldestMessageAge: number | null;
    newestMessageAge: number | null;
  };
  createdAt?: string;
  lastActivity?: string;
}

export interface QueueListItem {
  name: string;
  depth: number;
  oldestMessageAge: number | null;
  createdAt?: string;
}

export interface SystemStats {
  queues: {
    total: number;
    active: number;
    empty: number;
  };
  messages: {
    totalDepth: number;
    totalEnqueued?: number;
    totalDequeued?: number;
  };
  redis: {
    memoryUsed: string;
    connectedClients?: number;
    uptime?: number;
  };
  timestamp: string;
}

export interface QueueMetrics {
  queue: string;
  metrics: {
    depth: number;
    enqueueRate: {
      perSecond: number;
      perMinute: number;
      perHour: number;
    };
    dequeueRate: {
      perSecond: number;
      perMinute: number;
      perHour: number;
    };
    averageWaitTime: number;
    oldestMessageAge: number | null;
  };
  timestamp: string;
}
