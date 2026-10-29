const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 3000;

// Helper: Get primary physical Wi-Fi or LAN IP
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    let candidate = null;

    for (const name of Object.keys(interfaces)) {
        const lowerName = name.toLowerCase();
        // Skip virtual / loopback / container interfaces
        if (lowerName.includes('vethernet') || lowerName.includes('virtual') || lowerName.includes('wsl') || lowerName.includes('loopback')) {
            continue;
        }

        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                if (lowerName.includes('wi-fi') || lowerName.includes('wireless') || lowerName.includes('wlan')) {
                    return iface.address;
                }
                candidate = iface.address;
            }
        }
    }
    return candidate || 'localhost';
}

const localIP = getLocalIP();

// Helper: Determine public join URL dynamically
function resolveJoinUrl(req) {
    if (process.env.RENDER_EXTERNAL_URL) {
        return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
    }
    if (req) {
        const host = req.headers.host;
        if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
            const proto = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http');
            return `${proto}://${host}`;
        }
    }
    return `http://${localIP}:${PORT}`;
}

// Helper: Generate 4-digit Game PIN
function generateGamePin() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Game State
const state = {
    gamePin: generateGamePin(),
    phase: 'LOBBY', // LOBBY, ROUND_1_IPO, ROUND_2_RALLY, ROUND_3_DIP, ROUND_4_DIVIDEND, ROUND_5_QUIZ_1, ROUND_6_QUIZ_2, GAME_OVER
    stockName: 'Nova Pizza Inc.',
    stockPrice: 10,
    roundNumber: 0,
    roundTitle: 'Waiting for Players...',
    newsHeadline: '',
    newsDetails: '',
    dividendAmount: 0,
    quizQuestion: null,
    quizActive: false,
    quizRevealed: false,
    quizAnswers: new Map(), // playerId -> { answerIndex, isCorrect, time, name }
    players: new Map() // id -> { id, name, avatar, cash, shares, quizScore, lastAction, connected }
};

// HTTP Static & API Router
const server = http.createServer(async (req, res) => {
    let url = req.url.split('?')[0];

    // Health check for Render & uptime monitors
    if (url === '/health' || url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok', uptime: Math.floor(process.uptime()), memory: process.memoryUsage().rss }));
    }

    // Dynamic join URL & QR code endpoint (includes ?pin=XXXX)
    if (url === '/api/info') {
        const currentJoinUrl = resolveJoinUrl(req);
        const joinUrlWithPin = `${currentJoinUrl}?pin=${state.gamePin}`;
        let qrDataUrl = '';
        try {
            qrDataUrl = await QRCode.toDataURL(joinUrlWithPin, { width: 300, margin: 2 });
        } catch (e) {
            console.error('QR code generation error:', e);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
            localIP, 
            port: PORT, 
            joinUrl: currentJoinUrl, 
            gamePin: state.gamePin,
            joinUrlWithPin,
            qrDataUrl 
        }));
    }

    // Big Screen Arena
    if (url === '/host' || url === '/bigscreen') {
        const hostFile = path.join(__dirname, 'public', 'host.html');
        return serveFile(hostFile, 'text/html; charset=utf-8', res);
    }

    // Interactive Slides Deck
    if (url === '/slides' || url === '/presentation') {
        const slidesFile = path.join(__dirname, 'public', 'slides.html');
        return serveFile(slidesFile, 'text/html; charset=utf-8', res);
    }

    // Static Assets or Mobile Player Client
    let filePath = path.join(__dirname, 'public', url === '/' ? 'player.html' : url);
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Fallback to player.html for client-side routing
            const playerFile = path.join(__dirname, 'public', 'player.html');
            return serveFile(playerFile, 'text/html; charset=utf-8', res);
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        serveFile(filePath, contentTypes[ext] || 'application/octet-stream', res);
    });
});

