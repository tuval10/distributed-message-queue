# BE server:

[project backend is deployed in ](https://message-queue-api-156591205769.us-central1.run.app)

## Testing

````bash
export SERVICE_URL="https://message-queue-api-156591205769.us-central1.run.app'
curl $SERVICE_URL/health

# Test enqueue
curl -X POST $SERVICE_URL/api/test \
 -H "Content-Type: application/json" \
 -d '{"message": "Hello from Cloud Run!"}'

# Test dequeue
curl "$SERVICE_URL/api/test?timeout=5000"
```bash
````

# FE server

Deployed [here](https://message-queue-frontend-156591205769.us-central1.run.app/)
