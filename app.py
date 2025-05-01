from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
import random
import string

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'  # Change this in production
socketio = SocketIO(app, async_mode='threading')

# Store active games in memory (in a real app, use a database)
active_games = {}

def generate_game_id():
    return ''.join(random.choices(string.digits, k=6))

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/new-game')
def new_game():
    return render_template('new_game.html')

@app.route('/create-game', methods=['POST'])
def create_game():
    data = request.get_json()
    initial_board = data.get('board', ['0'] * 81)
    
    # Convert the initial board to the new structure
    board = []
    for value in initial_board:
        board.append({
            'value': value,
            'is_starting': value != '0',  # True if the cell had a value at start
            'edited_by': None  # Will store the user who edited the cell
        })
    
    # Generate a unique game ID
    game_id = generate_game_id()
    while game_id in active_games:
        game_id = generate_game_id()
    
    # Store the game state
    active_games[game_id] = {
        'board': board,
        'players': []
    }
    
    return jsonify({'game_id': game_id})

@app.route('/game/<game_id>')
def game(game_id):
    if game_id not in active_games:
        return "Game not found", 404
    return render_template('game.html', game_id=game_id, board=active_games[game_id]['board'])

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('join_game')
def handle_join_game(data):
    game_id = data['game_id']
    join_room(game_id)
    emit('game_state', {'board': active_games[game_id]['board']}, room=game_id)

@socketio.on('cell_update')
def handle_cell_update(data):
    print(data)
    game_id = data['game_id']
    cell_index = int(data['cell_index'])
    value = data['value']
    user = data.get('user', 'anonymous')  # Get the user who made the change
    
    if game_id in active_games:
        cell = active_games[game_id]['board'][cell_index]
        # Only allow updates to non-starting cells
        if not cell['is_starting']:
            cell['value'] = value
            cell['edited_by'] = user
            emit('cell_updated', {
                'cell_index': cell_index,
                'value': value,
                'is_starting': cell['is_starting'],
                'edited_by': user
            }, room=game_id)

if __name__ == '__main__':
    socketio.run(app, debug=True) 