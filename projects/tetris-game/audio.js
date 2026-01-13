class AudioController {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.oscillator = null;
        this.gainNode = null;
        this.musicNode = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.error('Web Audio API not supported', e);
        }
    }

    play(soundName) {
        if (this.muted || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        switch (soundName) {
            case 'move':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(50, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'rotate':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(600, now + 0.05);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;

            case 'drop': // Hard drop
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;

            case 'land':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(100, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'clear':
                osc.type = 'square';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(800, now + 0.1);
                osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;

            case 'tetris':
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
                osc.frequency.linearRampToValueAtTime(1800, now + 0.2);
                osc.frequency.linearRampToValueAtTime(2400, now + 0.3);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;

            case 'levelup':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(800, now + 0.2);
                osc.frequency.linearRampToValueAtTime(1200, now + 0.4);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
                osc.start(now);
                osc.stop(now + 0.6);
                break;

            case 'gameover':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(50, now + 1.0);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 1.0);
                osc.start(now);
                osc.stop(now + 1.0);
                break;
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopMusic();
        } else {
            // If game is active, resume music? 
            // Ideally we need game state to know, but for now we just toggle flag.
            // The game loop calls startMusic() on start.
            // If we unmute in middle of game, we might want to restart music.
            // Simple fix: if not muted and music was supposed to be playing...
            // Let's just return status and let user re-trigger or wait for next loop?
            // Actually, simplest is just mute the master gain if we had one.
            // Since we create nodes per sound, global mute flag works for SFX.
            // For music, we need to stop/start the sequencer.
        }
        return this.muted;
    }

    startMusic() {
        if (this.muted || this.musicTimer) return;
        this.musicIndex = 0;
        this.playNextNote();
    }

    stopMusic() {
        clearTimeout(this.musicTimer);
        this.musicTimer = null;
    }

    playNextNote() {
        if (this.muted) return;

        // Simple Korobeiniki (Tetris Theme A) snippet
        // Notes: E5, B4, C5, D5, C5, B4, A4, A4, C5, E5, D5, C5, B4, C5, D5, E5, C5, A4, A4...
        // Frequencies approx: E5=659, B4=493, C5=523, D5=587, A4=440
        const melody = [
            { f: 659, d: 400 }, { f: 493, d: 200 }, { f: 523, d: 200 }, { f: 587, d: 400 }, { f: 523, d: 200 }, { f: 493, d: 200 },
            { f: 440, d: 400 }, { f: 440, d: 200 }, { f: 523, d: 200 }, { f: 659, d: 400 }, { f: 587, d: 200 }, { f: 523, d: 200 },
            { f: 493, d: 600 }, { f: 523, d: 200 }, { f: 587, d: 400 }, { f: 659, d: 400 },
            { f: 523, d: 400 }, { f: 440, d: 400 }, { f: 440, d: 400 }, { f: 0, d: 400 } // Rest
        ];

        const note = melody[this.musicIndex % melody.length];

        if (note.f > 0 && this.ctx) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = note.f;
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + note.d / 1000 - 0.05);
            osc.start();
            osc.stop(this.ctx.currentTime + note.d / 1000);
        }

        this.musicIndex++;
        this.musicTimer = setTimeout(() => this.playNextNote(), note.d);
    }
}

const audioManager = new AudioController();
