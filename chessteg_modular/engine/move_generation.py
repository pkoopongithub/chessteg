"""
Chessteg Move Generation Module - KORRIGIERTE VERSION MIT DEBUG
Vollständige Zuggenerierung mit allen Schachregeln
"""

import copy
from typing import List, Dict, Any, Optional

# Konstanten für Figurentypen (aus Core Engine)
PAWN = 1
KNIGHT = 4
BISHOP = 3
ROOK = 5
QUEEN = 9
KING = 99
WHITE = 1
BLACK = -1

# Richtungen für 10x10 Board
DIRECTIONS = {
    'N': 10, 'S': -10, 'E': 1, 'W': -1,
    'NE': 11, 'NW': 9, 'SE': -9, 'SW': -11
}

# Springer-Züge (L-Form)
KNIGHT_MOVES = [21, 19, 12, 8, -8, -12, -19, -21]


class MoveGenerator:
    """
    Vollständige Zuggenerierung für alle Figurentypen inklusive spezieller Regeln
    """
    
    def __init__(self, engine):
        self.engine = engine
    
    def generate_moves(self, color: int) -> List[Dict[str, Any]]:
        """
        Generiert alle legalen Züge für eine Farbe inklusive spezieller Züge
        
        Args:
            color: Farbe (1=weiß, -1=schwarz)
            
        Returns:
            List[Dict]: Liste der legalen Züge
        """
        all_moves = []
        
        for piece in self.engine.pieces:
            if not piece['captured'] and piece['color'] == color:
                piece_moves = self.generate_piece_moves(piece)
                all_moves.extend(piece_moves)
        
        # Spezielle Züge hinzufügen
        special_moves = self._generate_special_moves(color)
        all_moves.extend(special_moves)
        
        # Nur legale Züge zurückgeben (ohne Selbstschach)
        legal_moves = [move for move in all_moves if self.is_move_legal(move)]
        
        # DEBUG: Zeige Anzahl der generierten Züge
        # print(f"Generierte legale Züge für {color}: {len(legal_moves)}")
        
        return legal_moves

    def generate_legal_moves(self, color: int) -> List[Dict[str, Any]]:
        """Generiert legale Züge - Alias für generate_moves für Kompatibilität."""
        return self.generate_moves(color)

    def generate_active_moves(self, color: int) -> List[Dict[str, Any]]:
        """Generiert nur aktive Züge (Schläge) für Quiescence Search."""
        all_moves = self.generate_moves(color)
        active_moves = []
        
        for move in all_moves:
            # Schlagzüge und Bauernumwandlungen als "aktiv" betrachten
            if (move.get('capture_pos') or 
                move.get('special_type') == 'en_passant' or
                move.get('promotion_piece')):
                active_moves.append(move)
        
        return active_moves

    def is_move_legal(self, move: Dict[str, Any]) -> bool:
        """
        Prüft, ob ein Zug legal ist (König nicht im Schach nach dem Zug)
        
        Args:
            move: Der Zug im Diktionär-Format
            
        Returns:
            bool: True wenn der Zug legal ist
        """
        piece_id = move['piece_id']
        piece = self.engine.get_piece_by_id(piece_id)
        
        if not piece:
            return False
            
        color = piece['color']
        
        # Führe den Zug temporär aus
        snapshot = self.engine.take_snapshot()
        
        # Verwende die niedrigstufige Methode, um den Zug durchzuführen,
        # ohne die white_turn-Variable zu ändern.
        self.engine._apply_move_internal(move)
        
        is_legal = not self.engine.is_king_in_check(color)
        
        # Mache den Zug rückgängig
        self.engine.restore_snapshot(snapshot)
        
        return is_legal

    def _generate_special_moves(self, color: int) -> List[Dict[str, Any]]:
        """
        Generiert Rochade und Bauernumwandlungen - KORRIGIERTE VERSION
        """
        special_moves = []
        
        # Rochade-Züge
        rules = self.engine.rules
        
        # Kleine Rochade
        if rules.validate_castling(color, 'kingside'):
            if color == WHITE:
                king_pos = 25  # e1
                king_to = 27   # g1
                rook_pos = 28  # h1  
                rook_to = 26   # f1
            else:
                king_pos = 95  # e8
                king_to = 97   # g8
                rook_pos = 98  # h8
                rook_to = 96   # f8
            
            king = self.engine.get_piece_at(king_pos)
            rook = self.engine.get_piece_at(rook_pos)
            
            if king and king['type'] == KING and rook and rook['type'] == ROOK:
                special_moves.append({
                    'piece_id': king['id'],
                    'piece': king,  # 🚨 WICHTIG: Füge piece-Objekt hinzu
                    'type': KING,   # 🚨 WICHTIG: Explizit setzen
                    'color': color, # 🚨 WICHTIG: Explizit setzen
                    'from_pos': king_pos,
                    'to_pos': king_to,
                    'capture_pos': None,
                    'promotion_piece': None,
                    'special_type': 'castling',
                    'rook_id': rook['id'],
                    'rook_from': rook_pos,
                    'rook_to': rook_to
                })
        
        # Große Rochade
        if rules.validate_castling(color, 'queenside'):
            if color == WHITE:
                king_pos = 25  # e1
                king_to = 23   # c1
                rook_pos = 21  # a1  
                rook_to = 24   # d1
            else:
                king_pos = 95  # e8
                king_to = 93   # c8
                rook_pos = 91  # a8
                rook_to = 94   # d8
                
            king = self.engine.get_piece_at(king_pos)
            rook = self.engine.get_piece_at(rook_pos)
            
            if king and king['type'] == KING and rook and rook['type'] == ROOK:
                special_moves.append({
                    'piece_id': king['id'],
                    'piece': king,  # 🚨 WICHTIG
                    'type': KING,   # 🚨 WICHTIG  
                    'color': color, # 🚨 WICHTIG
                    'from_pos': king_pos,
                    'to_pos': king_to,
                    'capture_pos': None,
                    'promotion_piece': None,
                    'special_type': 'castling',
                    'rook_id': rook['id'],
                    'rook_from': rook_pos,
                    'rook_to': rook_to
                })
        
        return special_moves

    def generate_piece_moves(self, piece: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generiert alle möglichen Züge für eine einzelne Figur (ohne Legalitätsprüfung)
        """
        piece_type = piece['type']
        
        if piece_type == PAWN:
            return self._generate_pawn_moves(piece)
        elif piece_type == ROOK:
            return self._generate_sliding_moves(piece, ['N', 'S', 'E', 'W'])
        elif piece_type == BISHOP:
            return self._generate_sliding_moves(piece, ['NE', 'NW', 'SE', 'SW'])
        elif piece_type == QUEEN:
            return self._generate_sliding_moves(piece, list(DIRECTIONS.keys()))
        elif piece_type == KNIGHT:
            return self._generate_knight_moves(piece)
        elif piece_type == KING:
            return self._generate_king_moves(piece)
            
        return []

    def _create_move(self, piece: Dict[str, Any], to_pos: int, capture_pos: Optional[int] = None, 
                    special_type: Optional[str] = None, promotion_piece: Optional[int] = None) -> Dict[str, Any]:
        """
        Erstellt ein standardisiertes Zug-Diktionär - KORRIGIERTE VERSION
        """
        move_dict = {
            'piece_id': piece['id'],
            'piece': piece,
            'type': piece['type'],        # 🚨 KRITISCH: Figurentyp
            'color': piece['color'],      # 🚨 KRITISCH: Farbe
            'from_pos': piece['position'],
            'to_pos': to_pos,
            'capture_pos': capture_pos,
            'promotion_piece': promotion_piece,
            'special_type': special_type
        }
        
        # Markiere Schlagzüge für Move Ordering
        if capture_pos is not None:
            move_dict['is_capture'] = True
            
        # 🚨 NEU: Setze promotion_type falls promotion_piece vorhanden
        if promotion_piece is not None:
            move_dict['promotion_type'] = promotion_piece
            
        return move_dict

    def _generate_pawn_moves(self, pawn: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generiert Züge für einen Bauern
        """
        moves = []
        color = pawn['color']
        start_pos = pawn['position']
        
        # Die Richtung, in die der Bauer zieht
        forward = DIRECTIONS['N'] * color
        
        # Position der 1. und 2. Reihe (bezogen auf das 10x10 Board)
        # Die 1. Reihe (aus Benutzersicht) ist die Reihe 2, die 8. Reihe ist die Reihe 9.
        # Weiße Bauern starten auf Reihe 3 (31-38), Schwarze auf Reihe 8 (81-88).
        start_row = 3 if color == WHITE else 8

        # =========================================================================
        # 1. Vorwärtszug (Ein Feld)
        # =========================================================================
        one_step = start_pos + forward
        if self.engine.get_piece_at(one_step) is None:
            
            # KORREKTUR: Eigene Implementierung für Promotions-Prüfung
            if self._is_promotion_rank(one_step, color):
                # Füge alle Promotion-Züge (Dame, Turm, Läufer, Springer) hinzu
                for p_type in [QUEEN, ROOK, BISHOP, KNIGHT]:
                    moves.append(self._create_move(pawn, one_step, promotion_piece=p_type))
            else:
                moves.append(self._create_move(pawn, one_step))

                # =========================================================================
                # 2. Vorwärtszug (Zwei Felder)
                # =========================================================================
                if pawn['position'] // 10 == start_row:
                    two_step = start_pos + 2 * forward
                    if self.engine.get_piece_at(two_step) is None:
                        moves.append(self._create_move(pawn, two_step, special_type='double_pawn_push'))

        # =========================================================================
        # 3. Schlagzüge (Diagonal)
        # =========================================================================
        capture_dirs = [forward + DIRECTIONS['E'], forward + DIRECTIONS['W']]
        
        for capture_dir in capture_dirs:
            target_pos = start_pos + capture_dir
            if not self.engine.is_valid_position(target_pos):
                continue
                
            target_piece = self.engine.get_piece_at(target_pos)
            
            # Normaler Schlagzug
            if target_piece and target_piece['color'] != color:
                if self._is_promotion_rank(target_pos, color):
                    # Promotion-Schlagzug
                    for p_type in [QUEEN, ROOK, BISHOP, KNIGHT]:
                        moves.append(self._create_move(pawn, target_pos, target_pos, promotion_piece=p_type))
                else:
                    moves.append(self._create_move(pawn, target_pos, target_pos))
            
            # En Passant
            elif target_pos == self.engine.rules.en_passant_target:
                # Das geschlagene Bauernfeld ist immer 10 Schritte (eine Reihe) hinter dem Ziel
                captured_pawn_pos = target_pos - forward 
                
                moves.append(self._create_move(pawn, target_pos, captured_pawn_pos, special_type='en_passant'))
                
        return moves

    def _is_promotion_rank(self, position: int, color: int) -> bool:
        """
        Prüft ob eine Position auf der Umwandlungsreihe für die gegebene Farbe liegt
        """
        row = position // 10
        # Weißer Bauer auf 8. Reihe (Row 9) oder schwarzer Bauer auf 1. Reihe (Row 2)
        return (color == WHITE and row == 9) or (color == BLACK and row == 2)

    def _generate_knight_moves(self, piece: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generiert Züge für einen Springer
        """
        moves = []
        current_pos = piece['position'] # KORREKTUR: Verwende 'position'
        color = piece['color']
        
        for move in KNIGHT_MOVES:
            target_pos = current_pos + move
            if self.engine.is_valid_position(target_pos):
                target_piece = self.engine.get_piece_at(target_pos)
                
                if target_piece is None:
                    # Leeres Feld
                    moves.append(self._create_move(piece, target_pos))
                elif target_piece['color'] != color:
                    # Schlagzug
                    moves.append(self._create_move(piece, target_pos, target_pos))
                    
        return moves

    def _generate_king_moves(self, piece: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generiert Züge für den König (Rochade wird separat in _generate_special_moves behandelt)
        """
        moves = []
        current_pos = piece['position'] # KORREKTUR: Verwende 'position'
        color = piece['color']
        
        for direction in DIRECTIONS.values():
            target_pos = current_pos + direction
            if self.engine.is_valid_position(target_pos):
                target_piece = self.engine.get_piece_at(target_pos)
                
                if target_piece is None:
                    # Leeres Feld
                    moves.append(self._create_move(piece, target_pos))
                elif target_piece['color'] != color:
                    # Schlagzug
                    moves.append(self._create_move(piece, target_pos, target_pos))
                    
        return moves

    def _generate_sliding_moves(self, piece: Dict[str, Any], directions: List[str]) -> List[Dict[str, Any]]:
        """
        Generiert Züge für gleitende Figuren (Dame, Turm, Läufer)
        """
        moves = []
        current_pos = piece['position'] # KORREKTUR: Verwende 'position'
        color = piece['color']
        
        for direction_str in directions:
            direction = DIRECTIONS[direction_str]
            field = current_pos + direction
            
            while self.engine.is_valid_position(field):
                target_piece = self.engine.get_piece_at(field)
                
                if target_piece is None:
                    # Leeres Feld: Zug hinzufügen und weiter in diese Richtung
                    moves.append(self._create_move(piece, field))
                elif target_piece['color'] != color:
                    # Gegnerische Figur: Schlagzug hinzufügen und Schleife beenden
                    moves.append(self._create_move(piece, field, field))
                    break
                else:
                    # Eigene Figur: Blockiert, Schleife beenden
                    break
                    
                field += direction
                
        return moves

    def get_attacked_squares(self, piece: Dict[str, Any]) -> List[int]:
        """
        Gibt eine Liste aller Felder zurück, die von einer bestimmten Figur angegriffen werden.
        Wird für die Schachprüfung verwendet.
        """
        piece_type = piece['type']
        attacked_squares = []
        
        # KORREKTUR: Die Position der Figur ist IMMER 'position', NICHT 'pos'.
        current_pos = piece['position']
        color = piece['color']

        if piece_type == PAWN:
            forward = DIRECTIONS['N'] * color
            # Bauern-Angriffszüge sind diagonal (keine normalen Züge)
            capture_dirs = [forward + DIRECTIONS['E'], forward + DIRECTIONS['W']]
            
            for capture_dir in capture_dirs:
                target_pos = current_pos + capture_dir
                if self.engine.is_valid_position(target_pos):
                    # Nur die Angriffsfelder zurückgeben, unabhängig davon, ob eine Figur dort steht
                    attacked_squares.append(target_pos)
                    
        elif piece_type == KNIGHT:
            for move in KNIGHT_MOVES:
                target_pos = current_pos + move
                if self.engine.is_valid_position(target_pos):
                    attacked_squares.append(target_pos)
                    
        elif piece_type == KING:
            for direction in DIRECTIONS.values():
                target_pos = current_pos + direction
                if self.engine.is_valid_position(target_pos):
                    attacked_squares.append(target_pos)
                    
        elif piece_type in [ROOK, BISHOP, QUEEN]:
            if piece_type == ROOK:
                directions = ['N', 'S', 'E', 'W']
            elif piece_type == BISHOP:
                directions = ['NE', 'NW', 'SE', 'SW']
            else: # QUEEN
                directions = list(DIRECTIONS.keys())
                
            for direction_str in directions:
                direction = DIRECTIONS[direction_str]
                field = current_pos + direction
                
                # Dies ist der Teil, der im Traceback (Zeile 642) den Fehler verursachte, 
                # wenn er in einer Unterfunktion fälschlicherweise 'pos' verwendete.
                # Hier ist die Korrektur: Die Startposition ist current_pos = piece['position'].
                
                while self.engine.is_valid_position(field):
                    attacked_squares.append(field)
                    target_piece = self.engine.get_piece_at(field)
                    
                    # Bei Angriffsgenerierung stoppen wir nur, wenn wir auf eine Figur treffen
                    if target_piece is not None:
                        break
                        
                    field += direction
        
        return attacked_squares
        
    def is_square_attacked(self, position: int, attacker_color: int) -> bool:
        """
        Prüft, ob ein Feld von einer Figur der gegebenen Farbe angegriffen wird
        
        Args:
            position: Zu prüfendes Feld
            attacker_color: Farbe der Angreifer
            
        Returns:
            bool: True wenn Feld angegriffen wird
        """
        for piece in self.engine.pieces:
            if (piece['captured'] or 
                piece['color'] != attacker_color):
                continue
            
            attacked_squares = self.get_attacked_squares(piece)
            if position in attacked_squares:
                return True
        
        return False


# Test des erweiterten MoveGenerators
if __name__ == "__main__":
    print("Testing Extended MoveGenerator...")
    
    from core import ChesstegEngine
    engine = ChesstegEngine()
    move_gen = MoveGenerator(engine)
    
    # Test: Züge für Weiß generieren
    white_moves = move_gen.generate_moves(1)
    print(f"White moves in initial position: {len(white_moves)}")
    
    # Test: Spezielle Züge
    castling_moves = [m for m in white_moves if m.get('special_type') == 'castling']
    print(f"Castling moves available: {len(castling_moves)}")
    
    # Test: Springer-Züge
    knights = [p for p in engine.pieces if p['type'] == 4 and p['color'] == 1]
    for knight in knights:
        knight_moves = move_gen._generate_knight_moves(knight)
        print(f"Knight at {engine._position_to_notation(knight['position'])} moves: {len(knight_moves)}")
