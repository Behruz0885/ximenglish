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
    phase: 'LOBBY', // LOBBY, ROUND_1_IPO, ...
    stockName: 'Nova Pizza Inc.',
    stockPrice: 10,
    totalShares: 1000000,
    storesCount: '12 Locations',
    annualRevenue: '$8.5 Million',
    valuationFormatted: '$10,000,000',
    roundNumber: 0,
    quizNumber: null,
    isQuiz: false,
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
            quizNumber: state.quizNumber,
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
            totalShares: state.totalShares || 1000000,
            storesCount: state.storesCount || '12 Locations',
            annualRevenue: state.annualRevenue || '$8.5M',
            valuationFormatted: state.valuationFormatted || `$${(state.stockPrice * 1000000).toLocaleString()}`,
            roundNumber: state.roundNumber,
            quizNumber: state.quizNumber,
            isQuiz: state.isQuiz,
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

// Predefined Game Rounds: 10 Pizza Business Processes + 5 Simple Speed Quizzes + Grand Finale
const ROUNDS = [
    // --- 1. IPO ---
    {
        phase: 'ROUND_1_IPO',
        number: 1,
        isQuiz: false,
        title: 'ROUND 1: THE PIZZA IPO ($10 / Share)',
        price: 10,
        stores: '12 Locations',
        revenue: '$8.5 Million',
        valuation: '$10,000,000',
        headline: 'Nova Pizza Inc. Launches on the Stock Market at $10 / Share!',
        details: 'Nova Pizza operates 12 busy California pizzerias. To open new restaurants and buy ovens, the founders issue 1,000,000 shares at $10 each ($10M company valuation). You have $100 starting cash. Buy your first slices!',
        dividend: 0
    },
    // --- 2. VIRAL MARKETING ---
    {
        phase: 'ROUND_2_VIRAL',
        number: 2,
        isQuiz: false,
        title: 'ROUND 2: SECRET SAUCE GOES VIRAL ($16 / Share)',
        price: 16,
        stores: '12 Locations',
        revenue: '$14.0 Million',
        valuation: '$16,000,000',
        headline: 'Viral Sensation: "Hot-Honey Truffle Pizza" hits 40 Million views!',
        details: 'Customers line up for 2 hours outside every restaurant. Daily pizza sales surge 65%! High demand pushes the stock price from $10 up to $16 ($16M company valuation). Will you hold or take quick profits?',
        dividend: 0
    },
    // --- SPEED QUIZ 1 ---
    {
        phase: 'QUIZ_1_SHARE',
        quizNumber: 1,
        isQuiz: true,
        title: '⚡ SPEED QUIZ 1: WHAT IS A STOCK SHARE?',
        price: 16,
        stores: '12 Locations',
        revenue: '$14.0 Million',
        valuation: '$16,000,000',
        headline: 'Knowledge Bonus: What does owning a share of stock actually mean?',
        details: 'Tap the correct answer on your mobile phone to earn a +$30 cash bonus!',
        dividend: 0,
        quiz: {
            question: 'What is a share of stock?',
            options: [
                'A bank loan you have to repay with interest',
                'A legal slice of ownership in a real company',
                'A lottery ticket that depends on luck',
                'A discount coupon for free pizza'
            ],
            correct: 1,
            reward: 30
        }
    },
    // --- 3. STORE EXPANSION ---
    {
        phase: 'ROUND_3_EXPANSION',
        number: 3,
        isQuiz: false,
        title: 'ROUND 3: RAPID DRIVE-THRU EXPANSION ($24 / Share)',
        price: 24,
        stores: '30 Locations',
        revenue: '$25.0 Million',
        valuation: '$24,000,000',
        headline: 'Physical Expansion: Nova Pizza opens 18 new drive-thrus!',
        details: 'Using the cash raised from the IPO, Nova Pizza expands into Texas and Florida. Total locations reach 30 pizzerias. Customer volume pushes the stock to $24 ($24M valuation)!',
        dividend: 0
    },
    // --- 4. TECHNOLOGY & AUTOMATION ---
    {
        phase: 'ROUND_4_TECH',
        number: 4,
        isQuiz: false,
        title: 'ROUND 4: DELIVERY APP & ROBOTIC KITCHENS ($32 / Share)',
        price: 32,
        stores: '30 Stores + App',
        revenue: '$38.0 Million',
        valuation: '$32,000,000',
        headline: 'Tech Innovation: Nova Pizza launches mobile app & automated ovens!',
        details: '500,000 customers download the app for 1-click delivery. New automated dough-presses cut labor costs by 30%, skyrocketing profit margins. Stock leaps to $32 ($32M valuation)!',
        dividend: 0
    },
    // --- SPEED QUIZ 2 ---
    {
        phase: 'QUIZ_2_GROWTH',
        quizNumber: 2,
        isQuiz: true,
        title: '⚡ SPEED QUIZ 2: WHY DO STOCKS GROW?',
        price: 32,
        stores: '30 Stores + App',
        revenue: '$38.0 Million',
        valuation: '$32,000,000',
        headline: 'Knowledge Bonus: What drives stock prices higher over time?',
        details: 'Answer on your phone for a +$30 cash bonus!',
        dividend: 0,
        quiz: {
            question: 'Why does a company\'s stock price go UP over time?',
            options: [
                'When the company sells more and earns higher profits',
                'Pure luck and random coin flips',
                'When the company closes its stores and fires workers',
                'The government forces the price to increase'
            ],
            correct: 0,
            reward: 30
        }
    },
    // --- 5. PANIC DIP ---
    {
        phase: 'ROUND_5_DIP',
        number: 5,
        isQuiz: false,
        title: 'ROUND 5: THE CHEESE INFLATION PANIC ($15 / Share)',
        price: 15,
        stores: '30 Locations',
        revenue: '$34.0 Million',
        valuation: '$15,000,000',
        headline: 'Market Correction: Severe dairy shortage spikes cheese costs by 80%!',
        details: 'Financial news predicts profit collapse. Panicked short-term traders dump their shares, causing the price to crash from $32 down to $15! Is Nova Pizza ruined, or is quality on sale? BUY THE DIP or PANIC SELL?',
        dividend: 0
    },
    // --- SPEED QUIZ 3 ---
    {
        phase: 'QUIZ_3_DIP',
        quizNumber: 3,
        isQuiz: true,
        title: '⚡ SPEED QUIZ 3: BUYING THE DIP',
        price: 15,
        stores: '30 Locations',
        revenue: '$34.0 Million',
        valuation: '$15,000,000',
        headline: 'Knowledge Bonus: What is the mindset of a smart investor during a dip?',
        details: 'Answer on your phone for a +$30 cash bonus!',
        dividend: 0,
        quiz: {
            question: 'What does "Buying the Dip" mean in the stock market?',
            options: [
                'Selling all your shares in fear when the market drops',
                'Buying quality shares at a discount when price temporarily falls',
                'Borrowing cash to gamble on random trends',
                'Deleting your investment app'
            ],
            correct: 1,
            reward: 30
        }
    },
    // --- 6. SUPPLY CHAIN TURNAROUND ---
    {
        phase: 'ROUND_6_REBOUND',
        number: 6,
        isQuiz: false,
        title: 'ROUND 6: THE SUPPLY CHAIN TURNAROUND ($26 / Share)',
        price: 26,
        stores: '45 Locations',
        revenue: '$45.0 Million',
        valuation: '$26,000,000',
        headline: 'Turnaround: Nova Pizza signs direct 5-year fixed contracts with dairy farmers!',
        details: 'Smart management bypasses wholesalers, cutting ingredient costs back to normal. Profits surge back and 15 new stores open. The stock rebounds sharply from $15 back to $26 ($26M valuation)!',
        dividend: 0
    },
    // --- 7. CASH DIVIDEND ---
    {
        phase: 'ROUND_7_DIVIDEND',
        number: 7,
        isQuiz: false,
        title: 'ROUND 7: FRANCHISE BOOM & $3 CASH DIVIDEND ($36 / Share)',
        price: 36,
        stores: '75 Locations',
        revenue: '$60.0 Million',
        valuation: '$36,000,000',
        headline: 'Cash Payout: Nova Pizza pays $3.00 Cash Dividend Per Share!',
        details: 'Nova Pizza sells 30 profitable franchise licenses. With massive cash in the bank, the Board deposits $3.00 CASH directly into your balance for every share you hold! Stock price rallies to $36 ($36M valuation)!',
        dividend: 3
    },
    // --- SPEED QUIZ 4 ---
    {
        phase: 'QUIZ_4_DIVIDEND',
        quizNumber: 4,
        isQuiz: true,
        title: '⚡ SPEED QUIZ 4: CASH DIVIDENDS',
        price: 36,
        stores: '75 Locations',
        revenue: '$60.0 Million',
        valuation: '$36,000,000',
        headline: 'Knowledge Bonus: How do companies share profits with investors?',
        details: 'Answer on your phone for a +$40 cash bonus!',
        dividend: 0,
        quiz: {
            question: 'What is a cash Dividend in the stock market?',
            options: [
                'A monthly maintenance fee you pay to the stock broker',
                'A share of company profits paid directly to shareholders in cash',
                'A coupon code for free pizza delivery',
                'A penalty for holding shares too long'
            ],
            correct: 1,
            reward: 40
        }
    },
    // --- 8. COMPETITION & PRICE WAR ---
    {
        phase: 'ROUND_8_COMPETITION',
        number: 8,
        isQuiz: false,
        title: 'ROUND 8: FAST-FOOD PRICE WAR ($28 / Share)',
        price: 28,
        stores: '80 Locations',
        revenue: '$58.0 Million',
        valuation: '$28,000,000',
        headline: 'Price War: A giant fast-food rival launches a $5 imitation pizza!',
        details: 'A corporate giant spends millions advertising a cheap copy of Nova Pizza. Short-term quarterly growth slows down and the stock dips to $28. But loyal customers return for Nova Pizza\'s authentic quality.',
        dividend: 0
    },
    // --- 9. GLOBAL EXPANSION ---
    {
        phase: 'ROUND_9_GLOBAL',
        number: 9,
        isQuiz: false,
        title: 'ROUND 9: GLOBAL EXPANSION (LONDON & TOKYO) ($48 / Share)',
        price: 48,
        stores: '130 Locations',
        revenue: '$85.0 Million',
        valuation: '$48,000,000',
        headline: 'International Hit: Flagships open in London, Tokyo and Dubai!',
        details: 'Global demand is off the charts! 50 international franchise stores open to rave reviews. International revenue pushes company sales to $85 Million. The stock rockets to $48 ($48M valuation)!',
        dividend: 0
    },
    // --- SPEED QUIZ 5 ---
    {
        phase: 'QUIZ_5_INDEX',
        quizNumber: 5,
        isQuiz: true,
        title: '⚡ SPEED QUIZ 5: REDUCING RISK (S&P 500)',
        price: 48,
        stores: '130 Locations',
        revenue: '$85.0 Million',
        valuation: '$48,000,000',
        headline: 'Final Knowledge Bonus: How do professional investors protect wealth?',
        details: 'Final speed quiz challenge for a +$40 cash bonus!',
        dividend: 0,
        quiz: {
            question: 'What is the smartest way to reduce risk when investing?',
            options: [
                'Putting all your life savings into 1 single meme stock',
                'Diversifying by owning an index fund (like the S&P 500)',
                'Trading every 5 minutes based on social media rumors',
                'Keeping all your cash hidden under a mattress'
            ],
            correct: 1,
            reward: 40
        }
    },
    // --- 10. RECORD YEAR & MEGA DIVIDEND ---
    {
        phase: 'ROUND_10_MEGA_DIVIDEND',
        number: 10,
        isQuiz: false,
        title: 'ROUND 10: $110M MILESTONE & $5 MEGA DIVIDEND ($60 / Share)',
        price: 60,
        stores: '200+ Locations',
        revenue: '$110.0 Million',
        valuation: '$60,000,000',
        headline: 'Historic Milestone: Nova Pizza hits 200 stores & pays $5 Mega Dividend!',
        details: 'Nova Pizza crosses $110M annual revenue with 200+ global stores! The Board deposits a huge $5.00 CASH Dividend per share into your account! Share price reaches an all-time high of $60 ($60M valuation)! Patient shareholders win massive wealth!',
        dividend: 5
    },
    // --- GRAND FINALE ---
    {
        phase: 'GAME_OVER',
        number: 11,
        isQuiz: false,
        title: 'GRAND FINALE: WALL STREET CHAMPIONS',
        price: 60,
        stores: '200+ Locations',
        revenue: '$110.0 Million',
        valuation: '$60,000,000',
        headline: 'The Stock Market Showdown is Complete!',
        details: 'See who built the largest net worth through patience, smart buying during dips, and cash dividends!',
        dividend: 0
    }
];

