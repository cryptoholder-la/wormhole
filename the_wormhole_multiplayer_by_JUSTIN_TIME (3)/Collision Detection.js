// Collision System

/**
 * @file QuadTree-based collision detection with tweakable bounds and retrieval granularity for live tuning.
 */

/**
 * @tweakable World bounds for broad-phase collision (x, y, w, h)
 */
const COLLISION_WORLD_BOUNDS = {
  x: 0
};

/**
 * @tweakable Max objects per quad before subdivision
 */
const QUADTREE_CAPACITY = 4;

class Rectangle {
  constructor(x, y, w, h) {
    this.x = x; this.y = y;
    this.width = w; this.height = h;
  }

  contains(circle) {
    return (
      circle.x - circle.radius >= this.x &&
      circle.x + circle.radius <= this.x + this.width &&
      circle.y - circle.radius >= this.y &&
      circle.y + circle.radius <= this.y + this.height
    );
  }

  intersects(circle) {
    const xDist = Math.abs(circle.x - (this.x + this.width / 2));
    const yDist = Math.abs(circle.y - (this.y + this.height / 2));
    const r = circle.radius;
    const w = this.width / 2;
    const h = this.height / 2;

    if (xDist > w + r || yDist > h + r) return false;
    if (xDist <= w || yDist <= h) return true;
    const dx = xDist - w, dy = yDist - h;
    return dx * dx + dy * dy <= r * r;
  }
}

class Circle {
  constructor(x, y, r) {
    this.x = x; this.y = y; this.radius = r;
  }
}

class QuadTree {
  constructor(boundary, capacity) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.objects = [];
    this.divided = false;
  }
  insert(obj) {
    if (!this.boundary.contains(obj)) return false;
    if (this.objects.length < this.capacity) {
      this.objects.push(obj);
      return true;
    }
    if (!this.divided) this.subdivide();
    return (
      this.northeast.insert(obj) || this.northwest.insert(obj) ||
      this.southeast.insert(obj) || this.southwest.insert(obj)
    );
  }
  subdivide() {
    const { x, y, width, height } = this.boundary, hw = width / 2, hh = height / 2;
    this.northeast = new QuadTree(new Rectangle(x + hw, y, hw, hh), this.capacity);
    this.northwest = new QuadTree(new Rectangle(x, y, hw, hh), this.capacity);
    this.southeast = new QuadTree(new Rectangle(x + hw, y + hh, hw, hh), this.capacity);
    this.southwest = new QuadTree(new Rectangle(x, y + hh, hw, hh), this.capacity);
    this.divided = true;
  }
  clear() {
    this.objects = [];
    if (this.divided) {
      this.northeast.clear(); this.northwest.clear();
      this.southeast.clear(); this.southwest.clear();
      this.divided = false;
    }
  }
  retrieve(circle, found = []) {
    if (!this.boundary.intersects(circle)) return found;
    this.objects.forEach(obj => found.push(obj));
    if (this.divided) {
      this.northeast.retrieve(circle, found);
      this.northwest.retrieve(circle, found);
      this.southeast.retrieve(circle, found);
      this.southwest.retrieve(circle, found);
    }
    return found;
  }
}

class CollisionEngine {
  /**
   * @tweakable Use a QuadTree for spatial partitioning (set to false for brute-force)
   */
  static USE_QUADTREE = true;
  /**
   * QuadTree for current state (updated per frame)
   */
  static quadTree = new QuadTree(
    new Rectangle(
      COLLISION_WORLD_BOUNDS.x,
      COLLISION_WORLD_BOUNDS.y,
      COLLISION_WORLD_BOUNDS.width,
      COLLISION_WORLD_BOUNDS.height
    ),
    QUADTREE_CAPACITY
  );

  /**
   * Refresh the QuadTree with current player/projectile states
   */
  static update(gameState) {
    if (!this.USE_QUADTREE) return; // no-op if disabled
    this.quadTree.clear();
    // Insert all collidable objects
    gameState.players.forEach(player => {
      this.quadTree.insert(new Circle(player.x, player.y, player.radius || 12));
    });
    gameState.projectiles.forEach(projectile => {
      this.quadTree.insert(new Circle(projectile.x, projectile.y, 2));
    });
  }

  /**
   * Checks for collisions and handles them via a callback.
   * @param {object} gameState
   * @param {function} handleProjectileHit (projectile, target)
   */
  static checkCollisions(gameState, handleProjectileHit) {
    if (!this.USE_QUADTREE) return; // Optional: add brute-force fallback
    gameState.projectiles.forEach(projectile => {
      const candidates = this.quadTree.retrieve(new Circle(projectile.x, projectile.y, 2));
      candidates.forEach(target => {
        if (this.circleCollision(projectile, target)) {
          handleProjectileHit(projectile, target);
        }
      });
    });
  }

  /**
   * Returns true if two circles collide
   */
  static circleCollision(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (a.radius || 2) + (b.radius || 2);
  }
}

module.exports = { CollisionEngine, QuadTree, Rectangle, Circle };