function serveFile(filePath, contentType, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('File not found');
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// WebSocket Server
const wss = new WebSocketServer({ server });

function getPlayersList() {
    const list = [];
    state.players.forEach(p => {
        const netWorth = p.cash + (p.shares * state.stockPrice) + (p.quizScore || 0);
        list.push({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            cash: p.cash,
            shares: p.shares,
            quizScore: p.quizScore,
            netWorth: netWorth,
            lastAction: p.lastAction,
            connected: p.connected
        });
    });
    // Sort descending by total net worth
    list.sort((a, b) => b.netWorth - a.netWorth);
    return list;
}

function broadcast(msg) {
    const payload = JSON.stringify(msg);
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
            client.send(payload);
        }
    });
}

function getQuizCounts() {
    const counts = [0, 0, 0, 0];
    state.quizAnswers.forEach(ans => {
        if (ans.answerIndex >= 0 && ans.answerIndex < 4) {
            counts[ans.answerIndex]++;
        }
    });
    return counts;
}

function broadcastQuizProgress() {
    broadcast({
        type: 'QUIZ_PROGRESS_UPDATE',
        totalPlayers: state.players.size,
        answeredCount: state.quizAnswers.size,
        answeredPlayerNames: Array.from(state.quizAnswers.values()).map(a => a.name)
    });
}

function broadcastState() {
    let broadcastQuiz = null;
    if (state.quizActive && state.quizQuestion) {
        broadcastQuiz = {
            question: state.quizQuestion.question,
            options: state.quizQuestion.options,
            reward: state.quizQuestion.reward,
            revealed: state.quizRevealed,
            correct: state.quizRevealed ? state.quizQuestion.correct : null,
            counts: state.quizRevealed ? getQuizCounts() : null
        };
    }

    broadcast({
        type: 'STATE_UPDATE',
        state: {
            gamePin: state.gamePin,
            phase: state.phase,
            stockName: state.stockName,
            stockPrice: state.stockPrice,
            roundNumber: state.roundNumber,
            roundTitle: state.roundTitle,
            newsHeadline: state.newsHeadline,
            newsDetails: state.newsDetails,
            dividendAmount: state.dividendAmount,
            quizQuestion: broadcastQuiz,
            quizProgress: state.quizActive ? {
                totalPlayers: state.players.size,
                answeredCount: state.quizAnswers.size,
                revealed: state.quizRevealed,
                counts: state.quizRevealed ? getQuizCounts() : null,
                answeredPlayerNames: Array.from(state.quizAnswers.values()).map(a => a.name)
            } : null,
            players: getPlayersList()
        }
    });
}

