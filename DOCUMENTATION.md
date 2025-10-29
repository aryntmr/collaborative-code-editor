# Collaborative Code Editor - Comprehensive Project Documentation

## Project Overview

A real-time collaborative code editor built with React.js and Node.js that allows multiple users to code together in the same virtual room. Users can see each other's code changes and cursor positions in real-time, execute code in multiple programming languages, and share files.

---

## Technology Stack

### Frontend
- **React.js 18.0.0** - UI framework for building the interactive interface
- **Recoil 0.7.0** - State management for language and theme preferences with localStorage persistence
- **React Router 6.3.0** - Client-side routing for navigation between home and editor pages
- **Socket.io-client 4.4.1** - WebSocket client for real-time bidirectional communication
- **CodeMirror 5.65.2** - In-browser code editor with syntax highlighting, 60+ themes, and 20+ language modes
- **React Hot Toast 2.2.0** - Toast notifications for user feedback
- **UUID 8.3.2** - Generating unique room IDs

### Backend
- **Node.js v25.0.0** - JavaScript runtime environment
- **Express.js 4.17.3** - Web server framework
- **Socket.io 4.4.1** - WebSocket server for real-time communication
- **Child Process (exec)** - For executing code in various languages

### Deployment
- **Docker** - Containerization with multi-stage build support
- **PM2** - Process manager for production deployment

---

## Architecture

### Client-Server Architecture
```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│                 │◄─────────────────────────►│                 │
│  React Client   │      Socket.io Events      │   Node Server   │
│  (Port 3000)    │                            │  (Port 5001)    │
│                 │                            │                 │
└─────────────────┘                            └─────────────────┘
        │                                              │
        ├─ CodeMirror Editor                          ├─ Room Management
        ├─ State Management (Recoil)                  ├─ Code Execution
        ├─ Socket Event Handlers                      ├─ Socket Broadcasting
        └─ File Upload/Download                       └─ User Tracking
```

### Real-Time Communication Flow

**1. User Joins Room:**
```
Client → JOIN {roomId, username}
Server → JOINED {clients, username, socketId} (broadcast to all in room)
Client → SYNC_CODE {socketId, code} (existing users send code to new joiner)
```

**2. Code Changes:**
```
User A types → CODE_CHANGE {roomId, code}
Server → CODE_CHANGE {code} (broadcast to all EXCEPT sender via socket.in())
User B receives → Editor updates with setValue()
```

**3. Cursor Movement:**
```
User A moves cursor → CURSOR_CHANGE {roomId, cursor, username}
Server → CURSOR_CHANGE {socketId, cursor, username} (broadcast to all EXCEPT sender)
User B receives → Creates/updates remote cursor widget at position
```

**4. Code Execution:**
```
User clicks Run → RUN_CODE {roomId, code, language}
Server → Executes code in temporary file
Server → CODE_OUTPUT {output} (broadcast to all in room)
All users → Display output panel
```

---

## Project Structure

```
collaborative-code-editor/
├── public/                  # Static assets
│   ├── index.html          # Main HTML template
│   ├── logo.png            # Application logo
│   ├── manifest.json       # PWA manifest
│   └── robots.txt          # SEO configuration
│
├── src/
│   ├── actions/
│   │   └── Actions.js      # Socket.io event constants
│   │
│   ├── components/
│   │   ├── Client.js       # Connected user avatar component
│   │   ├── Editor.js       # CodeMirror editor with real-time sync
│   │   └── Output.js       # Code execution output display panel
│   │
│   ├── pages/
│   │   ├── Home.js         # Landing page with room creation/joining
│   │   └── EditorPage.js   # Main editor page with sidebar controls
│   │
│   ├── App.css             # Global styles and component styles
│   ├── App.js              # Main app component with routing
│   ├── atoms.js            # Recoil state atoms (language, theme)
│   ├── index.css           # Root styles
│   ├── index.js            # React app entry point
│   ├── socket.js           # Socket.io client initialization
│   └── reportWebVitals.js  # Performance monitoring
│
├── server.js               # Express + Socket.io server
├── package.json            # Dependencies and scripts
├── Dockerfile              # Docker containerization
├── docker-compose.yml      # Docker compose configuration
├── .env                    # Environment variables
└── README.md               # Project documentation
```

