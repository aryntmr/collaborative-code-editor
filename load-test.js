#!/usr/bin/env node

// Collaborative Code Editor - Load Testing Tool
// Usage: npm run load-test [options]

const io = require('socket.io-client');
const ACTIONS = require('./src/actions/Actions');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isViewMode = args.includes('--view');
const isCompareMode = args.includes('--compare');

if (isViewMode) {
    const viewArg = args[args.indexOf('--view') + 1];
    if (viewArg === 'all') {
        viewAllResults();
    } else {
        viewLatestResult();
    }
    process.exit(0);
}

if (isCompareMode) {
    compareResults();
    process.exit(0);
}

const CONFIG = {
    serverUrl: process.env.SERVER_URL || 'http://localhost:5001',
    totalUsers: parseInt(process.env.TOTAL_USERS || args[args.indexOf('--users') + 1]) || 10,
    usersPerRoom: parseInt(process.env.USERS_PER_ROOM || args[args.indexOf('--room') + 1]) || 5,
    testDuration: parseInt(process.env.TEST_DURATION) || 30000,
    codeChangeInterval: 2000,
    cursorMoveInterval: 500,
};

const metrics = {
    connectionsSuccessful: 0,
    connectionsFailed: 0,
    messagesReceived: 0,
    messagesSent: 0,
    errors: [],
    latencies: [],
    startTime: Date.now(),
    connectionTimes: [],
};

const activeSockets = [];

function generateRoomId() {
    return `test-room-${Math.floor(Math.random() * Math.ceil(CONFIG.totalUsers / CONFIG.usersPerRoom))}`;
}

function generateCode() {
    const samples = [
        'console.log("Hello World");',
        'function test() { return 42; }',
        'const x = 100;\nconst y = 200;\nconsole.log(x + y);',
    ];
    return samples[Math.floor(Math.random() * samples.length)];
}

function generateCursor() {
    return { line: Math.floor(Math.random() * 10), ch: Math.floor(Math.random() * 40) };
}

function createUser(userId) {
    const username = `TestUser${userId}`;
    const roomId = generateRoomId();
    const connectionStartTime = Date.now();
    
    const socket = io(CONFIG.serverUrl, {
        'force new connection': true,
        timeout: 10000,
        transports: ['websocket'],
    });

    const user = { id: userId, username, roomId, socket, connected: false };

    socket.on('connect', () => {
        user.connected = true;
        metrics.connectionsSuccessful++;
        metrics.connectionTimes.push(Date.now() - connectionStartTime);
        console.log(`✓ User ${userId} connected`);
        socket.emit(ACTIONS.JOIN, { roomId, username });
        startUserActivity(user);
    });

    socket.on('connect_error', (error) => {
        metrics.connectionsFailed++;
        metrics.errors.push({ userId, error: error.message });
        console.error(`✗ User ${userId} failed:`, error.message);
    });

    socket.on(ACTIONS.JOINED, () => {
        metrics.messagesReceived++;
        if (user.lastActionTime) {
            const latency = Date.now() - user.lastActionTime;
            if (latency < 5000) metrics.latencies.push(latency);
        }
    });

    socket.on(ACTIONS.CODE_CHANGE, () => metrics.messagesReceived++);
    socket.on(ACTIONS.CURSOR_CHANGE, () => metrics.messagesReceived++);

    activeSockets.push(user);
}

function startUserActivity(user) {
    user.codeTimer = setInterval(() => {
        if (user.connected) {
            user.lastActionTime = Date.now();
            user.socket.emit(ACTIONS.CODE_CHANGE, { roomId: user.roomId, code: generateCode() });
            metrics.messagesSent++;
        }
    }, CONFIG.codeChangeInterval);

    user.cursorTimer = setInterval(() => {
        if (user.connected) {
            user.socket.emit(ACTIONS.CURSOR_CHANGE, { roomId: user.roomId, cursor: generateCursor(), username: user.username });
            metrics.messagesSent++;
        }
    }, CONFIG.cursorMoveInterval);
}

