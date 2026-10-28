# 📈 Stocks & Shares — Real-Time Classroom Arena & Presentation

An interactive, real-time multiplayer stock market game and 10-slide presentation deck designed for classrooms, workshops, and large-screen displays.

Built with **Node.js, WebSockets, HTML5, CSS3, and JavaScript**.

---

## 🚀 Key Features

1. **Big Screen Host Arena (`/host`)**:
   - **Interactive SVG Pizza Model**: Visualizes company shares ("1 slice = 1 share of the whole company pizza").
   - **Live Price Ticker & Market Pulse**: Dynamic stock price surges ($10 IPO → $25 Rally → $8 Panic Dip → $35 Record Year).
   - **Breaking News Alerts**: Broadcast-style green bull market rally, red panic crash, and gold cash dividend alerts.
   - **Live Esports Leaderboard**: Ranks all students in real time by Net Worth ($Cash + Slices × Price + Quiz bonuses).
   - **Speed Quiz Arena**: Multi-choice knowledge checks (S&P 500, CEO governance) with instant bonus payouts.
   - **Olympic Podium Finale**: Confetti explosion celebrating the top 3 investor champions.
   - **Web Audio Sound Effects**: Crisp real-time trading chimes, news gong, and fanfare.

2. **Mobile Controller (`/`)**:
   - Zero-install web app for students' phones.
   - Live Portfolio Card (Cash, Slices, Total Net Worth).
   - Fast Action Buttons: `Buy 1 Slice`, `Buy Max`, `Sell 1 Slice`, `Sell All`, `Hold Position`.
   - Speed Quiz buttons (A, B, C, D).
   - Instant transaction notifications and auto-reconnecting WebSocket connection.

3. **Interactive 10-Slide Deck (`/slides`)**:
   - Clean, modern presentation explaining stocks, pizza analogy, capital gains, dividends, index funds, compound interest calculator, and risk management.
   - Includes speaker notes for the teacher.

4. **PowerPoint Deck (`stocks_and_shares.pptx`)**:
   - 10 widescreen (16:9) slides formatted with `Segoe UI`.
   - Clean iconography, no emojis, production-ready for offline use.

---

## 🛠️ Local Development & Classroom Wi-Fi Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
*(Or double-click `run.bat` on Windows)*

### 3. Open on Screen
- **Projector / Big Screen**: [http://localhost:3000/host](http://localhost:3000/host)
- **Slides**: [http://localhost:3000/slides](http://localhost:3000/slides)
- **Student Phones**: Scan the QR code shown on the host screen or enter the local IP link displayed (e.g. `http://192.168.x.x:3000`).

---

## 🌐 Deploy to Render.com (Web Service)

This repository is pre-configured for **Render.com Web Services**:
- Automatic `PORT` binding (`process.env.PORT || 3000`).
- Bound to `0.0.0.0` for cloud routing.
- Dynamic QR code generation based on `RENDER_EXTERNAL_URL` or domain headers.
- Automatic WebSocket keep-alive ping/pong heartbeat every 25 seconds.
- Built-in `/health` endpoint for Render uptime health checks.

### Step-by-Step Render Deployment:
1. Push this repository to GitHub: `https://github.com/shonazarovbehruz425/ximenglish.git`.
2. Open [dashboard.render.com](https://dashboard.render.com).
3. Click **New +** → **Web Service**.
4. Select your GitHub repository: `shonazarovbehruz425/ximenglish`.
5. Enter configuration settings:
   - **Name**: `ximenglish` (or any name you prefer)
   - **Region**: Frankfurt / Singapore / Oregon (closest to you)
   - **Branch**: `main`
   - **Root Directory**: *(Leave empty / blank)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
6. Click **Create Web Service**.
7. In ~60 seconds, your game is live globally at:
   - Big Screen: `https://your-app-name.onrender.com/host`
   - Student Phones: `https://your-app-name.onrender.com`
   - Presentation: `https://your-app-name.onrender.com/slides`

Students anywhere can now scan the QR code and join directly over 4G, 5G, or school Wi-Fi!

---

## 📄 License
MIT © Behruz Shonazarov