---

## Detailed Component Breakdown

### 1. **server.js** - Backend Server

**Purpose:** Manages WebSocket connections, room-based communication, and code execution.

**Key Functions:**

- **`getAllConnectedClients(roomId)`**
  - Returns array of all users in a specific room
  - Maps socket IDs to usernames using `userSocketMap`

- **`executeCode(code, language, callback)`**
  - Writes code to temporary file in OS temp directory
  - Maps language to appropriate compiler/interpreter command
  - Executes with 5-second timeout and 1MB buffer limit
  - Cleans up temp files after execution
  - Supported languages: JavaScript (with print() alias), Python, C++, Java, Go, Rust, Ruby, PHP, Shell, R

**Socket Events Handled:**

- **JOIN**: User joins a room
  - Adds user to `userSocketMap`
  - Adds socket to room
  - Broadcasts JOINED to all clients in room

- **CODE_CHANGE**: Code modification
  - Broadcasts to all in room EXCEPT sender using `socket.in(roomId)`

- **SYNC_CODE**: New user syncing with existing code
  - Sends code to specific socket using `io.to(socketId)`

- **RUN_CODE**: Code execution request
  - Calls `executeCode()` function
  - Broadcasts output to entire room

- **CURSOR_CHANGE**: Cursor position update
  - Broadcasts cursor position and username to all EXCEPT sender

- **disconnecting**: User leaving
  - Broadcasts DISCONNECTED to room
  - Removes from `userSocketMap`

**Language Configuration Example:**
```javascript
'javascript': {
    ext: 'js',
    cmd: (file) => `node ${file}`,
    wrapCode: (code) => `const print = console.log;\n${code}`
}
```

---

### 2. **src/socket.js** - Socket Client Initialization

**Purpose:** Establishes WebSocket connection to backend server.

```javascript
export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
    };
    return io(REACT_APP_BACKEND_URL, options);
};
```

---

### 3. **src/actions/Actions.js** - Event Constants

**Purpose:** Centralized constants for Socket.io event names to prevent typos.

```javascript
const ACTIONS = {
    JOIN: 'join',
    JOINED: 'joined',
    DISCONNECTED: 'disconnected',
    CODE_CHANGE: 'code-change',
    SYNC_CODE: 'sync-code',
    LEAVE: 'leave',
    RUN_CODE: 'run-code',
    CODE_OUTPUT: 'code-output',
    CURSOR_CHANGE: 'cursor-change',
};
```

---

### 4. **src/atoms.js** - Recoil State Management

**Purpose:** Global state atoms with localStorage persistence.

```javascript
export const language = atom({
    key: 'language',
    default: localStorage.getItem('language') || 'javascript',
});

export const cmtheme = atom({
    key: 'cmtheme',
    default: localStorage.getItem('cmtheme') || 'monokai',
});
```

**State Updates:**
- When language/theme changes, localStorage is updated
- Page refreshes to apply CodeMirror settings

---

### 5. **src/pages/Home.js** - Landing Page

**Purpose:** Room creation and joining interface.

**Features:**
- **Create Room**: Generates UUID, navigates to `/editor/:roomId`
- **Join Room**: Validates room ID and username inputs
- **Form Validation**: Ensures both fields are filled
- **Navigation**: Uses React Router's `useNavigate()` with state passing

**User Flow:**
```
1. User enters username
2. User enters/generates room ID
3. Clicks "Join" → Navigates to EditorPage with {username} in location.state
```

---

### 6. **src/pages/EditorPage.js** - Main Editor Page

**Purpose:** Main collaborative editing interface with sidebar controls.

**State Management:**
- `clients` - Array of connected users
- `output` - Code execution results
- `showOutput` - Output panel visibility
- `lang` - Current programming language (from Recoil)
- `them` - Current CodeMirror theme (from Recoil)

**Key Functions:**

**`copyRoomId()`**
- Uses Clipboard API to copy room ID
- Shows toast notification

**`runCode()`**
- Validates code exists
- Emits RUN_CODE event to server
- Shows loading toast