let currentRoundIndex = -1;

function setRound(idx) {
    if (idx < 0 || idx >= ROUNDS.length) return;
    currentRoundIndex = idx;
    const r = ROUNDS[idx];

    state.phase = r.phase;
    state.roundNumber = r.number || state.roundNumber;
    state.quizNumber = r.quizNumber || null;
    state.isQuiz = Boolean(r.isQuiz);
    state.roundTitle = r.title;
    state.stockPrice = r.price;
    state.storesCount = r.stores || state.storesCount;
    state.annualRevenue = r.revenue || state.annualRevenue;
    state.valuationFormatted = r.valuation || `$${(r.price * 1000000).toLocaleString()}`;
    state.newsHeadline = r.headline;
    state.newsDetails = r.details;
    state.dividendAmount = r.dividend || 0;

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
    state.totalShares = 1000000;
    state.storesCount = '12 Locations';
    state.annualRevenue = '$8.5 Million';
    state.valuationFormatted = '$10,000,000';
    state.roundNumber = 0;
    state.quizNumber = null;
    state.isQuiz = false;
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
                        quizNumber: state.quizNumber,
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
                        totalShares: state.totalShares || 1000000,
                        storesCount: state.storesCount || '12 Locations',
                        annualRevenue: state.annualRevenue || '$8.5M',
                        valuationFormatted: state.valuationFormatted || `$${(state.stockPrice * 1000000).toLocaleString()}`,
                        roundNumber: state.roundNumber,
                        quizNumber: state.quizNumber,
                        isQuiz: state.isQuiz,
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
