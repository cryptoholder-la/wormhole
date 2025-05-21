// Session Recovery Service

/**
 * @file Session/Player reconnection and snapshot recovery, with tweakable session expiry and recovery policy.
 */

/**
 * @tweakable Allowed age of a session to be restorable (seconds); after this, expire snapshot
 */
const SESSION_EXPIRE_SECONDS = 7200;

class SessionManager {
  /**
   * @tweakable If true, allow reconnect even if player health is zero (spectate mode fallback)
   */
  static ALLOW_SPECTATE_ON_DEAD = false;

  /**
   * Attempts to reconnect a player to an existing match session.
   * @param {string} playerId
   * @param {string} matchId
   * @returns {Promise<{matchState: object, playerState: object}>}
   */
  static async reconnectPlayer(playerId, matchId) {
    const matchState = await GameState.getMatchState(matchId);

    if (!matchState) {
      throw new Error('Match session expired');
    }

    if (!matchState.players.includes(playerId)) {
      if (this.ALLOW_SPECTATE_ON_DEAD) {
        return { matchState, playerState: null };
      }
      throw new Error('Not part of this match');
    }

    const player = await redis.hgetall(`players:${playerId}`);
    return {
      matchState,
      playerState: {
        x: Number(player.x),
        y: Number(player.y),
        health: Number(player.health),
        inventory: JSON.parse(player.inventory || "[]")
      }
    };
  }

  /**
   * Save the live state of a player. Call regularly or on disconnect.
   * @param {string} playerId
   * @param {object} state
   */
  static async savePlayerState(playerId, state) {
    await redis.hset(`players:${playerId}`, {
      x: state.x,
      y: state.y,
      health: state.health,
      inventory: JSON.stringify(state.inventory),
      lastSaved: Date.now()
    });
  }
}

module.exports = SessionManager;