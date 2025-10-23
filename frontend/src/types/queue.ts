export interface Message {
  id: string;
  content: any;
  timestamp: string;
  queueName: string;
}

export interface Queue {
  name: string;
  messageCount: number;
  createdAt: string;
}

export interface EnqueueResponse {
  success: boolean;
  queue: string;
  timestamp: string;
}

export interface QueueInfo {
  queue: string;
  depth: number;
  firstEnqueueTime: string | null;
  lastEnqueueTime: string | null;
  lastDequeueTime: string | null;
  exists: boolean;
}

export interface QueueMetrics {
  queue: string;
  depth: number;
  totalEnqueued: number;
  totalDequeued: number;
  enqueuedLast24h: number;
  dequeuedLast24h: number;
  avgWaitTimeMs: number | null;
  oldestMessageAge: number | null;
}

export interface SystemStats {
  totalQueues: number;
  totalMessages: number;
  totalEnqueuedLast24h: number;
  totalDequeuedLast24h: number;
  topQueues: Array<{
    name: string;
    depth: number;
    enqueuedLast24h: number;
  }>;
}
