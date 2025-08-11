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