**`downloadCode()`**
- Maps language to file extension (20+ formats)
- Creates Blob from code
- Triggers browser download with timestamp filename
- Example: `code_1761691119558.js`

**`uploadCode(event)`**
- Reads file using FileReader API
- Broadcasts CODE_CHANGE to sync with all users
- Updates local codeRef
- Accepts 20+ file extensions

**Socket Event Listeners:**

**JOINED**
```javascript
({clients, username, socketId}) => {
    if (username !== location.state?.username) {
        toast.success(`${username} joined`);
    }
    setClients(clients);
    socketRef.current.emit(ACTIONS.SYNC_CODE, {
        code: codeRef.current,
        socketId,
    });
}
```

**DISCONNECTED**
```javascript
({socketId, username}) => {
    toast.success(`${username} left`);
    setClients(prev => prev.filter(client => client.socketId !== socketId));
}
```

**CODE_OUTPUT**
```javascript
({output}) => {
    setOutput(output);
    setShowOutput(true);
    toast.success/error based on output.success
}
```

**UI Structure:**
```
┌─────────────────────────────────────────────────┐
│  Sidebar (230px)         │   Editor Panel       │
│  ┌───────────────────┐   │                      │
│  │ Logo              │   │   CodeMirror         │
│  │ Connected Users   │   │   Editor             │
│  │ Language Select   │   │                      │
│  │ Theme Select      │   │                      │
│  │ Copy Room ID      │   │                      │
│  │ Run Code          │   │                      │
│  │ Upload/Download   │   │                      │
│  │ Leave Room        │   │                      │
│  └───────────────────┘   │                      │
│                           │   Output Panel (floating)│
└─────────────────────────────────────────────────┘
```

---

### 7. **src/components/Editor.js** - CodeMirror Integration

**Purpose:** Real-time collaborative code editor with cursor tracking.

**Refs:**
- `editorRef` - CodeMirror instance
- `cursorsRef` - Map of remote cursor bookmarks {socketId: bookmark}
- `isRemoteUpdate` - Flag to prevent cursor emission during remote setValue

**Initialization (useEffect with [lang] dependency):**
```javascript
editorRef.current = Codemirror.fromTextArea(
    document.getElementById('realtimeEditor'),
    {
        mode: {name: lang},
        theme: editorTheme,
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
    }
);
```

**Event Handlers:**

**'change' Event**
```javascript
editorRef.current.on('change', (instance, changes) => {
    const {origin} = changes;
    const code = instance.getValue();
    onCodeChange(code); // Updates parent's codeRef
    
    if (origin !== 'setValue') { // Prevent infinite loop
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
        });
    }
});
```

**'cursorActivity' Event**
```javascript
editorRef.current.on('cursorActivity', (instance) => {
    if (isRemoteUpdate.current) return; // Skip during remote updates
    
    const cursor = instance.getCursor(); // {line, ch}
    socketRef.current.emit(ACTIONS.CURSOR_CHANGE, {
        roomId,
        cursor: {line: cursor.line, ch: cursor.ch},
        username: username,
    });
});
```

**Socket Event Handlers (useEffect with [socketRef.current]):**

**handleCodeChange**
```javascript
const handleCodeChange = ({code}) => {
    if (code !== null && editorRef.current) {
        const currentCode = editorRef.current.getValue();
        
        // Only update if different (prevents unnecessary setValue)
        if (currentCode === code) return;
        
        // Preserve cursor position during remote update
        isRemoteUpdate.current = true;
        const currentCursor = editorRef.current.getCursor();
        editorRef.current.setValue(code);
        editorRef.current.setCursor(currentCursor);
        isRemoteUpdate.current = false;
    }
};
```

**handleCursorChange**
```javascript
const handleCursorChange = ({socketId, cursor, username}) => {
    if (!editorRef.current) return;
    
    // Skip own cursor (server already filters with socket.in())
    if (socketRef.current && socketId === socketRef.current.id) return;
    
    // Remove old cursor widget
    if (cursorsRef.current[socketId]) {
        cursorsRef.current[socketId].clear();
    }
    
    // Create cursor widget (span for inline display)
    const cursorElement = document.createElement('span');
    cursorElement.className = 'remote-cursor';
    cursorElement.style.borderLeftColor = getColorForUser(socketId);
    
    const label = document.createElement('span');
    label.className = 'remote-cursor-label';
    label.textContent = username;
    label.style.backgroundColor = getColorForUser(socketId);
    cursorElement.appendChild(label);
    
    // Place cursor at position (insertLeft: false prevents text breaking)
    const bookmark = editorRef.current.setBookmark(cursor, {
        widget: cursorElement,
        insertLeft: false,
    });
    
    cursorsRef.current[socketId] = bookmark;
};
```

