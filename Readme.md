# WebRTC Peer-to-Peer Video Chat Application

A real-time peer-to-peer video chat application built with WebRTC, Spring Boot WebSocket signaling server, and vanilla JavaScript. Users can connect randomly with other online users for instant video conversations.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Troubleshooting](#troubleshooting)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- 🎥 **Real-time video and audio streaming** using WebRTC
- 🔄 **Random peer matching** system
- 🔌 **WebSocket signaling server** for peer connection establishment
- 🔁 **Automatic reconnection** on connection loss
- 📱 **Responsive design** with Tailwind CSS
- 🎯 **HD video quality** with echo cancellation and noise suppression
- 🔊 **Audio controls** with auto-gain control
- 🌐 **Multiple STUN servers** for better connectivity
- 📊 **Comprehensive logging** for debugging

## 🏗️ Architecture

```
┌─────────────┐         WebSocket          ┌─────────────────┐
│   Client A  │◄──────Signaling───────────►│  Spring Boot    │
│  (Browser)  │      (Offer/Answer/ICE)    │  Signaling      │
└─────────────┘                             │  Server         │
      ▲                                     └─────────────────┘
      │                                              ▲
      │                                              │
      │         WebRTC (Direct P2P)                 │
      │         (Video/Audio Stream)                │
      │                                              │
      ▼                                              ▼
┌─────────────┐         WebSocket          ┌─────────────────┐
│   Client B  │◄──────Signaling───────────►│                 │
│  (Browser)  │      (Offer/Answer/ICE)    │                 │
└─────────────┘                             └─────────────────┘
```

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Java 17** or higher
- **Maven 3.6+**
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **HTTPS connection** (WebRTC requires secure context)
- **Ngrok** (for testing) or a production server with SSL

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/webrtc-video-chat.git
cd webrtc-video-chat/SignalingServer/SignalingServer
```

### 2. Install Dependencies

Maven will automatically download dependencies when you build:

```bash
./mvnw clean install
```

Or on Windows:

```cmd
mvnw.cmd clean install
```

## ⚙️ Configuration

### 1. Configure Application Properties

Edit `src/main/resources/application.properties`:

```properties
# Server port
server.port=8550

# SSL Configuration (for production)
server.ssl.enabled=false
server.ssl.key-store=classpath:keystore.p12
server.ssl.key-store-password=YourPassword
server.ssl.key-store-type=PKCS12
server.ssl.key-alias=myserver
server.ssl.key-password=YourPassword
```

### 2. Update WebSocket URL

Edit `src/main/resources/static/signaling.js`:

```javascript
// For local testing with ngrok
const wsUrl = 'wss://your-ngrok-url.ngrok-free.app/websocket-endpoint';

// For production
const wsUrl = 'wss://yourdomain.com/websocket-endpoint';
```

### 3. Generate SSL Certificate (Production)

For production deployment, generate a proper SSL certificate:

```bash
keytool -genkeypair -alias myserver -keyalg RSA -keysize 2048 \
  -storetype PKCS12 -keystore keystore.p12 -validity 3650
```

Place the `keystore.p12` file in `src/main/resources/`.

## 🏃 Running the Application

### Option 1: Local Development with Ngrok

1. **Start the Spring Boot server:**

```bash
./mvnw spring-boot:run
```

2. **Start ngrok tunnel:**

```bash
ngrok http 8550
```

3. **Update WebSocket URL** in `signaling.js` with your ngrok URL

4. **Open the application:**

```
https://your-ngrok-url.ngrok-free.app/Home.html
```

### Option 2: Production Deployment

1. **Build the JAR file:**

```bash
./mvnw clean package
```

2. **Run the JAR:**

```bash
java -jar target/SignalingServer-0.0.1-SNAPSHOT.jar
```

3. **Access via your domain:**

```
https://yourdomain.com/Home.html
```

## 📁 Project Structure

```
SignalingServer/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/vediochat/SignalingServer/
│   │   │       ├── SignalingServerApplication.java    # Main application
│   │   │       ├── SignalingHandler.java              # WebSocket handler
│   │   │       └── webSocketConfig.java               # WebSocket config
│   │   └── resources/
│   │       ├── application.properties                 # App configuration
│   │       └── static/
│   │           ├── Home.html                          # Main HTML page
│   │           ├── main.js                            # Main JavaScript
│   │           ├── webrtc.js                          # WebRTC logic
│   │           └── signaling.js                       # Signaling logic
│   └── test/
├── pom.xml                                            # Maven configuration
└── README.md
```

## 🔧 How It Works

### 1. Connection Flow

```
User A clicks "Find a Peer"
         ↓
Sends 'ready' message to server
         ↓
Server matches with User B (if available)
         ↓
Server sends 'matchFound' to both users
         ↓
User A creates offer (SDP)
         ↓
User A sends offer to server → User B
         ↓
User B creates answer (SDP)
         ↓
User B sends answer to server → User A
         ↓
Both exchange ICE candidates
         ↓
Direct P2P connection established
         ↓
Video/Audio streaming begins
```

### 2. Message Types

| Message Type | Direction | Purpose |
|-------------|-----------|---------|
| `ready` | Client → Server | Request to find a peer |
| `matchFound` | Server → Client | Notify peer match found |
| `offer` | Client A → Server → Client B | SDP offer for connection |
| `answer` | Client B → Server → Client A | SDP answer to offer |
| `iceCandidate` | Client ↔ Server ↔ Client | Exchange ICE candidates |
| `peerDisconnected` | Server → Client | Notify peer disconnection |

### 3. WebRTC Connection States

Monitor connection states in browser console:

- **Signaling State**: `stable`, `have-local-offer`, `have-remote-offer`
- **ICE Connection State**: `new`, `checking`, `connected`, `completed`, `failed`
- **Connection State**: `new`, `connecting`, `connected`, `disconnected`, `failed`, `closed`

## 🐛 Troubleshooting

### Issue: "Cannot access camera/microphone"

**Solution:**
- Grant camera/microphone permissions in browser
- Ensure HTTPS connection (required for WebRTC)
- Check browser settings for media permissions

### Issue: "WebSocket connection failed"

**Solution:**
- Verify WebSocket URL in `signaling.js`
- Check if server is running on correct port
- Ensure ngrok tunnel is active (for local testing)
- Check firewall settings

### Issue: "Video not displaying"

**Solution:**
- Check browser console for errors
- Verify both peers have granted camera permissions
- Ensure STUN servers are accessible
- Check network connectivity
- Try different browser

### Issue: "Connection state: failed"

**Solution:**
- May need TURN server for restrictive networks
- Check NAT/firewall configuration
- Verify STUN servers are reachable
- Try different network (mobile hotspot)

### Issue: "ICE candidates not exchanging"

**Solution:**
- Verify WebSocket is open when sending candidates
- Check signaling server logs
- Ensure peer IDs are correctly exchanged
- Check for JavaScript errors in console

## 🛠️ Technologies Used

### Backend
- **Spring Boot 3.5.5** - Application framework
- **Spring WebSocket** - WebSocket support
- **Jackson** - JSON processing
- **Maven** - Build tool

### Frontend
- **WebRTC API** - Real-time communication
- **WebSocket API** - Signaling communication
- **Tailwind CSS** - Styling
- **Vanilla JavaScript** - ES6 modules

### Infrastructure
- **STUN Servers** - NAT traversal (Google STUN)
- **Ngrok** - Local testing tunnel
- **HTTPS** - Secure communication

## 📈 Performance Considerations

- **Video Quality**: Defaults to 720p (adjustable in `webrtc.js`)
- **Audio Processing**: Echo cancellation, noise suppression enabled
- **Connection Timeout**: 10 seconds for peer matching
- **Reconnection**: Up to 5 attempts with 3-second delay
- **ICE Gathering**: Multiple STUN servers for reliability

## 🔒 Security Considerations

- ✅ HTTPS required for WebRTC
- ✅ No media data passes through server (P2P only)
- ✅ Session IDs used for peer matching
- ⚠️ No authentication implemented (add for production)
- ⚠️ No room/channel isolation (add for multi-room support)
- ⚠️ CORS enabled for all origins (restrict in production)

## 🚧 Future Enhancements

- [ ] Add TURN server support for restrictive networks
- [ ] Implement user authentication
- [ ] Add text chat functionality
- [ ] Support multiple participants (group calls)
- [ ] Add screen sharing capability
- [ ] Implement room/channel system
- [ ] Add recording functionality
- [ ] Mobile app development
- [ ] Add filters and effects
- [ ] Implement user reporting/blocking




---

**⭐ If you found this project helpful, please give it a star!**