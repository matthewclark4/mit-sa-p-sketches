let svgEl;
let svgLoaded = false;
const SVG_W = 341, SVG_H = 100;

// ── v2-images: list your image paths here ────────────────────────────────────
const EXTRA_IMAGES_SRC = [
    'images/img-1.jpg',
    'images/img-2.jpg',
    'images/img-3.jpg',
    'images/img-4.jpg',
    'images/img-5.jpg',
    'images/img-6.jpg',
    'images/img-7.jpg',
    'images/img-8.jpg',
    'images/img-9.jpg',
];
let extraImages = new Array(EXTRA_IMAGES_SRC.length).fill(null);

// ── V5: focus-point control state ────────────────────────────────────────────
const CTRL_W = 160, CTRL_H = 110, DOT_R = 8;
let ctrlPoints = [
    { x: 0.20, y: 0.20, col: '#5599ff' },
    { x: 0.80, y: 0.20, col: '#ff5555' },
    { x: 0.25, y: 0.78, col: '#ffcc22' },
    { x: 0.75, y: 0.78, col: '#55dd66' },
];
let ctrlCanvas, ctrlCtx, ctrlDragging = -1;
let v5Panel = null;
let mpHands = null, videoEl = null;
let v5UseLogo = false;

let tt = 0;
let ttTgt = 1;
let frame = 0;
let canvas;
var ran = Math.random() * 10;
let maxDepth = 8;
let minRatio = 0;
let mode = 'v2';

function setup() {
    frameRate(30);
    canvas = createCanvas(window.innerWidth, window.innerHeight);

    svgEl = new Image();
    svgEl.onload = () => { svgLoaded = true; };
    svgEl.src = "images/logo-1.svg";

    EXTRA_IMAGES_SRC.forEach((src, i) => {
        let img = new Image();
        img.onload = () => { extraImages[i] = img; };
        img.src = src;
    });

    buildUI();
}

function draw() {
    // always advance time so v3 Three.js loop can read tt
    frame++;
    tt += (ttTgt - tt) / 4;
    if (frame % 30 == 0) ttTgt = frame * 2;
    if (tt % 600 == 0) ran = Math.random() * 10;

    if (mode === 'v3' || mode === 'v4') return;
    let isV56 = mode === 'v5' || mode === 'v6';
    background((mode === 'v1' || (isV56 && !v5UseLogo)) ? 0 : 255);
    if ((mode === 'v2' || mode === 'v2i' || (isV56 && v5UseLogo)) && !svgLoaded) return;
    split0(canvas.width, canvas.height);
    if (mode === 'v5' || mode === 'v6') drawCtrlPanel();
}

// ── V1: abstract grid ────────────────────────────────────────────────────────

function split0(w, h) {
    if (mode === 'v1') {
        splitGrid(0, 0, w, h, 0, 1);
    } else if (mode === 'v2i') {
        splitLogoImages(0, 0, w, h, 0, 0, SVG_W, SVG_H, 0, 1);
    } else if (mode === 'v5' || mode === 'v6') {
        if (v5UseLogo) splitLogoV5(0, 0, w, h, 0, 0, SVG_W, SVG_H, 0, 1);
        else           splitGridV5(0, 0, w, h, 0, 1);
    } else {
        splitLogo(0, 0, w, h, 0, 0, SVG_W, SVG_H, 0, 1);
    }
}

function splitGrid(x, y, w, h, n, nodeId) {
    randomSeed(nodeId + floor(ran * 100));

    if ((random() < 0.2 && n > 3) || n > maxDepth) {
        stroke(255);
        strokeWeight(0.5);
        fill(0);
        rect(x, y, w, h);
    } else {
        let crx = 0.5 + 0.5 * Math.sin(tt * (0.01 + n * 0.01) + n * 50);
        crx = Math.max(Math.min(crx, 1 - minRatio), minRatio);
        let cry = 0.5 + 0.5 * Math.cos(tt * (0.01 + n * 0.01) + n * 9930);
        cry = Math.max(Math.min(cry, 1 - minRatio), minRatio);

        let ww = w * crx, ww2 = w * (1 - crx);
        let hh = h * cry, hh2 = h * (1 - cry);

        if (n <= 1) {
            splitGrid(x,     y,    ww,  hh,  n+1, nodeId*4+0);
            splitGrid(x+ww,  y,    ww2, hh,  n+1, nodeId*4+1);
            splitGrid(x,     y+hh, ww,  hh2, n+1, nodeId*4+2);
            splitGrid(x+ww,  y+hh, ww2, hh2, n+1, nodeId*4+3);
        } else if (nodeId % 2 == 0) {
            splitGrid(x,    y, ww,  h, n+1, nodeId*2+0);
            splitGrid(x+ww, y, ww2, h, n+1, nodeId*2+1);
        } else {
            splitGrid(x, y,    w, hh,  n+1, nodeId*2+0);
            splitGrid(x, y+hh, w, hh2, n+1, nodeId*2+1);
        }
    }
}

// ── V5: focus-point grid ─────────────────────────────────────────────────────

// 0 = far from all dots, 1 = right on a dot
function computeInfluence(cx, cy) {
    let nx = cx / width, ny = cy / height;
    let best = 0;
    for (let p of ctrlPoints) {
        let inf = Math.max(0, 1 - Math.hypot(nx - p.x, ny - p.y) / 0.6);
        if (inf > best) best = inf;
    }
    return best;
}

