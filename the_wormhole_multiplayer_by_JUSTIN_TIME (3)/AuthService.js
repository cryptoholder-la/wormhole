// Auth Service

/**
 * @file Authentication service with tweakable values for session, JWT, and security logic.
 */

const jwt = require('jsonwebtoken');
const Redis = require('ioredis');

/**
 * @tweakable JWT session secret environment variable key
 */
const JWT_SECRET_ENV = 'JWT_SECRET';

/**
 * @tweakable Default JWT token expiry duration (e.g. '8h', '12h')
 */
const DEFAULT_JWT_EXPIRES_IN = '8h';

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthenticationError";
    this.status = 401;
  }
}

class AuthService {
  /**
   * @tweakable Which Redis hash prefix to use for user lookup
   */
  static USER_HASH_PREFIX = 'users:';

  /**
   * Authenticates a player's JWT token and session in Redis.
   * @param {string} token
   * @returns {Promise<{id:string, mmr:number, inventory:object}>}
   */
  static async authenticate(token) {
    try {
      const secret = process.env[JWT_SECRET_ENV];
      const decoded = jwt.verify(token, secret);
      const redis = global.redis || new Redis(); // For standalone/test
      const user = await redis.hgetall(`${this.USER_HASH_PREFIX}${decoded.id}`);

      // Check session token matches (session revocation safety)
      if (user.sessionToken !== token) {
        throw new Error('Invalid session');
      }

      return {
        id: decoded.id,
        mmr: Number(user.mmr),
        inventory: JSON.parse(user.inventory || "[]")
      };
    } catch (error) {
      throw new AuthenticationError('Invalid credentials');
    }
  }

  /**
   * Generates a JWT for a user
   * @param {object} user - {id, role, ...}
   * @returns {string} JWT token
   */
  static generateToken(user) {
    /**
     * @tweakable JWT claims issuer name
     */
    const ISSUER = 'game-server';
    const secret = process.env[JWT_SECRET_ENV];
    return jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      secret,
      {
        expiresIn: DEFAULT_JWT_EXPIRES_IN, // tweakable
        issuer: ISSUER
      }
    );
  }
}

module.exports = AuthService;