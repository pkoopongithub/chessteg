"""
Chessteg Core Engine Module - KORRIGIERTE VERSION (Behebt IndexError)
"""

import copy
import sys
import os
from typing import List, Dict, Any, Optional

# Füge den aktuellen Pfad zum Python-Pfad hinzu für relative Imports
sys.path.append(os.path.dirname(__file__))

# Konstanten für bessere Lesbarkeit
WHITE = 1
BLACK = -1
EMPTY = 0
DUMMY = 100

# Figuren-Typen
PAWN = 1
KNIGHT = 4
BISHOP = 3
ROOK = 5
QUEEN = 9
KING = 99

# Figuren-Symbole für die Darstellung (Hier in der Engine, um sie unabhängig zu machen)
PIECE_SYMBOLS = {
    1: '♙',   # Weißer Bauer
    -1: '♟',  # Schwarzer Bauer
    4: '♘',   # Weißer Springer
    -4: '♞',  # Schwarzer Springer
    3: '♗',   # Weißer Läufer
    -3: '♝',  # Schwarzer Läufer
    5: '♖',   # Weißer Turm
    -5: '♜',  # Schwarzer Turm
    9: '♕',   # Weiße Dame
    -9: '♛',  # Schwarze Dame
    99: '♔',  # Weißer König
    -99: '♚', # Schwarzer König
    EMPTY: ' '
}

# Import der Komponenten (relative Imports in einer echten Modulstruktur)
try:
    from move_generation import MoveGenerator
    from evaluation import PositionEvaluator
    from search import SearchAlgorithm
    from rules import ChessRules
except ImportError:
    print("WARNING: Relative imports failed. Using dummy components.")
    class DummyComponent:
        def __init__(self, *args): pass
        def generate_moves(self, *args): return []
        def evaluate_position(self): return 0
        def computer_move(self): return None
        
    MoveGenerator = DummyComponent
    PositionEvaluator = DummyComponent
    SearchAlgorithm = DummyComponent
    ChessRules = DummyComponent