**getColorForUser(socketId)**
- Hashes socketId to consistently assign one of 8 colors
- Ensures same user always gets same color across sessions

**Cleanup:**
- Named handlers allow proper removal with `socket.off()`
- Prevents duplicate listeners on re-render

---

### 8. **src/components/Client.js** - User Avatar

**Purpose:** Display connected user with avatar.

```javascript
<Client username="John" />
```

Uses `react-avatar` library with username initials.

---

### 9. **src/components/Output.js** - Execution Results Panel

**Purpose:** Floating panel to display code execution output.

**Props:**
- `output` - {success, output, error, timestamp}
- `isVisible` - Boolean to show/hide
- `onClose` - Callback to hide panel

**UI Elements:**
- Close button (✕)
- Success/Error indicator
- Timestamp
- Output text (stdout)
- Error text (stderr) if failed

**Styling:**
- Floating panel with z-index
- Success: green border, Error: red border
- Monospace font for output

---

### 10. **src/App.css** - Styling

**Key Styles:**

**Layout:**
```css
.mainWrap {
    display: grid;
    grid-template-columns: 230px 1fr;
    height: 100vh;
}
```

**CodeMirror Customization:**
```css
.CodeMirror {
    font-family: 'Cascadia Code', sans-serif !important;
    min-height: calc(100vh - 20px);
    font-size: 16px;
    line-height: 1.6;
}

.CodeMirror-cursor {
    border-left-width: 2px !important;
}

.CodeMirror pre.CodeMirror-line {
    line-height: 1.5; /* Reduces cursor height */
}
```

**Remote Cursor:**
```css
.remote-cursor {
    position: relative;
    border-left: 2px solid;
    height: 1.2em;
    z-index: 100;
    animation: blink-cursor 1s step-start infinite;
}

@keyframes blink-cursor {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
}

.remote-cursor-label {
    position: absolute;
    top: -18px;
    left: -2px;
    font-size: 10px;
    padding: 2px 6px;
    animation: fadeOut 3s ease-in-out forwards;
}

@keyframes fadeOut {
    0%, 70% { opacity: 1; }
    100% { opacity: 0; }
}
```

**Button Styles:**
- CSS variables for consistent theming
- Hover effects with transitions
- Flexbox layout for file buttons

---

## Features Implementation Details

### 1. **Real-Time Code Synchronization**

**Challenge:** Prevent infinite loops when multiple users type simultaneously.

**Solution:**
- Use `origin` parameter from CodeMirror change event
- Only emit CODE_CHANGE when `origin !== 'setValue'`
- Server uses `socket.in(roomId)` to exclude sender
- Client checks if incoming code differs before setValue

**Edge Cases Handled:**
- Race conditions: setValue is synchronous
- Cursor preservation during remote updates
- isRemoteUpdate flag prevents cursor emission during setValue

---

### 2. **Collaborative Cursors**

**Challenge:** Display other users' cursor positions without interfering with local cursor.

**Solution:**
- Use CodeMirror's `setBookmark()` API with widget
- Store bookmarks in `cursorsRef` by socketId
- Clear old bookmark before creating new one
- Filter own cursor using socketId comparison

**Visual Features:**
- Blinking animation (1s interval, step-start)
- Color-coded per user (8 colors, hash-based)
- Username label that fades after 3 seconds
- Inline display (span) to avoid breaking text layout

---

### 3. **Code Execution**

**Architecture:**
```
Frontend                 Backend                 OS
   │                        │                     │
   ├─RUN_CODE──────────────►│                     │
   │                        ├─Create temp file────►│
   │                        ├─Execute command─────►│
   │                        │◄─stdout/stderr──────┤
   │                        ├─Delete temp file────►│
   │◄─CODE_OUTPUT───────────┤                     │
   │                        │                     │
```

