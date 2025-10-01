import { 
    getLocalStream, 
    createPeerConnection, 
    addLocalStreamToPeerConnection,
    createOfferAndSend, 
    createAnswerAndSend 
} from './webrtc.js';

import { connectToSignalingServer, findMatch, getPeerId, setPeerId } from './signaling.js';

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
    switch (message.type) {
        case 'matchFound':
            myId = message.ownId;
            peerId = message.peerId;
            peerConnection = createPeerConnection(signalingChannel, peerId); // <-- correct

            if (localStream) {
                addLocalStreamToPeerConnection(localStream, peerConnection);
            }

            if (myId < peerId) {
                await createOfferAndSend(peerConnection, signalingChannel, peerId);
            }
            break;
        case 'offer':
            peerId = message.peerId; // <-- ensure peerId is set
            peerConnection = createPeerConnection(signalingChannel, peerId); // <-- fix: pass peerId
            if (localStream) {
                addLocalStreamToPeerConnection(localStream, peerConnection);
            }
            await createAnswerAndSend(peerConnection, signalingChannel, message.sdp, peerId); // <-- use peerId
            break;
        case 'answer':
                console.log("Received answer from peer:", peerId);
            if (peerConnection.signalingState === "have-local-offer") {
                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription({ type: 'answer', sdp: message.sdp })
                );
            }   
            break;
        case 'iceCandidate':
                if (!peerConnection) {
                    console.warn("Received ICE candidate before peerConnection was ready. Ignoring.");
                    return;
                }
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
                } catch (err) {
                    console.error("Error adding received ICE candidate:", err);
                }
                break;
    }
}

findButton.disabled = true; // Initially disabled

async function setup() {
    signalingChannel = connectToSignalingServer(handleSignalingMessage);
    localStream = await getLocalStream(localVideo);
    findButton.disabled = false; // Enable after stream is ready
}

findButton.addEventListener('click', () => {
    if (localStream) {
        findMatch();
    } else {
        console.warn("Local stream not ready");
    }
});
