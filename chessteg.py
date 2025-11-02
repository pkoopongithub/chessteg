import copy
from typing import List, Tuple, Optional, Dict, Any
import math
import time

# Konstanten
WHITE = 1
BLACK = -1
EMPTY = 0
DUMMY = 100
PAWN = 1
BISHOP = 3
KNIGHT = 4
ROOK = 5
QUEEN = 9
KING = 99

class ChesstegEngine:
    def __init__(self):
        self.board = self.initialize_board()
        self.pieces = []
        self.white_turn = True
        self.evaluation = 0
        self.checkmate = False
        self.stalemate = False
        self.last_move = None
        self.move_history = []
        
        # KI-Einstellungen
        self.ai_settings = {
            'search_depth': 3,
            'extended_evaluation': True,
            'quiescence_search': True,
            'quiescence_depth': 2,
            'timeout_ms': 8000
        }
        
        # Bewertungstabellen
        self.evaluation_table = {
            'material': {
                PAWN: 100,
                KNIGHT: 320,
                BISHOP: 330,
                ROOK: 500,
                QUEEN: 900,
                KING: 20000
            },
            
            'position': {
                PAWN: [
                    [0,   0,   0,   0,   0,   0,   0,   0],
                    [50,  50,  50,  50,  50,  50,  50,  50],
                    [10,  10,  20,  30,  30,  20,  10,  10],
                    [5,   5,  10,  25,  25,  10,   5,   5],
                    [0,   0,   0,  20,  20,   0,   0,   0],
                    [5,  -5, -10,   0,   0, -10,  -5,   5],
                    [5,  10,  10, -20, -20,  10,  10,   5],
                    [0,   0,   0,   0,   0,   0,   0,   0]
                ],
                
                KNIGHT: [
                    [-50, -40, -30, -30, -30, -30, -40, -50],
                    [-40, -20,   0,   5,   5,   0, -20, -40],
                    [-30,   5,  10,  15,  15,  10,   5, -30],
                    [-30,   0,  15,  20,  20,  15,   0, -30],
                    [-30,   5,  15,  20,  20,  15,   5, -30],
                    [-30,   0,  10,  15,  15,  10,   0, -30],
                    [-40, -20,   0,   0,   0,   0, -20, -40],
                    [-50, -40, -30, -30, -30, -30, -40, -50]
                ],
                
                BISHOP: [
                    [-20, -10, -10, -10, -10, -10, -10, -20],
                    [-10,   0,   0,   0,   0,   0,   0, -10],
                    [-10,   0,   5,  10,  10,   5,   0, -10],
                    [-10,   5,   5,  10,  10,   5,   5, -10],
                    [-10,   0,  10,  10,  10,  10,   0, -10],
                    [-10,  10,  10,  10,  10,  10,  10, -10],
                    [-10,   5,   0,   0,   0,   0,   5, -10],
                    [-20, -10, -10, -10, -10, -10, -10, -20]
                ],
                
                ROOK: [
                    [0,   0,   0,   5,   5,   0,   0,   0],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [5,  10,  10,  10,  10,  10,  10,   5],
                    [0,   0,   0,   0,   0,   0,   0,   0]
                ],
                
                QUEEN: [
                    [-20, -10, -10, -5, -5, -10, -10, -20],
                    [-10,   0,   5,  0,  0,   0,   0, -10],
                    [-10,   5,   5,  5,  5,   5,   0, -10],
                    [0,     0,   5,  5,  5,   5,   0,  -5],
                    [-5,    0,   5,  5,  5,   5,   0,  -5],
                    [-10,   0,   5,  5,  5,   5,   0, -10],
                    [-10,   0,   0,  0,  0,   0,   0, -10],
                    [-20, -10, -10, -5, -5, -10, -10, -20]
                ],
                
                KING: [
                    [20,  30,  10,   0,   0,  10,  30,  20],
                    [20,  20,   0,   0,   0,   0,  20,  20],
                    [-10, -20, -20, -20, -20, -20, -20, -10],
                    [-20, -30, -30, -40, -40, -30, -30, -20],
                    [-30, -40, -40, -50, -50, -40, -40, -30],
                    [-30, -40, -40, -50, -50, -40, -40, -30],
                    [-30, -40, -40, -50, -50, -40, -40, -30],
                    [-30, -40, -40, -50, -50, -40, -40, -30]
                ]
            }
        }

        self.move_counter = 0
        self.node_counter = 0
        self.calculation_start_time = 0
        
        self.initialize_pieces()

    def initialize_board(self):
        board = [DUMMY] * 120
        for row in range(2, 10):
            for col in range(1, 9):
                board[row * 10 + col] = EMPTY
        return board

    def add_piece(self, piece_type, color, position):
        self.pieces.append({'type': piece_type, 'color': color, 'pos': position, 'captured': False})
        self.board[position] = piece_type * color

    def initialize_pieces(self):
        self.pieces = []
        # Könige
        self.add_piece(KING, BLACK, 95)
        self.add_piece(KING, WHITE, 25)
        # Damen
        self.add_piece(QUEEN, BLACK, 94)
        self.add_piece(QUEEN, WHITE, 24)
        # Türme
        self.add_piece(ROOK, BLACK, 91)
        self.add_piece(ROOK, BLACK, 98)
        self.add_piece(ROOK, WHITE, 21)
        self.add_piece(ROOK, WHITE, 28)
        # Springer
        self.add_piece(KNIGHT, BLACK, 92)
        self.add_piece(KNIGHT, BLACK, 97)
        self.add_piece(KNIGHT, WHITE, 22)
        self.add_piece(KNIGHT, WHITE, 27)
        # Läufer
        self.add_piece(BISHOP, BLACK, 93)
        self.add_piece(BISHOP, BLACK, 96)
        self.add_piece(BISHOP, WHITE, 23)
        self.add_piece(BISHOP, WHITE, 26)
        # Bauern
        for i in range(1, 9):
            self.add_piece(PAWN, BLACK, 80 + i)
            self.add_piece(PAWN, WHITE, 30 + i)

    def is_opponent(self, color, field_value):
        if field_value == EMPTY or field_value == DUMMY:
            return False
        return (color > 0 and field_value < 0) or (color < 0 and field_value > 0)

    def generate_moves(self, color):
        all_moves = []
        
        for piece in self.pieces:
            if not piece['captured'] and piece['color'] == color:
                piece_moves = self.generate_piece_moves(piece)
                all_moves.extend(piece_moves)
        
        return [move for move in all_moves if self.is_move_legal(move)]

    def generate_piece_moves(self, piece):
        piece_type = piece['type']
        if piece_type == ROOK:
            return self.generate_rook_moves(piece)
        elif piece_type == BISHOP:
            return self.generate_bishop_moves(piece)
        elif piece_type == QUEEN:
            return self.generate_queen_moves(piece)
        elif piece_type == KNIGHT:
            return self.generate_knight_moves(piece)
        elif piece_type == KING:
            return self.generate_king_moves(piece)
        elif piece_type == PAWN:
            return self.generate_pawn_moves(piece)
        else:
            return []

    def generate_rook_moves(self, piece):
        moves = []
        directions = [1, -1, 10, -10]
        
        for direction in directions:
            field = piece['pos'] + direction
            
            while self.board[field] != DUMMY:
                if self.board[field] == EMPTY:
                    moves.append(self.create_move(piece, field))
                else:
                    if self.is_opponent(piece['color'], self.board[field]):
                        moves.append(self.create_move(piece, field, True))
                    break
                field += direction
        return moves

    def generate_bishop_moves(self, piece):
        moves = []
        directions = [9, 11, -9, -11]
        
        for direction in directions:
            field = piece['pos'] + direction
            
            while self.board[field] != DUMMY:
                if self.board[field] == EMPTY:
                    moves.append(self.create_move(piece, field))
                else:
                    if self.is_opponent(piece['color'], self.board[field]):
                        moves.append(self.create_move(piece, field, True))
                    break
                field += direction
        return moves

    def generate_queen_moves(self, piece):
        return self.generate_rook_moves(piece) + self.generate_bishop_moves(piece)

    def generate_knight_moves(self, piece):
        moves = []
        knight_moves = [8, 12, 19, 21, -8, -12, -19, -21]
        
        for move in knight_moves:
            field = piece['pos'] + move
            if self.board[field] != DUMMY:
                if self.board[field] == EMPTY:
                    moves.append(self.create_move(piece, field))
                elif self.is_opponent(piece['color'], self.board[field]):
                    moves.append(self.create_move(piece, field, True))
        return moves

    def generate_king_moves(self, piece):
        moves = []
        king_moves = [1, -1, 10, -10, 9, 11, -9, -11]
        
        for move in king_moves:
            field = piece['pos'] + move
            if self.board[field] != DUMMY:
                if self.board[field] == EMPTY:
                    moves.append(self.create_move(piece, field))
                elif self.is_opponent(piece['color'], self.board[field]):
                    moves.append(self.create_move(piece, field, True))
        return moves

    def generate_pawn_moves(self, piece):
        moves = []
        forward = 10 if piece['color'] == WHITE else -10
        start_row = 3 if piece['color'] == WHITE else 8
        current_row = piece['pos'] // 10

        # Ein Feld vorwärts
        field = piece['pos'] + forward
        if self.board[field] == EMPTY:
            moves.append(self.create_move(piece, field))
            
            # Zwei Felder vorwärts von Startposition
            if current_row == start_row:
                double_field = field + forward
                if self.board[double_field] == EMPTY:
                    moves.append(self.create_move(piece, double_field))

        # Schlagen
        for side in [forward + 1, forward - 1]:
            field = piece['pos'] + side
            if self.board[field] != DUMMY and self.board[field] != EMPTY:
                if self.is_opponent(piece['color'], self.board[field]):
                    moves.append(self.create_move(piece, field, True))

        return moves

    def create_move(self, piece, target_pos, is_capture=False):
        captured_piece = self.find_captured_piece(target_pos) if is_capture else None
        return {
            'from_pos': piece['pos'],
            'to_pos': target_pos,
            'type': piece['type'],
            'color': piece['color'],
            'captured': captured_piece
        }

    def is_move_legal(self, move):
        if move['from_pos'] == move['to_pos']:
            return False
        
        if self.board[move['from_pos']] == EMPTY or self.board[move['from_pos']] == DUMMY:
            return False
        
        piece_value = self.board[move['from_pos']]
        is_white_turn = self.white_turn
        
        if ((is_white_turn and piece_value < 0) or 
            (not is_white_turn and piece_value > 0)):
            return False
        
        target_value = self.board[move['to_pos']]
        if target_value != EMPTY and target_value != DUMMY:
            if ((is_white_turn and target_value > 0) or 
                (not is_white_turn and target_value < 0)):
                return False

        # Schach-Prüfung
        original_board = self.board.copy()
        original_pieces = copy.deepcopy(self.pieces)

        # Temporären Zug ausführen
        self.board[move['from_pos']] = EMPTY
        self.board[move['to_pos']] = move['type'] * move['color']
        
        moving_piece = next((p for p in self.pieces 
                           if p['pos'] == move['from_pos'] and 
                           not p['captured'] and p['color'] == move['color']), None)

        if moving_piece:
            original_pos = moving_piece['pos']
            moving_piece['pos'] = move['to_pos']
            
            if move['captured']:
                captured_piece_temp = next((p for p in self.pieces 
                                          if p['pos'] == move['to_pos'] and 
                                          not p['captured'] and p['color'] == -move['color']), None)
                if captured_piece_temp:
                    captured_piece_temp['captured'] = True
        
            in_check = self.is_king_in_check(move['color'])
        
            # Zustand wiederherstellen
            self.board = original_board
            self.pieces = original_pieces
            
            return not in_check
        
        # Fallback
        self.board = original_board
        self.pieces = original_pieces
        return False

    def find_captured_piece(self, position):
        return next((p for p in self.pieces 
                   if p['pos'] == position and not p['captured'] and 
                   ((self.white_turn and p['color'] == BLACK) or 
                    (not self.white_turn and p['color'] == WHITE))), None)

    def execute_move(self, move):
        if not self.is_move_legal(move):
            print(f"Move is not legal: {self.move_to_notation(move)}")
            return False

        self.board[move['from_pos']] = EMPTY
        self.board[move['to_pos']] = move['type'] * move['color']

        piece = next((p for p in self.pieces 
                     if p['pos'] == move['from_pos'] and 
                     not p['captured'] and p['color'] == move['color']), None)
        
        if piece:
            piece['pos'] = move['to_pos']
            
            if move['captured']:
                captured = next((p for p in self.pieces 
                               if p['pos'] == move['to_pos'] and 
                               not p['captured'] and p['color'] == -move['color']), None)
                if captured:
                    captured['captured'] = True

        self.white_turn = not self.white_turn
        self.last_move = copy.deepcopy(move)
        self.move_history.append(copy.deepcopy(move))
        
        self.check_game_status()
        
        print(f"Move executed: {self.move_to_notation(move)}")
        return True

    def copy_state(self):
        return {
            'board': self.board.copy(),
            'pieces': copy.deepcopy(self.pieces),
            'white_turn': self.white_turn,
            'evaluation': self.evaluation,
            'checkmate': self.checkmate,
            'stalemate': self.stalemate
        }

    def restore_state(self, state):
        self.board = state['board'].copy()
        self.pieces = copy.deepcopy(state['pieces'])
        self.white_turn = state['white_turn']
        self.evaluation = state['evaluation']
        self.checkmate = state['checkmate']
        self.stalemate = state['stalemate']

    def undo_move(self):
        if not self.last_move:
            return False

        move = self.last_move
        
        self.board[move['from_pos']] = move['type'] * move['color']
        self.board[move['to_pos']] = (move['captured']['type'] * move['captured']['color'] 
                                    if move['captured'] else EMPTY)

        piece = next((p for p in self.pieces 
                     if p['pos'] == move['to_pos'] and 
                     not p['captured'] and p['color'] == move['color']), None)
        if piece:
            piece['pos'] = move['from_pos']

        if move['captured']:
            captured = next((p for p in self.pieces 
                           if p['type'] == move['captured']['type'] and 
                           p['color'] == move['captured']['color'] and p['captured']), None)
            if captured:
                captured['captured'] = False
                captured['pos'] = move['to_pos']

        self.white_turn = not self.white_turn
        self.last_move = None
        self.checkmate = False
        self.stalemate = False
        
        return True

    # KI-Funktionen
    def computer_move(self):
        print("=== KI MOVE CALCULATION STARTED ===")
        start_time = time.time()
        self.calculation_start_time = start_time
        self.node_counter = 0
        self.move_counter = 0
        
        current_color = WHITE if self.white_turn else BLACK
        all_moves = self.generate_moves(current_color)
        
        if not all_moves:
            print("No legal moves available")
            return None

        # Eröffnungszug prüfen
        opening_move = self.check_opening_move(all_moves)
        if opening_move:
            print(f"Opening move used: {self.move_to_notation(opening_move)}")
            return opening_move

        # Züge sortieren
        all_moves = self.sort_moves(all_moves, current_color)
        
        # Alpha-Beta-Suche
        best_move = all_moves[0]  # Fallback
        best_evaluation = -math.inf if current_color == WHITE else math.inf
        
        print(f"Searching with depth {self.ai_settings['search_depth']}")
        print(f"Available moves: {len(all_moves)}")
        
        for move in all_moves:
            # Timeout-Check
            if time.time() - start_time > self.ai_settings['timeout_ms'] / 1000:
                print("Timeout - using best move so far")
                break
            
            self.move_counter += 1
            
            state_before_move = self.copy_state()
            self.execute_temp_move(move)
            
            if current_color == WHITE:
                evaluation = self.alpha_beta(
                    self.ai_settings['search_depth'] - 1, 
                    -math.inf, 
                    math.inf, 
                    False,
                    start_time
                )
            else:
                evaluation = self.alpha_beta(
                    self.ai_settings['search_depth'] - 1, 
                    -math.inf, 
                    math.inf, 
                    True,
                    start_time
                )
            
            self.restore_state(state_before_move)
            
            print(f"Move {self.move_counter}: {self.move_to_notation(move)} -> Evaluation: {evaluation}")
            
            if current_color == WHITE:
                if evaluation > best_evaluation:
                    best_evaluation = evaluation
                    best_move = move
            else:
                if evaluation < best_evaluation:
                    best_evaluation = evaluation
                    best_move = move
        
        end_time = time.time()
        print(f"=== KI MOVE CALCULATION COMPLETED ===")
        print(f"Best move: {self.move_to_notation(best_move)}")
        print(f"Evaluation: {best_evaluation}")
        print(f"Calculated nodes: {self.node_counter}")
        print(f"Time needed: {(end_time - start_time) * 1000:.0f}ms")
        
        return best_move

    def alpha_beta(self, depth, alpha, beta, maximizing, start_time):
        # Timeout-Check
        if time.time() - start_time > self.ai_settings['timeout_ms'] / 1000:
            return -10000 if maximizing else 10000
        
        self.node_counter += 1
        
        # Blattknoten oder Endstellung
        if depth == 0:
            if self.ai_settings['quiescence_search']:
                return self.quiescence_search(alpha, beta, maximizing, start_time)
            return self.evaluate_position()
        
        current_color = WHITE if maximizing else BLACK
        moves = self.generate_moves(current_color)
        
        # Terminale Stellungen
        if not moves:
            if self.is_king_in_check(current_color):
                return (-20000 + depth) if maximizing else (20000 - depth)
            return 0
        
        # Züge sortieren
        moves = self.sort_moves(moves, current_color)
        
        if maximizing:
            max_evaluation = -math.inf
            
            for move in moves:
                state_before_move = self.copy_state()
                self.execute_temp_move(move)
                
                evaluation = self.alpha_beta(depth - 1, alpha, beta, False, start_time)
                
                self.restore_state(state_before_move)
                
                max_evaluation = max(max_evaluation, evaluation)
                alpha = max(alpha, evaluation)
                
                if beta <= alpha:
                    break  # Beta-Cutoff
            
            return max_evaluation
        else:
            min_evaluation = math.inf
            
            for move in moves:
                state_before_move = self.copy_state()
                self.execute_temp_move(move)
                
                evaluation = self.alpha_beta(depth - 1, alpha, beta, True, start_time)
                
                self.restore_state(state_before_move)
                
                min_evaluation = min(min_evaluation, evaluation)
                beta = min(beta, evaluation)
                
                if beta <= alpha:
                    break  # Alpha-Cutoff
            
            return min_evaluation

    def quiescence_search(self, alpha, beta, maximizing, start_time):
        stand_evaluation = self.evaluate_position()
        
        if maximizing:
            if stand_evaluation >= beta:
                return beta
            alpha = max(alpha, stand_evaluation)
        else:
            if stand_evaluation <= alpha:
                return alpha
            beta = min(beta, stand_evaluation)
        
        # Nur Schlagzüge generieren
        capture_moves = self.generate_capture_moves(WHITE if maximizing else BLACK)
        
        if not capture_moves:
            return stand_evaluation
        
        # Timeout-Check
        if time.time() - start_time > self.ai_settings['timeout_ms'] / 1000:
            return stand_evaluation
        
        if maximizing:
            for move in capture_moves:
                state_before_move = self.copy_state()
                self.execute_temp_move(move)
                
                evaluation = self.quiescence_search(alpha, beta, False, start_time)
                
                self.restore_state(state_before_move)
                
                alpha = max(alpha, evaluation)
                if beta <= alpha:
                    break
            return alpha
        else:
            for move in capture_moves:
                state_before_move = self.copy_state()
                self.execute_temp_move(move)
                
                evaluation = self.quiescence_search(alpha, beta, True, start_time)
                
                self.restore_state(state_before_move)
                
                beta = min(beta, evaluation)
                if beta <= alpha:
                    break
            return beta

    def sort_moves(self, moves, color):
        def move_key(move):
            # Schlagzüge zuerst
            capture_value = (self.evaluation_table['material'][move['captured']['type']] 
                           if move['captured'] else 0)
            
            # Zentrumszüge bevorzugen
            center_value = self.calculate_center_value(move['to_pos'])
            
            return (-capture_value, -center_value)  # Höhere Werte zuerst
        
        return sorted(moves, key=move_key)

    def check_opening_move(self, moves):
        move_number = len(self.move_history)
        
        # Nur in den ersten 8 Zügen Eröffnungslogik anwenden
        if move_number >= 8:
            return None
        
        # Zentrumsbauern bevorzugen
        center_moves = [move for move in moves 
                       if move['type'] == PAWN and 
                       move['to_pos'] in [44, 45, 54, 55]]
        
        if center_moves:
            return center_moves[0]
        
        # Springer entwickeln
        knight_moves = [move for move in moves 
                       if move['type'] == KNIGHT and 
                       move['to_pos'] in [33, 36, 63, 66]]
        
        if knight_moves:
            return knight_moves[0]
        
        return None

    def calculate_center_value(self, position):
        row, col = self.position_to_coordinates(position)
        center_row = 5.5  # Zwischen Reihe 5 und 6
        center_col = 4.5  # Zwischen Linie 4 und 5
        
        row_distance = abs(row - center_row)
        col_distance = abs(col - center_col)
        
        # Je näher am Zentrum, desto höher der Wert
        return 10 - (row_distance + col_distance)

    def generate_capture_moves(self, color):
        all_moves = self.generate_moves(color)
        return [move for move in all_moves if move['captured'] is not None]

    def evaluate_position(self):
        if self.checkmate:
            return -20000 if self.white_turn else 20000
        
        if self.stalemate:
            return 0
        
        material = 0
        position = 0
        development_advantage = self.calculate_development_advantage()
        center_control = self.calculate_center_control()
        pawn_structure = self.calculate_pawn_structure()
        
        # Material und Positionsbewertung
        for piece in self.pieces:
            if piece['captured']:
                continue
            
            piece_value = self.evaluation_table['material'][piece['type']]
            pos_value = self.calculate_position_value(piece)
            
            if piece['color'] == WHITE:
                material += piece_value
                position += pos_value
            else:
                material -= piece_value
                position -= pos_value
        
        # Verbesserte Gewichtung
        total_evaluation = (
            material + 
            position * 0.1 + 
            development_advantage * 2 + 
            center_control * 1.5 +
            pawn_structure * 0.5
        )
            
        self.evaluation = round(total_evaluation)
        return self.evaluation

    def calculate_position_value(self, piece):
        if not self.ai_settings['extended_evaluation']:
            return 0
        
        board_row, board_col = self.position_to_coordinates(piece['pos'])
        
        row = board_row - 2 if piece['color'] == WHITE else 7 - (board_row - 2)
        col = board_col - 1
        
        row = max(0, min(7, row))
        col = max(0, min(7, col))
        
        return self.evaluation_table['position'][piece['type']][row][col]

    def position_to_coordinates(self, position):
        row = position // 10
        col = position % 10
        return row, col

    def calculate_development_advantage(self):
        advantage = 0
        
        developed_pieces = [piece for piece in self.pieces 
                          if not piece['captured'] and 
                          (piece['type'] == KNIGHT or piece['type'] == BISHOP) and
                          self.is_piece_developed(piece)]
        
        for piece in developed_pieces:
            advantage += 20 if piece['color'] == WHITE else -20
        
        return advantage

    def is_piece_developed(self, piece):
        start_row = 2 if piece['color'] == WHITE else 9
        return piece['pos'] // 10 != start_row

    def calculate_center_control(self):
        center_fields = [44, 45, 54, 55]
        control = 0
        
        for field in center_fields:
            if self.board[field] != EMPTY:
                piece = next((p for p in self.pieces 
                            if p['pos'] == field and not p['captured']), None)
                if piece:
                    # Höhere Werte für stärkere Figuren
                    piece_value = self.evaluation_table['material'][piece['type']] / 100
                    control += piece_value * 5 if piece['color'] == WHITE else -piece_value * 5
        
        return control

    def calculate_pawn_structure(self):
        evaluation = 0
        
        # Doppelbauern bestrafen
        pawns_per_file = {}

        for piece in self.pieces:
            if not piece['captured'] and piece['type'] == PAWN:
                file = piece['pos'] % 10
                key = f"{file}-{piece['color']}"
                pawns_per_file[key] = pawns_per_file.get(key, 0) + 1

        for key, count in pawns_per_file.items():
            if count > 1:
                color = WHITE if key.endswith(str(WHITE)) else BLACK
                evaluation += -20 if color == WHITE else 20
        
        return evaluation

    def move_to_notation(self, move):
        from_pos = self.position_to_notation(move['from_pos'])
        to_pos = self.position_to_notation(move['to_pos'])
        return f"{from_pos}{to_pos}"

    def execute_temp_move(self, move):
        self.board[move['from_pos']] = EMPTY
        self.board[move['to_pos']] = move['type'] * move['color']
        
        piece = next((p for p in self.pieces 
                     if p['pos'] == move['from_pos'] and 
                     not p['captured'] and p['color'] == move['color']), None)
        
        if piece:
            piece['pos'] = move['to_pos']
            
            if move['captured']:
                captured = next((p for p in self.pieces 
                               if p['pos'] == move['to_pos'] and 
                               not p['captured'] and p['color'] == -move['color']), None)
                if captured:
                    captured['captured'] = True

    # Spielregeln
    def is_checkmate(self, color):
        if self.is_king_in_check(color):
            legal_moves = self.generate_moves(color)
            return len(legal_moves) == 0
        return False

    def is_stalemate(self, color):
        if not self.is_king_in_check(color):
            legal_moves = self.generate_moves(color)
            return len(legal_moves) == 0
        return False

    def is_king_in_check(self, color):
        king = next((p for p in self.pieces 
                   if p['type'] == KING and p['color'] == color and not p['captured']), None)
        
        if not king:
            return False

        opponent_color = -color
        
        for piece in self.pieces:
            if piece['captured'] or piece['color'] != opponent_color:
                continue
            
            attack_moves = self.generate_piece_moves(piece)

            for move in attack_moves:
                if move['to_pos'] == king['pos']:
                    return True
        
        return False

    def check_game_status(self):
        current_color = WHITE if self.white_turn else BLACK
        
        if self.is_checkmate(current_color):
            self.checkmate = True
            self.stalemate = False
        elif self.is_stalemate(current_color):
            self.stalemate = True
            self.checkmate = False
        else:
            self.checkmate = False
            self.stalemate = False

    def position_to_notation(self, position):
        files = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', '']
        row = position // 10
        file = position % 10
        return f"{files[file]}{row - 1}"

    def get_piece_name(self, piece_value):
        color = 'White' if piece_value > 0 else 'Black'
        piece_type = abs(piece_value)
        
        names = {
            PAWN: 'Pawn',
            ROOK: 'Rook',
            BISHOP: 'Bishop',
            KNIGHT: 'Knight',
            QUEEN: 'Queen',
            KING: 'King'
        }
        
        return f"{color} {names.get(piece_type, 'Unknown')}"