**Security Measures:**
- 5-second timeout per execution
- 1MB output buffer limit
- Temp file cleanup (even on error)
- Language whitelist

**Language-Specific Handling:**
- JavaScript: Adds `const print = console.log;` wrapper
- Java: Requires class name matching (Program_timestamp)
- Compiled languages: Two-step (compile + execute)

---

### 4. **File Upload/Download**

**Upload Flow:**
```
User selects file
→ FileReader.readAsText()
→ Emit CODE_CHANGE with file content
→ All users receive and update editor
→ Toast notification
```

**Download Flow:**
```
Click download
→ Create Blob from codeRef.current
→ Create Object URL
→ Programmatically click <a> element
→ Revoke Object URL
→ Toast notification
```

**Supported Formats:**
- Web: .js, .jsx, .ts, .tsx, .html, .css, .scss, .sass, .json, .xml, .yaml, .yml
- Backend: .py, .java, .cpp, .c, .cs, .go, .rs, .rb, .php, .sh, .r
- Markup: .md, .txt, .sql
- Mobile: .swift, .dart

---

## State Management

### Recoil Atoms

**language Atom:**
```javascript
atom({
    key: 'language',
    default: localStorage.getItem('language') || 'javascript',
})
```

- Persisted in localStorage
- Changes trigger page reload (CodeMirror mode initialization)
- Used in Editor component for syntax highlighting

**cmtheme Atom:**
```javascript
atom({
    key: 'cmtheme',
    default: localStorage.getItem('cmtheme') || 'monokai',
})
```

- 60+ themes available
- Applied to CodeMirror instance
- Persisted across sessions

### Component State

**EditorPage:**
- `clients` - Array<{socketId, username}>
- `output` - {success, output, error, timestamp} | null
- `showOutput` - boolean

**Editor:**
- `editorRef` - CodeMirror instance (ref)
- `cursorsRef` - Map<socketId, bookmark> (ref)
- `isRemoteUpdate` - boolean flag (ref)

### Props Flow

```
EditorPage
    ├─ socketRef (passed down)
    ├─ roomId (from URL params)
    ├─ username (from location.state)
    ├─ codeRef (managed in EditorPage)
    │
    ├─► Editor
    │     ├─ socketRef
    │     ├─ roomId
    │     ├─ username
    │     └─ onCodeChange(code) → codeRef.current = code
    │
    ├─► Client (mapped from clients array)
    │     └─ username
    │
    └─► Output
          ├─ output
          ├─ isVisible
          └─ onClose
```

---

## Socket.io Event Flow

### Detailed Event Sequence

**Scenario: User A creates room, User B joins**

1. **User A Creates Room**
```
Browser → Generate UUID → Navigate to /editor/:roomId
EditorPage mounts → initSocket() → Connect to server
Client → JOIN {roomId: 'abc123', username: 'Alice'}
Server → socket.join('abc123')
Server → userSocketMap[socketA.id] = 'Alice'
Server → getAllConnectedClients('abc123') returns [{socketId: socketA.id, username: 'Alice'}]
Server → io.to(socketA.id).emit(JOINED, {clients: [Alice], username: 'Alice', socketId: socketA.id})
Client A → Receives JOINED, setClients([Alice])
Client A → Skips toast (own username)
Client A → Emits SYNC_CODE (code is empty)
```

2. **User A Types "hello"**
```
CodeMirror → 'change' event, origin='input'
Client A → emit(CODE_CHANGE, {roomId: 'abc123', code: 'hello'})
Server → socket.in('abc123').emit(CODE_CHANGE, {code: 'hello'})
(No other users in room, nothing happens)
```

