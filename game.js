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
    this.keys = new Set();

    this.regionName = document.getElementById("regionName");
    this.position = document.getElementById("position");
  }

  start() {
    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"].includes(event.key)) {
        event.preventDefault();
      }
      this.keys.add(event.key.toLowerCase());
    });

    window.addEventListener("keyup", (event) => {
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
    this.moveCooldown -= delta;

    if (this.moveCooldown <= 0) {
      const direction = this.readDirection();
      if (direction) {
        this.move(direction);
        this.moveCooldown = 110;
      }
    }

    const exit = this.region.exits[`${this.player.x},${this.player.y}`];
    if (exit && !this.justArrived) {
      this.changeRegion(exit.region, exit.x, exit.y);
    }

    this.regionName.textContent = this.region.name;
    this.position.textContent = `${this.player.x}, ${this.player.y}`;
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
  }

  canWalk(x, y) {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;

    const tileKey = this.region.map[y][x];
    const tile = tileLegend[tileKey];
    return tile?.walkable ?? false;
  }

  changeRegion(regionKey, x, y) {
    this.region = this.regions[regionKey];
    this.player.x = x;
    this.player.y = y;
    this.moveCooldown = 200;
    this.justArrived = true;
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

    this.drawPlayer();
    this.drawGrid();
  }

  drawPlayer() {
    const px = this.player.x * TILE_SIZE;
    const py = this.player.y * TILE_SIZE;

    this.ctx.fillStyle = "#2b2c30";
    this.ctx.fillRect(px + 8, py + 8, 16, 16);
    this.ctx.fillStyle = this.player.color;
    this.ctx.fillRect(px + 9, py + 6, 14, 14);

    this.ctx.fillStyle = "#1f2328";
    const eyeOffset = this.player.facing === "left" ? 10 : this.player.facing === "right" ? 16 : 13;
    this.ctx.fillRect(px + eyeOffset, py + 11, 2, 2);
    this.ctx.fillRect(px + eyeOffset + 4, py + 11, 2, 2);
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
}

const canvas = document.getElementById("game");
const game = new GameEngine(canvas, regions);
game.start();
