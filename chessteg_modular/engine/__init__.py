"""
Chessteg Engine Module - KORRIGIERTE VERSION
"""

# =============================================================================
# KONSTANTEN
# =============================================================================
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

PIECE_SYMBOLS = {
    'wP': '♙', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wQ': '♕', 'wK': '♔',
    'bP': '♟', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bQ': '♛', 'bK': '♚'
}

PIECE_VALUES = {
    PAWN: 100, KNIGHT: 320, BISHOP: 330, ROOK: 500, QUEEN: 900, KING: 20000
}

# =============================================================================
# MODUL-IMPORTS - KEIN EXCEPTION HANDLING MEHR
# =============================================================================
from .core import ChesstegEngine
from .move_generation import MoveGenerator
from .evaluation import PositionEvaluator
from .search import SearchAlgorithm
from .rules import ChessRules

# =============================================================================
# ÖFFENTLICHE SCHNITTSTELLE
# =============================================================================
__all__ = [
    'ChesstegEngine', 'MoveGenerator', 'PositionEvaluator', 
    'SearchAlgorithm', 'ChessRules', 'WHITE', 'BLACK', 'EMPTY', 'DUMMY', 
    'PAWN', 'BISHOP', 'KNIGHT', 'ROOK', 'QUEEN', 'KING',
    'PIECE_SYMBOLS', 'PIECE_VALUES'
]

# =============================================================================
# HILFSFUNKTIONEN
# =============================================================================
def get_piece_name(piece_value):
    if piece_value == EMPTY: return "Empty"
    if piece_value == DUMMY: return "Dummy"
    color = 'White' if piece_value > 0 else 'Black'
    piece_type = abs(piece_value)
    names = {PAWN: 'Pawn', ROOK: 'Rook', BISHOP: 'Bishop', 
             KNIGHT: 'Knight', QUEEN: 'Queen', KING: 'King'}
    return f"{color} {names.get(piece_type, 'Unknown')}"

def get_piece_code(piece_value):
    if piece_value == EMPTY or piece_value == DUMMY: return None
    color = 'w' if piece_value > 0 else 'b'
    piece_type = abs(piece_value)
    types = {PAWN: 'P', ROOK: 'R', BISHOP: 'B', KNIGHT: 'N', QUEEN: 'Q', KING: 'K'}
    return color + types.get(piece_type, '?')

def position_to_notation(position):
    files = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', '']
    row = position // 10
    file = position % 10
    if 1 <= file <= 8 and 2 <= row <= 9:
        return f"{files[file]}{row - 1}"
    return "??"

def notation_to_position(notation):
    if len(notation) != 2: return None
    file_char = notation[0].lower()
    rank_char = notation[1]
    files = {'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5, 'f': 6, 'g': 7, 'h': 8}
    if file_char in files and rank_char.isdigit():
        file = files[file_char]
        rank = int(rank_char) + 1
        return rank * 10 + file
    return None

print("✅ Chessteg Engine Module MIT VOLLSTÄNDIGEN MODULEN geladen")