function splitGridV5(x, y, w, h, n, nodeId) {
    randomSeed(nodeId + floor(ran * 100));

    let inf = computeInfluence(x + w / 2, y + h / 2);
    let localDepth = Math.round(1 + inf * (maxDepth - 1)); // 1 far away → maxDepth at dot
    let amp = inf * 0.1;

    if ((random() < 0.2 && n > 3) || n > localDepth) {
        stroke(255); strokeWeight(0.5); fill(0);
        rect(x, y, w, h);
    } else {
        let crx = 0.5 + amp * Math.sin(tt * (0.01 + n * 0.01) + n * 50);
        crx = Math.max(Math.min(crx, 1 - minRatio), minRatio);
        let cry = 0.5 + amp * Math.cos(tt * (0.01 + n * 0.01) + n * 9930);
        cry = Math.max(Math.min(cry, 1 - minRatio), minRatio);

        let ww = w * crx, ww2 = w * (1 - crx);
        let hh = h * cry, hh2 = h * (1 - cry);

        if (n <= 1) {
            splitGridV5(x,     y,    ww,  hh,  n+1, nodeId*4+0);
            splitGridV5(x+ww,  y,    ww2, hh,  n+1, nodeId*4+1);
            splitGridV5(x,     y+hh, ww,  hh2, n+1, nodeId*4+2);
            splitGridV5(x+ww,  y+hh, ww2, hh2, n+1, nodeId*4+3);
        } else if (nodeId % 2 == 0) {
            splitGridV5(x,    y, ww,  h, n+1, nodeId*2+0);
            splitGridV5(x+ww, y, ww2, h, n+1, nodeId*2+1);
        } else {
            splitGridV5(x, y,    w, hh,  n+1, nodeId*2+0);
            splitGridV5(x, y+hh, w, hh2, n+1, nodeId*2+1);
        }
    }
}

function drawCtrlPanel() {
    if (!ctrlCtx) return;
    let c = ctrlCtx;
    c.fillStyle = '#6b7280';
    c.fillRect(0, 0, CTRL_W, CTRL_H);

    // faint grid guides
    c.strokeStyle = 'rgba(255,255,255,0.12)';
    c.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
        c.beginPath(); c.moveTo(i * CTRL_W / 4, 0); c.lineTo(i * CTRL_W / 4, CTRL_H); c.stroke();
    }
    for (let i = 1; i < 3; i++) {
        c.beginPath(); c.moveTo(0, i * CTRL_H / 3); c.lineTo(CTRL_W, i * CTRL_H / 3); c.stroke();
    }

    // dots
    for (let p of ctrlPoints) {
        let px = p.x * CTRL_W, py = p.y * CTRL_H;
        c.beginPath(); c.arc(px, py, DOT_R, 0, Math.PI * 2);
        c.fillStyle = p.col; c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.5; c.stroke();
    }
}

// logo slice with influence-driven depth + amplitude (used by v5/v6 logo mode)
function splitLogoV5(x, y, w, h, ix, iy, iw, ih, n, nodeId) {
    randomSeed(nodeId + floor(ran * 100));

    let inf = computeInfluence(x + w / 2, y + h / 2);
    let localDepth = Math.round(1 + inf * (maxDepth - 1));
    let amp = inf * 0.5;

    if ((random() < 0.2 && n > 3) || n > localDepth) {
        drawRegion(x, y, w, h, ix, iy, iw, ih);
    } else {
        let crx = 0.5 + amp * Math.sin(tt * (0.01 + n * 0.01) + n * 50);
        crx = Math.max(Math.min(crx, 1 - minRatio), minRatio);
        let cry = 0.5 + amp * Math.cos(tt * (0.01 + n * 0.01) + n * 9930);
        cry = Math.max(Math.min(cry, 1 - minRatio), minRatio);

        let ww = w*crx,   ww2 = w*(1-crx);
        let hh = h*cry,   hh2 = h*(1-cry);
        let iww = iw*0.5, iww2 = iw*0.5;
        let ihh = ih*0.5, ihh2 = ih*0.5;

        if (n <= 1) {
            splitLogoV5(x,    y,    ww,  hh,  ix,     iy,     iww,  ihh,  n+1, nodeId*4+0);
            splitLogoV5(x+ww, y,    ww2, hh,  ix+iww, iy,     iww2, ihh,  n+1, nodeId*4+1);
            splitLogoV5(x,    y+hh, ww,  hh2, ix,     iy+ihh, iww,  ihh2, n+1, nodeId*4+2);
            splitLogoV5(x+ww, y+hh, ww2, hh2, ix+iww, iy+ihh, iww2, ihh2, n+1, nodeId*4+3);
        } else if (nodeId % 2 == 0) {
            splitLogoV5(x,    y, ww,  h, ix,     iy, iww,  ih, n+1, nodeId*2+0);
            splitLogoV5(x+ww, y, ww2, h, ix+iww, iy, iww2, ih, n+1, nodeId*2+1);
        } else {
            splitLogoV5(x, y,    w, hh,  ix, iy,     iw, ihh,  n+1, nodeId*2+0);
            splitLogoV5(x, y+hh, w, hh2, ix, iy+ihh, iw, ihh2, n+1, nodeId*2+1);
        }
    }
}

// ── V6: hand tracking ────────────────────────────────────────────────────────

function onHandResults(results) {
    if (mode !== 'v6') return;
    if (!results.multiHandLandmarks || !results.multiHandLandmarks[0]) return;
    let lm = results.multiHandLandmarks[0];
    // index / middle / ring / pinky fingertips
    [8, 12, 16, 20].forEach((tip, i) => {
        ctrlPoints[i].x = 1 - lm[tip].x; // mirror x to match selfie-view video
        ctrlPoints[i].y = lm[tip].y;
    });
}

