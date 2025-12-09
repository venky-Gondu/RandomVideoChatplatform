// Request local camera + microphone
export async function getLocalStream(videoElement) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }, 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        videoElement.srcObject = stream;
        console.log("Local stream obtained successfully");
        return stream;
    } catch (err) {
        console.error("Error accessing media devices:", err);
        alert("Cannot access camera/microphone. Please grant permissions and reload.");
        return null;
    }
}

// Create RTCPeerConnection
export function createPeerConnection(signalingChannel, peerId, remoteVideoElement) {
    console.log("Creating peer connection for peer:", peerId);
    
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ]
    });

    // Handle ICE candidates
    pc.onicecandidate = event => {
        if (event.candidate) {
            console.log("Sending ICE candidate to:", peerId);
            if (signalingChannel && signalingChannel.readyState === WebSocket.OPEN) {
                signalingChannel.send(JSON.stringify({
                    type: 'iceCandidate',
                    candidate: event.candidate,
                    peerId: peerId
                }));
            } else {
                console.warn("Cannot send ICE candidate, WebSocket not open");
            }
        } else {
            console.log("All ICE candidates have been sent");
        }
    };

    // Handle incoming tracks (remote video/audio)
    pc.ontrack = event => {
        console.log("Received remote track:", event.track.kind, event.track.label);
        if (remoteVideoElement.srcObject !== event.streams[0]) {
            remoteVideoElement.srcObject = event.streams[0];
            console.log("Remote stream attached to video element");
        }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        switch (pc.connectionState) {
            case 'connected':
                console.log("✓ Peers connected successfully!");
                break;
            case 'disconnected':
                console.warn("Connection disconnected");
                break;
            case 'failed':
                console.error("Connection failed");
                break;
            case 'closed':
                console.log("Connection closed");
                break;
        }
    };

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
            console.error("ICE connection failed - may need TURN server");
        }
    };

    // Monitor ICE gathering state
    pc.onicegatheringstatechange = () => {
        console.log("ICE gathering state:", pc.iceGatheringState);
    };

    // Monitor signaling state
    pc.onsignalingstatechange = () => {
        console.log("Signaling state:", pc.signalingState);
    };

    return pc;
}

// Attach local stream to PeerConnection
export function addLocalStreamToPeerConnection(stream, pc) {
    console.log("Adding local stream tracks to peer connection");
    stream.getTracks().forEach(track => {
        console.log("Adding track:", track.kind, track.label);
        pc.addTrack(track, stream);
    });
}

// Create an SDP offer and send it
export async function createOfferAndSend(pc, signalingChannel, peerId) {
    try {
        console.log("Creating offer for peer:", peerId);
        const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        
        await pc.setLocalDescription(offer);
        console.log("Local description set (offer)");
        console.log("Offer SDP:", offer.sdp.substring(0, 100) + "...");

        if (signalingChannel.readyState === WebSocket.OPEN) {
            signalingChannel.send(JSON.stringify({
                type: "offer",
                sdp: offer.sdp,
                peerId: peerId
            }));
            console.log("Offer sent to peer:", peerId);
        } else {
            console.error("Cannot send offer, WebSocket not open");
        }
    } catch (err) {
        console.error("Error creating/sending offer:", err);
    }
}

// Create an SDP answer and send it
export async function createAnswerAndSend(pc, signalingChannel, offerSdp, peerId) {
    try {
        console.log("Creating answer for peer:", peerId);
        
        // Set remote description (the offer)
        await pc.setRemoteDescription(new RTCSessionDescription({ 
            type: "offer", 
            sdp: offerSdp 
        }));
        console.log("Remote description set (offer)");

        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("Local description set (answer)");
        console.log("Answer SDP:", answer.sdp.substring(0, 100) + "...");

        // Send answer
        if (signalingChannel.readyState === WebSocket.OPEN) {
            signalingChannel.send(JSON.stringify({
                type: "answer",
                sdp: answer.sdp,
                peerId: peerId
            }));
            console.log("Answer sent to peer:", peerId);
        } else {
            console.error("Cannot send answer, WebSocket not open");
        }
    } catch (err) {
        console.error("Error creating/sending answer:", err);
    }
}