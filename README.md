# 🎮 Double Blind: An Asymmetric Co-op Arcade

A collection of 6 asymmetric cooperative games where two players see completely different views and must communicate to succeed. Built with pure HTML5, CSS3, and Vanilla JavaScript using WebRTC (PeerJS) for P2P networking.

## 🚀 Quick Start Guide

### **Local Testing (2 Browser Windows)**

1. **Install a Local Server**
   
   The easiest way is to use Python's built-in HTTP server or VS Code's Live Server extension.

   **Option A: Python HTTP Server**
   ```powershell
   # Navigate to the project folder
   cd C:\Users\Admin\Documents\Projects\async-games
   
   # Start server (Python 3)
   python -m http.server 8000
   
   # OR Python 2
   python -m SimpleHTTPServer 8000
   ```

   **Option B: VS Code Live Server**
   - Install the "Live Server" extension by Ritwick Dey
   - Right-click `index.html` → "Open with Live Server"

2. **Open Two Browser Windows**
   
   Open `http://localhost:8000` (or `http://127.0.0.1:5500` for Live Server) in **two separate browser windows** (not tabs - side by side works best).

3. **Play the Game**
   
   **Window 1 (Host - Player A "Spirit"):**
   - Click "Invisible Platformer"
   - Click "Host (Player A - Spirit)"
   - You'll see a **4-letter Room Code** (e.g., `X7K9`)
   - You can see the FULL level (platforms, spikes, goal)
   - You cannot control the character

   **Window 2 (Client - Player B "Hero"):**
   - Click "Invisible Platformer"
   - Click "Client (Player B - Hero)"
   - Enter the **Room Code** from Window 1
   - Click "Join"
   - Your screen is **pitch black** except for your character
   - Use **Arrow Keys** or **WASD** to move
   - **Space** or **Up Arrow** to jump

4. **How to Win**
   
   Player A (Spirit) guides Player B (Hero) through voice/text chat:
   - "Jump now!"
   - "Move right slowly..."
   - "Stop! There's a spike ahead!"
   
   Goal: Reach the **golden glowing box** in the top-right corner.

---

## 🌐 Deploying to GitHub Pages

### **Step 1: Push to GitHub**

```powershell
cd C:\Users\Admin\Documents\Projects\async-games

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit - Double Blind arcade"

# Link to your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/async-games.git
git branch -M main
git push -u origin main
```

### **Step 2: Enable GitHub Pages**

1. Go to your repository on GitHub: `https://github.com/YOUR_USERNAME/async-games`
2. Click **Settings** (top right)
3. Scroll to **Pages** (left sidebar)
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**
6. Wait 1-2 minutes for deployment

### **Step 3: Access Your Game**

Your game will be live at:
```
https://YOUR_USERNAME.github.io/async-games/
```

**Example:** If your username is `ha-rish-23`:
```
https://ha-rish-23.github.io/async-games/
```

---

## 🎯 How to Connect with a Friend

### **Testing with a Friend (Both Online)**

1. **Host Player:**
   - Opens: `https://YOUR_USERNAME.github.io/async-games/`
   - Clicks "Invisible Platformer"
   - Clicks "Host (Player A - Spirit)"
   - Shares the **4-letter code** with friend (via Discord, WhatsApp, etc.)

2. **Client Player:**
   - Opens: `https://YOUR_USERNAME.github.io/async-games/`
   - Clicks "Invisible Platformer"
   - Clicks "Client (Player B - Hero)"
   - Enters the code and clicks "Join"

3. **Play Together!**
   - Use voice chat (Discord, phone call) to coordinate
   - Host sees everything, Client is blind
   - Work together to reach the goal!

---

## 🛠️ Technical Stack

- **Frontend:** HTML5 Canvas, CSS3, Vanilla JavaScript (ES6+)
- **Networking:** [PeerJS](https://peerjs.com/) (WebRTC wrapper) for P2P connections
- **Physics:** Custom 2D physics (Game 5 uses Matter.js)
- **Audio:** Web Audio API
- **Hosting:** Static files (GitHub Pages compatible)

---

## 🎨 Game 1: Invisible Platformer

**Player A (Spirit):** Full view of the level  
**Player B (Hero):** Pitch black screen, only sees their character

**Controls (Player B):**
- **Arrow Keys** or **A/D**: Move left/right
- **Space** or **W/Up Arrow**: Jump

**Mechanics:**
- Smooth acceleration/deceleration
- Variable jump height (hold jump for higher jumps)
- Particle effects on jump
- Pixel art character sprite with facing direction
- Spike hazards (instant death)
- Glowing goal zone

**Tips:**
- Player A should call out platform positions: "There's a platform 2 character-widths to your right"
- Watch out for spike patterns on the ground
- Time your jumps carefully - momentum carries you!

---

## 📋 Upcoming Games

2. **Sonar Submarine** - Captain controls, Radar sees (Vector oscilloscope style)
3. **The Art Heist** - Hacker sees lasers, Thief navigates grid (Blueprint style)
4. **Assembly Line: The Bomb** - Expert reads manual, Tech interacts (Industrial style)
5. **PIVOT!** - Two players move a couch through physics (Low-poly cartoon)
6. **The Marauder's Map** - Map holder sees all, Student has limited vision (Parchment style)

---

## 🐛 Troubleshooting

**"Connection failed" error:**
- PeerJS public servers can be unreliable. Try refreshing both windows.
- Make sure both players are online (not localhost + online mix)
- Check browser console for errors (F12)

**Game runs slow:**
- Close other browser tabs
- Try a different browser (Chrome/Edge recommended)

**Can't connect to friend:**
- Ensure both are using the **same URL** (either both local or both GitHub Pages)
- Check firewall settings (PeerJS uses WebRTC which may be blocked)
- Some corporate/school networks block WebRTC

---

## 📦 Project Structure

```
async-games/
├── index.html              # Main menu (Neon Arcade)
├── css/
│   └── global.css          # Shared styles
├── js/
│   ├── network.js          # PeerJS wrapper (NetworkManager)
│   └── audio-manager.js    # Web Audio effects
└── games/
    └── platformer/
        ├── platformer.html # Game page
        ├── game.js         # Game logic
        └── style.css       # Game-specific styles
```

---

## 📝 License

MIT License - Feel free to modify and share!

---

## 🎉 Credits

Created as a demonstration of asymmetric cooperative gameplay using modern web technologies.

**Inspirations:**
- Keep Talking and Nobody Explodes (Game 4)
- Friends TV Show "Pivot!" Scene (Game 5)
- Harry Potter Marauder's Map (Game 6)
