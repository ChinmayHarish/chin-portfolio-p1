// Tetromino Definitions
// Shapes are defined as 4x4 or 3x3 matrices
const TETROMINOS = {
    I: {
        id: 'I',
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: '#00f0f0', // Cyan
        border: '#00aaaa',
        size: 4
    },
    J: {
        id: 'J',
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#0000f0', // Blue
        border: '#0000aa',
        size: 3
    },
    L: {
        id: 'L',
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#f0a000', // Orange
        border: '#aa7700',
        size: 3
    },
    O: {
        id: 'O',
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#f0f000', // Yellow
        border: '#aaaa00',
        size: 2
    },
    S: {
        id: 'S',
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#00f000', // Green
        border: '#00aa00',
        size: 3
    },
    T: {
        id: 'T',
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#a000f0', // Purple
        border: '#7700aa',
        size: 3
    },
    Z: {
        id: 'Z',
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: '#f00000', // Red
        border: '#aa0000',
        size: 3
    }
};

// SRS (Super Rotation System) Wall Kick Data
// Offsets are [x, y] where +x is right, -y is up (standard Cartesian, but we might need to invert y for screen coords)
// Actually in Tetris grid: +y is Down.
// JLtsz offsets
const KICKS_JLTSZ = {
    '0-1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '1-0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '1-2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '2-1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '2-3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '3-2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '3-0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '0-3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
};

// I offsets (different because 4x4)
const KICKS_I = {
    '0-1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '1-0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '1-2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '2-1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2-3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '3-2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '3-0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '0-3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
};

// O piece doesn't kick (doesn't rotate effectively)
const KICKS_O = {};

function getKickData(type, rotationIndex, direction) {
    // direction: 1 for clockwise, -1 for counter-clockwise
    // rotationIndex: 0=0, 1=90, 2=180, 3=270 (current state BEFORE rotation)

    // Calculate next state
    let nextState = (rotationIndex + direction + 4) % 4;
    let key = `${rotationIndex}-${nextState}`;

    if (type === 'O') return [[0, 0]];
    if (type === 'I') return KICKS_I[key] || [[0, 0]];
    return KICKS_JLTSZ[key] || [[0, 0]];
}
