// Matchmaking Service with tweakable parameters
// Intended for Node.js server-side with Redis and WS players map

/**
 * @file Manages matchmaking queues and match creation for Tempest Multiplayer.
 * Tweak values using the @tweakable JSDoc annotation for real-time tuning.
 */

/* global redis, uuid, players */

class Matchmaker {
  /**
   * @tweakable How long (in seconds) players stay in the matchmaking queue before expiring
   */
  static QUEUE_TTL = 300; // 5 minutes

  /**
   * @tweakable Minimum number of players required to create a match
   */
  static MATCH_THRESHOLD = 4;

  /**
   * @tweakable Amount of time (seconds) a match state should persist in Redis
   */
  static MATCH_TTL = 3600; // 1 hour

  /**
   * @tweakable Custom key prefix used for queue keys in redis
   */
  static QUEUE_PREFIX = "matchmaking:queue";

  /**
   * @tweakable Custom key prefix used for match objects in redis
   */
  static MATCH_PREFIX = "matches";

  /**
   * Adds the player to the matchmaking queue for their region.
   * @param {object} player - {id, region, ...}
   */
  static async joinQueue(player) {
    const queueKey = `${this.QUEUE_PREFIX}:${player.region}`;
    await redis.zadd(queueKey, Date.now(), player.id);
    await redis.expire(queueKey, this.QUEUE_TTL);
    await this.checkMatches(player.region);
  }

  /**
   * Checks if enough players are in the queue for a match, and if so, creates one.
   * @param {string} region
   */
  static async checkMatches(region) {
    const queueKey = `${this.QUEUE_PREFIX}:${region}`;
    const count = await redis.zcard(queueKey);

    if (count >= this.MATCH_THRESHOLD) {
      // Get enough players to make a match
      const playerIds = await redis.zrange(queueKey, 0, this.MATCH_THRESHOLD - 1);

      await redis.zrem(queueKey, ...playerIds);
      await this.createMatch(playerIds);
    }
  }

  /**
   * Creates a match and notifies the involved players.
   * @param {string[]} playerIds
   */
  static async createMatch(playerIds) {
    const matchId = uuid.v4();
    const region = await this.getPlayerRegion(playerIds[0]);
    const matchKey = `${this.MATCH_PREFIX}:${matchId}`;

    const matchData = {
      id: matchId,
      players: JSON.stringify(playerIds),
      region,
      createdAt: Date.now()
    };
    await redis.hset(matchKey, matchData);
    await redis.expire(matchKey, this.MATCH_TTL);

    for (const playerId of playerIds) {
      const ws = players.get(playerId);
      if (ws && ws.send) {
        ws.send(JSON.stringify({
          type: 'matchFound',
          matchId,
          opponents: playerIds.filter(id => id !== playerId)
        }));
      }
    }
  }

  /**
   * Gets the region for a player, or defaults if not found.
   * @param {string} playerId
   * @returns {Promise<string>}
   */
  static async getPlayerRegion(playerId) {
    // Example: lookup from Redis hash "players:{id}" or provide a fallback
    // You would normally have player objects with a "region" field
    const data = await redis.hgetall(`players:${playerId}`);
    return data && data.region ? data.region : "global";
  }
}

export default Matchmaker;