function setupHandTracking() {
    if (mpHands) return; // already running

    // Video element doubles as MediaPipe source and visible camera preview
    videoEl = document.createElement('video');
    videoEl.autoplay = true; videoEl.playsInline = true; videoEl.muted = true;
    let previewH = Math.round(CTRL_W * 3 / 4); // 4:3 aspect
    css(videoEl, {
        width: CTRL_W + 'px', height: previewH + 'px',
        borderRadius: '6px', display: 'block',
        transform: 'scaleX(-1)' // mirror so it feels like a selfie
    });
    if (v5Panel) v5Panel.insertBefore(videoEl, ctrlCanvas);

    mpHands = new Hands({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
    });
    mpHands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
    });
    mpHands.onResults(onHandResults);

    const cam = new Camera(videoEl, {
        onFrame: async () => { await mpHands.send({ image: videoEl }); },
        width: 320, height: 240
    });
    cam.start().catch(err => console.warn('Camera error:', err));
}

// ── V2: logo slice ────────────────────────────────────────────────────────────

function drawRegion(x, y, w, h, ix, iy, iw, ih) {
    if (w < 0.5 || h < 0.5 || iw < 0.01 || ih < 0.01) return;
    let scaleX = w / iw;
    let scaleY = h / ih;
    let ctx = drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(svgEl, x - ix * scaleX, y - iy * scaleY, SVG_W * scaleX, SVG_H * scaleY);
    ctx.restore();
}

function splitLogo(x, y, w, h, ix, iy, iw, ih, n, nodeId) {
    randomSeed(nodeId + floor(ran * 100));

    if ((random() < 0.2 && n > 3) || n > maxDepth) {
        drawRegion(x, y, w, h, ix, iy, iw, ih);
    } else {
        let crx = 0.5 + 0.5 * Math.sin(tt * (0.01 + n * 0.01) + n * 50);
        crx = Math.max(Math.min(crx, 1 - minRatio), minRatio);
        let cry = 0.5 + 0.5 * Math.cos(tt * (0.01 + n * 0.01) + n * 9930);
        cry = Math.max(Math.min(cry, 1 - minRatio), minRatio);

        let ww = w * crx,   ww2 = w * (1 - crx);
        let hh = h * cry,   hh2 = h * (1 - cry);
        let iww = iw * 0.5, iww2 = iw * 0.5;
        let ihh = ih * 0.5, ihh2 = ih * 0.5;

        if (n <= 1) {
            splitLogo(x,     y,    ww,  hh,  ix,      iy,      iww,  ihh,  n+1, nodeId*4+0);
            splitLogo(x+ww,  y,    ww2, hh,  ix+iww,  iy,      iww2, ihh,  n+1, nodeId*4+1);
            splitLogo(x,     y+hh, ww,  hh2, ix,      iy+ihh,  iww,  ihh2, n+1, nodeId*4+2);
            splitLogo(x+ww,  y+hh, ww2, hh2, ix+iww,  iy+ihh,  iww2, ihh2, n+1, nodeId*4+3);
        } else if (nodeId % 2 == 0) {
            splitLogo(x,    y, ww,  h, ix,     iy, iww,  ih, n+1, nodeId*2+0);
            splitLogo(x+ww, y, ww2, h, ix+iww, iy, iww2, ih, n+1, nodeId*2+1);
        } else {
            splitLogo(x, y,    w, hh,  ix, iy,     iw, ihh,  n+1, nodeId*2+0);
            splitLogo(x, y+hh, w, hh2, ix, iy+ihh, iw, ihh2, n+1, nodeId*2+1);
        }
    }
}

// ── V2i: logo + images ───────────────────────────────────────────────────────

// draw an image cover-cropped (centered) into a cell
function drawImageCover(img, x, y, w, h) {
    if (!img || w < 1 || h < 1) return;
    let imgAspect = img.naturalWidth / img.naturalHeight;
    let cellAspect = w / h;
    let sx, sy, sw, sh;
    if (imgAspect > cellAspect) {
        sh = img.naturalHeight; sw = sh * cellAspect;
        sx = (img.naturalWidth - sw) / 2; sy = 0;
    } else {
        sw = img.naturalWidth; sh = sw / cellAspect;
        sx = 0; sy = (img.naturalHeight - sh) / 2;
    }
    let ctx = drawingContext;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
}

