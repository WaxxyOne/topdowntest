const TILE_SIZE = 32;
const MAP_WIDTH = 16;
const MAP_HEIGHT = 11;

const tileLegend = {
  G: { name: "grass", color: "#3f8f41", walkable: true },
  D: { name: "dirt", color: "#8d6740", walkable: true },
  W: { name: "water", color: "#2c6ea3", walkable: false },
  T: { name: "tree", color: "#1f5a2b", walkable: false },
  S: { name: "stairs", color: "#c9b26c", walkable: true },
  B: { name: "boulder", color: "#6d3720", walkable: false }
};

const regions = {
  meadow: {
    name: "Emerald Meadow",
    start: { x: 2, y: 2 },
    map: [
      "WWWWWWWWWWWWWWWW",
      "WGGGGGGGGGGGGGGW",
      "WGGGTTGGGGGGGGGW",
      "WGGGTTGGGGGGGGGW",
      "WGGGGGGGDDDDGGGW",
      "WGGGGGGGDDDDGGGW",
      "WGGGGGGGGGGGGSGW",
      "WGGGGGGGGGGGGGGW",
      "WGGGGGTTGGGGGGGW",
      "WGGGGGGGGGGGGGGW",
      "WWWWWWWWWWWWWWWW",
    ],
    exits: {
      "13,6": { region: "caves", x: 1, y: 5 },
    },
    enemySpawns: [
      { x: 4, y: 7 },
      { x: 9, y: 4 },
      { x: 12, y: 8 },
    ],
  },
  caves: {
    name: "Moon Caves",
    start: { x: 1, y: 5 },
    map: [
      "WWWWWWWWWWWWWWWW",
      "WDDDDDDDDDDDDDDW",
      "WDDWDDWDDDWWWDDW",
      "WDDWDDWDDDWWWDDW",
      "WDDDDDDDDDDDDDDW",
      "WSDDDWDDDDDDDDDW",
      "WDDDDWDDDBBBDDDW",
      "WDDDDWDDDDDDDDDW",
      "WDDDDDDDDDWWDDDW",
      "WDDDDDDDDDDDDDDW",
      "WWWWWWWWWWWWWWWW",
    ],
    exits: {
      "1,5": { region: "meadow", x: 13, y: 6 },
    },
    enemySpawns: [
      { x: 3, y: 2 },
      { x: 10, y: 5 },
      { x: 13, y: 8 },
    ],
  },
};

class GameEngine {
  constructor(canvas, regionData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.regions = regionData;
    this.region = this.regions.meadow;
    this.player = {
      x: this.region.start.x,
      y: this.region.start.y,
      facing: "down",
      color: "#fce06b",
    };
    this.moveCooldown = 0;
    this.justArrived = true;
    this.firing = true;
    this.keys = new Set();
    this.projectiles = [];
    this.enemy = null;
    this.enemyMoveTimer = 0;
    this.gameOver = false;

    this.projectileSpeed = 280;
    this.projectileRadius = 4;
    this.enemyRadius = 10;

    this.regionName = document.getElementById("regionName");
    this.position = document.getElementById("position");
    this.status = document.getElementById("status");

    this.spawnEnemy();
  }

  start() {
    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D", " "].includes(event.key)) {
        event.preventDefault();
      }

      if (event.code === "Space" && !this.firing) {
        this.firing = true;
        this.shoot();
      }