function calculateMetrics() {
    const duration = (Date.now() - metrics.startTime) / 1000;
    const avgLat = metrics.latencies.length ? metrics.latencies.reduce((a,b) => a+b, 0) / metrics.latencies.length : 0;
    const sorted = [...metrics.latencies].sort((a,b) => a-b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const avgConn = metrics.connectionTimes.length ? metrics.connectionTimes.reduce((a,b) => a+b, 0) / metrics.connectionTimes.length : 0;

    return {
        timestamp: new Date().toISOString(),
        totalUsers: CONFIG.totalUsers,
        usersPerRoom: CONFIG.usersPerRoom,
        connectionsSuccessful: metrics.connectionsSuccessful,
        connectionsFailed: metrics.connectionsFailed,
        connectionSuccessRate: ((metrics.connectionsSuccessful / CONFIG.totalUsers) * 100).toFixed(2),
        messagesSent: metrics.messagesSent,
        messagesReceived: metrics.messagesReceived,
        messagesPerSecond: (metrics.messagesSent / duration).toFixed(2),
        avgLatency: avgLat.toFixed(2),
        p95Latency: p95.toFixed(2),
        avgConnectionTime: avgConn.toFixed(2),
        errors: metrics.errors.length,
    };
}

function saveResults(stats) {
    const dir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, `test-${Date.now()}.json`), JSON.stringify(stats, null, 2));
    fs.writeFileSync(path.join(dir, 'latest.json'), JSON.stringify(stats, null, 2));
    console.log('\n💾 Results saved to test-results/latest.json');
}

async function runLoadTest() {
    console.log('\n' + '='.repeat(60));
    console.log(`LOAD TEST: ${CONFIG.totalUsers} users, ${CONFIG.usersPerRoom}/room`);
    console.log('='.repeat(60) + '\n');

    for (let i = 1; i <= CONFIG.totalUsers; i++) {
        createUser(i);
        await new Promise(r => setTimeout(r, 100));
    }

    await new Promise(r => setTimeout(r, CONFIG.testDuration));

    console.log('\nCleaning up...');
    activeSockets.forEach(u => {
        if (u.codeTimer) clearInterval(u.codeTimer);
        if (u.cursorTimer) clearInterval(u.cursorTimer);
        if (u.socket) u.socket.disconnect();
    });

    await new Promise(r => setTimeout(r, 1000));
    
    const stats = calculateMetrics();
    printReport(stats);
    saveResults(stats);
    process.exit(0);
}

function printReport(stats) {
    console.log('\n' + '='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));
    console.log(`Connections: ${stats.connectionsSuccessful}/${stats.totalUsers} (${stats.connectionSuccessRate}%)`);
    console.log(`Messages: ${stats.messagesSent} sent, ${stats.messagesReceived} received`);
    console.log(`Latency: ${stats.avgLatency}ms avg, ${stats.p95Latency}ms p95`);
    
    const rate = parseFloat(stats.connectionSuccessRate);
    const lat = parseFloat(stats.avgLatency);
    const assessment = (rate === 100 && lat < 100) ? '✅ EXCELLENT' :
                      (rate >= 95 && lat < 300) ? '✅ GOOD' :
                      (rate >= 80 && lat < 500) ? '⚠️  FAIR' : '❌ POOR';
    console.log(`Assessment: ${assessment}`);
    console.log('='.repeat(60) + '\n');
}

function viewLatestResult() {
    const file = path.join(__dirname, 'test-results', 'latest.json');
    if (!fs.existsSync(file)) {
        console.log('❌ No results found');
        return;
    }
    const data = JSON.parse(fs.readFileSync(file));
    console.log(`\n${data.totalUsers} users (${data.usersPerRoom}/room)`);
    console.log(`Success: ${data.connectionSuccessRate}%`);
    console.log(`Latency: ${data.avgLatency}ms avg, ${data.p95Latency}ms p95`);
    console.log(`Messages: ${data.messagesSent} sent, ${data.messagesReceived} received\n`);
}

function viewAllResults() {
    const dir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(dir)) {
        console.log('❌ No results found');
        return;
    }
    const files = fs.readdirSync(dir).filter(f => f !== 'latest.json' && f.endsWith('.json')).sort().reverse();
    console.log(`\nTotal Tests: ${files.length}\n`);
    files.forEach((f, i) => {
        const d = JSON.parse(fs.readFileSync(path.join(dir, f)));
        console.log(`${i+1}. ${d.totalUsers} users | ${d.connectionSuccessRate}% | ${d.avgLatency}ms`);
    });
    console.log('');
}

function compareResults() {
    const dir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(dir)) {
        console.log('❌ No results found');
        return;
    }
    const files = fs.readdirSync(dir).filter(f => f !== 'latest.json' && f.endsWith('.json')).sort().reverse().slice(0, 4);
    if (files.length < 2) {
        console.log('⚠️  Need at least 2 tests');
        return;
    }
    const tests = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f))));
    console.log('\nUsers'.padEnd(15) + tests.map(t => String(t.totalUsers).padEnd(12)).join(''));
    console.log('Success%'.padEnd(15) + tests.map(t => (t.connectionSuccessRate+'%').padEnd(12)).join(''));
    console.log('Latency'.padEnd(15) + tests.map(t => (t.avgLatency+'ms').padEnd(12)).join(''));
    console.log('');
}

runLoadTest();