// same recursion as splitLogo, but leaf cells can show an extra image instead
function splitLogoImages(x, y, w, h, ix, iy, iw, ih, n, nodeId) {
    randomSeed(nodeId + floor(ran * 100));

    if ((random() < 0.2 && n > 3) || n > maxDepth) {
        // use a separate seed so image assignment is independent of tree shape
        randomSeed(nodeId * 17 + 3331);
        let loaded = extraImages.filter(img => img !== null);
        if (loaded.length > 0 && random() < 0.35 && w > 80 && h > 50) {
            let img = loaded[floor(random() * loaded.length)];
            drawImageCover(img, x, y, w, h);
        } else {
            drawRegion(x, y, w, h, ix, iy, iw, ih);
        }
        return;
    }

    let crx = 0.5 + 0.5 * Math.sin(tt * (0.01 + n * 0.01) + n * 50);
    crx = Math.max(Math.min(crx, 1 - minRatio), minRatio);
    let cry = 0.5 + 0.5 * Math.cos(tt * (0.01 + n * 0.01) + n * 9930);
    cry = Math.max(Math.min(cry, 1 - minRatio), minRatio);

    let ww = w * crx,   ww2 = w * (1 - crx);
    let hh = h * cry,   hh2 = h * (1 - cry);
    let iww = iw * 0.5, iww2 = iw * 0.5;
    let ihh = ih * 0.5, ihh2 = ih * 0.5;

    if (n <= 1) {
        splitLogoImages(x,     y,    ww,  hh,  ix,      iy,      iww,  ihh,  n+1, nodeId*4+0);
        splitLogoImages(x+ww,  y,    ww2, hh,  ix+iww,  iy,      iww2, ihh,  n+1, nodeId*4+1);
        splitLogoImages(x,     y+hh, ww,  hh2, ix,      iy+ihh,  iww,  ihh2, n+1, nodeId*4+2);
        splitLogoImages(x+ww,  y+hh, ww2, hh2, ix+iww,  iy+ihh,  iww2, ihh2, n+1, nodeId*4+3);
    } else if (nodeId % 2 == 0) {
        splitLogoImages(x,    y, ww,  h, ix,     iy, iww,  ih, n+1, nodeId*2+0);
        splitLogoImages(x+ww, y, ww2, h, ix+iww, iy, iww2, ih, n+1, nodeId*2+1);
    } else {
        splitLogoImages(x, y,    w, hh,  ix, iy,     iw, ihh,  n+1, nodeId*2+0);
        splitLogoImages(x, y+hh, w, hh2, ix, iy+ihh, iw, ihh2, n+1, nodeId*2+1);
    }
}

// ── V3: Three.js 3D grid ─────────────────────────────────────────────────────

let threeCanvas, threeRenderer, threeScene, threeCamera;
let edgeGeo, edgeLines, threeRAF, threeReady = false;
const MAX_EDGE_VERTS = 8000 * 24; // 12 edges × 2 pts per box, upper bound
const edgePosArray = new Float32Array(MAX_EDGE_VERTS * 3);
let edgeVertCount = 0;

let faceGeo, faceMesh, logoTexture;
const MAX_FACES = 8000;
const facePosArray4 = new Float32Array(MAX_FACES * 6 * 3);
const faceUVArray4  = new Float32Array(MAX_FACES * 6 * 2);
let faceVertCount4  = 0;

// orbit state
let orbitTheta = 0, orbitPhi = 0;
let orbitRadius, initOrbitRadius;
let orbitVel = { t: 0, p: 0 };
let isDragging = false, lastMouse = { x: 0, y: 0 };

// volume dims — set at setup to match screen aspect
let volW, volH, volD;

function setupThreeJS() {
    if (threeReady) return;

    let W = window.innerWidth, H = window.innerHeight;
    let aspect = W / H;
    // front face fills screen exactly; depth = screen-height equivalent
    volH = 10; volW = volH * aspect; volD = volH;

    threeCanvas = document.createElement('canvas');
    css(threeCanvas, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', zIndex: '1' });
    document.body.appendChild(threeCanvas);

    threeRenderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true });
    threeRenderer.setSize(W, H);
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    threeRenderer.setClearColor(0x0a1628); // dark navy

    threeScene = new THREE.Scene();

    // perspective camera — FOV chosen so front face fills screen height at start
    const FOV = 35;
    initOrbitRadius = (volH / 2) / Math.tan((FOV / 2) * Math.PI / 180);
    orbitRadius = initOrbitRadius;
    threeCamera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 1000);
    threeCamera.position.set(0, 0, orbitRadius);
    threeCamera.lookAt(0, 0, 0);

    // edge geometry — single merged LineSegments, updated each frame
    edgeGeo = new THREE.BufferGeometry();
    let posAttr = new THREE.BufferAttribute(edgePosArray, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    edgeGeo.setAttribute('position', posAttr);
    edgeGeo.setDrawRange(0, 0);
    edgeLines = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0xd0e8ff }));
    threeScene.add(edgeLines);

    // v4 face geometry — textured front faces of each leaf box
    faceGeo = new THREE.BufferGeometry();
    let fPosAttr = new THREE.BufferAttribute(facePosArray4, 3);
    fPosAttr.setUsage(THREE.DynamicDrawUsage);
    faceGeo.setAttribute('position', fPosAttr);
    let fUVAttr = new THREE.BufferAttribute(faceUVArray4, 2);
    fUVAttr.setUsage(THREE.DynamicDrawUsage);
    faceGeo.setAttribute('uv', fUVAttr);
    faceGeo.setDrawRange(0, 0);

    let texCanvas = document.createElement('canvas');
    texCanvas.width = 4096;
    texCanvas.height = Math.round(4096 * SVG_H / SVG_W);
    let texCtx = texCanvas.getContext('2d');
    texCtx.fillStyle = '#fff';
    texCtx.fillRect(0, 0, texCanvas.width, texCanvas.height);
    if (svgLoaded) {
        texCtx.drawImage(svgEl, 0, 0, texCanvas.width, texCanvas.height);
    } else {
        svgEl.addEventListener('load', () => {
            texCtx.drawImage(svgEl, 0, 0, texCanvas.width, texCanvas.height);
            if (logoTexture) logoTexture.needsUpdate = true;
        }, { once: true });
    }
    logoTexture = new THREE.CanvasTexture(texCanvas);
    logoTexture.minFilter = THREE.LinearFilter;
    logoTexture.anisotropy = threeRenderer.capabilities.getMaxAnisotropy();
    faceMesh = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ map: logoTexture, side: THREE.DoubleSide }));
    faceMesh.visible = false;
    threeScene.add(faceMesh);

    // mouse orbit
    threeCanvas.addEventListener('mousedown', e => {
        isDragging = true;
        orbitVel = { t: 0, p: 0 };
        lastMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        let dx = e.clientX - lastMouse.x, dy = e.clientY - lastMouse.y;
        orbitVel.t = dx * 0.008;
        orbitVel.p = dy * 0.008;
        orbitTheta -= orbitVel.t;
        orbitPhi   -= orbitVel.p;
        orbitPhi = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, orbitPhi));
        lastMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { isDragging = false; });

    threeCanvas.addEventListener('wheel', e => {
        e.preventDefault();
        orbitRadius *= 1 + e.deltaY * 0.001;
        orbitRadius = Math.max(1, Math.min(initOrbitRadius * 6, orbitRadius));
    }, { passive: false });

    threeReady = true;
}

