/**
 * Tetris Controls Module
 * Handles all keyboard, touch button, and gesture inputs
 */

class Controls {
    constructor(game) {
        this.game = game;
        this.isMobile = this.detectMobile();
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.longPressTimer = null;
        this.repeatTimer = null;
        this.repeatAction = null;

        // Gesture thresholds
        this.SWIPE_THRESHOLD = 30;
        this.LONG_PRESS_DURATION = 300;
        this.REPEAT_DELAY = 150;
        this.REPEAT_INITIAL_DELAY = 200;

        this.init();
    }

    /**
     * Detect if device is mobile/touch-based
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || ('ontouchstart' in window)
            || (navigator.maxTouchPoints > 0)
            || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    }

    /**
     * Initialize all event listeners
     */
    init() {
        this.setupKeyboardControls();
        this.setupTouchButtons();
        this.setupSwipeGestures();
        this.setupVisibilityAPI();
        this.setupUIControls();

        // Show/hide appropriate controls
        this.updateControlsVisibility();

        // Re-evaluate on resize
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = this.detectMobile();
            if (wasMobile !== this.isMobile) {
                this.updateControlsVisibility();
            }
        });
    }

    /**
     * Show touch controls on mobile, keyboard hints on desktop
     */
    updateControlsVisibility() {
        const mobileControls = document.getElementById('mobile-controls');
        const controlsGuide = document.querySelector('.controls-guide');

        if (this.isMobile) {
            if (mobileControls) mobileControls.style.display = 'flex';
            if (controlsGuide) controlsGuide.style.display = 'none';
        } else {
            if (mobileControls) mobileControls.style.display = 'none';
            if (controlsGuide) controlsGuide.style.display = 'block';
        }
    }

    /**
     * Provide haptic feedback if available
     */
    vibrate(duration = 10) {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    }

    /**
     * Setup keyboard event handlers
     */
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            // Prevent default for game keys
            if ([32, 37, 38, 39, 40, 27].includes(event.keyCode)) {
                event.preventDefault();
            }

            // Handle menu state
            if (this.game.state === 'MENU') {
                if (event.keyCode === 13) { // Enter
                    document.getElementById('start-btn').click();
                }
                return;
            }

            // Handle paused state
            if (this.game.state === 'PAUSED') {
                if (event.keyCode === 80 || event.keyCode === 27) { // P or Escape
                    this.game.togglePause();
                }
                return;
            }

            // Handle game over state
            if (this.game.state === 'GAMEOVER') {
                if (event.keyCode === 82) { // R
                    document.getElementById('restart-btn').click();
                }
                return;
            }

            // Only process during gameplay
            if (this.game.state !== 'PLAYING') return;

            switch (event.keyCode) {
                case 37: // Left Arrow
                    this.game.playerMove(-1);
                    break;
                case 39: // Right Arrow
                    this.game.playerMove(1);
                    break;
                case 40: // Down Arrow
                    this.game.manualDrop();
                    break;
                case 38: // Up Arrow (Rotate Right)
                case 88: // X (Rotate Right)
                    this.game.playerRotate(1);
                    break;
                case 90: // Z (Rotate Left)
                case 17: // Ctrl (Rotate Left)
                    this.game.playerRotate(-1);
                    break;
                case 32: // Space (Hard Drop)
                    this.game.playerHardDrop();
                    break;
                case 67: // C (Hold)
                    this.game.holdTetromino();
                    break;
                case 80: // P (Pause)
                case 27: // Escape (Pause)
                    this.game.togglePause();
                    break;
            }
        });

        // Key repeat for arrow keys
        document.addEventListener('keyup', () => {
            this.stopRepeat();
        });
    }

    /**
     * Setup touch button controls
     */
    setupTouchButtons() {
        // Helper to bind touch events with repeat support
        const bindTouch = (id, action, repeatable = false) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            // Prevent context menu
            btn.addEventListener('contextmenu', (e) => e.preventDefault());

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.game.state === 'PLAYING') {
                    action();
                    this.vibrate();

                    if (repeatable) {
                        this.startRepeat(action);
                    }
                }
                btn.classList.add('active');
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('active');
                this.stopRepeat();
            }, { passive: false });

            btn.addEventListener('touchcancel', () => {
                btn.classList.remove('active');
                this.stopRepeat();
            });

            // Mouse events for testing on desktop
            btn.addEventListener('mousedown', () => {
                if (this.game.state === 'PLAYING') {
                    action();
                    if (repeatable) {
                        this.startRepeat(action);
                    }
                }
                btn.classList.add('active');
            });

            btn.addEventListener('mouseup', () => {
                btn.classList.remove('active');
                this.stopRepeat();
            });

            btn.addEventListener('mouseleave', () => {
                btn.classList.remove('active');
                this.stopRepeat();
            });
        };

        // Bind directional buttons with repeat
        bindTouch('btn-left', () => this.game.playerMove(-1), true);
        bindTouch('btn-right', () => this.game.playerMove(1), true);
        bindTouch('btn-down', () => this.game.manualDrop(), true);

        // Bind action buttons without repeat
        bindTouch('btn-rotate', () => this.game.playerRotate(1), false);
        bindTouch('btn-drop', () => this.game.playerHardDrop(), false);
        bindTouch('btn-hold', () => this.game.holdTetromino(), false);
        bindTouch('btn-pause', () => this.game.togglePause(), false);
    }

    /**
     * Start repeating an action
     */
    startRepeat(action) {
        this.stopRepeat();
        this.repeatTimer = setTimeout(() => {
            this.repeatAction = setInterval(() => {
                if (this.game.state === 'PLAYING') {
                    action();
                    this.vibrate(5);
                }
            }, this.REPEAT_DELAY);
        }, this.REPEAT_INITIAL_DELAY);
    }

    /**
     * Stop repeating
     */
    stopRepeat() {
        if (this.repeatTimer) {
            clearTimeout(this.repeatTimer);
            this.repeatTimer = null;
        }
        if (this.repeatAction) {
            clearInterval(this.repeatAction);
            this.repeatAction = null;
        }
    }

    /**
     * Setup swipe gestures on the game board
     */
    setupSwipeGestures() {
        const gameBoard = document.querySelector('.game-board-wrapper');
        if (!gameBoard) return;

        gameBoard.addEventListener('touchstart', (e) => {
            if (this.game.state !== 'PLAYING') return;

            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.touchStartTime = Date.now();

            // Long press detection for hold
            this.longPressTimer = setTimeout(() => {
                this.game.holdTetromino();
                this.vibrate(50);
            }, this.LONG_PRESS_DURATION);
        }, { passive: true });

        gameBoard.addEventListener('touchmove', (e) => {
            // Cancel long press if finger moves
            if (this.longPressTimer) {
                const dx = e.touches[0].clientX - this.touchStartX;
                const dy = e.touches[0].clientY - this.touchStartY;
                if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }
            }
        }, { passive: true });

        gameBoard.addEventListener('touchend', (e) => {
            if (this.game.state !== 'PLAYING') return;

            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const touchDuration = Date.now() - this.touchStartTime;

            const dx = touchEndX - this.touchStartX;
            const dy = touchEndY - this.touchStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // Check for tap (quick touch with no movement)
            if (touchDuration < 200 && absDx < 10 && absDy < 10) {
                this.game.playerRotate(1);
                this.vibrate();
                return;
            }

            // Check for swipe
            if (absDx > this.SWIPE_THRESHOLD || absDy > this.SWIPE_THRESHOLD) {
                if (absDx > absDy) {
                    // Horizontal swipe
                    if (dx > 0) {
                        this.game.playerMove(1); // Right
                    } else {
                        this.game.playerMove(-1); // Left
                    }
                } else {
                    // Vertical swipe
                    if (dy > 0) {
                        this.game.manualDrop(); // Down
                    } else {
                        this.game.playerHardDrop(); // Up = Hard drop
                    }
                }
                this.vibrate();
            }
        }, { passive: true });
    }

    /**
     * Setup visibility API for auto-pause
     */
    setupVisibilityAPI() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.game.state === 'PLAYING') {
                this.game.togglePause();
            }
        });

        // Also pause on window blur
        window.addEventListener('blur', () => {
            if (this.game.state === 'PLAYING') {
                this.game.togglePause();
            }
        });
    }

    /**
     * Setup UI button controls (start, restart, etc.)
     */
    setupUIControls() {
        // Prevent touch scrolling/zooming during gameplay
        document.body.addEventListener('touchmove', (e) => {
            if (this.game.state === 'PLAYING') {
                e.preventDefault();
            }
        }, { passive: false });

        // Double-tap prevention
        document.body.addEventListener('touchend', (e) => {
            if (this.game.state === 'PLAYING') {
                e.preventDefault();
            }
        }, { passive: false });
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Controls;
}