      this.keys.add(event.key.toLowerCase());
    });

    window.addEventListener("keyup", (event) => {
      if (event.code === "Space") {
        this.firing = false;
      }

      this.keys.delete(event.key.toLowerCase());
    });

    requestAnimationFrame((ts) => this.loop(ts));
  }

  loop(ts) {
    if (!this.lastFrame) this.lastFrame = ts;
    const delta = ts - this.lastFrame;
    this.lastFrame = ts;

    this.update(delta);
    this.render();

    requestAnimationFrame((nextTs) => this.loop(nextTs));
  }

  update(delta) {
    if (this.gameOver) {
      this.regionName.textContent = this.region.name;
      this.position.textContent = `${this.player.x}, ${this.player.y}`;
      this.status.textContent = "Game Over";
      return;
    }

    this.moveCooldown -= delta;

    if (this.moveCooldown <= 0) {
      const direction = this.readDirection();
      if (direction) {
        this.move(direction);
        this.moveCooldown = 110;
      }
    }

    this.updateProjectiles(delta);
    this.updateEnemy(delta);
    this.checkEnemyContact();

    const exit = this.region.exits[`${this.player.x},${this.player.y}`];
    if (exit && !this.justArrived) {
      this.changeRegion(exit.region, exit.x, exit.y);
    }

    this.regionName.textContent = this.region.name;
    this.position.textContent = `${this.player.x}, ${this.player.y}`;
    this.status.textContent = "Exploring";
  }

  readDirection() {
    if (this.keys.has("arrowup") || this.keys.has("w")) return "up";
    if (this.keys.has("arrowdown") || this.keys.has("s")) return "down";
    if (this.keys.has("arrowleft") || this.keys.has("a")) return "left";
    if (this.keys.has("arrowright") || this.keys.has("d")) return "right";
    return null;
  }

  move(direction) {
    const offsets = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };

    const nextX = this.player.x + offsets[direction].x;
    const nextY = this.player.y + offsets[direction].y;

    if (!this.canWalk(nextX, nextY)) return;

    this.player.x = nextX;
    this.player.y = nextY;
    this.player.facing = direction;
    this.justArrived = false;

    this.checkEnemyContact();
  }

  canWalk(x, y) {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;

    const tileKey = this.region.map[y][x];
    const tile = tileLegend[tileKey];
    return tile?.walkable ?? false;
  }

  shoot() {
    if (this.gameOver || this.projectiles.length >= 3) return;

    const vectors = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };

    const speed = 2;
    const direction = vectors[this.player.facing];
    if (!direction) return;

    this.projectiles.push({
      x: this.player.x * TILE_SIZE + TILE_SIZE / 2,
      y: this.player.y * TILE_SIZE + TILE_SIZE / 2,
      vx: direction.x * speed,
      vy: direction.y * speed,
    });
  }

  updateProjectiles(delta) {
    const maxX = MAP_WIDTH * TILE_SIZE;
    const maxY = MAP_HEIGHT * TILE_SIZE;

    this.projectiles = this.projectiles.filter((projectile) => {
      projectile.x += projectile.vx * this.projectileSpeed * (delta / 1000);
      projectile.y += projectile.vy * this.projectileSpeed * (delta / 1000);

      if (this.enemy && this.collidesWithEnemy(projectile.x, projectile.y, this.projectileRadius)) {
        this.enemy = null;
        return false;
      }

      const inBounds =
        projectile.x >= this.projectileRadius &&
        projectile.x <= maxX - this.projectileRadius &&
        projectile.y >= this.projectileRadius &&
        projectile.y <= maxY - this.projectileRadius;

      return inBounds;
    });
  }

  spawnEnemy() {
    const spawns = this.region.enemySpawns || [];
    if (spawns.length === 0) {
      this.enemy = null;
      return;
    }

    const choices = spawns.filter((spot) => spot.x !== this.player.x || spot.y !== this.player.y);
    const pool = choices.length > 0 ? choices : spawns;
    const spawn = pool[Math.floor(Math.random() * pool.length)];

    this.enemy = {
      x: spawn.x,
      y: spawn.y,
    };
    this.enemyMoveTimer = 300;
  }

  updateEnemy(delta) {
    if (!this.enemy) return;

    this.enemyMoveTimer -= delta;
    if (this.enemyMoveTimer > 0) return;

    this.enemyMoveTimer = 260 + Math.random() * 320;

    const moves = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const move = moves[Math.floor(Math.random() * moves.length)];
      const nextX = this.enemy.x + move.x;
      const nextY = this.enemy.y + move.y;

      if (!this.canWalk(nextX, nextY)) continue;

      this.enemy.x = nextX;
      this.enemy.y = nextY;
      break;
    }
  }

  collidesWithEnemy(x, y, radius) {
    if (!this.enemy) return false;

    const enemyCenterX = this.enemy.x * TILE_SIZE + TILE_SIZE / 2;
    const enemyCenterY = this.enemy.y * TILE_SIZE + TILE_SIZE / 2;
    const dx = x - enemyCenterX;
    const dy = y - enemyCenterY;

    return Math.hypot(dx, dy) <= radius + this.enemyRadius;
  }

  checkEnemyContact() {
    if (!this.enemy || this.gameOver) return;

    if (this.enemy.x === this.player.x && this.enemy.y === this.player.y) {
      this.gameOver = true;
      this.keys.clear();
    }
  }

  changeRegion(regionKey, x, y) {
    this.region = this.regions[regionKey];
    this.player.x = x;
    this.player.y = y;
    this.moveCooldown = 200;
    this.justArrived = true;
    this.projectiles = [];
    this.spawnEnemy();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        const tileKey = this.region.map[y][x];
        const tile = tileLegend[tileKey];

        this.ctx.fillStyle = tile.color;
        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        if (tileKey === "T") {
          this.ctx.fillStyle = "#12381b";
          this.ctx.fillRect(x * TILE_SIZE + 8, y * TILE_SIZE + 4, 16, 24);
        }

        if (tileKey === "S") {
          this.ctx.strokeStyle = "#a1874f";
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(x * TILE_SIZE + 5, y * TILE_SIZE + 5, 22, 22);
        }

        if (tileKey === "B") {
          this.ctx.fillStyle = "#000000";
          this.ctx.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, 24, 24);
        }
      }
    }

    this.drawEnemy();
    this.drawPlayer();
    this.drawProjectiles();
    this.drawGrid();

    if (this.gameOver) {
      this.drawGameOver();
    }
  }

  drawPlayer() {
    const px = this.player.x * TILE_SIZE;
    const py = this.player.y * TILE_SIZE;

    this.ctx.fillStyle = "#2b2c30";
    this.ctx.fillRect(px + 8, py + 8, 16, 16);
    this.ctx.fillStyle = this.player.color;
    this.ctx.fillRect(px + 9, py + 6, 14, 14);

    this.ctx.fillStyle = "#1f2328";
    const eyeOffsetx = this.player.facing === "left" ? 10 : this.player.facing === "right" ? 16 : 13;
    const eyeOffsety = this.player.facing === "up" ? 9 : this.player.facing === "down" ? 13 : 11;
    this.ctx.fillRect(px + eyeOffsetx, py + eyeOffsety, 2, 2);
    this.ctx.fillRect(px + eyeOffsetx + 4, py + eyeOffsety, 2, 2);
  }

  drawEnemy() {
    if (!this.enemy) return;

    const ex = this.enemy.x * TILE_SIZE;
    const ey = this.enemy.y * TILE_SIZE;

    this.ctx.fillStyle = "#2a1317";
    this.ctx.fillRect(ex + 7, ey + 7, 18, 18);
    this.ctx.fillStyle = "#df4d5f";
    this.ctx.fillRect(ex + 9, ey + 9, 14, 14);
    this.ctx.fillStyle = "#fff3f3";
    this.ctx.fillRect(ex + 11, ey + 12, 3, 3);
    this.ctx.fillRect(ex + 18, ey + 12, 3, 3);
  }

  drawGameOver() {
    this.ctx.fillStyle = "rgb(0 0 0 / 58%)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#ffe2e2";
    this.ctx.font = "bold 34px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText("Game Over", this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.textAlign = "left";
  }

  drawGrid() {
    this.ctx.strokeStyle = "rgb(0 0 0 / 12%)";
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= MAP_WIDTH; x += 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * TILE_SIZE, 0);
      this.ctx.lineTo(x * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
      this.ctx.stroke();
    }

    for (let y = 0; y <= MAP_HEIGHT; y += 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * TILE_SIZE);
      this.ctx.lineTo(MAP_WIDTH * TILE_SIZE, y * TILE_SIZE);
      this.ctx.stroke();
    }
  }

  drawProjectiles() {
    this.ctx.fillStyle = "#ffe0a3";

    for (const projectile of this.projectiles) {
      this.ctx.beginPath();
      this.ctx.arc(projectile.x, projectile.y, this.projectileRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
}

const canvas = document.getElementById("game");
const game = new GameEngine(canvas, regions);
game.start();