function startThreeJS() {
    cancelAnimationFrame(threeRAF);
    threeCanvas.style.display = 'block';
    loopThreeJS();
}

function stopThreeJS() {
    cancelAnimationFrame(threeRAF);
    if (threeCanvas) threeCanvas.style.display = 'none';
}

function loopThreeJS() {
    if (mode !== 'v3' && mode !== 'v4') return;
    threeRAF = requestAnimationFrame(loopThreeJS);

    if (!isDragging) {
        orbitVel.t *= 0.88;
        orbitVel.p *= 0.88;
        orbitTheta -= orbitVel.t;
        orbitPhi   -= orbitVel.p;
        orbitPhi = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, orbitPhi));
    }

    let cx = orbitRadius * Math.cos(orbitPhi) * Math.sin(orbitTheta);
    let cy = orbitRadius * Math.sin(orbitPhi);
    let cz = orbitRadius * Math.cos(orbitPhi) * Math.cos(orbitTheta);
    threeCamera.position.set(cx, cy, cz);
    threeCamera.lookAt(0, 0, 0);

    edgeVertCount = 0;
    faceVertCount4 = 0;
    let depth = Math.min(maxDepth, 6);

    if (mode === 'v4') {
        split4D(-volW/2,-volH/2,-volD/2, volW,volH,volD, 0,0,SVG_W,SVG_H, 0,1,depth);
        faceMesh.visible = true;
    } else {
        split3D(-volW/2,-volH/2,-volD/2, volW,volH,volD, 0,1,depth, addBoxEdges);
        faceMesh.visible = false;
    }

    edgeGeo.attributes.position.needsUpdate = true;
    edgeGeo.setDrawRange(0, edgeVertCount);
    faceGeo.attributes.position.needsUpdate = true;
    faceGeo.attributes.uv.needsUpdate = true;
    faceGeo.setDrawRange(0, faceVertCount4);

    threeRenderer.render(threeScene, threeCamera);
}

// write 12 edges (24 line-segment endpoints) into edgePosArray
function addBoxEdges(x, y, z, w, h, d) {
    if (edgeVertCount + 24 > MAX_EDGE_VERTS) return;
    let x2 = x+w, y2 = y+h, z2 = z+d;
    let E = edgePosArray, v = edgeVertCount * 3;
    // bottom
    E[v]=x;  E[v+1]=y;  E[v+2]=z;   E[v+3]=x2; E[v+4]=y;  E[v+5]=z;  v+=6;
    E[v]=x2; E[v+1]=y;  E[v+2]=z;   E[v+3]=x2; E[v+4]=y;  E[v+5]=z2; v+=6;
    E[v]=x2; E[v+1]=y;  E[v+2]=z2;  E[v+3]=x;  E[v+4]=y;  E[v+5]=z2; v+=6;
    E[v]=x;  E[v+1]=y;  E[v+2]=z2;  E[v+3]=x;  E[v+4]=y;  E[v+5]=z;  v+=6;
    // top
    E[v]=x;  E[v+1]=y2; E[v+2]=z;   E[v+3]=x2; E[v+4]=y2; E[v+5]=z;  v+=6;
    E[v]=x2; E[v+1]=y2; E[v+2]=z;   E[v+3]=x2; E[v+4]=y2; E[v+5]=z2; v+=6;
    E[v]=x2; E[v+1]=y2; E[v+2]=z2;  E[v+3]=x;  E[v+4]=y2; E[v+5]=z2; v+=6;
    E[v]=x;  E[v+1]=y2; E[v+2]=z2;  E[v+3]=x;  E[v+4]=y2; E[v+5]=z;  v+=6;
    // verticals
    E[v]=x;  E[v+1]=y;  E[v+2]=z;   E[v+3]=x;  E[v+4]=y2; E[v+5]=z;  v+=6;
    E[v]=x2; E[v+1]=y;  E[v+2]=z;   E[v+3]=x2; E[v+4]=y2; E[v+5]=z;  v+=6;
    E[v]=x2; E[v+1]=y;  E[v+2]=z2;  E[v+3]=x2; E[v+4]=y2; E[v+5]=z2; v+=6;
    E[v]=x;  E[v+1]=y;  E[v+2]=z2;  E[v+3]=x;  E[v+4]=y2; E[v+5]=z2;
    edgeVertCount += 24;
}

