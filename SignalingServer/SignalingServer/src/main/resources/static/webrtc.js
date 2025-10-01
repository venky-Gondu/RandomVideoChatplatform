// Request local camera + microphone
export async function getLocalStream(videoElement) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoElement.srcObject = stream;
        return stream;
    } catch (err) {
        console.error("Error accessing media devices:", err);
        return null;
    }
}

// Create RTCPeerConnection
export function createPeerConnection(signalingChannel, peerId) {
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    });

    // Capture peerId in closure so it's available when sending ICE candidates
    pc.onicecandidate = event => {
        if (
            event.candidate &&
            signalingChannel &&
            signalingChannel.readyState === WebSocket.OPEN
        ) {
            console.log("Sending ICE candidate to:", peerId);
            signalingChannel.send(JSON.stringify({
                type: 'iceCandidate',
                candidate: event.candidate,
                peerId: peerId
                 // Now correctly uses the passed peerId
            }));
        }
    };

    pc.ontrack = event => {
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    return pc;
}

// Attach local stream to PeerConnection
export function addLocalStreamToPeerConnection(stream, pc) {
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
}

// Create an SDP offer and send it
export async function createOfferAndSend(pc, signalingChannel, peerId) {
    console.log("Creating offer for peer:", peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    signalingChannel.send(JSON.stringify({
        type: "offer",
        sdp: offer.sdp,
        peerId: peerId
    }));
}

// Create an SDP answer and send it
export async function createAnswerAndSend(pc, signalingChannel, offerSdp, peerId) {
    await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: offerSdp }));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    signalingChannel.send(JSON.stringify({
        type: "answer",
        sdp: answer.sdp,
        peerId: peerId
    }));
}
