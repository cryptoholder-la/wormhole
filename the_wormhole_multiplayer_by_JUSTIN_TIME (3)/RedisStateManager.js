// Redis State Manager

/**
 * @file Robust Redis Cluster session/game state manager with tweakable TTL/cluster config.
 */

const Redis = require('ioredis');

/**
 * @tweakable List of Redis cluster nodes (default localhost cluster)
 */
const REDIS_CLUSTER_NODES = [
  { host: 'redis-node-1', port: 6379 },
  { host: 'redis-node-2', port: 6380 }
];

/**
 * @tweakable Default state expiry for match state in Redis (seconds)
 */
const MATCH_STATE_EXPIRE_SECONDS = 7200; // 2 hours

/**
 * @tweakable Default channel prefix for match updates
 */
const MATCH_CHANNEL_PREFIX = "matches:";

const redis = new Redis.Cluster(REDIS_CLUSTER_NODES);

class GameState {
  /**
   * Save/update match state in Redis.
   * @param {string} matchId
   * @param {object} state
   */
  static async saveMatchState(matchId, state) {
    const pipeline = redis.pipeline();
    pipeline.hset(`${MATCH_CHANNEL_PREFIX}${matchId}`, 'state', JSON.stringify(state));
    pipeline.expire(`${MATCH_CHANNEL_PREFIX}${matchId}`, MATCH_STATE_EXPIRE_SECONDS);
    await pipeline.exec();
  }

  /**
   * Fetch match state from Redis.
   * @param {string} matchId
   * @returns {Promise<object|null>}
   */
  static async getMatchState(matchId) {
    const raw = await redis.hget(`${MATCH_CHANNEL_PREFIX}${matchId}`, 'state');
    return raw ? JSON.parse(raw) : null;
  }

  /**
   * Publish a state update to a given channel.
   * @param {string} channel
   * @param {object} update
   */
  static async publishUpdate(channel, update) {
    await redis.publish(channel, JSON.stringify(update));
  }
}

module.exports = { GameState, redis };