// write two triangles (front face at z+d) with UV mapped to source logo region
function addFaceVerts(x, y, z, w, h, d, ix, iy, iw, ih) {
    if (faceVertCount4 + 6 > MAX_FACES * 6) return;
    let u0 = ix / SVG_W,  u1 = (ix + iw) / SVG_W;
    let vt = 1 - iy / SVG_H,  vb = 1 - (iy + ih) / SVG_H; // flip v so logo is upright
    let fz = z + d + 0.002; // tiny push in front to avoid z-fighting with front edges
    let P = facePosArray4, U = faceUVArray4;
    let vi = faceVertCount4 * 3, ui = faceVertCount4 * 2;
    P[vi]=x;   P[vi+1]=y;   P[vi+2]=fz; U[ui]=u0; U[ui+1]=vb; vi+=3; ui+=2;
    P[vi]=x+w; P[vi+1]=y;   P[vi+2]=fz; U[ui]=u1; U[ui+1]=vb; vi+=3; ui+=2;
    P[vi]=x+w; P[vi+1]=y+h; P[vi+2]=fz; U[ui]=u1; U[ui+1]=vt; vi+=3; ui+=2;
    P[vi]=x;   P[vi+1]=y;   P[vi+2]=fz; U[ui]=u0; U[ui+1]=vb; vi+=3; ui+=2;
    P[vi]=x+w; P[vi+1]=y+h; P[vi+2]=fz; U[ui]=u1; U[ui+1]=vt; vi+=3; ui+=2;
    P[vi]=x;   P[vi+1]=y+h; P[vi+2]=fz; U[ui]=u0; U[ui+1]=vt;
    faceVertCount4 += 6;
}

function split3D(x, y, z, w, h, d, n, nodeId, maxD, onLeaf) {
    randomSeed(nodeId + floor(ran * 100));

    if ((random() < 0.15 && n > 2) || n > maxD) {
        onLeaf(x, y, z, w, h, d);
        return;
    }

    let rx = 0.5 + 0.5 * Math.sin(tt * (0.01 + n * 0.01) + n * 50);
    rx = Math.max(Math.min(rx, 1 - minRatio), minRatio);
    let ry = 0.5 + 0.5 * Math.cos(tt * (0.01 + n * 0.01) + n * 9930);
    ry = Math.max(Math.min(ry, 1 - minRatio), minRatio);
    let rz = 0.5 + 0.5 * Math.sin(tt * (0.01 + n * 0.013) + n * 3141 + 7);
    rz = Math.max(Math.min(rz, 1 - minRatio), minRatio);

    if (n <= 1) {
        let wx = w*rx, wx2 = w*(1-rx);
        let wy = h*ry, wy2 = h*(1-ry);
        let wz = d*rz, wz2 = d*(1-rz);
        split3D(x,    y,    z,    wx,  wy,  wz,  n+1, nodeId*8+0, maxD, onLeaf);
        split3D(x+wx, y,    z,    wx2, wy,  wz,  n+1, nodeId*8+1, maxD, onLeaf);
        split3D(x,    y+wy, z,    wx,  wy2, wz,  n+1, nodeId*8+2, maxD, onLeaf);
        split3D(x+wx, y+wy, z,    wx2, wy2, wz,  n+1, nodeId*8+3, maxD, onLeaf);
        split3D(x,    y,    z+wz, wx,  wy,  wz2, n+1, nodeId*8+4, maxD, onLeaf);
        split3D(x+wx, y,    z+wz, wx2, wy,  wz2, n+1, nodeId*8+5, maxD, onLeaf);
        split3D(x,    y+wy, z+wz, wx,  wy2, wz2, n+1, nodeId*8+6, maxD, onLeaf);
        split3D(x+wx, y+wy, z+wz, wx2, wy2, wz2, n+1, nodeId*8+7, maxD, onLeaf);
    } else {
        let axis = nodeId % 3;
        if (axis === 0) {
            let wx = w*rx, wx2 = w*(1-rx);
            split3D(x,    y, z, wx,  h, d, n+1, nodeId*2+0, maxD, onLeaf);
            split3D(x+wx, y, z, wx2, h, d, n+1, nodeId*2+1, maxD, onLeaf);
        } else if (axis === 1) {
            let wy = h*ry, wy2 = h*(1-ry);
            split3D(x, y,    z, w, wy,  d, n+1, nodeId*2+0, maxD, onLeaf);
            split3D(x, y+wy, z, w, wy2, d, n+1, nodeId*2+1, maxD, onLeaf);
        } else {
            let wz = d*rz, wz2 = d*(1-rz);
            split3D(x, y, z,    w, h, wz,  n+1, nodeId*2+0, maxD, onLeaf);
            split3D(x, y, z+wz, w, h, wz2, n+1, nodeId*2+1, maxD, onLeaf);
        }
    }
}

