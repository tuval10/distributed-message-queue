Overview

Build and deploy a distributed message queue service using Node.js with TypeScript.
You may use AI tools to assist you, but your submission should reflect clear design reasoning and tradeoff awareness, not just generated code.

⸻

Requirements

1.⁠ ⁠REST API

Implement a backend exposing:
• POST /api/{queue_name} – Add a JSON message to the queue.
• GET /api/{queue_name}?timeout={ms} – Retrieve and remove the next message.
• If the queue is empty wait for a new message for <timeout> and if it's added by this timeout dequeue it immediately
• Return 204 if no message is available after the timeout (default: 10s).

Queues are created dynamically on first use.

⸻

2.⁠ ⁠Distributed Behavior

Multiple backend instances must operate as one logical queue:
• Messages added to one instance are available to all.
• No duplicates or message loss.
• Use Redis, a database, or any coordination layer of your choice.
