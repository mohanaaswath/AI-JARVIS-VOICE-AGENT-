# AI JARVIS – Browser-Based Offline & Online Voice Assistant (PWA)

A modern, intelligent, browser-based AI assistant operating seamlessly across **Online** and **Offline** modes. Built as a Progressive Web App (PWA) installable on desktop, laptop, tablet, and mobile devices.

---

## 🌟 Key Features

### 1. Dual Operating Modes
- **Online Mode**:
  - Connects to Cloud AI models (Google Gemini, OpenAI GPT-4o, Anthropic Claude).
  - Real-time web search integration via DuckDuckGo & live scraping tool proxy.
  - Contextual conversations and smart reasoning.
  - Natural speech synthesis and voice-to-text.
- **Offline Mode**:
  - Instant loading and caching through PWA **Service Worker** (`sw.js`).
  - Persistent offline storage in **IndexedDB** (`jarvis_offline_db`) for conversations, chat history, notes, tasks, and user preferences.
  - Browser-native speech synthesis (`SpeechSynthesis`) and speech recognition (`Web Speech API`).
  - Seamless offline note-taking and task reminders.
  - Automatic network state detection (`online` / `offline` events) with real-time UI indicator.

### 2. Browser Voice Assistant & Interactive Arc Reactor
- Central animated futuristic **Arc Reactor** with audio-reactive energy pulses.
- Push-to-talk & continuous voice capture.
- Real-time user transcript rendering.
- Speech interruption: tap or speak to interrupt the assistant immediately.
- Configurable voices, speech rate, pitch, and auto-speak toggle in Settings.

### 3. Integrated Assistant Tools & Productivity Hub
- **Voice-to-Notes**: Say *"Save this explanation in my notes"* to automatically extract and save notes to IndexedDB.
- **Task Tracker**: Say *"Add task finish project review"* to create and track to-do items.
- **Browser Actions**: Safe user-directed web navigation (e.g. *"Open YouTube"*, *"Search Google for..."*).
- **Export & Import**: Download all saved data as JSON or restore backups anytime.

---

## 🚀 Running the Application

### Option A: One-Click Silent Web Launch (No CMD Window)
Double-click `start-jarvis.bat`.
It starts the FastAPI backend and Vite frontend silently in the background without popping up visible command prompt windows, and automatically opens:
```
http://localhost:5173
```

### Option B: Stop Background Services
Double-click `stop-jarvis.bat` to terminate all background JARVIS processes cleanly.

### Option C: Manual Launch
1. **Start the Backend API**:
   ```powershell
   .\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000
   ```
2. **Start the Frontend**:
   ```powershell
   cd frontend
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

---

## 📱 PWA Installation
When visiting `http://localhost:5173` in Chrome, Edge, or Safari:
1. Click the **"Install PWA"** button in the sidebar or the browser address bar icon.
2. The application installs as a standalone desktop or mobile application.
3. Once installed, it works offline without an internet connection using cached assets and IndexedDB!

---

## 🧪 Testing and Verification
Run the backend test suite:
```powershell
.\venv\Scripts\python.exe -m pytest tests
```
Build the frontend:
```powershell
cd frontend
npm run build
```
