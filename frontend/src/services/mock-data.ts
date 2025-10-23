import {
  Queue,
  Message,
  EnqueueResponse,
  QueueInfo,
  QueueMetrics,
  SystemStats,
} from "../types/queue";

// Mock data storage
const mockQueues = new Map<string, Message[]>();
const mockQueueMetadata = new Map<
  string,
  { created: number; enqueued: number; dequeued: number }
>();

// Initialize with some sample data
const sampleQueues = ["orders", "notifications", "emails"];
sampleQueues.forEach((name, idx) => {
  const messages: Message[] = [];
  for (let i = 0; i < idx + 1; i++) {
    messages.push({
      id: `${name}-${i}`,
      content: { text: `Sample message ${i} for ${name}`, data: { index: i } },
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      queueName: name,
    });
  }
  mockQueues.set(name, messages);
  mockQueueMetadata.set(name, {
    created: Date.now() - Math.random() * 86400000,
    enqueued: idx + 5,
    dequeued: idx + 3,
  });
});

export const mockApi = {
  // GET /internal/queues - List all queues
  async getQueues(): Promise<Queue[]> {
    await delay(300);
    return Array.from(mockQueues.entries()).map(([name, messages]) => ({
      name,
      messageCount: messages.length,
      createdAt: new Date(
        mockQueueMetadata.get(name)?.created || Date.now()
      ).toISOString(),
    }));
  },

  // Create a queue
  async createQueue(queueName: string): Promise<void> {
    await delay(200);
    if (!mockQueues.has(queueName)) {
      mockQueues.set(queueName, []);
      mockQueueMetadata.set(queueName, {
        created: Date.now(),
        enqueued: 0,
        dequeued: 0,
      });
    }
  },

  // POST /internal/queues/{queue_name}/messages - Enqueue a message
  async enqueueMessage(
    queueName: string,
    message: any
  ): Promise<EnqueueResponse> {
    await delay(200);

    if (!mockQueues.has(queueName)) {
      mockQueues.set(queueName, []);
      mockQueueMetadata.set(queueName, {
        created: Date.now(),
        enqueued: 0,
        dequeued: 0,
      });
    }

    const messages = mockQueues.get(queueName)!;
    const metadata = mockQueueMetadata.get(queueName)!;

    const newMessage: Message = {
      id: `${queueName}-${Date.now()}-${Math.random()}`,
      content: message,
      timestamp: new Date().toISOString(),
      queueName,
    };

    messages.push(newMessage);
    metadata.enqueued++;

    return {
      success: true,
      queue: queueName,
      timestamp: new Date().toISOString(),
    };
  },

  // POST /internal/queues/{queue_name}/messages/bulk - Bulk enqueue
  async bulkEnqueue(
    queueName: string,
    messages: any[]
  ): Promise<{ success: boolean; count: number; timestamp: string }> {
    await delay(300);

    if (!mockQueues.has(queueName)) {
      mockQueues.set(queueName, []);
      mockQueueMetadata.set(queueName, {
        created: Date.now(),
        enqueued: 0,
        dequeued: 0,
      });
    }

    const queueMessages = mockQueues.get(queueName)!;
    const metadata = mockQueueMetadata.get(queueName)!;

    messages.forEach((msg) => {
      const newMessage: Message = {
        id: `${queueName}-${Date.now()}-${Math.random()}`,
        content: msg,
        timestamp: new Date().toISOString(),
        queueName,
      };
      queueMessages.push(newMessage);
      metadata.enqueued++;
    });

    return {
      success: true,
      count: messages.length,
      timestamp: new Date().toISOString(),
    };
  },

  // GET /internal/queues/{queue_name}/messages - Dequeue a message
  async dequeueMessage(
    queueName: string,
    timeout: number = 5000
  ): Promise<Message | null> {
    await delay(Math.min(timeout, 1000));

    const messages = mockQueues.get(queueName);
    if (!messages || messages.length === 0) {
      return null;
    }

    const metadata = mockQueueMetadata.get(queueName);
    if (metadata) {
      metadata.dequeued++;
    }

    const message = messages.shift()!;
    return message;
  },

  // GET /internal/queues/{queue_name}/messages/peek - Peek at messages
  async peekMessages(
    queueName: string,
    limit: number = 10
  ): Promise<Message[]> {
    await delay(200);
    const messages = mockQueues.get(queueName);
    if (!messages) {
      return [];
    }
    return messages.slice(0, limit);
  },

  // Get queue depth (for display purposes)
  async getQueueDepth(queueName: string): Promise<number> {
    await delay(100);
    const messages = mockQueues.get(queueName);
    return messages ? messages.length : 0;
  },

  // DELETE /internal/queues/{queue_name}/messages - Purge queue
  async purgeQueue(
    queueName: string
  ): Promise<{ success: boolean; purgedCount: number }> {
    await delay(300);
    const messages = mockQueues.get(queueName);
    const count = messages ? messages.length : 0;
    if (messages) {
      messages.length = 0;
    }
    return { success: true, purgedCount: count };
  },

  // GET /internal/queues/{queue_name} - Get queue info
  async getQueueInfo(queueName: string): Promise<QueueInfo> {
    await delay(200);
    const messages = mockQueues.get(queueName);
    const exists = messages !== undefined;
    const metadata = mockQueueMetadata.get(queueName);

    return {
      queue: queueName,
      depth: messages?.length || 0,
      firstEnqueueTime: metadata
        ? new Date(metadata.created).toISOString()
        : null,
      lastEnqueueTime:
        messages && messages.length > 0
          ? messages[messages.length - 1].timestamp
          : null,
      lastDequeueTime: new Date(
        Date.now() - Math.random() * 3600000
      ).toISOString(),
      exists,
    };
  },

  // DELETE /internal/queues/{queue_name} - Delete a queue
  async deleteQueue(queueName: string): Promise<void> {
    await delay(300);
    mockQueues.delete(queueName);
    mockQueueMetadata.delete(queueName);
  },

  // GET /internal/queues/{queue_name}/metrics - Get queue metrics
  async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    await delay(250);
    const messages = mockQueues.get(queueName);
    const metadata = mockQueueMetadata.get(queueName);

    return {
      queue: queueName,
      depth: messages?.length || 0,
      totalEnqueued: metadata?.enqueued || 0,
      totalDequeued: metadata?.dequeued || 0,
      enqueuedLast24h: Math.floor((metadata?.enqueued || 0) * 0.6),
      dequeuedLast24h: Math.floor((metadata?.dequeued || 0) * 0.6),
      avgWaitTimeMs:
        messages && messages.length > 0 ? Math.random() * 5000 : null,
      oldestMessageAge:
        messages && messages.length > 0
          ? Date.now() - new Date(messages[0].timestamp).getTime()
          : null,
    };
  },

  // GET /api/stats - Get system statistics
  async getSystemStats(): Promise<SystemStats> {
    await delay(300);
    const allQueues = Array.from(mockQueues.entries());

    return {
      totalQueues: allQueues.length,
      totalMessages: allQueues.reduce((sum, [_, msgs]) => sum + msgs.length, 0),
      totalEnqueuedLast24h: Array.from(mockQueueMetadata.values()).reduce(
        (sum, meta) => sum + Math.floor(meta.enqueued * 0.6),
        0
      ),
      totalDequeuedLast24h: Array.from(mockQueueMetadata.values()).reduce(
        (sum, meta) => sum + Math.floor(meta.dequeued * 0.6),
        0
      ),
      topQueues: allQueues
        .map(([name, msgs]) => ({
          name,
          depth: msgs.length,
          enqueuedLast24h: Math.floor(
            (mockQueueMetadata.get(name)?.enqueued || 0) * 0.6
          ),
        }))
        .sort((a, b) => b.depth - a.depth)
        .slice(0, 5),
    };
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
