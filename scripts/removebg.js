// Removes the baked-in checkerboard / light background from the butterfly PNG
// by flood-filling background-like pixels from the image borders and making
// them transparent. Interior cream spots are preserved because the flood fill
// is stopped by the butterfly's dark wing edges.

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC = path.join(__dirname, '..', 'assets', 'butterfly_raw.png');
const OUT = path.join(__dirname, '..', 'assets', 'butterfly.png');

const png = PNG.sync.read(fs.readFileSync(SRC));
const { width: W, height: H, data } = png;

function idx(x, y) { return (y * W + x) * 4; }

// A pixel counts as "background" if it's light and nearly grey
// (the checkerboard is white ~255 and light grey ~204).
function isBg(x, y) {
  const i = idx(x, y);
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const mn = Math.min(r, g, b);
  const mx = Math.max(r, g, b);
  return mn > 170 && (mx - mn) < 45;
}

const visited = new Uint8Array(W * H);
const stack = [];

function push(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const p = y * W + x;
  if (visited[p]) return;
  visited[p] = 1;
  stack.push(x, y);
}

// seed from every border pixel
for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }

let cleared = 0;
while (stack.length) {
  const y = stack.pop();
  const x = stack.pop();
  if (!isBg(x, y)) continue;     // stop at the butterfly edge
  data[idx(x, y) + 3] = 0;       // make transparent
  cleared++;
  push(x + 1, y); push(x - 1, y);
  push(x, y + 1); push(x, y - 1);
}

// soften 1px fringe: any remaining pixel touching a transparent one and still
// greyish gets partially faded to kill the halo
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    const i = idx(x, y);
    if (data[i + 3] === 0) continue;
    const neighbourTransparent =
      data[idx(x + 1, y) + 3] === 0 || data[idx(x - 1, y) + 3] === 0 ||
      data[idx(x, y + 1) + 3] === 0 || data[idx(x, y - 1) + 3] === 0;
    if (neighbourTransparent) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
      if (mn > 150 && (mx - mn) < 60) data[i + 3] = 90;
    }
  }
}

fs.writeFileSync(OUT, PNG.sync.write(png));
console.log(`Done. Cleared ${cleared} background pixels -> ${OUT}`);