3. **User B Joins Same Room**
```
Client B → JOIN {roomId: 'abc123', username: 'Bob'}
Server → socket.join('abc123')
Server → userSocketMap[socketB.id] = 'Bob'
Server → getAllConnectedClients('abc123') returns [Alice, Bob]
Server → io.to(socketA.id).emit(JOINED, {...})  // to Alice
Server → io.to(socketB.id).emit(JOINED, {...})  // to Bob

Client A receives JOINED:
    username='Bob' !== 'Alice', so toast("Bob joined")
    setClients([Alice, Bob])
    emit(SYNC_CODE, {socketId: socketB.id, code: 'hello'})
    
Client B receives JOINED:
    username='Bob' === 'Bob', so skip toast
    setClients([Alice, Bob])
    emit(SYNC_CODE, {socketId: socketB.id, code: ''})

Server receives SYNC_CODE from Alice:
    io.to(socketB.id).emit(CODE_CHANGE, {code: 'hello'})
    
Client B receives CODE_CHANGE:
    Editor.handleCodeChange({code: 'hello'})
    currentCode = ''
    currentCode !== 'hello', so setValue('hello')
```

4. **User B Moves Cursor**
```
CodeMirror → 'cursorActivity' event
isRemoteUpdate.current = false
Client B → emit(CURSOR_CHANGE, {roomId: 'abc123', cursor: {line: 0, ch: 5}, username: 'Bob'})
Server → socket.in('abc123').emit(CURSOR_CHANGE, {socketId: socketB.id, cursor: {line: 0, ch: 5}, username: 'Bob'})
Client A → handleCursorChange({socketId: socketB.id, ...})
    socketB.id !== socketA.id, so create cursor widget
    Create <span> with label "Bob"
    setBookmark at {line: 0, ch: 5}
    cursorsRef.current[socketB.id] = bookmark
```

5. **User B Types "world"**
```
CodeMirror → 'change' event, origin='input'
code = 'helloworld'
Client B → emit(CODE_CHANGE, {roomId: 'abc123', code: 'helloworld'})
Server → socket.in('abc123').emit(CODE_CHANGE, {code: 'helloworld'})
Client A → handleCodeChange({code: 'helloworld'})
    currentCode = 'hello'
    currentCode !== 'helloworld'
    isRemoteUpdate.current = true
    Save current cursor position
    setValue('helloworld')
    Restore cursor position
    isRemoteUpdate.current = false
```

6. **User A Clicks "Run Code"**
```
Client A → emit(RUN_CODE, {roomId: 'abc123', code: 'helloworld', language: 'javascript'})
Server → executeCode('helloworld', 'javascript', callback)
    wrappedCode = 'const print = console.log;\nhelloworld'
    Write to /tmp/code_1234567890.js
    exec('node /tmp/code_1234567890.js')
    Error: 'helloworld is not defined'
    callback({success: false, error: '...', output: '', timestamp: '...'})
Server → io.in('abc123').emit(CODE_OUTPUT, {output: {...}})
Client A → setOutput({...}), setShowOutput(true), toast.error()
Client B → setOutput({...}), setShowOutput(true), toast.error()
```

7. **User B Disconnects**
```
Browser → Close tab / Navigate away
Socket.io → 'disconnecting' event
Server → rooms = [socketB.id, 'abc123']
Server → socket.in('abc123').emit(DISCONNECTED, {socketId: socketB.id, username: 'Bob'})
Server → delete userSocketMap[socketB.id]
Client A → handleDisconnected({socketId: socketB.id, username: 'Bob'})
    toast("Bob left the room")
    setClients([Alice])
Client A → Editor.handleDisconnected({socketId: socketB.id})
    cursorsRef.current[socketB.id].clear()
    delete cursorsRef.current[socketB.id]
```

---

## Environment Configuration

**.env File:**
```env
REACT_APP_BACKEND_URL=http://localhost:5001
SERVER_PORT=5001
```

**Why Port 5001?**
- Port 5000 is used by macOS AirPlay Receiver
- Avoids conflict with system services

**Environment Variables Usage:**
- `REACT_APP_BACKEND_URL` - Used in socket.js for WebSocket connection
- `SERVER_PORT` - Used in server.js for Express server

---

## Development Workflow

### Running Locally

**Terminal 1 - Backend:**
```bash
SERVER_PORT=5001 node server.js
```

**Terminal 2 - Frontend:**
```bash
npm start
```

**Accessing the App:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5001

### Building for Production

```bash
npm run build
```

Creates optimized production build in `build/` directory.

### Docker Deployment

```bash
docker-compose up
```

