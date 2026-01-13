/**
 * Tetris Game Core
 * Classic Tetris with SRS rotation, 7-bag randomizer, and lock delay
 */

// Game Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const HIDDEN_ROWS = 2;

// Game States
const GAME_STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
};

class Game {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('tetris-board');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('next-canvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.holdCanvas = document.getElementById('hold-canvas');
        this.holdCtx = this.holdCanvas.getContext('2d');

        // Game grid
        this.grid = this.createGrid();

        // Stats
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.highScore = parseInt(localStorage.getItem('tetris_high_score')) || 0;

        // Game state
        this.state = GAME_STATE.MENU;

        // Timing
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;

        // Lock delay
        this.lockDelay = 500;
        this.lockTimer = 0;
        this.isLocking = false;
        this.lockMoves = 0;
        this.maxLockMoves = 15;

        // Player/Piece state
        this.player = {
            pos: { x: 0, y: 0 },
            matrix: null,
            tetromino: null,
            rotationIndex: 0
        };

        // Piece queue (7-bag system)
        this.bag = [];
        this.nextPieces = [];
        this.nextPiece = null;
        this.holdPiece = null;
        this.canHold = true;

        // Animation state
        this.clearingLines = [];
        this.clearAnimationFrame = 0;
        this.isAnimatingClear = false;

        // Load preferences
        this.loadPreferences();
        this.updateScore();

        // Setup UI listeners
        this.setupUIListeners();

        // Start game loop
        requestAnimationFrame(this.update.bind(this));
    }