// Predefined Game Rounds
const ROUNDS = [
    {
        phase: 'ROUND_1_IPO',
        number: 1,
        title: 'ROUND 1: THE PIZZA IPO ($10 / Share)',
        price: 10,
        headline: 'Nova Pizza Inc. Launches on the Stock Market!',
        details: 'The company needs money to expand. Each share costs $10. You have $100 cash. How many slices do you want to buy?',
        dividend: 0
    },
    {
        phase: 'ROUND_2_RALLY',
        number: 2,
        title: 'ROUND 2: THE VIRAL SENSATION (Rally to $25)',
        price: 25,
        headline: 'Viral Hit: Nova Pizza explodes on social media!',
        details: 'Global sales jumped 300%. The stock price surges from $10 to $25! You can SELL NOW to secure your capital gain, or HOLD for future dividends!',
        dividend: 0
    },
    {
        phase: 'ROUND_3_DIP',
        number: 3,
        title: 'ROUND 3: THE PANIC DIP (Price drops to $8)',
        price: 8,
        headline: 'Breaking: Cheese shortage rumors cause temporary panic!',
        details: 'Social media claims the company is in trouble. Stock falls to $8. Will you PANIC SELL at a loss, or BUY THE DIP while it is on sale?',
        dividend: 0
    },
    {
        phase: 'ROUND_4_DIVIDEND',
        number: 4,
        title: 'ROUND 4: RECORD PROFITS & CASH DIVIDEND',
        price: 35,
        headline: 'Record Year: Payout of $5 Cash Dividend Per Share!',
        details: 'The company crushed earnings! Every shareholder receives $5 CASH per share directly deposited. Stock price rockets to $35!',
        dividend: 5
    },
    {
        phase: 'ROUND_5_QUIZ_1',
        number: 5,
        title: 'ROUND 5: KNOWLEDGE CHECK (Bonus +$30)',
        price: 35,
        headline: 'Speed Quiz: What is an S&P 500 Index Fund (ETF)?',
        details: 'Choose the correct answer on your phone. First to answer gets extra cash bonus!',
        dividend: 0,
        quiz: {
            question: 'What is an S&P 500 ETF (Index Fund)?',
            options: [
                'Buying 1 hyped cryptocurrency',
                'Owning the top 500 biggest companies at once',
                'A bank loan with high interest',
                'A lottery ticket'
            ],
            correct: 1,
            reward: 30
        }
    },
    {
        phase: 'ROUND_6_QUIZ_2',
        number: 6,
        title: 'ROUND 6: FINAL KNOWLEDGE CHECK (Bonus +$40)',
        price: 35,
        headline: 'Speed Quiz: Who does the CEO of Apple ultimately work for?',
        details: 'Choose the correct answer on your phone to climb the final leaderboard!',
        dividend: 0,
        quiz: {
            question: 'If you own 1 share of Apple, who does CEO Tim Cook work for?',
            options: [
                'Only for himself',
                'The bank manager',
                'For YOU (the shareholder/owner)',
                'Nobody'
            ],
            correct: 2,
            reward: 40
        }
    },
    {
        phase: 'GAME_OVER',
        number: 7,
        title: 'GRAND FINALE: THE WINNERS PODIUM',
        price: 35,
        headline: 'The Stock Market Showdown is Complete!',
        details: 'See who built the largest net worth through patience, smart buying, and dividends!',
        dividend: 0
    }
];

let currentRoundIndex = -1;

function setRound(idx) {
    if (idx < 0 || idx >= ROUNDS.length) return;
    currentRoundIndex = idx;
    const r = ROUNDS[idx];

    state.phase = r.phase;
    state.roundNumber = r.number;
    state.roundTitle = r.title;
    state.stockPrice = r.price;
    state.newsHeadline = r.headline;
    state.newsDetails = r.details;
    state.dividendAmount = r.dividend;

    // Apply dividends if any
    if (r.dividend > 0) {
        state.players.forEach(p => {
            if (p.shares > 0) {
                const payout = p.shares * r.dividend;
                p.cash += payout;
                p.lastAction = `Received +$${payout} in Dividends!`;
            }
        });
    } else {
        state.players.forEach(p => {
            p.lastAction = '';
        });
    }

    if (r.quiz) {
        state.quizQuestion = r.quiz;
        state.quizActive = true;
        state.quizRevealed = false;
        state.quizAnswers.clear();
    } else {
        state.quizQuestion = null;
        state.quizActive = false;
        state.quizRevealed = false;
        state.quizAnswers.clear();
    }

    broadcastState();
}

function resetGame() {
    currentRoundIndex = -1;
    state.gamePin = generateGamePin();
    state.phase = 'LOBBY';
    state.stockPrice = 10;
    state.roundNumber = 0;
    state.roundTitle = 'Waiting for Players...';
    state.newsHeadline = '';
    state.newsDetails = '';
    state.dividendAmount = 0;
    state.quizQuestion = null;
    state.quizActive = false;
    state.quizRevealed = false;
    state.quizAnswers.clear();

    // Clear all player sessions completely for clean classroom reset
    state.players.clear();

    broadcastState();
}

