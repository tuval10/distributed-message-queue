# Frontend Screens

## 1. Queue Dashboard (`/`)

Shows list of all queues with a form/button to create new queues.

**Features:**

- View all existing queues
- Create new queue dialog
- Click queue card to navigate to details
- Display message count per queue

## 2. Queue Details (`/queue/:queueName`)

Displays messages in the selected queue, with controls to send new messages and consume/delete messages.

**Features:**

- Send messages (JSON or text)
- Consume next message (FIFO)
- View queue depth
- Message preview (mock mode only)
- Consumed message dialog