Multi-stage build:
1. Build React app
2. Copy build to Express server
3. Expose port 5000
4. Start with PM2

---

## Bug Fixes Implemented

### 1. **Synchronization Issues**

**Problem:** Guest couldn't see host's changes, changes vanished when guest typed.

**Root Cause:**
- `setTimeout` in handleCodeChange caused race conditions
- isRemoteUpdate flag wasn't reset synchronously
- setValue was called without cursor preservation

**Fix:**
- Removed `setTimeout`, made all operations synchronous
- Added code diff check before setValue
- Preserved and restored cursor position synchronously

### 2. **Own Cursor Appearing Big**

**Problem:** User's own cursor rendered as remote cursor widget.

**Root Cause:**
- No filtering of own socketId in CURSOR_CHANGE handler

**Fix:**
- Added `if (socketId === socketRef.current.id) return;` check
- Server already excludes sender with `socket.in()`, this is extra safety

### 3. **Remote Cursor Breaking Text**

**Problem:** Remote cursor split text on the line.

**Root Cause:**
- Using `<div>` elements (block display)
- `insertLeft: true` placed cursor before character

**Fix:**
- Changed to `<span>` elements (inline display)
- Set `insertLeft: false` to place cursor after character position

### 4. **Cursor Size Issues**

**Problem:** Main cursor appeared too tall after edits.

**Root Cause:**
- CodeMirror line-height (1.6) made cursor tall

**Fix:**
- Added CSS: `.CodeMirror pre.CodeMirror-line { line-height: 1.5; }`
- Set `.CodeMirror-cursor { border-left-width: 2px !important; }`

---

## Key Concepts Explained

### 1. **Socket.io Rooms**

Rooms enable isolated group communication:
```javascript
socket.join(roomId);              // Add socket to room
socket.in(roomId).emit(event);    // Broadcast to room EXCEPT sender
io.in(roomId).emit(event);        // Broadcast to entire room INCLUDING sender
io.to(socketId).emit(event);      // Send to specific socket
```

### 2. **CodeMirror Integration**

CodeMirror provides:
- Syntax highlighting (mode configuration)
- Themes (60+ options)
- Line numbers
- Auto-closing tags/brackets
- Search functionality
- Bookmarks API for cursor widgets

**Mode Configuration:**
```javascript
mode: {name: 'javascript'}  // or 'python', 'clike', etc.
```

### 3. **Refs vs State**

**When to use refs:**
- `editorRef` - DOM manipulation, doesn't trigger re-render
- `codeRef` - Latest code value, avoid state updates on every keystroke
- `cursorsRef` - Cursor bookmarks, frequent updates
- `isRemoteUpdate` - Flag that changes multiple times per second

**When to use state:**
- `clients` - Renders user avatars, needs re-render
- `output` - Toggles output panel visibility
- `lang`, `them` - Triggers page reload

### 4. **Event Propagation**

**Preventing Infinite Loops:**
```javascript
// Client A types
onChange → emit CODE_CHANGE

// Server
receives CODE_CHANGE → socket.in(room).emit (excludes sender)

// Client B
receives CODE_CHANGE → setValue (origin='setValue')
setValue → onChange (origin='setValue')
if (origin !== 'setValue') emit // FALSE, doesn't emit
```

### 5. **Cursor Position Tracking**

CodeMirror cursor object:
```javascript
{
    line: 0,    // Zero-indexed line number
    ch: 5       // Zero-indexed character position in line
}
```

**Bookmark API:**
```javascript
editor.setBookmark(
    {line: 0, ch: 5},
    {
        widget: domElement,
        insertLeft: false
    }
)
```

---

## Performance Optimizations

1. **Debouncing:** CodeMirror naturally debounces rapid keystrokes
2. **Code Diff Check:** Only setValue if code actually changed
3. **Lazy Loading:** Themes/modes imported but only one loaded
4. **Event Cleanup:** Named handlers properly removed on unmount
5. **Ref Usage:** Avoid unnecessary re-renders with refs
6. **Synchronous Operations:** Cursor updates don't use setTimeout

---

## Testing the Application

### Test Scenario 1: Basic Collaboration

