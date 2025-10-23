import axios from "axios";
import { config } from "../config/env";
import { mockApi } from "./mock-data";
import {
  Queue,
  Message,
  EnqueueResponse,
  QueueInfo,
  QueueMetrics,
  SystemStats,
} from "../types/queue";

const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// Real API implementation
const realApi = {
  // GET /internal/queues - List all queues
  async getQueues(): Promise<Queue[]> {
    try {
      const response = await apiClient.get("/internal/queues");
      const queues = response.data.queues || [];
      return queues.map((q: any) => ({
        name: q.name,
        messageCount: q.depth || 0,
        createdAt: q.createdAt || new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Failed to fetch queues:", error);
      return [];
    }
  },

  async createQueue(queueName: string): Promise<void> {
    await apiClient.post("/internal/queues", { name: queueName });
  },

  // POST /internal/queues/{queue_name}/messages - Enqueue message
  async enqueueMessage(
    queueName: string,
    message: any
  ): Promise<EnqueueResponse> {
    const response = await apiClient.post(
      `/internal/queues/${queueName}/messages`,
      { message }
    );
    return response.data;
  },

  // POST /internal/queues/{queue_name}/messages/bulk - Bulk enqueue
  async bulkEnqueue(
    queueName: string,
    messages: any[]
  ): Promise<{ success: boolean; count: number; timestamp: string }> {
    const response = await apiClient.post(
      `/internal/queues/${queueName}/messages/bulk`,
      { messages }
    );
    return response.data;
  },

  // GET /internal/queues/{queue_name}/messages - Dequeue message
  async dequeueMessage(
    queueName: string,
    timeout: number = 5000
  ): Promise<Message | null> {
    try {
      const response = await apiClient.get(
        `/internal/queues/${queueName}/messages`,
        {
          params: { timeout },
          timeout: timeout + 1000, // Add buffer to axios timeout
        }
      );

      if (response.status === 204) {
        return null;
      }

      return {
        id: response.data.id,
        content: response.data.payload,
        timestamp: response.data.enqueuedAt,
        queueName,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 204) {
        return null;
      }
      throw error;
    }
  },

  // GET /internal/queues/{queue_name}/messages/peek - Peek at messages
  async peekMessages(
    queueName: string,
    limit: number = 20
  ): Promise<Message[]> {
    try {
      const response = await apiClient.get(
        `/internal/queues/${queueName}/messages/peek`,
        {
          params: { count: limit },
        }
      );

      return response.data.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.payload,
        timestamp: msg.enqueuedAt,
        queueName,
      }));
    } catch (error) {
      console.error("Failed to peek messages:", error);
      return [];
    }
  },

  async getQueueDepth(queueName: string): Promise<number> {
    try {
      const response = await apiClient.get(
        `/internal/queues/${queueName}/messages/peek`,
        {
          params: { count: 1 },
        }
      );
      return response.data.totalDepth || 0;
    } catch (error) {
      return 0;
    }
  },

  // DELETE /internal/queues/{queue_name}/messages - Purge queue
  async purgeQueue(
    queueName: string
  ): Promise<{ success: boolean; purgedCount: number }> {
    const response = await apiClient.delete(
      `/internal/queues/${queueName}/messages`
    );
    return response.data;
  },

  // GET /internal/queues/{queue_name} - Get queue info
  async getQueueInfo(queueName: string): Promise<QueueInfo> {
    const response = await apiClient.get(`/internal/queues/${queueName}`);
    return response.data;
  },

  // DELETE /internal/queues/{queue_name} - Delete queue
  async deleteQueue(queueName: string): Promise<void> {
    await apiClient.delete(`/internal/queues/${queueName}`);
  },

  // GET /internal/queues/{queue_name}/metrics - Get queue metrics
  async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    const response = await apiClient.get(
      `/internal/queues/${queueName}/metrics`
    );
    return response.data;
  },

  // GET /api/stats - Get system statistics
  async getSystemStats(): Promise<SystemStats> {
    const response = await apiClient.get("/api/stats");
    return response.data;
  },
};

// Export the appropriate API based on config
export const api = config.useMockData ? mockApi : realApi;
