let signalingChannel;
let myPeerId = null;


export function connectToSignalingServer(onMessageReceived) {
    const wsUrl = 'wss://79e696388938.ngrok-free.app/websocket-endpoint';
    signalingChannel = new WebSocket(wsUrl);

    signalingChannel.onopen = () => {
        console.log("Connected to signaling server!");
    };

    signalingChannel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        onMessageReceived(message);
    };

    signalingChannel.onclose = () => {
        console.log("Disconnected from signaling server.");
    };

    signalingChannel.onerror = (error) => {
        console.error("WebSocket error: ", error);
    };

    return signalingChannel;
}

export function findMatch() {
    if (!signalingChannel || signalingChannel.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket not ready yet, state=", signalingChannel?.readyState);
        return;
    }
    console.log("Looking for a match...");
    signalingChannel.send(JSON.stringify({ type: 'ready' }));
}



export function getPeerId() {
    return myPeerId;
}

export function setPeerId(id) {
    myPeerId = id;
}
