// WebRTC Voice Chat Signaling Service with tweakables

/**
 * @file Manages WebRTC (voice or video) signaling for real-time multiplayer, with tweakable JSDoc annotations.
 * This file assumes a server-side Node/WebSocket environment and uses simple-peer for demo structure.
 */

/* global SimplePeer, WebSocket */

class VoiceChatService {
  /**
   * @tweakable Maximum simultaneous voice chat connections per match
   */
  static MAX_VOICE_CONNECTIONS = 10;

  /**
   * @tweakable ICE server config used for peer connections
   */
  static ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' }
    // Add TURN servers as needed:
    // { urls: 'turn:your.turnserver.com', username: 'youruser', credential: 'yourpass' }
  ];

  /** Map: matchId -> array of { ws, peer } */
  static connections = new Map();

  /**
   * Handle an incoming signaling message.
   * @param {WebSocket} ws
   * @param {object} message
   */
  static handleSignaling(ws, message) {
    switch (message.type) {
      case 'offer':
        this.handleOffer(ws, message);
        break;
      case 'answer':
        this.handleAnswer(ws, message);
        break;
      case 'ice-candidate':
        this.handleICECandidate(ws, message);
        break;
    }
  }

  /**
   * Handle incoming offer, create SimplePeer and connect.
   * @param {WebSocket} ws
   * @param {object} offer
   */
  static async handleOffer(ws, offer) {
    // Enforce max connections per match
    const list = this.connections.get(offer.matchId) || [];
    if (list.length >= this.MAX_VOICE_CONNECTIONS) {
      ws.send(JSON.stringify({type:"voice-denied", reason:"max_connections"}));
      return;
    }

    const peer = new SimplePeer({
      initiator: false,
      trickle: true,
      config: { iceServers: this.ICE_SERVERS }
    });

    peer.on('signal', answer => {
      // Send answer back to offerer
      ws.send(JSON.stringify({ ...answer, type: 'answer', matchId: offer.matchId }));
    });

    peer.signal(offer.sdp);

    // Save the connection
    list.push({ ws, peer });
    this.connections.set(offer.matchId, list);

    ws.on('close', () => {
      // Remove peer on close
      this.connections.set(offer.matchId, (this.connections.get(offer.matchId) || []).filter(conn => conn.ws !== ws));
      peer.destroy();
    });
  }

  /**
   * Handle answer message ("answer" to previous offer)
   * @param {WebSocket} ws
   * @param {object} message
   */
  static handleAnswer(ws, message) {
    // Forward to correct SimplePeer instance (find peer by ws and matchId)
    const list = this.connections.get(message.matchId) || [];
    for (const conn of list) {
      if (conn.ws === ws) {
        conn.peer.signal(message.sdp);
      }
    }
  }

  /**
   * Handle ICE candidate exchange
   * @param {WebSocket} ws
   * @param {object} message
   */
  static handleICECandidate(ws, message) {
    const list = this.connections.get(message.matchId) || [];
    for (const conn of list) {
      if (conn.ws === ws) {
        conn.peer.signal(message.candidate);
      }
    }
  }

  /**
   * Setup SFU (Selective Forwarding Unit) to support multi-user voice in a match.
   * @param {string} matchId
   *
   * @tweakable Enable SFU (single peer per room forwarding to many)
   */
  static SFU_ENABLED = true;
  static setupSFU(matchId) {
    if (!this.SFU_ENABLED) return;

    // SFU "core" peer
    const sfu = new SimplePeer({ initiator: true, trickle: true, config: { iceServers: this.ICE_SERVERS } });

    const list = this.connections.get(matchId) || [];

    // Pipe audio streams to and from the SFU for all peers
    for (const conn of list) {
      conn.peer.pipe(sfu).pipe(conn.peer);
    }

    sfu.on('error', err => console.error('SFU Error:', err));
  }
}