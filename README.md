# Top-Down Adventure Engine

A lightweight browser-based engine for Zelda-style top-down maps.

## Features

- Grid-based movement in 4 directions (WASD or arrow keys).
- Tile-based region rendering on an HTML canvas.
- Multiple regions with transition points (`exits`) for map travel.
- Basic collision using tile walkability rules.

## Run locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Region data format

Regions are declared in `game.js`:

- `map`: array of strings where each character is a tile key.
- `start`: initial player tile for that region.
- `exits`: map of `"x,y"` coordinates to destination region coordinates.

This keeps map authoring simple while still supporting multiple connected maps.