// V4: same as split3D but carries source UV (ix,iy,iw,ih) for logo warp
// source always splits at 0.5; canvas splits at animated ratio — same trick as v2
function split4D(x, y, z, w, h, d, ix, iy, iw, ih, n, nodeId, maxD) {
    randomSeed(nodeId + floor(ran * 100));
    if ((random() < 0.15 && n > 2) || n > maxD) {
        addBoxEdges(x, y, z, w, h, d);
        addFaceVerts(x, y, z, w, h, d, ix, iy, iw, ih);
        return;
    }

    let rx = 0.5 + 0.5 * Math.sin(tt * (0.01 + n * 0.01) + n * 50);
    rx = Math.max(Math.min(rx, 1 - minRatio), minRatio);
    let ry = 0.5 + 0.5 * Math.cos(tt * (0.01 + n * 0.01) + n * 9930);
    ry = Math.max(Math.min(ry, 1 - minRatio), minRatio);
    let rz = 0.5 + 0.5 * Math.sin(tt * (0.01 + n * 0.013) + n * 3141 + 7);
    rz = Math.max(Math.min(rz, 1 - minRatio), minRatio);

    let ixw = iw * 0.5, ixw2 = iw * 0.5;
    let iyh = ih * 0.5, iyh2 = ih * 0.5;

    if (n <= 1) {
        let wx=w*rx, wx2=w*(1-rx), wy=h*ry, wy2=h*(1-ry), wz=d*rz, wz2=d*(1-rz);
        // y- children get logo bottom half (iy+iyh), y+ get logo top half (iy) so it renders upright
        split4D(x,    y,    z,    wx, wy,  wz,  ix,     iy+iyh, ixw,  iyh2, n+1,nodeId*8+0,maxD);
        split4D(x+wx, y,    z,    wx2,wy,  wz,  ix+ixw, iy+iyh, ixw2, iyh2, n+1,nodeId*8+1,maxD);
        split4D(x,    y+wy, z,    wx, wy2, wz,  ix,     iy,     ixw,  iyh,  n+1,nodeId*8+2,maxD);
        split4D(x+wx, y+wy, z,    wx2,wy2, wz,  ix+ixw, iy,     ixw2, iyh,  n+1,nodeId*8+3,maxD);
        split4D(x,    y,    z+wz, wx, wy,  wz2, ix,     iy+iyh, ixw,  iyh2, n+1,nodeId*8+4,maxD);
        split4D(x+wx, y,    z+wz, wx2,wy,  wz2, ix+ixw, iy+iyh, ixw2, iyh2, n+1,nodeId*8+5,maxD);
        split4D(x,    y+wy, z+wz, wx, wy2, wz2, ix,     iy,     ixw,  iyh,  n+1,nodeId*8+6,maxD);
        split4D(x+wx, y+wy, z+wz, wx2,wy2, wz2, ix+ixw, iy,     ixw2, iyh,  n+1,nodeId*8+7,maxD);
    } else {
        let axis = nodeId % 3;
        if (axis === 0) {
            let wx=w*rx, wx2=w*(1-rx);
            split4D(x,    y,z, wx,  h,d, ix,     iy,ixw,  ih,n+1,nodeId*2+0,maxD);
            split4D(x+wx, y,z, wx2, h,d, ix+ixw, iy,ixw2, ih,n+1,nodeId*2+1,maxD);
        } else if (axis === 1) {
            let wy=h*ry, wy2=h*(1-ry);
            // top 3D child → top of logo (iy), bottom → bottom half (iy+iyh)
            split4D(x,y+wy, z, w,wy2,d, ix,iy,     iw,iyh,  n+1,nodeId*2+0,maxD);
            split4D(x,y,    z, w,wy,  d, ix,iy+iyh, iw,iyh2, n+1,nodeId*2+1,maxD);
        } else {
            let wz=d*rz, wz2=d*(1-rz);
            split4D(x,y,z,    w,h,wz,  ix,iy,iw,ih,n+1,nodeId*2+0,maxD);
            split4D(x,y,z+wz, w,h,wz2, ix,iy,iw,ih,n+1,nodeId*2+1,maxD);
        }
    }
}

// ── UI ───────────────────────────────────────────────────────────────────────

