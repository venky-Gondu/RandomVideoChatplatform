let signalingChannel;
let myPeerId = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

/**
 * Connect to the WebSocket signaling server
 * @param {Function} onMessageReceived - Callback function to handle received messages
 * @returns {WebSocket} The WebSocket connection
 */
export function connectToSignalingServer(onMessageReceived) {

    const wsUrl = 'wss://5655b3ccc1dc.ngrok-free.app/websocket-endpoint';
    
    console.log("Connecting to signaling server:", wsUrl);
    
    try {
        signalingChannel = new WebSocket(wsUrl);
    } catch (err) {
        console.error("Failed to create WebSocket:", err);
        alert("Failed to connect to server. Please check the URL and try again.");
        return null;
    }

    // WebSocket opened successfully
    signalingChannel.onopen = () => {
        console.log("✓ Connected to signaling server!");
        reconnectAttempts = 0; // Reset reconnect counter on successful connection
    };

    // Handle incoming messages from server
    signalingChannel.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log("← Received signaling message:", message.type);
            onMessageReceived(message);
        } catch (err) {
            console.error("Error parsing signaling message:", err, "Raw data:", event.data);
        }
    };

    // Handle connection close
    signalingChannel.onclose = (event) => {
        console.log("Disconnected from signaling server.");
        console.log("Close code:", event.code, "Reason:", event.reason || "No reason provided");
        
        // Attempt reconnection if not exceeded max attempts
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`Attempting to reconnect... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            setTimeout(() => {
                connectToSignalingServer(onMessageReceived);
            }, RECONNECT_DELAY);
        } else {
            console.error("Max reconnection attempts reached. Please refresh the page.");
            alert("Lost connection to server. Please refresh the page to reconnect.");
        }
    };

    // Handle WebSocket errors
    signalingChannel.onerror = (error) => {
        console.error("WebSocket error occurred:", error);
    };

    return signalingChannel;
}

/**
 * Send a 'ready' message to find a match
 */
export function findMatch() {
    if (!signalingChannel) {
        console.error("Signaling channel not initialized");
        alert("Not connected to server. Please refresh the page.");
        return;
    }
    
    // Check if WebSocket is still connecting
    if (signalingChannel.readyState === WebSocket.CONNECTING) {
        console.warn("WebSocket is still connecting, state:", signalingChannel.readyState);
        alert("Still connecting to server... Please wait a moment and try again.");
        return;
    }
    
    // Check if WebSocket is open and ready
    if (signalingChannel.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket not ready, state:", signalingChannel.readyState);
        alert("Connection to server lost. Please refresh the page.");
        return;
    }
    
    console.log("→ Sending 'ready' message to find a match...");
    try {
        signalingChannel.send(JSON.stringify({ type: 'ready' }));
    } catch (err) {
        console.error("Error sending ready message:", err);
        alert("Failed to send request. Please try again.");
    }
}

/**
 * Send any signaling message through the WebSocket
 * @param {Object} message - The message object to send
 */
export function sendSignalingMessage(message) {
    if (signalingChannel && signalingChannel.readyState === WebSocket.OPEN) {
        console.log("→ Sending signaling message:", message.type);
        try {
            signalingChannel.send(JSON.stringify(message));
        } catch (err) {
            console.error("Error sending signaling message:", err);
        }
    } else {
        console.error("Cannot send message, WebSocket not open. State:", signalingChannel?.readyState);
    }
}

/**
 * Get the current peer ID
 * @returns {string|null} The peer ID or null
 */
export function getPeerId() {
    return myPeerId;
}

/**
 * Set the peer ID
 * @param {string} id - The peer ID to set
 */
export function setPeerId(id) {
    myPeerId = id;
    console.log("Peer ID set to:", id);
}

/**
 * Get the WebSocket signaling channel
 * @returns {WebSocket} The WebSocket connection
 */
export function getSignalingChannel() {
    return signalingChannel;
}

/**
 * Check if the WebSocket is connected and ready
 * @returns {boolean} True if connected, false otherwise
 */
export function isConnected() {
    return signalingChannel && signalingChannel.readyState === WebSocket.OPEN;
}

/**
 * Manually close the WebSocket connection
 */
export function disconnect() {
    if (signalingChannel) {
        console.log("Manually closing WebSocket connection");
        reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
        signalingChannel.close();
        signalingChannel = null;
    }
}

/**
 * Get the current WebSocket connection state
 * @returns {string} The connection state as a readable string
 */
export function getConnectionState() {
    if (!signalingChannel) return 'NOT_INITIALIZED';
    
    switch (signalingChannel.readyState) {
        case WebSocket.CONNECTING:
            return 'CONNECTING';
        case WebSocket.OPEN:
            return 'OPEN';
        case WebSocket.CLOSING:
            return 'CLOSING';
        case WebSocket.CLOSED:
            return 'CLOSED';
        default:
            return 'UNKNOWN';
    }
}