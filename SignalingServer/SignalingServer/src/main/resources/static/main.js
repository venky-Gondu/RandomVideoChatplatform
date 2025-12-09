import { 
    getLocalStream, 
    createPeerConnection, 
    addLocalStreamToPeerConnection,
    createOfferAndSend, 
    createAnswerAndSend 
} from './webrtc.js';

import { connectToSignalingServer, findMatch } from './signaling.js';

let localVideo = document.getElementById('localVideo');
let remoteVideo = document.getElementById('remoteVideo');
let findButton = document.getElementById('findButton');

let signalingChannel;
let peerConnection;
let localStream;

let myId = null;
let peerId = null;

// Handle messages from signaling server
async function handleSignalingMessage(message) {
    console.log("Received message:", message);
    
    switch (message.type) {
        case 'matchFound':
            console.log("Match found! My ID:", message.ownId, "Peer ID:", message.peerId);
            myId = message.ownId;
            peerId = message.peerId;
            
            // Create peer connection with remote video element
            peerConnection = createPeerConnection(signalingChannel, peerId, remoteVideo);

            if (localStream) {
                addLocalStreamToPeerConnection(localStream, peerConnection);
            }

            // The client with the smaller ID creates the offer
            if (myId < peerId) {
                console.log("I am the offerer (myId < peerId)");
                await createOfferAndSend(peerConnection, signalingChannel, peerId);
            } else {
                console.log("I am waiting for offer (myId > peerId)");
            }
            break;
            
        case 'offer':
            console.log("Received offer from peer");
            peerId = message.peerId;
            
            // Create peer connection if it doesn't exist
            if (!peerConnection) {
                peerConnection = createPeerConnection(signalingChannel, peerId, remoteVideo);
                if (localStream) {
                    addLocalStreamToPeerConnection(localStream, peerConnection);
                }
            }
            
            await createAnswerAndSend(peerConnection, signalingChannel, message.sdp, peerId);
            break;
            
        case 'answer':
            console.log("Received answer from peer");
            if (peerConnection && peerConnection.signalingState === "have-local-offer") {
                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription({ type: 'answer', sdp: message.sdp })
                );
                console.log("Remote description set successfully");
            } else {
                console.warn("Cannot set remote description, signaling state:", peerConnection?.signalingState);
            }
            break;
            
        case 'iceCandidate':
            if (!peerConnection) {
                console.warn("Received ICE candidate before peerConnection was ready. Ignoring.");
                return;
            }
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
                console.log("ICE candidate added successfully");
            } catch (err) {
                console.error("Error adding received ICE candidate:", err);
            }
            break;
            
        case 'peerDisconnected':
            console.log("Peer disconnected");
            if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
            }
            remoteVideo.srcObject = null;
            peerId = null;
            myId = null;
            alert("Peer disconnected. Click 'Find a Peer' to connect again.");
            break;
    }
}

// Initialize the application
async function setup() {
    try {
        console.log("Setting up application...");
        
        // Connect to signaling server
        signalingChannel = connectToSignalingServer(handleSignalingMessage);
        
        // Get local media stream
        localStream = await getLocalStream(localVideo);
        
        if (localStream) {
            console.log("Local stream ready");
            findButton.disabled = false; // Enable button after stream is ready
        } else {
            console.error("Failed to get local stream");
            alert("Failed to access camera/microphone. Please check permissions.");
        }
    } catch (err) {
        console.error("Setup error:", err);
        alert("Setup failed: " + err.message);
    }
}

// Button click handler
findButton.addEventListener('click', () => {
    if (!localStream) {
        console.warn("Local stream not ready");
        alert("Please wait for camera access...");
        return;
    }
    
    if (peerConnection) {
        console.log("Already in a call");
        return;
    }
    
    console.log("Finding match...");
    findMatch();
    findButton.disabled = true; // Disable while connecting
    
    // Re-enable after a timeout in case connection fails
    setTimeout(() => {
        if (!peerConnection || peerConnection.connectionState === 'failed') {
            findButton.disabled = false;
        }
    }, 10000);
});

// Start the application when page loads
findButton.disabled = true; // Initially disabled
setup();