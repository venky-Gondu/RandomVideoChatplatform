package com.vediochat.SignalingServer;

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
        System.out.println("WebSocket closed: " + session.getId());
        waitingQueue.remove(session);

        // remove from peerMap and notify peer if exists
        WebSocketSession peer = peerMap.remove(session.getId());
        if (peer != null && peer.isOpen()) {
            peerMap.remove(peer.getId());
            try {
                peer.sendMessage(new TextMessage("{\"type\":\"peerDisconnected\"}"));
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        JsonNode jsonMessage = objectMapper.readTree(message.getPayload());
        String type = jsonMessage.get("type").asText();

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
    }

    private void handleReady(WebSocketSession session) throws IOException {
        System.out.println("Client " + session.getId() + " is ready for a match.");

        if (!waitingQueue.isEmpty()) {
            WebSocketSession peer = waitingQueue.poll();
            if (peer != null && peer.isOpen() && peer.getId() != session.getId()) {
                peerMap.put(session.getId(), peer);
                peerMap.put(peer.getId(), session);

                System.out.println("Match found! " + session.getId() + " paired with " + peer.getId());

                // Tell each client who their peer is
                peer.sendMessage(new TextMessage("{\"type\":\"matchFound\",\"peerId\":\"" + session.getId() + "\",\"ownId\":\"" + peer.getId() + "\"}"));
                session.sendMessage(new TextMessage("{\"type\":\"matchFound\",\"peerId\":\"" + peer.getId() + "\",\"ownId\":\"" + session.getId() + "\"}"));
            } else {
                waitingQueue.add(session);
            }
        } else {
            waitingQueue.add(session);
        }
    }

    private void handleOffer(WebSocketSession session, JsonNode message) throws IOException {
        JsonNode peerIdNode = message.get("peerId");
        if (peerIdNode == null) {
            System.out.println("Offer message missing peerId: " + message.toString());
            return;
        }
        String peerId = peerIdNode.asText();
        WebSocketSession peer = peerMap.get(peerId);
        if (peer != null && peer.isOpen()) {
            peer.sendMessage(new TextMessage(message.toString()));
        } else {
            System.out.println("Peer not found or not open for offer: " + peerId);
        }
    }

    private void handleAnswer(WebSocketSession session, JsonNode message) throws IOException {
        JsonNode peerIdNode = message.get("peerId");
        if (peerIdNode == null) {
            System.out.println("Answer message missing peerId: " + message.toString());
            return;
        }
        String peerId = peerIdNode.asText();
        WebSocketSession peer = peerMap.get(peerId);
        if (peer != null && peer.isOpen()) {
            peer.sendMessage(new TextMessage(message.toString()));
        }
    }

    private void handleIceCandidate(WebSocketSession session, JsonNode message) throws IOException {
        JsonNode peerIdNode = message.get("peerId");
        if (peerIdNode == null) {
            System.out.println("ICE candidate message missing peerId: " + message.toString());
            return;
        }
        String peerId = peerIdNode.asText();
        WebSocketSession peer = peerMap.get(peerId);
        if (peer != null && peer.isOpen()) {
            peer.sendMessage(new TextMessage(message.toString()));
        }
    }
}
