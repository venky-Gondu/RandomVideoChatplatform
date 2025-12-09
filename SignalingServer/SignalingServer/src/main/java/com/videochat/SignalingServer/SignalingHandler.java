package com.videochat.SignalingServer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
public class SignalingHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Queue<WebSocketSession> waitingQueue = new ConcurrentLinkedQueue<>();
    private final Map<String, WebSocketSession> peerMap = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        System.out.println("New WebSocket connection established: " + session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        System.out.println("WebSocket closed: " + session.getId() + " Status: " + status);
        waitingQueue.remove(session);

        // Remove from peerMap and notify peer if exists
        WebSocketSession peer = peerMap.remove(session.getId());
        if (peer != null && peer.isOpen()) {
            peerMap.remove(peer.getId());
            try {
                peer.sendMessage(new TextMessage("{\"type\":\"peerDisconnected\"}"));
                System.out.println("Notified peer " + peer.getId() + " about disconnection");
            } catch (IOException e) {
                System.err.println("Error notifying peer about disconnection: " + e.getMessage());
            }
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        try {
            JsonNode jsonMessage = objectMapper.readTree(message.getPayload());
            String type = jsonMessage.has("type") ? jsonMessage.get("type").asText() : "unknown";

            System.out.println("Received message from " + session.getId() + ": " + type);

            switch (type) {
                case "ready":
                    handleReady(session);
                    break;
                case "offer":
                    handleOffer(session, jsonMessage);
                    break;
                case "answer":
                    handleAnswer(session, jsonMessage);
                    break;
                case "iceCandidate":
                    handleIceCandidate(session, jsonMessage);
                    break;
                default:
                    System.out.println("Unknown message type: " + type);
            }
        } catch (Exception e) {
            System.err.println("Error handling message from " + session.getId() + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void handleReady(WebSocketSession session) throws IOException {
        System.out.println("Client " + session.getId() + " is ready for a match.");

        if (!waitingQueue.isEmpty()) {
            WebSocketSession peer = waitingQueue.poll();
            
            // Fixed: Use .equals() for String comparison instead of !=
            if (peer != null && peer.isOpen() && !peer.getId().equals(session.getId())) {
                peerMap.put(session.getId(), peer);
                peerMap.put(peer.getId(), session);

                System.out.println("Match found! " + session.getId() + " paired with " + peer.getId());

                // Tell each client who their peer is
                String peerMessage = "{\"type\":\"matchFound\",\"peerId\":\"" + session.getId() + "\",\"ownId\":\"" + peer.getId() + "\"}";
                String sessionMessage = "{\"type\":\"matchFound\",\"peerId\":\"" + peer.getId() + "\",\"ownId\":\"" + session.getId() + "\"}";
                
                peer.sendMessage(new TextMessage(peerMessage));
                session.sendMessage(new TextMessage(sessionMessage));
                
                System.out.println("Sent matchFound to both peers");
            } else {
                // Peer is invalid, add current session to queue
                System.out.println("Invalid peer found in queue, adding current session to queue");
                waitingQueue.add(session);
            }
        } else {
            System.out.println("No peers waiting, adding " + session.getId() + " to queue");
            waitingQueue.add(session);
        }
    }

    private void handleOffer(WebSocketSession session, JsonNode message) throws IOException {
        JsonNode peerIdNode = message.get("peerId");
        if (peerIdNode == null) {
            System.out.println("Offer message missing peerId from " + session.getId());
            return;
        }
        
        String peerId = peerIdNode.asText();
        WebSocketSession peer = peerMap.get(peerId);
        
        if (peer != null && peer.isOpen()) {
            peer.sendMessage(new TextMessage(message.toString()));
            System.out.println("Forwarded offer from " + session.getId() + " to " + peerId);
        } else {
            System.out.println("Peer not found or not open for offer: " + peerId);
        }
    }

    private void handleAnswer(WebSocketSession session, JsonNode message) throws IOException {
        JsonNode peerIdNode = message.get("peerId");
        if (peerIdNode == null) {
            System.out.println("Answer message missing peerId from " + session.getId());
            return;
        }
        
        String peerId = peerIdNode.asText();
        WebSocketSession peer = peerMap.get(peerId);
        
        if (peer != null && peer.isOpen()) {
            peer.sendMessage(new TextMessage(message.toString()));
            System.out.println("Forwarded answer from " + session.getId() + " to " + peerId);
        } else {
            System.out.println("Peer not found or not open for answer: " + peerId);
        }
    }

    private void handleIceCandidate(WebSocketSession session, JsonNode message) throws IOException {
        JsonNode peerIdNode = message.get("peerId");
        if (peerIdNode == null) {
            System.out.println("ICE candidate message missing peerId from " + session.getId());
            return;
        }
        
        String peerId = peerIdNode.asText();
        WebSocketSession peer = peerMap.get(peerId);
        
        if (peer != null && peer.isOpen()) {
            peer.sendMessage(new TextMessage(message.toString()));
            System.out.println("Forwarded ICE candidate from " + session.getId() + " to " + peerId);
        } else {
            System.out.println("Peer not found or not open for ICE candidate: " + peerId);
        }
    }
}