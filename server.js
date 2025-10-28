const express = require('express');
const app = express();

const http = require('http');
const path = require('path');
const {Server} = require('socket.io');
const {exec} = require('child_process');
const fs = require('fs');
const os = require('os');

const ACTIONS = require('./src/actions/Actions');

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

// Function to execute code
function executeCode(code, language, callback) {
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    let fileName, command;

    // Map language to file extension and execution command
    const languageConfig = {
        'javascript': {
            ext: 'js',
            cmd: (file) => `node ${file}`
        },
        'python': {
            ext: 'py',
            cmd: (file) => `python3 ${file}`
        },
        'clike': {
            ext: 'cpp',
            cmd: (file) => `g++ ${file} -o ${tempDir}/program_${timestamp} && ${tempDir}/program_${timestamp}`
        },
        'java': {
            ext: 'java',
            cmd: (file) => {
                // Java requires class name to match filename
                return `javac ${file} && java -cp ${tempDir} Program_${timestamp}`;
            }
        },
        'go': {
            ext: 'go',
            cmd: (file) => `go run ${file}`
        },
        'rust': {
            ext: 'rs',
            cmd: (file) => `rustc ${file} -o ${tempDir}/program_${timestamp} && ${tempDir}/program_${timestamp}`
        },
        'ruby': {
            ext: 'rb',
            cmd: (file) => `ruby ${file}`
        },
        'php': {
            ext: 'php',
            cmd: (file) => `php ${file}`
        },
        'shell': {
            ext: 'sh',
            cmd: (file) => `bash ${file}`
        },
        'r': {
            ext: 'r',
            cmd: (file) => `Rscript ${file}`
        }
    };

    const config = languageConfig[language] || languageConfig['javascript'];
    fileName = path.join(tempDir, `code_${timestamp}.${config.ext}`);

    // Write code to temporary file
    fs.writeFile(fileName, code, (err) => {
        if (err) {
            callback({
                success: false,
                error: 'Failed to write code to file: ' + err.message,
                output: '',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Execute the code with a timeout
        const execProcess = exec(config.cmd(fileName), {
            timeout: 5000, // 5 second timeout
            maxBuffer: 1024 * 1024 // 1MB buffer
        }, (error, stdout, stderr) => {
            // Clean up temporary files
            fs.unlink(fileName, () => {});
            
            // For compiled languages, clean up executable
            if (['clike', 'rust'].includes(language)) {
                fs.unlink(`${tempDir}/program_${timestamp}`, () => {});
            }

            if (error) {
                callback({
                    success: false,
                    error: stderr || error.message,
                    output: stdout,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            callback({
                success: true,
                output: stdout,
                error: stderr,
                timestamp: new Date().toISOString()
            });
        });
    });
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({roomId, username}) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({socketId}) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({roomId, code}) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, {code});
    });

    socket.on(ACTIONS.SYNC_CODE, ({socketId, code}) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, {code});
    });

    socket.on(ACTIONS.RUN_CODE, ({roomId, code, language}) => {
        console.log('Running code for language:', language);
        executeCode(code, language, (output) => {
            // Broadcast output to all users in the room
            io.in(roomId).emit(ACTIONS.CODE_OUTPUT, {output});
        });
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

// Serve response in production
app.get('/', (req, res) => {
    const htmlContent = '<h1>Welcome to the code editor server</h1>';
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
});

const PORT = process.env.SERVER_PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));