function revealQuizAnswer() {
    if (!state.quizActive || !state.quizQuestion || state.quizRevealed) return;
    state.quizRevealed = true;

    const counts = getQuizCounts();

    // Award cash & quizScore to correct answers (once!)
    state.quizAnswers.forEach((ans, pid) => {
        const p = state.players.get(pid);
        if (p) {
            if (ans.isCorrect) {
                p.cash += state.quizQuestion.reward;
                p.quizScore = (p.quizScore || 0) + state.quizQuestion.reward;
                p.lastAction = `Correct Quiz! +$${state.quizQuestion.reward}`;
            } else {
                p.lastAction = 'Quiz Incorrect';
            }
        }
    });

    broadcast({
        type: 'QUIZ_REVEAL_EVENT',
        correctIndex: state.quizQuestion.correct,
        counts: counts,
        reward: state.quizQuestion.reward,
        totalAnswered: state.quizAnswers.size
    });

    broadcastState();
}

// WebSocket Keep-Alive Heartbeat (Critical for Render/Cloud Proxies)
function heartbeat() {
    this.isAlive = true;
}

const pingInterval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 25000);

wss.on('close', () => clearInterval(pingInterval));

wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    let playerId = null;

    ws.on('message', (rawData) => {
        try {
            const data = JSON.parse(rawData);

            // HOST CONNECT & CONTROLS
            if (data.type === 'HOST_CONNECT') {
                ws.isHost = true;
                const dynamicJoinUrl = resolveJoinUrl(req);
                let hostQuiz = null;
                if (state.quizActive && state.quizQuestion) {
                    hostQuiz = {
                        question: state.quizQuestion.question,
                        options: state.quizQuestion.options,
                        reward: state.quizQuestion.reward,
                        revealed: state.quizRevealed,
                        correct: state.quizRevealed ? state.quizQuestion.correct : null,
                        counts: state.quizRevealed ? getQuizCounts() : null
                    };
                }
                ws.send(JSON.stringify({
                    type: 'INIT_HOST',
                    joinUrl: dynamicJoinUrl,
                    localIP,
                    port: PORT,
                    gamePin: state.gamePin,
                    state: {
                        gamePin: state.gamePin,
                        phase: state.phase,
                        stockName: state.stockName,
                        stockPrice: state.stockPrice,
                        roundNumber: state.roundNumber,
                        roundTitle: state.roundTitle,
                        newsHeadline: state.newsHeadline,
                        newsDetails: state.newsDetails,
                        dividendAmount: state.dividendAmount,
                        quizQuestion: hostQuiz,
                        quizProgress: state.quizActive ? {
                            totalPlayers: state.players.size,
                            answeredCount: state.quizAnswers.size,
                            revealed: state.quizRevealed,
                            counts: state.quizRevealed ? getQuizCounts() : null,
                            answeredPlayerNames: Array.from(state.quizAnswers.values()).map(a => a.name)
                        } : null,
                        players: getPlayersList()
                    }
                }));
                return;
            }

            if (data.type === 'HOST_NEXT_ROUND') {
                // If currently in an active unrevealed quiz, clicking Next Round reveals the answer first!
                if (state.quizActive && !state.quizRevealed) {
                    revealQuizAnswer();
                    return;
                }

                if (currentRoundIndex < ROUNDS.length - 1) {
                    setRound(currentRoundIndex + 1);
                }
                return;
            }

            if (data.type === 'HOST_REVEAL_QUIZ') {
                if (state.quizActive && !state.quizRevealed) {
                    revealQuizAnswer();
                }
                return;
            }

            if (data.type === 'HOST_PREV_ROUND') {
                if (currentRoundIndex > 0) {
                    setRound(currentRoundIndex - 1);
                } else {
                    resetGame();
                }
                return;
            }

            if (data.type === 'HOST_RESET') {
                resetGame();
                return;
            }

            // PLAYER JOIN (Requires valid Game PIN)
            if (data.type === 'PLAYER_JOIN') {
                const clientPin = (data.pin || '').toString().trim();
                if (clientPin !== state.gamePin) {
                    ws.send(JSON.stringify({
                        type: 'JOIN_ERROR',
                        message: 'Noto‘g‘ri Game PIN! Katta ekrandagi 4 xonali kodni kiriting.'
                    }));
                    return;
                }

                playerId = 'p_' + Math.random().toString(36).substring(2, 9);
                const name = (data.name || 'Investor').trim().substring(0, 16);
                const avatar = data.avatar || 'PizzaIcon';

                const player = {
                    id: playerId,
                    name: name,
                    avatar: avatar,
                    cash: 100,
                    shares: 0,
                    quizScore: 0,
                    lastAction: 'Joined game',
                    connected: true,
                    ws: ws
                };

                state.players.set(playerId, player);
                ws.playerId = playerId;

                ws.send(JSON.stringify({
                    type: 'JOIN_SUCCESS',
                    player: {
                        id: player.id,
                        name: player.name,
                        avatar: player.avatar,
                        cash: player.cash,
                        shares: player.shares
                    },
                    state: {
                        phase: state.phase,
                        gamePin: state.gamePin,
                        stockName: state.stockName,
                        stockPrice: state.stockPrice,
                        roundNumber: state.roundNumber,
                        roundTitle: state.roundTitle,
                        newsHeadline: state.newsHeadline
                    }
                }));

                broadcastState();
                return;
            }

            // BLOCK TRADING BEFORE GAME STARTS OR WHEN FINISHED
            if (data.type === 'PLAYER_BUY' || data.type === 'PLAYER_SELL' || data.type === 'PLAYER_HOLD') {
                if (state.phase === 'LOBBY') {
                    ws.send(JSON.stringify({
                        type: 'ACTION_RESULT',
                        action: data.type.replace('PLAYER_', ''),
                        success: false,
                        message: 'O‘yin hali boshlanmadi! O‘qituvchi boshlashini kuting.'
                    }));
                    return;
                }
                if (state.phase === 'GAME_OVER') {
                    ws.send(JSON.stringify({
                        type: 'ACTION_RESULT',
                        action: data.type.replace('PLAYER_', ''),
                        success: false,
                        message: 'O‘yin yakunlandi! Natijalarni katta ekranda ko‘ring.'
                    }));
                    return;
                }
            }

            // BUY SHARES
            if (data.type === 'PLAYER_BUY') {
                const player = state.players.get(ws.playerId);
                if (!player) return;

                const amount = parseInt(data.amount) || 1;
                const cost = amount * state.stockPrice;

                if (player.cash >= cost && amount > 0) {
                    player.cash -= cost;
                    player.shares += amount;
                    player.lastAction = `Bought ${amount} slice${amount > 1 ? 's' : ''} at $${state.stockPrice}`;

                    ws.send(JSON.stringify({
                        type: 'ACTION_RESULT',
                        action: 'BUY',
                        amount: amount,
                        cost: cost,
                        success: true,
                        message: `Bought ${amount} slice${amount > 1 ? 's' : ''} for $${cost}!`,
                        cash: player.cash,
                        shares: player.shares
                    }));

                    // Broadcast high-energy live trade event to big screen & all clients
                    broadcast({
                        type: 'LIVE_TRADE_EVENT',
                        trade: {
                            type: 'BUY',
                            playerId: player.id,
                            playerName: player.name,
                            amount: amount,
                            cost: cost,
                            price: state.stockPrice,
                            time: Date.now()
                        }
                    });

                    broadcastState();
                } else {
                    ws.send(JSON.stringify({
                        type: 'ACTION_RESULT',
                        action: 'BUY',
                        success: false,
                        message: 'Not enough cash to buy!'
                    }));
                }
                return;
            }

            // SELL SHARES
            if (data.type === 'PLAYER_SELL') {
                const player = state.players.get(ws.playerId);
                if (!player) return;

                const amount = parseInt(data.amount) || 1;
                if (player.shares >= amount && amount > 0) {
                    const revenue = amount * state.stockPrice;
                    player.shares -= amount;
                    player.cash += revenue;
                    player.lastAction = `Sold ${amount} slice${amount > 1 ? 's' : ''} at $${state.stockPrice}`;

                    ws.send(JSON.stringify({
                        type: 'ACTION_RESULT',
                        action: 'SELL',
                        amount: amount,
                        revenue: revenue,
                        success: true,
                        message: `Sold ${amount} slice${amount > 1 ? 's' : ''} for +$${revenue}!`,
                        cash: player.cash,
                        shares: player.shares
                    }));

                    // Broadcast high-energy live trade event to big screen & all clients
                    broadcast({
                        type: 'LIVE_TRADE_EVENT',
                        trade: {
                            type: 'SELL',
                            playerId: player.id,
                            playerName: player.name,
                            amount: amount,
                            revenue: revenue,
                            price: state.stockPrice,
                            time: Date.now()
                        }
                    });

                    broadcastState();
                } else {
                    ws.send(JSON.stringify({
                        type: 'ACTION_RESULT',
                        action: 'SELL',
                        success: false,
                        message: 'You do not have that many slices!'
                    }));
                }
                return;
            }

            // HOLD (Do nothing this round)
            if (data.type === 'PLAYER_HOLD') {
                const player = state.players.get(ws.playerId);
                if (!player) return;

                player.lastAction = 'Held position (Patient)';
                ws.send(JSON.stringify({
                    type: 'ACTION_RESULT',
                    action: 'HOLD',
                    success: true,
                    message: 'Holding strong! 💎'
                }));

                broadcast({
                    type: 'LIVE_TRADE_EVENT',
                    trade: {
                        type: 'HOLD',
                        playerId: player.id,
                        playerName: player.name,
                        amount: 0,
                        price: state.stockPrice,
                        time: Date.now()
                    }
                });

                broadcastState();
                return;
            }

            // QUIZ ANSWER
            if (data.type === 'PLAYER_QUIZ_ANSWER') {
                const player = state.players.get(ws.playerId);
                if (!player || !state.quizActive || !state.quizQuestion) return;
                if (state.quizRevealed) return; // Cannot answer after reveal

                // Strictly prevent duplicate submissions / point spamming!
                if (state.quizAnswers.has(ws.playerId)) {
                    ws.send(JSON.stringify({
                        type: 'QUIZ_SUBMIT_CONFIRM',
                        alreadySubmitted: true,
                        message: 'Siz allaqachon javob bergansiz! Natijani kuting.'
                    }));
                    return;
                }

                const answerIndex = parseInt(data.answer);
                const isCorrect = (answerIndex === state.quizQuestion.correct);

                state.quizAnswers.set(ws.playerId, {
                    answerIndex: answerIndex,
                    isCorrect: isCorrect,
                    time: Date.now(),
                    name: player.name
                });

                player.lastAction = 'Answered Quiz';

                ws.send(JSON.stringify({
                    type: 'QUIZ_SUBMIT_CONFIRM',
                    answerIndex: answerIndex,
                    message: 'Javobingiz qabul qilindi! 🔒 O‘qituvchi natijalarni ochishini kuting...'
                }));

                // Broadcast live progress counter to host & players without wiping UI state
                broadcastQuizProgress();
                return;
            }

        } catch (e) {
            console.error('WebSocket message parsing error:', e);
        }
    });

    ws.on('close', () => {
        if (ws.playerId && state.players.has(ws.playerId)) {
            const p = state.players.get(ws.playerId);
            p.connected = false;
            broadcastState();
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🎮 STOCK MARKET MULTIPLAYER GAME SERVER (PRODUCTION)`);
    console.log(`📡 Port: ${PORT} (0.0.0.0)`);
    console.log(`📺 Big Screen Host:  http://localhost:${PORT}/host`);
    console.log(`📊 Slides Deck:      http://localhost:${PORT}/slides`);
    console.log(`📱 Students Join:    http://${localIP}:${PORT}`);
    console.log(`=======================================================`);
});

// Graceful process shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP and WS server.');
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received. Closing HTTP and WS server.');
    server.close(() => process.exit(0));
});
