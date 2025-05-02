const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const crypto = require('crypto');
const expressLayouts = require('express-ejs-layouts');

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'layout');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Store active games in memory
const activeGames = {};

// Generate a random game ID
function generateGameId() {
    return crypto.randomBytes(3).toString('hex');
}

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/new-game', (req, res) => {
    res.render('new_game');
});

app.post('/create-game', (req, res) => {
    const initialBoard = req.body.board || Array(81).fill('0');
    
    // Convert the initial board to the new structure
    const board = initialBoard.map(value => ({
        value,
        isStarting: value !== '', // Only mark non-zero cells as starting cells
        editedBy: null
    }));
    
    // Generate a unique game ID
    let gameId = generateGameId();
    while (gameId in activeGames) {
        gameId = generateGameId();
    }
    
    // Store the game state
    activeGames[gameId] = {
        board,
        players: []
    };
    
    res.json({ gameId });
});

app.get('/game/:gameId', (req, res) => {
    const gameId = req.params.gameId;
    if (!activeGames[gameId]) {
        return res.status(404).send('Game not found');
    }
    res.render('game', { gameId, board: activeGames[gameId].board });
});

// Socket.IO events
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('join_game', (data) => {
        const gameId = data.gameId;
        socket.join(gameId);
        io.to(gameId).emit('game_state', { board: activeGames[gameId].board });
    });

    socket.on('cell_update', (data) => {
        const { gameId, cellIndex, value, user = 'anonymous' } = data;
        
        if (activeGames[gameId]) {
            const cell = activeGames[gameId].board[cellIndex];
            // Only allow updates to non-starting cells
            console.log(activeGames[gameId].board,"board");
            if (!cell.isStarting) {
                cell.value = value;
                cell.editedBy = user;
                io.to(gameId).emit('cell_updated', {
                    cellIndex,
                    value,
                    isStarting: cell.isStarting,
                    editedBy: user
                });
            } else {
                console.log(`Cell ${cellIndex} is a starting cell, update rejected`);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 