function buildUI() {
    let panel = document.createElement('div');
    css(panel, {
        position: 'fixed', top: '16px', right: '16px', zIndex: '10',
        display: 'flex', flexDirection: 'column', gap: '8px',
        background: 'rgba(200,200,200,0.85)',
        padding: '10px 12px', borderRadius: '10px',
        fontFamily: 'monospace', fontSize: '10px',
        color: '#222', userSelect: 'none', width: '130px'
    });

    let sel = document.createElement('select');
    css(sel, {
        background: 'rgba(255,255,255,0.6)', color: '#222',
        border: '1px solid rgba(0,0,0,0.15)', borderRadius: '5px',
        padding: '3px 6px', fontFamily: 'monospace', fontSize: '10px',
        cursor: 'pointer', width: '100%'
    });
    [['v1 - grid','v1'],['v2 - logo','v2'],['v2 - images','v2i'],['v3 - 3d','v3'],['v4 - 3d logo','v4'],['v5 - focus','v5'],['v6 - hands','v6']].forEach(([label, val]) => {
        let opt = document.createElement('option');
        opt.value = val; opt.textContent = label;
        if (val === mode) opt.selected = true;
        sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
        mode = sel.value;
        if (mode === 'v3' || mode === 'v4') {
            setupThreeJS();
            startThreeJS();
        } else {
            stopThreeJS();
        }
        if (mode === 'v4') {
            slicesCtrl.setValue(2);
            cellCtrl.setValue(0.45);
        }
        if (mode === 'v6') setupHandTracking();
    });
    panel.appendChild(sel);

    let hr = document.createElement('div');
    css(hr, { borderTop: '1px solid rgba(0,0,0,0.15)', margin: '2px 0' });
    panel.appendChild(hr);

    let slicesCtrl = addSliderRow(panel, 'slices',    2,    12,   maxDepth, 1,    v => { maxDepth = v; });
    let cellCtrl   = addSliderRow(panel, 'cell size', 0,  0.45,  minRatio, 0.01, v => { minRatio = v; });

    // v3-only reset row — hidden until v3 is active
    let resetRow = document.createElement('div');
    css(resetRow, {
        display: 'none', alignItems: 'center', gap: '6px',
        borderTop: '1px solid rgba(0,0,0,0.15)', paddingTop: '6px', marginTop: '2px'
    });
    let cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'reset2d';
    css(cb, { cursor: 'pointer', margin: '0' });
    let lbl = document.createElement('label');
    lbl.htmlFor = 'reset2d';
    lbl.textContent = 'reset to 2D view';
    css(lbl, { cursor: 'pointer', opacity: '0.7' });
    resetRow.appendChild(cb);
    resetRow.appendChild(lbl);
    panel.appendChild(resetRow);

    cb.addEventListener('change', () => {
        if (!cb.checked) return;
        orbitTheta = 0; orbitPhi = 0;
        orbitVel = { t: 0, p: 0 };
        orbitRadius = initOrbitRadius;
        // uncheck after a tick so it reads as a momentary action, not a persistent toggle
        setTimeout(() => { cb.checked = false; }, 200);
    });

    // show/hide reset row when version changes
    sel.addEventListener('change', () => {
        resetRow.style.display = (mode === 'v3' || mode === 'v4') ? 'flex' : 'none';
    });

    document.body.appendChild(panel);

    // ── v5 focus-point mini canvas (bottom-right, separate from main panel) ──
    v5Panel = document.createElement('div');
    css(v5Panel, {
        position: 'fixed', bottom: '16px', right: '16px', zIndex: '10',
        display: 'none', flexDirection: 'column', gap: '5px',
        background: 'rgba(200,200,200,0.85)', padding: '8px 10px',
        borderRadius: '10px', fontFamily: 'monospace', fontSize: '10px',
        color: '#222', userSelect: 'none'
    });
    let v5Lbl = document.createElement('div');
    v5Lbl.textContent = 'focus points';
    css(v5Lbl, { opacity: '0.6' });
    v5Panel.appendChild(v5Lbl);

    ctrlCanvas = document.createElement('canvas');
    ctrlCanvas.width = CTRL_W; ctrlCanvas.height = CTRL_H;
    css(ctrlCanvas, { display: 'block', borderRadius: '6px', cursor: 'crosshair' });
    ctrlCtx = ctrlCanvas.getContext('2d');
    v5Panel.appendChild(ctrlCanvas);

    let logoRow = document.createElement('div');
    css(logoRow, { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' });
    let logoCb = document.createElement('input');
    logoCb.type = 'checkbox'; logoCb.id = 'v5logo';
    css(logoCb, { cursor: 'pointer', margin: '0' });
    let logoLbl = document.createElement('label');
    logoLbl.htmlFor = 'v5logo'; logoLbl.textContent = 'use logo';
    css(logoLbl, { cursor: 'pointer', opacity: '0.7' });
    logoCb.addEventListener('change', () => { v5UseLogo = logoCb.checked; });
    logoRow.appendChild(logoCb); logoRow.appendChild(logoLbl);
    v5Panel.appendChild(logoRow);

    document.body.appendChild(v5Panel);

    // drag events for focus points
    ctrlCanvas.addEventListener('mousedown', e => {
        let r = ctrlCanvas.getBoundingClientRect();
        let mx = e.clientX - r.left, my = e.clientY - r.top;
        for (let i = 0; i < ctrlPoints.length; i++) {
            if (Math.hypot(mx - ctrlPoints[i].x * CTRL_W, my - ctrlPoints[i].y * CTRL_H) < DOT_R + 6) {
                ctrlDragging = i; break;
            }
        }
    });
    window.addEventListener('mousemove', e => {
        if (ctrlDragging < 0) return;
        let r = ctrlCanvas.getBoundingClientRect();
        ctrlPoints[ctrlDragging].x = Math.max(0, Math.min(1, (e.clientX - r.left) / CTRL_W));
        ctrlPoints[ctrlDragging].y = Math.max(0, Math.min(1, (e.clientY - r.top) / CTRL_H));
    });
    window.addEventListener('mouseup', () => { ctrlDragging = -1; });

    // show/hide v5 panel with mode (piggyback on the existing reset-row listener)
    sel.addEventListener('change', () => {
        v5Panel.style.display = (mode === 'v5' || mode === 'v6') ? 'flex' : 'none';
    });
}

function addSliderRow(parent, label, min, max, val, step, onChange) {
    let wrap = document.createElement('div');
    css(wrap, { display: 'flex', flexDirection: 'column', gap: '2px' });

    let header = document.createElement('div');
    css(header, { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' });

    let name = document.createElement('span');
    name.textContent = label;
    css(name, { opacity: '0.6' });
    header.appendChild(name);

    let valLabel = document.createElement('span');
    valLabel.textContent = (step < 1) ? parseFloat(val).toFixed(2) : val;
    css(valLabel, { opacity: '0.5' });
    header.appendChild(valLabel);

    wrap.appendChild(header);

    let slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min; slider.max = max; slider.value = val; slider.step = step;
    css(slider, { width: '100%', cursor: 'pointer', margin: '0' });
    slider.addEventListener('input', () => {
        let v = parseFloat(slider.value);
        onChange(v);
        valLabel.textContent = (step < 1) ? v.toFixed(2) : v;
    });
    wrap.appendChild(slider);

    parent.appendChild(wrap);
    return {
        setValue(v) {
            slider.value = v;
            onChange(v);
            valLabel.textContent = (step < 1) ? parseFloat(v).toFixed(2) : v;
        }
    };
}

// apply an object of camelCase styles to a DOM element
function css(el, styles) {
    Object.assign(el.style, styles);
}
