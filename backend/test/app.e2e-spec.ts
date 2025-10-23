import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Queue API', () => {
    const testQueueName = 'test-queue-' + Date.now();

    it('POST /api/{queue_name} - should enqueue a message', async () => {
      const message = { text: 'Hello, Queue!' };

      const response = await request(app.getHttpServer())
        .post(`/api/${testQueueName}`)
        .send(message)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('queue', testQueueName);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('GET /api/{queue_name} - should dequeue a message and return 200', async () => {
      const message = { text: 'Test message' };

      // First, enqueue a message
      await request(app.getHttpServer())
        .post(`/api/${testQueueName}-dequeue`)
        .send(message)
        .expect(201);

      // Then, dequeue it
      const response = await request(app.getHttpServer())
        .get(`/api/${testQueueName}-dequeue`)
        .expect(200);

      expect(response.body).toEqual(message);
    });

    it('GET /api/{queue_name} - should return 204 when no message is available after timeout', async () => {
      const emptyQueueName = 'empty-queue-' + Date.now();

      // Try to dequeue from an empty queue with a short timeout
      const response = await request(app.getHttpServer())
        .get(`/api/${emptyQueueName}`)
        .query({ timeout: '1000' }) // 1 second timeout
        .expect(204);

      // 204 should have no body
      expect(response.body).toEqual({});
    });

    it('GET /api/{queue_name} - should use default timeout of 10 seconds', async () => {
      const emptyQueueName = 'empty-queue-default-' + Date.now();

      // This will take ~10 seconds to complete due to default timeout
      // Note: In a real scenario, you might want to mock this or use a shorter timeout for testing
      const startTime = Date.now();
      await request(app.getHttpServer())
        .get(`/api/${emptyQueueName}`)
        .expect(204);
      const duration = Date.now() - startTime;

      // Should be roughly 10 seconds (allow some variance)
      expect(duration).toBeGreaterThanOrEqual(9000);
      expect(duration).toBeLessThan(12000);
    });

    it('GET /api/{queue_name} - should handle custom timeout parameter', async () => {
      const emptyQueueName = 'empty-queue-custom-' + Date.now();

      const startTime = Date.now();
      await request(app.getHttpServer())
        .get(`/api/${emptyQueueName}`)
        .query({ timeout: '2000' }) // 2 second timeout
        .expect(204);
      const duration = Date.now() - startTime;

      // Should be roughly 2 seconds
      expect(duration).toBeGreaterThanOrEqual(1800);
      expect(duration).toBeLessThan(3000);
    });

    it('GET /api/{queue_name} - should immediately return message when enqueued during wait', async () => {
      const blockingQueueName = 'blocking-queue-' + Date.now();
      const testMessage = { data: 'Message during wait', id: 123 };

      const startTime = Date.now();

      // Start dequeue request with 10 second timeout (will wait for message)
      const dequeuePromise = request(app.getHttpServer())
        .get(`/api/${blockingQueueName}`)
        .query({ timeout: '10000' })
        .expect(200);

      // Wait a bit to ensure the dequeue is blocking
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Enqueue a message while the dequeue is waiting
      await request(app.getHttpServer())
        .post(`/api/${blockingQueueName}`)
        .send(testMessage)
        .expect(201);

      // The dequeue should immediately return the message
      const response = await dequeuePromise;
      const duration = Date.now() - startTime;

      // Should complete quickly (well under the 10s timeout)
      expect(duration).toBeLessThan(5000);
      // Should receive the message that was enqueued
      expect(response.body).toEqual(testMessage);
    });
  });
});
