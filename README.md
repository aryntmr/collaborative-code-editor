# Sync Code: Realtime Collaborative Code Editor

## Introduction

Tired of emailing code snippets or struggling with screen sharing for debugging? **Sync Code** transforms the way you collaborate on code. This intuitive real-time collaborative editor enables developers and teams to write, debug, and iterate together—no matter where they are. With **Sync Code**, you can code together, debug together, and ship faster.

## Features

- Real-time collaborative code editing with multiple users in a shared room
- Instant change synchronization across all connected clients
- Copy Room ID button for quick sharing
- Leave Room button for seamless exit
- Syntax highlighting for multiple programming languages
- Theme customization based on user preference
- Rejoin rooms at any time to continue editing
- Real-time updates when users join or leave

---

## Prerequisites

### Running via Docker
- Docker **25.0.4**
- Docker Compose **1.29.2**

### Running Locally
- Node.js **v20.11.1**
- npm **10.2.4**
- pm2 **5.3.1** (install globally using `npm i -g pm2`)

> **Tip:** Node version management can be simplified using [nvm](https://github.com/nvm-sh/nvm) (v0.39.7).

---

## Tech Stack

- **Frontend:** React.js, CodeMirror, React-Toastify  
- **Backend:** Node.js, Express.js, Socket.io  

---

## Load Testing & Performance

Test the scalability of your deployment to understand capacity limits:

```bash
# Start server
SERVER_PORT=5001 node server.js

# Run load test (default: 10 users, 5/room, 30s)
npm run load-test

# Custom test
npm run load-test -- --users 50 --room 5

# View results
npm run load-test -- --view
npm run load-test -- --view all
npm run load-test -- --compare
```

### Tested Performance Results (Single Node)
- **1-25 users**: Excellent (<100ms latency) ✅
- **25-30 users**: Good (~167ms latency) ✅
- **30-40 users**: Fair (estimated) ⚠️
- **50+ users**: Poor (>700ms latency) ❌

� **Full Results:** See [TEST_RESULTS.md](./TEST_RESULTS.md) for detailed testing data and optimization strategies.

---

## Installation

### Option 1: Using Pre-Built Docker Image (Recommended)
1. Install [Docker](https://www.docker.com/).
2. Pull the image:
   ```bash
   docker pull mohitur/code-editor
3. Run the container:
   ```bash
   docker run -p 8000:8000 -p 3000:3000 -p 5000:5000 mohitur/code-editor
4. Visit http://localhost:3000.
5. Create a room and set a username.
6. Click Copy ROOM ID to share with collaborators.
7. In another browser/incognito tab, join with the same Room ID.
