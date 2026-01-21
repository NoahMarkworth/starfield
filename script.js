// Canvas setup
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

// Configuration with defaults
const config = {
    starCount: 500,
    speed: 20,
    starSize: 1,
    trailLength: 0.5,
    depth: 5,
    starColor: '#ffffff'
};

// State
let stars = [];
let isPaused = false;
let animationId = null;

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Box-Muller transform for normal distribution
function randomNormal(mean = 0, stdDev = 1) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z * stdDev + mean;
}

// Star class
class Star {
    constructor() {
        this.reset();
    }

    reset() {
        // Normal distribution centered at screen center
        // stdDev controls spread - using 1/3 of half-width so ~99% of stars are on screen
        this.x = randomNormal(0, canvas.width / 6);
        this.y = randomNormal(0, canvas.height / 6);
        this.z = Math.random() * canvas.width;
        this.pz = this.z;
        this.justReset = true;
    }

    update() {
        this.pz = this.z;

        // Calculate distance from center (0-1 range, clamped)
        const distFromCenter = Math.min(1, Math.sqrt(this.x * this.x + this.y * this.y) / (canvas.width / 2));

        // Apply parallax: center stars move faster, edge stars slower
        // depth=1: all stars same speed (multiplier = 1 for all)
        // depth>1: center faster, edges slower
        // At depth=10: center ~1.9x, edges ~0.1x
        const depthEffect = (config.depth - 1) / 9; // 0 to 1 range
        const parallaxMultiplier = 1 + depthEffect * (1 - distFromCenter) * 1.8 - depthEffect * 0.9;

        this.z -= config.speed * parallaxMultiplier;

        if (this.z < 1) {
            this.reset();
            this.z = canvas.width;
            this.pz = this.z; // Set pz to same as z to prevent trail glitch on reset
            this.justReset = true;
        }
    }

    draw() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Current position
        const sx = (this.x / this.z) * canvas.width + centerX;
        const sy = (this.y / this.z) * canvas.height + centerY;

        // Previous position for trail base
        const px = (this.x / this.pz) * canvas.width + centerX;
        const py = (this.y / this.pz) * canvas.height + centerY;

        // Size based on depth
        const size = (1 - this.z / canvas.width) * config.starSize * 3;

        // Brightness based on depth
        const brightness = 1 - this.z / canvas.width;

        // Parse color and apply brightness
        const color = hexToRgb(config.starColor);
        const r = Math.floor(color.r * brightness);
        const g = Math.floor(color.g * brightness);
        const b = Math.floor(color.b * brightness);

        // Draw trail from previous to current position (skip if just reset to avoid glitch)
        if (config.trailLength > 0 && !this.justReset) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        this.justReset = false;

        // Draw star
        ctx.beginPath();
        ctx.arc(sx, sy, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fill();
    }
}

// Helper function to convert hex to rgb
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

// Initialize stars
function initStars() {
    stars = [];
    for (let i = 0; i < config.starCount; i++) {
        stars.push(new Star());
    }
}

// Update star count dynamically
function updateStarCount(newCount) {
    const diff = newCount - stars.length;
    if (diff > 0) {
        for (let i = 0; i < diff; i++) {
            stars.push(new Star());
        }
    } else if (diff < 0) {
        stars.splice(newCount);
    }
}

// Animation loop
function animate() {
    // Clear with trail effect using alpha
    // Use square root to make the slider more linear-feeling
    // trailLength 0 = full clear, 2 = very persistent
    const normalizedTrail = config.trailLength / 2; // 0 to 1 range
    const clearAlpha = 1 - Math.sqrt(normalizedTrail) * 0.95;
    ctx.fillStyle = `rgba(0, 0, 0, ${clearAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw stars
    for (const star of stars) {
        star.update();
        star.draw();
    }

    if (!isPaused) {
        animationId = requestAnimationFrame(animate);
    }
}

// Control panel toggle
const toggleBtn = document.getElementById('toggleControls');
const controlsPanel = document.getElementById('controlsPanel');

toggleBtn.addEventListener('click', () => {
    controlsPanel.classList.toggle('hidden');
});

// Slider controls
const sliders = {
    starCount: document.getElementById('starCount'),
    speed: document.getElementById('speed'),
    starSize: document.getElementById('starSize'),
    trailLength: document.getElementById('trailLength'),
    depth: document.getElementById('depth'),
    starColor: document.getElementById('starColor')
};

const valueDisplays = {
    starCount: document.getElementById('starCountValue'),
    speed: document.getElementById('speedValue'),
    starSize: document.getElementById('starSizeValue'),
    trailLength: document.getElementById('trailLengthValue'),
    depth: document.getElementById('depthValue')
};

// Update config when sliders change
sliders.starCount.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    config.starCount = value;
    valueDisplays.starCount.textContent = value;
    updateStarCount(value);
});

sliders.speed.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    config.speed = value;
    valueDisplays.speed.textContent = value;
});

sliders.starSize.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    config.starSize = value;
    valueDisplays.starSize.textContent = value;
});

sliders.trailLength.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    config.trailLength = value;
    valueDisplays.trailLength.textContent = value;
});

sliders.depth.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    config.depth = value;
    valueDisplays.depth.textContent = value;
});

sliders.starColor.addEventListener('input', (e) => {
    config.starColor = e.target.value;
});

// Pause/Play button
const pauseBtn = document.getElementById('pauseBtn');

pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Play' : 'Pause';
    pauseBtn.classList.toggle('paused', isPaused);

    if (!isPaused) {
        animate();
    }
});

// Reset button
const resetBtn = document.getElementById('resetBtn');

resetBtn.addEventListener('click', () => {
    // Reset config
    config.starCount = 500;
    config.speed = 20;
    config.starSize = 1;
    config.trailLength = 0.5;
    config.depth = 5;
    config.starColor = '#ffffff';

    // Reset sliders
    sliders.starCount.value = 500;
    sliders.speed.value = 20;
    sliders.starSize.value = 1;
    sliders.trailLength.value = 0.5;
    sliders.depth.value = 5;
    sliders.starColor.value = '#ffffff';

    // Reset value displays
    valueDisplays.starCount.textContent = '500';
    valueDisplays.speed.textContent = '20';
    valueDisplays.starSize.textContent = '1';
    valueDisplays.trailLength.textContent = '0.5';
    valueDisplays.depth.textContent = '5';

    // Reinitialize stars
    initStars();

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

// Handle window resize
window.addEventListener('resize', () => {
    resizeCanvas();
});

// Initialize
resizeCanvas();
initStars();
animate();