    /**
     * Load saved preferences from localStorage
     */
    loadPreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem('tetris_prefs')) || {};
            this.preferredStartLevel = prefs.startLevel || 1;
            document.getElementById('level-slider').value = this.preferredStartLevel;
            document.getElementById('start-level-val').innerText = this.preferredStartLevel;
        } catch (e) {
            console.warn('Could not load preferences:', e);
        }
    }

    /**
     * Save preferences to localStorage
     */
    savePreferences() {
        try {
            localStorage.setItem('tetris_prefs', JSON.stringify({
                startLevel: this.level,
                soundEnabled: !audioManager.muted
            }));
        } catch (e) {
            console.warn('Could not save preferences:', e);
        }
    }

    /**
     * Create empty game grid
     */
    createGrid() {
        return Array(ROWS).fill().map(() => Array(COLS).fill(0));
    }

    /**
     * Setup UI button listeners
     */
    setupUIListeners() {
        document.getElementById('start-btn').addEventListener('click', (e) => {
            e.target.blur();
            const startLevel = parseInt(document.getElementById('level-slider').value);
            this.start(startLevel);
        });

        document.getElementById('restart-btn').addEventListener('click', (e) => {
            e.target.blur();
            this.reset();
            document.getElementById('game-over-screen').classList.add('hidden');
            this.start(1);
        });

        document.getElementById('resume-btn').addEventListener('click', (e) => {
            e.target.blur();
            this.togglePause();
        });

        document.getElementById('quit-btn').addEventListener('click', () => {
            location.reload();
        });

        document.getElementById('mute-btn').addEventListener('click', () => {
            const isMuted = audioManager.toggleMute();
            document.getElementById('sound-icon').textContent = isMuted ? '🔇' : '🔊';
            this.savePreferences();
        });

        document.getElementById('level-slider').addEventListener('input', (e) => {
            document.getElementById('start-level-val').innerText = e.target.value;
        });
    }

    /**
     * Start the game
     */
    start(startLevel = 1) {
        audioManager.init();

        this.grid = this.createGrid();
        this.score = 0;
        this.lines = 0;
        this.level = startLevel;
        this.dropInterval = this.getDropInterval(this.level);
        this.bag = [];
        this.nextPieces = [];
        this.holdPiece = null;
        this.canHold = true;
        this.isAnimatingClear = false;
        this.clearingLines = [];

        this.updateScore();

        // Initialize bag and get first pieces
        this.fillBag();
        this.nextPiece = this.getNextFromBag();
        this.playerReset();

        this.state = GAME_STATE.PLAYING;

        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');

        this.startCountdown();
    }

    /**
     * Countdown before game starts
     */
    startCountdown() {
        const countdownEl = document.getElementById('countdown');
        const numEl = document.getElementById('countdown-num');
        countdownEl.classList.remove('hidden');

        let count = 3;
        numEl.innerText = count;
        audioManager.play('move');

        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                numEl.innerText = count;
                audioManager.play('move');
            } else if (count === 0) {
                numEl.innerText = 'GO!';
                audioManager.play('rotate');
            } else {
                clearInterval(timer);
                countdownEl.classList.add('hidden');
                this.state = GAME_STATE.PLAYING;
                audioManager.play('levelup');
                audioManager.startMusic();
            }
        }, 600);
    }

    /**
     * Reset game state
     */
    reset() {
        this.grid = this.createGrid();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.holdPiece = null;
        this.bag = [];
        this.nextPieces = [];
        this.isAnimatingClear = false;
        this.clearingLines = [];
        this.updateScore();
    }

    // ==================== 7-Bag Randomizer ====================

    /**
     * Fill the bag with shuffled pieces
     */
    fillBag() {
        const pieces = ['I', 'L', 'J', 'O', 'T', 'S', 'Z'];
        // Shuffle using Fisher-Yates
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        this.bag = pieces.map(type => TETROMINOS[type]);
    }

    /**
     * Get next piece from bag
     */
    getNextFromBag() {
        if (this.bag.length === 0) {
            this.fillBag();
        }
        return this.bag.pop();
    }

    /**
     * Get drop interval based on level (NES-style)
     */
    getDropInterval(level) {
        const frames = {
            0: 48, 1: 48, 2: 43, 3: 38, 4: 33, 5: 28,
            6: 23, 7: 18, 8: 13, 9: 8, 10: 6, 11: 5,
            12: 5, 13: 5, 14: 4, 15: 4, 16: 4, 17: 3,
            18: 3, 19: 3
        }[level] || (level > 19 ? 2 : 4);

        return (frames / 60) * 1000;
    }

    // ==================== Player Actions ====================

    /**
     * Reset player with new piece
     */
    playerReset() {
        // Deep copy the tetromino shape
        this.player.tetromino = this.nextPiece || this.getNextFromBag();
        this.player.matrix = this.player.tetromino.shape.map(row => [...row]);
        this.player.pos.y = 0;
        this.player.pos.x = Math.floor(COLS / 2) - Math.floor(this.player.matrix[0].length / 2);
        this.player.rotationIndex = 0;

        this.nextPiece = this.getNextFromBag();
        this.drawNext();

        // Reset lock delay state
        this.isLocking = false;
        this.lockTimer = 0;
        this.lockMoves = 0;

        if (this.collide(this.grid, this.player)) {
            this.gameOver();
        }
    }

    /**
     * Handle game over
     */
    gameOver() {
        this.state = GAME_STATE.GAMEOVER;
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('final-score').innerText = this.score.toLocaleString();
        document.getElementById('final-lines').innerText = this.lines;

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('tetris_high_score', this.highScore);
            this.updateScore();
        }

        audioManager.play('gameover');
        audioManager.stopMusic();
        this.savePreferences();
    }

    /**
     * Gravity drop (called by game loop)
     */
    playerDrop() {
        this.player.pos.y++;
        if (this.collide(this.grid, this.player)) {
            this.player.pos.y--;
            // Start lock delay
            if (!this.isLocking) {
                this.isLocking = true;
                this.lockTimer = 0;
            }
        } else {
            // Reset lock delay if piece moves down successfully
            this.isLocking = false;
            this.lockTimer = 0;
        }
        this.dropCounter = 0;
    }

    /**
     * Manual soft drop (down key)
     */
    manualDrop() {
        this.player.pos.y++;
        if (this.collide(this.grid, this.player)) {
            this.player.pos.y--;
            if (!this.isLocking) {
                this.isLocking = true;
                this.lockTimer = 0;
            }
        } else {
            this.score += 1; // Soft drop score
            this.updateScore();
            this.isLocking = false;
            this.lockTimer = 0;
        }
        this.dropCounter = 0;
    }

    /**
     * Hard drop (space key)
     */
    playerHardDrop() {
        let dropped = 0;
        while (!this.collide(this.grid, this.player)) {
            this.player.pos.y++;
            dropped++;
        }
        this.player.pos.y--;
        this.score += Math.max(0, dropped - 1) * 2;
        this.updateScore();

        this.lockPiece();
        audioManager.play('drop');
    }

    /**
     * Lock piece and spawn new one
     */
    lockPiece() {
        this.merge(this.grid, this.player);
        this.arenaSweep();
        this.canHold = true;
        this.playerReset();
    }

    /**
     * Move piece horizontally
     */
    playerMove(dir) {
        this.player.pos.x += dir;
        if (this.collide(this.grid, this.player)) {
            this.player.pos.x -= dir;
        } else {
            audioManager.play('move');
            // Reset lock delay on successful move (up to max moves)
            if (this.isLocking && this.lockMoves < this.maxLockMoves) {
                this.lockTimer = 0;
                this.lockMoves++;
            }
        }
    }

    /**
     * Rotate piece with SRS wall kicks
     */
    playerRotate(dir) {
        const currentRotation = this.player.rotationIndex;

        // Perform rotation
        this.rotate(this.player.matrix, dir);

        // Get kick data
        const kicks = getKickData(this.player.tetromino.id, currentRotation, dir);

        let success = false;
        for (const [offsetX, offsetY] of kicks) {
            const originalX = this.player.pos.x;
            const originalY = this.player.pos.y;

            this.player.pos.x += offsetX;
            this.player.pos.y -= offsetY; // Y is inverted in canvas

            if (!this.collide(this.grid, this.player)) {
                success = true;
                this.player.rotationIndex = (currentRotation + dir + 4) % 4;
                audioManager.play('rotate');

                // Reset lock delay on successful rotation
                if (this.isLocking && this.lockMoves < this.maxLockMoves) {
                    this.lockTimer = 0;
                    this.lockMoves++;
                }
                break;
            } else {
                this.player.pos.x = originalX;
                this.player.pos.y = originalY;
            }
        }

        if (!success) {
            this.rotate(this.player.matrix, -dir);
        }
    }

    /**
     * Rotate matrix in place
     */
    rotate(matrix, dir) {
        // Transpose
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }
        // Reverse rows or columns based on direction
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }

    /**
     * Hold current piece
     */
    holdTetromino() {
        if (!this.canHold || this.state !== GAME_STATE.PLAYING) return;

        audioManager.play('move');

        if (!this.holdPiece) {
            this.holdPiece = this.player.tetromino;
            this.playerReset();
        } else {
            const temp = this.player.tetromino;
            this.player.tetromino = this.holdPiece;
            this.holdPiece = temp;

            this.player.matrix = this.player.tetromino.shape.map(row => [...row]);
            this.player.pos.y = 0;
            this.player.pos.x = Math.floor(COLS / 2) - Math.floor(this.player.matrix[0].length / 2);
            this.player.rotationIndex = 0;
        }

        this.canHold = false;
        this.drawHold();
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.state === GAME_STATE.PLAYING) {
            this.state = GAME_STATE.PAUSED;
            document.getElementById('pause-screen').classList.remove('hidden');
            audioManager.stopMusic();
        } else if (this.state === GAME_STATE.PAUSED) {
            this.state = GAME_STATE.PLAYING;
            document.getElementById('pause-screen').classList.add('hidden');
            audioManager.startMusic();
        }
    }

    // ==================== Collision & Grid ====================

    /**
     * Check collision between piece and grid
     */
    collide(arena, player) {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                    (arena[y + o.y] === undefined ||
                        arena[y + o.y][x + o.x] === undefined ||
                        arena[y + o.y][x + o.x] !== 0)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Merge piece into grid
     */
    merge(arena, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    arena[y + player.pos.y][x + player.pos.x] = player.tetromino.color;
                }
            });
        });
    }

    /**
     * Clear completed lines with animation
     */
    arenaSweep() {
        this.clearingLines = [];

        for (let y = this.grid.length - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== 0)) {
                this.clearingLines.push(y);
            }
        }

        if (this.clearingLines.length > 0) {
            this.isAnimatingClear = true;
            this.clearAnimationFrame = 0;

            // Play sound based on lines cleared
            if (this.clearingLines.length === 4) {
                audioManager.play('tetris');
            } else {
                audioManager.play('clear');
            }
        }
    }

    /**
     * Complete line clear after animation
     */
    completeClear() {
        const rowCount = this.clearingLines.length;

        // Remove lines (from bottom up to maintain indices)
        this.clearingLines.sort((a, b) => b - a);
        for (const y of this.clearingLines) {
            this.grid.splice(y, 1);
            this.grid.unshift(Array(COLS).fill(0));
        }

        this.lines += rowCount;

        // Scoring
        const lineScores = { 1: 100, 2: 300, 3: 500, 4: 800 };
        this.score += (lineScores[rowCount] || 100) * this.level;
        this.updateScore();

        // Level up every 10 lines
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.dropInterval = this.getDropInterval(this.level);
            audioManager.play('levelup');
        }

        this.clearingLines = [];
        this.isAnimatingClear = false;
    }

    /**
     * Update score display
     */
    updateScore() {
        document.getElementById('score').innerText = this.score.toString().padStart(6, '0');
        document.getElementById('level').innerText = this.level;
        document.getElementById('lines').innerText = this.lines;
        document.getElementById('high-score').innerText = this.highScore.toString().padStart(6, '0');
    }

    // ==================== Game Loop ====================

    /**
     * Main game loop
     */
    update(time = 0) {
        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        if (this.state === GAME_STATE.PLAYING) {
            // Handle line clear animation
            if (this.isAnimatingClear) {
                this.clearAnimationFrame++;
                if (this.clearAnimationFrame >= 18) { // ~300ms at 60fps
                    this.completeClear();
                }
            } else {
                // Normal gameplay
                this.dropCounter += deltaTime;
                if (this.dropCounter > this.dropInterval) {
                    this.playerDrop();
                }

                // Lock delay
                if (this.isLocking) {
                    this.lockTimer += deltaTime;
                    if (this.lockTimer >= this.lockDelay) {
                        this.lockPiece();
                        audioManager.play('land');
                    }
                }
            }
        }

        this.draw();
        requestAnimationFrame(this.update.bind(this));
    }

    // ==================== Rendering ====================

    /**
     * Main draw function
     */
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= COLS; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * BLOCK_SIZE, 0);
            this.ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
            this.ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * BLOCK_SIZE);
            this.ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
            this.ctx.stroke();
        }

        // Draw locked blocks
        this.drawMatrix(this.grid, { x: 0, y: 0 });

        // Draw clearing lines animation
        if (this.isAnimatingClear) {
            const flash = Math.floor(this.clearAnimationFrame / 3) % 2 === 0;
            for (const y of this.clearingLines) {
                this.ctx.fillStyle = flash ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)';
                this.ctx.fillRect(0, y * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE);
            }
        }

        // Draw ghost piece
        if (this.state === GAME_STATE.PLAYING && !this.isAnimatingClear) {
            const ghostPos = { ...this.player.pos };
            while (!this.collide(this.grid, { pos: ghostPos, matrix: this.player.matrix })) {
                ghostPos.y++;
            }
            ghostPos.y--;

            this.ctx.globalAlpha = 0.2;
            this.drawMatrix(this.player.matrix, ghostPos, this.player.tetromino.color);
            this.ctx.globalAlpha = 1.0;
        }

        // Draw active piece
        if ((this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED) && !this.isAnimatingClear) {
            this.drawMatrix(this.player.matrix, this.player.pos, this.player.tetromino.color);
        }

        this.drawNext();
    }

    /**
     * Draw next piece preview
     */
    drawNext() {
        this.nextCtx.fillStyle = '#000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        if (this.nextPiece) {
            this.drawMatrixOnCanvas(this.nextCtx, this.nextPiece.shape, this.nextPiece.color);
        }
    }

    /**
     * Draw hold piece preview
     */
    drawHold() {
        this.holdCtx.fillStyle = '#000';
        this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);

        if (this.holdPiece) {
            const alpha = this.canHold ? 1.0 : 0.4;
            this.holdCtx.globalAlpha = alpha;
            this.drawMatrixOnCanvas(this.holdCtx, this.holdPiece.shape, this.holdPiece.color);
            this.holdCtx.globalAlpha = 1.0;
        }
    }

    /**
     * Draw a matrix on a small canvas (for next/hold)
     */
    drawMatrixOnCanvas(ctx, matrix, color) {
        const blockSize = 20;
        const offset = {
            x: (ctx.canvas.width / blockSize - matrix[0].length) / 2,
            y: (ctx.canvas.height / blockSize - matrix.length) / 2
        };

        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = color;
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = color;
                    ctx.fillRect((x + offset.x) * blockSize, (y + offset.y) * blockSize, blockSize, blockSize);

                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect((x + offset.x) * blockSize, (y + offset.y) * blockSize, blockSize, blockSize);
                    ctx.shadowBlur = 0;
                }
            });
        });
    }

    /**
     * Draw a matrix on the main canvas
     */
    drawMatrix(matrix, offset, colorOverride = null) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.ctx.fillStyle = typeof value === 'string' ? value : colorOverride;

                    // Neon glow effect
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = this.ctx.fillStyle;

                    this.ctx.fillRect(
                        (x + offset.x) * BLOCK_SIZE,
                        (y + offset.y) * BLOCK_SIZE,
                        BLOCK_SIZE,
                        BLOCK_SIZE
                    );

                    // Inner border
                    this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(
                        (x + offset.x) * BLOCK_SIZE,
                        (y + offset.y) * BLOCK_SIZE,
                        BLOCK_SIZE,
                        BLOCK_SIZE
                    );

                    this.ctx.shadowBlur = 0;
                }
            });
        });
    }
}

// Initialize game and controls
let game;
let controls;

document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
    controls = new Controls(game);
});
