# Realtime Chat App

A real-time chat app built with React. Features dark/light mode, multi-channel support, bot replies, emoji reactions, and cross-tab real-time messaging via BroadcastChannel API.

## Getting Started

### Prerequisites
- Node.js 16+ installed ([download](https://nodejs.org))

### Run in VS Code

1. **Open the folder in VS Code**
   ```
   File → Open Folder → select the `chat-app` folder
   ```

2. **Open the integrated terminal**
   ```
   Terminal → New Terminal  (or Ctrl + `)
   ```

3. **Install dependencies** (first time only)
   ```bash
   npm install
   ```

4. **Start the app**
   ```bash
   npm start
   ```

5. The app opens at **http://localhost:3000** in your browser.

---

## Features

- **Dark / Light mode** — toggle with the moon/sun button
- **4 channels** — general, random, dev-talk, design
- **Bot replies** — channel-aware simulated responses with typing indicator
- **Emoji reactions** — double-click any message bubble to react
- **Emoji picker** — click 😊 to insert emojis into your message
- **Real-time cross-tab** — open two browser tabs, messages appear in both
- **Responsive** — collapses sidebar on mobile
- **Keyboard shortcut** — press Enter to send

---

## Project Structure

```
chat-app/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx          # Main component
│   ├── App.module.css   # All styles (CSS Modules)
│   ├── data.js          # Users, channels, sample messages
│   └── index.js         # React entry point
├── package.json
└── README.md
```
