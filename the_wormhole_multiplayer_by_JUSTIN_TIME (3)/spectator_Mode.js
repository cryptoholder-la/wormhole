// Spectator Controller with tweakable options

/**
 * @file Enables real-time game state sharing for spectators in a "Tempest" multiplayer match.
 * Designed for simulated server-side. Add your own Redis pubsub/wiring as needed.
 */

class SpectatorManager {
  /**
   * @tweakable Maximum number of simultaneous spectators allowed per match
   */
  static MAX_SPECTATORS_PER_MATCH = 40;

  /**
   * @tweakable How often to broadcast state updates to spectators (ms)
   */
  static BROADCAST_INTERVAL_MS = 140;

  /**
   * @tweakable If true, send health for hidden (dead) players to spectators
   */
  static SHOW_HIDDEN_PLAYER_HEALTH = true;

  /** Map of ws.id to { channel, ws } */
  static spectators = new Map();

  /**
   * Add a spectator websocket to a match.
   *
   * @param {string} matchId
   * @param {WebSocket} ws
   */
  static async addSpectator(matchId, ws) {
    const channel = `match:${matchId}:spectate`;

    // Enforce max spectator count (per match/channel):
    const curSpectators = Array.from(this.spectators.values())
      .filter(s => s.channel === channel);
    if (curSpectators.length >= this.MAX_SPECTATORS_PER_MATCH) {
      ws.send(JSON.stringify({type:"spectate-denied", reason:"max_spectators"}));
      ws.close(4209, "Maximum spectators reached");
      return;
    }

    await redis.subscribe(channel);
    this.spectators.set(ws.id, { channel, ws });

    ws.on('close', () => {
      redis.unsubscribe(channel);
      this.spectators.delete(ws.id);
    });
  }

  /**
   * Broadcasts a filtered match state to all connected spectators.
   *
   * @param {string} matchId
   * @param {object} state  - Full match/game state
   */
  static broadcastState(matchId, state) {
    const channel = `match:${matchId}:spectate`;
    const limitedState = this.filterSpectatorState(state);

    // Broadcast to all matching spectators
    for (const {channel: ch, ws} of this.spectators.values()) {
      if (ch === channel && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "spectate-update", state: limitedState }));
      }
    }
    // Optionally: could redis.publish if using real pubsub
    // redis.publish(channel, JSON.stringify(limitedState));
  }

  /**
   * Filter the full game state for what is permitted to spectators.
   * @param {object} fullState
   */
  static filterSpectatorState(fullState) {
    return {
      // Do not reveal more than intended
      players: fullState.players.map(p => ({
        id: p.id,
        x: p.x,
        y: p.y,
        /**
         * Only send health if player is visible or flag enabled
         */
        health: p.hidden ? (
          this.SHOW_HIDDEN_PLAYER_HEALTH ? p.health : undefined
        ) : p.health
      })),
      /**
       * @tweakable Filtered subset of projectile data. Spectators only get xyz, not internal IDs.
       */
      projectiles: fullState.projectiles.map(pr => ({
        x: pr.x,
        y: pr.y,
        z: pr.z
      })),
      /**
       * Score: send leaderboard/spectator-safe version
       */
      score: fullState.score
    };
  }
}