class ChesstegEngine:
    """
    Die zentrale Schach-Engine. Verwaltet den Spielzustand, Figuren und die
    Schnittstellen zu den modularen Komponenten (Züge, Bewertung, Suche, Regeln).
    """

    def __init__(self):
        self.board = [EMPTY] * 120 # 10x12 Array, die Ränder sind DUMMY
        self.pieces: List[Dict[str, Any]] = []
        self.white_turn = True
        self.checkmate = False
        self.stalemate = False
        self.next_piece_id = 1 # Eindeutige ID für jede Figur
        self.move_history: List[Dict[str, Any]] = [] # Speichert vergangene Zustände

        # Komponenten initialisieren
        self.move_generator = MoveGenerator(self)
        self.evaluator = PositionEvaluator(self)
        self.search_algorithm = SearchAlgorithm(self)
        self.rules = ChessRules(self) # Regeln müssen vor initialize_pieces initialisiert werden

        self.initialize_board()
        self.initialize_pieces()
        self.synchronize_board_state()
        
    # =========================================================================
    # ZUSTANDSVERWALTUNG
    # =========================================================================

    def initialize_board(self):
        """Setzt das 120-Felder-Board (10x12) mit DUMMY-Rändern auf."""
        # Alle Felder auf EMPTY setzen
        self.board = [EMPTY] * 120 # Indices 0 bis 119

        # KORREKTUR: Ränder setzen
        # 1. Unterer und oberer vollständiger Rand (Rows 0 und 11, jeweils 10 Felder)
        for i in range(10): # i von 0 bis 9 (10 Iterationen)
            # Row 0 (Indices 0 bis 9)
            self.board[i] = DUMMY
            # Row 11 (Indices 110 bis 119)
            self.board[110 + i] = DUMMY
            
        # 2. Linke und rechte Ränder (Spalten 0 und 9) für Rows 1 bis 10
        for i in range(1, 11): # i von 1 bis 10 (10 Iterationen)
            self.board[i * 10] = DUMMY      # Col 0 (z.B. 10, 20, ..., 100)
            self.board[i * 10 + 9] = DUMMY  # Col 9 (z.B. 19, 29, ..., 109)
            
    def initialize_pieces(self):
        """Setzt die Figuren auf die Standard-Anfangsstellung."""
        self.pieces.clear()
        self.next_piece_id = 1
        
        # Initialisierung der Regeln (für Castling Rights etc.)
        self.rules.__init__(self) 

        # Schwarze Figuren (Reihe 9 und 8) - A8=91 bis H8=98; A7=81 bis H7=88
        self._add_piece(ROOK, BLACK, 91)
        self._add_piece(KNIGHT, BLACK, 92)
        self._add_piece(BISHOP, BLACK, 93)
        self._add_piece(QUEEN, BLACK, 94)
        self._add_piece(KING, BLACK, 95)
        self._add_piece(BISHOP, BLACK, 96)
        self._add_piece(KNIGHT, BLACK, 97)
        self._add_piece(ROOK, BLACK, 98)
        for i in range(81, 89):
            self._add_piece(PAWN, BLACK, i)

        # Weiße Figuren (Reihe 2 und 3) - A1=21 bis H1=28; A2=31 bis H2=38
        for i in range(31, 39):
            self._add_piece(PAWN, WHITE, i)
        self._add_piece(ROOK, WHITE, 21)
        self._add_piece(KNIGHT, WHITE, 22)
        self._add_piece(BISHOP, WHITE, 23)
        self._add_piece(QUEEN, WHITE, 24)
        self._add_piece(KING, WHITE, 25)
        self._add_piece(BISHOP, WHITE, 26)
        self._add_piece(KNIGHT, WHITE, 27)
        self._add_piece(ROOK, WHITE, 28)
        
        self.white_turn = True
        self.checkmate = False
        self.stalemate = False
        self.move_history.clear()
        
        self.synchronize_board_state()

    def _add_piece(self, piece_type: int, color: int, position: int):
        """Fügt dem Figuren-Array eine neue Figur hinzu."""
        piece_value = piece_type * color
        symbol_key = piece_value 
        
        new_piece = {
            'id': self.next_piece_id,
            'type': piece_type,
            'color': color,
            'value': piece_value,
            'position': position,
            'captured': False,
            'has_moved': False, 
            'symbol': PIECE_SYMBOLS.get(symbol_key, '?')
        }
        self.pieces.append(new_piece)
        self.next_piece_id += 1

    def synchronize_board_state(self, silent=False):
        """
        Stellt sicher, dass das 120-Felder-Board den aktuellen Positionen
        im `pieces` Array entspricht.
        """
        # 1. Board resetten (ohne DUMMY-Felder zu überschreiben)
        self.initialize_board()

        # 2. Figuren positionieren
        for piece in self.pieces:
            if not piece['captured']:
                position = piece['position']
                piece_value = piece['value']
                
                if self.is_valid_position(position):
                    self.board[position] = piece_value
                else:
                    if not silent:
                        print(f"WARNUNG: Figur ID {piece['id']} an ungültiger Position {position}")
                    piece['captured'] = True 
        
    def get_piece_at(self, position: int) -> Optional[Dict[str, Any]]:
        """Gibt das Figuren-Objekt an einer 10x10 Position zurück."""
        for piece in self.pieces:
            if not piece['captured'] and piece['position'] == position:
                return piece
        return None

    def get_piece_by_id(self, piece_id: int) -> Optional[Dict[str, Any]]:
        """Gibt das Figuren-Objekt anhand der ID zurück."""
        for piece in self.pieces:
            if piece['id'] == piece_id:
                return piece
        return None

    def get_king(self, color: int) -> Optional[Dict[str, Any]]:
        """Gibt das König-Objekt der angegebenen Farbe zurück."""
        for piece in self.pieces:
            if piece['type'] == KING and piece['color'] == color and not piece['captured']:
                return piece
        return None
        
    def is_valid_position(self, position: int) -> bool:
        """Prüft, ob eine Position innerhalb des 8x8 Spielfeldes liegt (21-98)."""
        if 20 < position < 100:
            col = position % 10
            return 1 <= col <= 8
        return False
        
    # =========================================================================
    # ZUG-AUSFÜHRUNG
    # =========================================================================

    def make_move(self, move: Dict[str, Any]) -> bool:
        """Führt einen Zug aus und aktualisiert den Spielzustand - KORRIGIERTE VERSION"""
        
        # 1. Speichere den aktuellen Zustand vor der Ausführung
        self._save_state()

        # 2. Führe den Zug durch (Figuren-Update)
        piece = self.get_piece_at(move['from_pos'])
        if not piece:
            print(f"❌ Keine Figur auf Startposition {self._position_to_notation(move['from_pos'])}")
            self._restore_state() 
            return False

        # 🚨 NEU: Spezielle Zug-Behandlung VOR der normalen Ausführung
        # Rochade
        if move.get('special_type') == 'castling':
            return self._execute_castling_move(move, piece)
        
        # En Passant
        if move.get('special_type') == 'en_passant':
            return self._execute_en_passant_move(move, piece)
        
        # Bauernumwandlung
        if move.get('promotion_piece'):
            return self._execute_promotion_move(move, piece)

        # Normale Zugausführung
        captured_piece = self.get_piece_at(move['to_pos'])
        if captured_piece:
            captured_piece['captured'] = True
            move['captured_piece_id'] = captured_piece['id']
        else:
            move['captured_piece_id'] = None
            
        # Figur an Zielposition bewegen
        piece['position'] = move['to_pos']
        piece['has_moved'] = True 

        # 3. Spezielle Regeln ausführen
        if hasattr(self.rules, 'process_move'):
            self.rules.process_move(move, piece, captured_piece)

        # 4. Board und Zustand synchronisieren
        self.synchronize_board_state()
        self.white_turn = not self.white_turn
        
        # 5. Prüfe auf Schachmatt/Patt
        self._check_game_end()

        return True

    def _execute_castling_move(self, move: Dict[str, Any], king: Dict[str, Any]) -> bool:
        """Führt Rochade aus"""
        rook = self.get_piece_by_id(move['rook_id'])
        if not rook:
            return False
            
        # Bewege König
        king['position'] = move['to_pos']
        king['has_moved'] = True
        
        # Bewege Turm  
        rook['position'] = move['rook_to']
        rook['has_moved'] = True
        
        # Rochaderechte aktualisieren
        self.rules._revoke_castling_rights(king['color'])
        
        self.synchronize_board_state()
        self.white_turn = not self.white_turn
        self._check_game_end()
        return True

    def _execute_en_passant_move(self, move: Dict[str, Any], pawn: Dict[str, Any]) -> bool:
        """Führt en Passant aus"""
        # Bewege Bauer
        pawn['position'] = move['to_pos']
        
        # Schlage gegnerischen Bauer
        captured_pawn_pos = move['capture_pos']
        captured_pawn = self.get_piece_at(captured_pawn_pos)
        if captured_pawn:
            captured_pawn['captured'] = True
            move['captured_piece_id'] = captured_pawn['id']
        
        self.synchronize_board_state()
        self.white_turn = not self.white_turn
        self._check_game_end()
        return True

    def _execute_promotion_move(self, move: Dict[str, Any], pawn: Dict[str, Any]) -> bool:
        """Führt Bauernumwandlung aus"""
        # Normale Bewegung
        captured_piece = self.get_piece_at(move['to_pos'])
        if captured_piece:
            captured_piece['captured'] = True
            move['captured_piece_id'] = captured_piece['id']
        
        # Bewege Bauer zur Umwandlungsposition
        pawn['position'] = move['to_pos']
        
        # Umwandlung durchführen
        promotion_piece_type = move['promotion_piece']
        pawn['type'] = promotion_piece_type
        pawn['value'] = promotion_piece_type * pawn['color']
        pawn['symbol'] = PIECE_SYMBOLS.get(pawn['value'], '?')
        
        self.synchronize_board_state()
        self.white_turn = not self.white_turn
        self._check_game_end()
        return True

    def undo_move(self) -> bool:
        """Macht den letzten Zug rückgängig."""
        if not self.move_history:
            return False

        # Lade den vorherigen Zustand
        previous_state = self.move_history.pop()
        
        self.pieces = previous_state['pieces']
        self.white_turn = previous_state['white_turn']
        self.checkmate = previous_state['checkmate']
        self.stalemate = previous_state['stalemate']
        self.next_piece_id = previous_state['next_piece_id']
        
        # Lade den Zustand der Regeln
        self.rules.en_passant_target = previous_state['rules']['en_passant_target']
        self.rules.castling_rights = previous_state['rules']['castling_rights']
        
        self.synchronize_board_state()
        return True

    def _save_state(self):
        """Speichert den aktuellen Spielzustand in der Historie."""
        current_state = {
            'pieces': copy.deepcopy(self.pieces),
            'white_turn': self.white_turn,
            'checkmate': self.checkmate,
            'stalemate': self.stalemate,
            'next_piece_id': self.next_piece_id,
            'rules': {
                'en_passant_target': self.rules.en_passant_target,
                'castling_rights': copy.deepcopy(self.rules.castling_rights)
            }
        }
        self.move_history.append(current_state)

    def _restore_state(self):
        """Stellt den Zustand aus dem letzten Eintrag in der Historie wieder her."""
        if self.move_history:
            self.pieces = self.move_history[-1]['pieces']
            self.white_turn = self.move_history[-1]['white_turn']
            self.checkmate = self.move_history[-1]['checkmate']
            self.stalemate = self.move_history[-1]['stalemate']
            self.next_piece_id = self.move_history[-1]['next_piece_id']
            self.rules.en_passant_target = self.move_history[-1]['rules']['en_passant_target']
            self.rules.castling_rights = self.move_history[-1]['rules']['castling_rights']
            self.synchronize_board_state()

    # =========================================================================
    # SCHACH/MATT/PATT-PRÜFUNG
    # =========================================================================
    
    def generate_all_moves(self, color: int) -> List[Dict[str, Any]]:
        """Generiert alle legalen Züge für die angegebene Farbe."""
        # Aufruf der korrigierten Methode im MoveGenerator
        return self.move_generator.generate_moves(color)

    def is_king_in_check(self, color: int) -> bool:
        """Prüft, ob der König der gegebenen Farbe im Schach steht."""
        king = self.get_king(color)
        if not king:
            return False 
            
        opponent_color = BLACK if color == WHITE else WHITE
        
        return self.move_generator.is_square_attacked(king['position'], opponent_color)
        
    def _check_game_end(self):
        """Prüft, ob die aktuelle Stellung Schachmatt oder Patt ist."""
        color = WHITE if self.white_turn else BLACK
        
        legal_moves = self.generate_all_moves(color)
        
        if not legal_moves:
            if self.is_king_in_check(color):
                self.checkmate = True
                self.stalemate = False
            else:
                self.checkmate = False
                self.stalemate = True
        else:
            self.checkmate = False
            self.stalemate = False

    def is_game_over(self) -> bool:
        """Prüft, ob das Spiel beendet ist."""
        return self.checkmate or self.stalemate

    def take_snapshot(self):
        """Erstellt eine Momentaufnahme des aktuellen Zustands."""
        return {
            'pieces': copy.deepcopy(self.pieces),
            'white_turn': self.white_turn,
            'checkmate': self.checkmate,
            'stalemate': self.stalemate,
            'board': self.board.copy()
        }

    def restore_snapshot(self, snapshot):
        """Stellt einen Zustand aus einer Momentaufnahme wieder her."""
        self.pieces = snapshot['pieces']
        self.white_turn = snapshot['white_turn']
        self.checkmate = snapshot['checkmate']
        self.stalemate = snapshot['stalemate']
        self.board = snapshot['board']

    def _apply_move_internal(self, move):
        """Wendet einen Zug an, ohne den Spielzustand vollständig zu ändern (für Suchalgorithmus)."""
        piece = self.get_piece_by_id(move['piece_id'])
        if not piece:
            return
            
        # Alte Position leeren
        self.board[piece['position']] = EMPTY
        
        # Geschlagene Figur entfernen
        if move.get('capture_pos'):
            captured_piece = self.get_piece_at(move['capture_pos'])
            if captured_piece:
                captured_piece['captured'] = True
                self.board[move['capture_pos']] = EMPTY
        
        # Figur bewegen
        piece['position'] = move['to_pos']
        self.board[move['to_pos']] = piece['value']
        
        # Promotion behandeln
        if move.get('promotion_piece'):
            piece['type'] = move['promotion_piece']
            piece['value'] = move['promotion_piece'] * piece['color']
            piece['symbol'] = PIECE_SYMBOLS.get(piece['value'], '?')

    # =========================================================================
    # HILFSFUNKTIONEN (NOTATION)
    # =========================================================================

    def _position_to_notation(self, position: int) -> str:
        """Konvertiert interne Position zu algebraischer Notation"""
        files = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', '']
        row = position // 10
        file = position % 10
        if 1 <= file <= 8 and 2 <= row <= 9:
            return f"{files[file]}{row - 1}"
        return "??"

    # =========================================================================
    # EDITOR-FUNKTIONEN
    # =========================================================================

    def editor_place_piece(self, piece_type: int, color: int, position: int) -> bool:
        """Platziert eine Figur auf einem Feld (Editor-Funktion)"""
        if not self.is_valid_position(position):
            return False
        
        # Entferne existierende Figur
        existing_piece = self.get_piece_at(position)
        if existing_piece:
            existing_piece['captured'] = True
        
        # Füge neue Figur hinzu (verwendet _add_piece mit neuer ID)
        self._add_piece(piece_type, color, position)
        
        # Synchronisiere das Board, um die neue Figur anzuzeigen
        self.synchronize_board_state(silent=True)
        return True
    
    def editor_remove_piece(self, position):
        """Entfernt eine Figur vom Brett (Editor-Funktion)"""
        piece = self.get_piece_at(position)
        if piece:
            piece['captured'] = True
            self.synchronize_board_state(silent=True)
            return True
        
        return False
    
    def editor_clear_board(self):
        """Entfernt alle Figuren vom Brett"""
        for piece in self.pieces:
            piece['captured'] = True
        self.synchronize_board_state(silent=True)
    
    def editor_standard_position(self):
        """Setzt die Standard-Anfangsstellung"""
        self.initialize_pieces()