1. User A creates room, copies Room ID
2. User B joins with Room ID
3. Both should see each other in "Connected" list
4. User A types → User B sees changes in real-time
5. User B types → User A sees changes in real-time
6. Both users see each other's colored cursors with usernames

### Test Scenario 2: Code Execution

1. User A writes: `console.log("Hello World")`
2. User A clicks "Run Code"
3. Both users see output panel with "Hello World"
4. User B writes: `print("Hello from B")` (using print alias)
5. User B clicks "Run Code"
6. Both users see new output: "Hello from B"

### Test Scenario 3: File Operations

1. User A uploads `script.js` file
2. Both users see file content in editor
3. User B downloads code
4. Verify downloaded file has same content
5. Check filename format: `code_timestamp.js`

### Test Scenario 4: Cursor Tracking

1. User A moves cursor to line 5
2. User B sees User A's colored cursor at line 5
3. Username label "Alice" appears above cursor
4. Label fades out after 3 seconds
5. Cursor continues blinking

### Test Scenario 5: Multi-Language Support

1. Change language to Python
2. Page reloads with Python syntax highlighting
3. Write: `print("Python code")`
4. Run → See output
5. Switch to C++ → Write C++ code → Execute

---

## Common Issues & Solutions

### Issue: "Socket connection failed"

**Cause:** Backend server not running or wrong URL

**Solution:**
```bash
# Start backend
SERVER_PORT=5001 node server.js

# Verify .env
REACT_APP_BACKEND_URL=http://localhost:5001
```

### Issue: "Code execution timeout"

**Cause:** Infinite loop or long-running process

**Solution:**
- 5-second timeout is intentional
- Optimize code to run faster
- For long processes, use external execution environment

### Issue: "Cursor appears in wrong position"

**Cause:** Line/character mismatch

**Solution:**
- Ensure all users have same code
- SYNC_CODE event should handle initial sync
- Check console logs for cursor positions

### Issue: "Theme/Language not applying"

**Cause:** localStorage not updated or page not reloaded

**Solution:**
```javascript
setLang(value);
window.location.reload(); // Required for CodeMirror re-initialization
```

---

## Future Enhancement Ideas

1. **Syntax Validation:** Real-time linting with ESLint/Pylint
2. **Voice Chat:** WebRTC integration for voice communication
3. **Permissions:** Read-only mode, admin controls
4. **Code History:** Git-like version control
5. **Breakpoints:** Debugging support for executed code
6. **AI Autocomplete:** GitHub Copilot integration
7. **Multiple Files:** Tab-based file system
8. **Database Persistence:** Save sessions to MongoDB
9. **User Authentication:** Login system with JWT
10. **Video Chat:** Screen sharing during collaboration

---

## Dependencies Breakdown

### Production Dependencies

```json
{
  "codemirror": "^5.65.2",           // Code editor
  "express": "^4.17.3",              // Web server
  "pm2": "^5.3.1",                   // Process manager
  "prettier": "^3.6.2",              // Code formatter
  "react": "^18.0.0",                // UI framework
  "react-avatar": "^4.0.0",          // User avatars
  "react-dom": "^18.0.0",            // React DOM renderer
  "react-hot-toast": "^2.2.0",       // Toast notifications
  "react-router-dom": "^6.3.0",      // Routing
  "react-scripts": "5.0.0",          // CRA build tools
  "recoil": "^0.7.0",                // State management
  "socket.io": "^4.4.1",             // WebSocket server
  "socket.io-client": "^4.4.1",      // WebSocket client
  "uuid": "^8.3.2",                  // UUID generation
  "web-vitals": "^2.1.4"             // Performance metrics
}
```

### Dev Dependencies

```json
{
  "nodemon": "^2.0.15"               // Auto-restart server on changes
}
```

---

## Git Branch Structure

- **main** - Stable production code
- **feature/new-features** - Development branch with:
  - Collaborative cursors
  - File upload/download
  - Code execution
  - Bug fixes
  - Print function alias for JavaScript

---

## Contributors

- **Aryan Tomar** - Full-stack development

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- CodeMirror for the amazing in-browser code editor
- Socket.io for real-time communication
- React team for the fantastic framework
- All open-source contributors

---

**Last Updated:** October 28, 2025
