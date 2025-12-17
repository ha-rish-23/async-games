# 🔧 Troubleshooting Guide

## Fixed Issues in Latest Version

### ✅ Room Code Shows "----" 
**Fixed!** The issue was with PeerJS initialization. The updated code now:
- Uses proper PeerJS configuration with STUN servers
- Has better error handling
- Shows detailed console logs (press F12 to see)
- Uses a consistent ID format (`doubleblind-XXXX`)

### ✅ Connection Errors Between Host and Client
**Fixed!** Improvements include:
- Timeout handling (15 seconds for client, 10 for host)
- Better error messages showing the exact issue
- Reliable connection flags
- Status indicators that update in real-time

---

## How to Test the Fix

### Step 1: Clear Browser Cache
**Important:** You need to clear cache to load the new code!

**Chrome/Edge:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Click "Clear data"

**Or use Hard Refresh:**
- Press `Ctrl + Shift + R` (Windows)
- Press `Cmd + Shift + R` (Mac)

### Step 2: Test Locally

**Window 1 (Host):**
1. Open `http://localhost:8000`
2. Click "Invisible Platformer"
3. Click "Host (Player A - Spirit)"
4. **Wait 3-5 seconds** for the room code to appear
5. You should see a 4-letter code like `W7K9`
6. Status should say "Waiting for client to connect..."

**Window 2 (Client):**
1. Open **NEW** browser window (Ctrl+N)
2. Go to `http://localhost:8000`
3. Click "Invisible Platformer"
4. Click "Client (Player B - Hero)"
5. Enter the 4-letter code from Window 1
6. Click "Join"
7. Should connect within 5 seconds

### Step 3: Check Console Logs

If it still doesn't work, press **F12** in both windows and check the Console tab. You should see:

**Host Console:**
```
✅ Host peer opened with ID: doubleblind-w7k9
📡 Room Code: W7K9
✅ Client connected: peer-abc123
```

**Client Console:**
```
✅ Client peer opened with ID: peer-abc123
🔗 Attempting to connect to host: doubleblind-w7k9
✅ Connected to host successfully!
```

---

## Common Issues

### Issue: "PeerJS connection timeout"

**Causes:**
- PeerJS cloud server is down/overloaded
- Browser is blocking WebRTC connections
- Firewall blocking ports

**Solutions:**
1. **Try again in 30 seconds** - PeerJS free tier can be slow
2. **Use Chrome or Edge** - Best WebRTC support
3. **Disable VPN** - Can interfere with P2P connections
4. **Check browser console** (F12) for specific errors

### Issue: "Failed to connect: peer-not-found"

**Causes:**
- Host hasn't fully initialized yet
- Wrong room code entered
- Host closed their window

**Solutions:**
1. **Host: Wait 5 seconds** after clicking "Host" before sharing code
2. **Client: Double-check** the room code (case doesn't matter)
3. **Both: Refresh** and start over if stuck

### Issue: Connection works but screen stays black (Client)

**Cause:** 
- Host stopped rendering or physics loop crashed

**Solution:**
1. Host: Check console for errors (F12)
2. Refresh both windows and reconnect

### Issue: Input lag or stuttering

**Causes:**
- Slow internet connection
- CPU overload

**Solutions:**
1. Close other browser tabs
2. Both players should have stable internet
3. Try reducing browser zoom to 100%

---

## Advanced Debugging

### Enable PeerJS Debug Mode

The code already has `debug: 2` enabled. To see all PeerJS logs:

1. Press **F12** → Console tab
2. Look for messages starting with `[PeerJS]`
3. Share these logs if asking for help

### Network Diagnostics

Test if WebRTC works in your network:

1. Visit: https://test.webrtc.org/
2. Click "Start Test"
3. All tests should pass (green)

If any fail, your network may block WebRTC (corporate/school networks often do).

---

## Testing on Different Networks

### ✅ Same Local Network (Easiest)
- Both on same WiFi → **Works great**
- No firewall issues

### ✅ Different Networks (Internet)
- Requires NAT traversal (STUN servers)
- May fail on strict corporate networks
- **GitHub Pages deployment recommended**

### ⚠️ Mixed Local + Online
- Host on `localhost`, Client on `yourusername.github.io` → **Won't work**
- Both must use same base URL

---

## When to Use GitHub Pages Instead

If local testing keeps failing:

1. Deploy to GitHub Pages (see README.md)
2. Both players use `https://username.github.io/async-games/`
3. GitHub's HTTPS connection is more stable for WebRTC

---

## Still Having Issues?

1. **Check Browser Compatibility:**
   - ✅ Chrome 80+
   - ✅ Edge 80+
   - ✅ Firefox 75+
   - ⚠️ Safari (may have issues)

2. **Verify Files Loaded:**
   - F12 → Network tab
   - Refresh page
   - All files should show "200 OK" (not 404)

3. **Try Incognito Mode:**
   - Ctrl+Shift+N (Chrome)
   - May bypass extension conflicts

4. **Restart the Server:**
   ```powershell
   # Stop server (Ctrl+C in terminal)
   # Start again
   python -m http.server 8000
   ```

---

## Contact

If you're still stuck, check the browser console (F12) and note:
- Any red error messages
- The exact step where it fails
- Browser name and version
