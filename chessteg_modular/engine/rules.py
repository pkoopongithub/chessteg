"""
Chessteg Rules Module - KORRIGIERTE VERSION
Vollständige Implementierung spezieller Schachregeln
"""

import copy
from typing import Dict, Any, Optional, List, Tuple


class ChessRules:
    """
    Implementiert spezielle Schachregeln: Rochade, en Passant, Bauernumwandlung
    """
    
    def __init__(self, engine):
        self.engine = engine
        self.en_passant_target = None
        self.castling_rights = {
            'white_kingside': True,
            'white_queenside': True, 
            'black_kingside': True,
            'black_queenside': True
        }
        self.move_history = []
    
    def process_move(self, move: Dict[str, Any], piece: Dict[str, Any], captured_piece: Optional[Dict[str, Any]]):
        """
        Verarbeitet spezielle Zugregeln nach einem Zug
        
        Args:
            move: Der ausgeführte Zug
            piece: Die bewegte Figur
            captured_piece: Geschlagene Figur (falls vorhanden)
        """
        # 🛡️ ROBUSTHEIT: FALLBACK für fehlende Felder
        move_type = move.get('type')
        if move_type is None and piece is not None:
            move_type = piece['type']
        
        move_color = move.get('color')
        if move_color is None and piece is not None:
            move_color = piece['color']
        
        # En Passant Recht aktualisieren (nur für Bauern)
        if move_type == 1:  # PAWN
            self.update_en_passant_after_move(move, move_color)
        
        # Rochaderechte aktualisieren
        self.update_castling_rights_after_move(move, piece)
        
        # Bauernumwandlung prüfen
        if self.check_pawn_promotion_required(move, piece):
            move['requires_promotion'] = True
    
    def validate_castling(self, color: int, side: str) -> bool:
        """
        Prüft ob Rochade möglich ist
        
        Args:
            color: Farbe (1=weiß, -1=schwarz)
            side: 'kingside' oder 'queenside'
            
        Returns:
            bool: True wenn Rochade legal
        """
        # Grundvoraussetzungen prüfen
        if not self._check_basic_castling_requirements(color, side):
            return False
        
        # König darf nicht im Schach stehen
        if self.engine.is_king_in_check(color):
            return False
        
        # Felder zwischen König und Turm dür nicht angegriffen sein
        if not self._check_castling_squares_safety(color, side):
            return False
        
        # Felder zwischen König und Turm müssen frei sein
        if not self._check_castling_squares_empty(color, side):
            return False
        
        return True
    
    def execute_castling(self, color: int, side: str) -> bool:
        """
        Führt Rochade aus
        
        Args:
            color: Farbe (1=weiß, -1=schwarz)
            side: 'kingside' oder 'queenside'
            
        Returns:
            bool: True wenn erfolgreich
        """
        if not self.validate_castling(color, side):
            return False
        
        # König und Turm positionen bestimmen
        king_from, king_to, rook_from, rook_to = self._get_castling_positions(color, side)
        
        # König finden
        king = next((p for p in self.engine.pieces 
                    if p['type'] == 99 and p['color'] == color and not p['captured']), None)
        if not king:
            return False
        
        # Turm finden
        rook = next((p for p in self.engine.pieces 
                    if p['type'] == 5 and p['color'] == color and 
                    p['position'] == rook_from and not p['captured']), None)
        if not rook:
            return False
        
        # Rochade ausführen
        # 1. König bewegen
        self.engine.board[king_from] = 0  # EMPTY
        self.engine.board[king_to] = 99 * color
        king['position'] = king_to
        
        # 2. Turm bewegen  
        self.engine.board[rook_from] = 0  # EMPTY
        self.engine.board[rook_to] = 5 * color
        rook['position'] = rook_to
        
        # Rochaderecht für diese Farbe aufheben
        self._revoke_castling_rights(color)
        
        # Zug zur History hinzufügen
        castling_move = {
            'type': 'castling',
            'color': color,
            'side': side,
            'king_from': king_from,
            'king_to': king_to,
            'rook_from': rook_from, 
            'rook_to': rook_to
        }
        self.move_history.append(castling_move)
        
        print(f"Castling executed: {self._get_castling_notation(color, side)}")
        return True
    
    def validate_en_passant(self, pawn: Dict[str, Any], target_pos: int) -> bool:
        """
        Prüft en Passant
        
        Args:
            pawn: Bauer der schlagen will
            target_pos: Zielfeld
            
        Returns:
            bool: True wenn en Passant legal
        """
        # Grundvoraussetzungen prüfen
        if not self._check_basic_en_passant_requirements(pawn, target_pos):
            return False
        
        # Es muss ein en Passant Ziel geben
        if self.en_passant_target is None:
            return False
        
        # Zielposition muss dem en Passant Ziel entsprechen
        if target_pos != self.en_passant_target:
            return False
        
        # Gegnerischer Bauer muss existieren
        opponent_pawn_pos = self._get_opponent_pawn_position_for_en_passant(pawn, target_pos)
        opponent_pawn = self.engine.get_piece_at(opponent_pawn_pos)
        
        if not opponent_pawn or opponent_pawn['type'] != 1 or opponent_pawn['color'] != -pawn['color']:
            return False
        
        # Der Zug darf keinen Selbstschach verursachen
        return self._validate_no_self_check_after_en_passant(pawn, target_pos, opponent_pawn_pos)
    
    def execute_en_passant(self, pawn: Dict[str, Any], target_pos: int) -> bool:
        """
        Führt en Passant aus
        
        Args:
            pawn: Bauer der schlägt
            target_pos: Zielfeld
            
        Returns:
            bool: True wenn erfolgreich
        """
        if not self.validate_en_passant(pawn, target_pos):
            print(f"En Passant validation failed for {self._position_to_notation(pawn['position'])} to {self._position_to_notation(target_pos)}")
            return False
        
        # Gegnerischen Bauer finden und position
        opponent_pawn_pos = self._get_opponent_pawn_position_for_en_passant(pawn, target_pos)
        opponent_pawn = self.engine.get_piece_at(opponent_pawn_pos)
        
        if not opponent_pawn:
            print(f"En Passant: No opponent pawn found at {self._position_to_notation(opponent_pawn_pos)}")
            return False
        
        # En Passant ausführen
        # 1. Bauer bewegen
        from_pos = pawn['position']
        self.engine.board[from_pos] = 0  # EMPTY
        self.engine.board[target_pos] = 1 * pawn['color']
        pawn['position'] = target_pos
        
        # 2. Gegnerischen Bauer schlagen
        self.engine.board[opponent_pawn_pos] = 0  # EMPTY
        opponent_pawn['captured'] = True
        
        # En Passant Recht zurücksetzen
        self.en_passant_target = None
        
        # Zug zur History hinzufügen
        en_passant_move = {
            'type': 'en_passant',
            'color': pawn['color'],
            'from_pos': from_pos,
            'to_pos': target_pos,
            'captured_pawn_pos': opponent_pawn_pos
        }
        self.move_history.append(en_passant_move)
        
        print(f"En passant executed: {self._position_to_notation(from_pos)}{self._position_to_notation(target_pos)}")
        return True
    
    def handle_pawn_promotion(self, pawn: Dict[str, Any], promotion_piece: str = 'queen') -> bool:
        """
        Behandelt Bauernumwandlung
        
        Args:
            pawn: Bauer der umgewandelt werden soll
            promotion_piece: Gewünschte Figur ('queen', 'rook', 'bishop', 'knight')
            
        Returns:
            bool: True wenn erfolgreich
        """
        # Prüfen ob Umwandlung möglich ist
        if not self._can_pawn_promote(pawn):
            return False
        
        # Figurtyp bestimmen
        piece_type = self._get_promotion_piece_type(promotion_piece)
        if piece_type is None:
            return False
        
        # Umwandlung durchführen
        position = pawn['position']
        
        # Alten Bauer entfernen
        self.engine.pieces = [p for p in self.engine.pieces if p != pawn]
        
        # Neue Figur hinzufügen
        self.engine.pieces.append({
            'type': piece_type,
            'color': pawn['color'],
            'position': position,
            'captured': False
        })
        
        # Brett aktualisieren
        self.engine.board[position] = piece_type * pawn['color']
        
        # Umwandlung zur History hinzufügen
        promotion_move = {
            'type': 'promotion',
            'color': pawn['color'],
            'position': position,
            'promotion_piece': promotion_piece
        }
        self.move_history.append(promotion_move)
        
        print(f"Pawn promotion: {promotion_piece} at {self._position_to_notation(position)}")
        return True
    
    def check_pawn_promotion_required(self, move: Dict[str, Any], piece: Dict[str, Any] = None) -> bool:
        """
        Prüft ob nach einem Bauerzug Umwandlung erforderlich ist
        
        Args:
            move: Ausgeführter Bauerzug
            piece: Figur (falls move['type'] fehlt)
            
        Returns:
            bool: True wenn Umwandlung erforderlich
        """
        # 🛡️ ROBUSTHEIT: FALLBACK für fehlende Felder
        move_type = move.get('type')
        if move_type is None and piece is not None:
            move_type = piece['type']
            
        move_color = move.get('color')
        if move_color is None and piece is not None:
            move_color = piece['color']
            
        if move_type != 1:  # Nur für Bauern
            return False
        
        target_row = move['to_pos'] // 10
        
        # Weißer Bauer auf 8. Reihe oder schwarzer Bauer auf 1. Reihe
        return (move_color == 1 and target_row == 9) or (move_color == -1 and target_row == 2)
    
    def update_castling_rights_after_move(self, move: Dict[str, Any], piece: Dict[str, Any] = None):
        """
        Aktualisiert Rochaderechte nach einem Zug
        
        Args:
            move: Ausgeführter Zug
            piece: Figur (falls move['type'] fehlt)
        """
        # 🛡️ ROBUSTHEIT: FALLBACK für fehlende Felder
        move_type = move.get('type')
        if move_type is None and piece is not None:
            move_type = piece['type']
            
        move_color = move.get('color')
        if move_color is None and piece is not None:
            move_color = piece['color']
            
        # Wenn König bewegt wurde, Rochaderechte aufheben
        if move_type == 99:  # KING
            self._revoke_castling_rights(move_color)
        
        # Wenn Turm bewegt wurde, entsprechendes Rochaderecht aufheben
        elif move_type == 5:  # ROOK
            self._revoke_rook_castling_rights(move_color, move['from_pos'])
    
    def update_en_passant_after_move(self, move: Dict[str, Any], move_color: int = None):
        """
        Aktualisiert en Passant Recht nach einem Zug - KORRIGIERTE VERSION
        """
        # 🛡️ ROBUSTHEIT: FALLBACK für fehlende Felder
        if move_color is None:
            move_color = move.get('color')
            
        # En Passant Recht zurücksetzen
        self.en_passant_target = None
        
        # Wenn Bauer Doppelschritt, en Passant Recht setzen
        move_type = move.get('type')
        if move_type == 1:  # PAWN
            from_row = move['from_pos'] // 10
            to_row = move['to_pos'] // 10
            
            # Doppelschritt erkannt (2 Reihen Differenz)
            if abs(from_row - to_row) == 2:
                # Feld hinter dem Bauer setzen
                direction = 10 if move_color == 1 else -10
                self.en_passant_target = move['from_pos'] + direction
                # print(f"En passant target set: {self._position_to_notation(self.en_passant_target)}")  # 🚨 DEBUG auskommentiert
    
    def get_available_promotion_pieces(self) -> List[str]:
        """
        Gibt verfügbare Umwandlungsfiguren zurück
        
        Returns:
            List[str]: Liste der Figurennamen
        """
        return ['queen', 'rook', 'bishop', 'knight']
    
    def is_promotion_rank(self, position: int, color: int) -> bool:
        """
        Prüft ob eine Position auf der Umwandlungsreihe für die gegebene Farbe liegt
        """
        row = position // 10
        # Weißer Bauer auf 8. Reihe (Row 9) oder schwarzer Bauer auf 1. Reihe (Row 2)
        return (color == 1 and row == 9) or (color == -1 and row == 2)
    
    # =========================================================================
    # HILFSFUNKTIONEN - ROCHADE
    # =========================================================================
    
    def _check_basic_castling_requirements(self, color: int, side: str) -> bool:
        """Prüft grundlegende Rochade-Voraussetzungen"""
        # Rochaderecht muss vorhanden sein
        if not self._has_castling_right(color, side):
            return False
        
        # König und Turm müssen auf Startpositionen sein
        king_pos, rook_pos = self._get_king_rook_start_positions(color, side)
        
        king = self.engine.get_piece_at(king_pos)
        rook = self.engine.get_piece_at(rook_pos)
        
        if not king or king['type'] != 99 or king['color'] != color:
            return False
        
        if not rook or rook['type'] != 5 or rook['color'] != color:
            return False
        
        return True
    
    def _check_castling_squares_safety(self, color: int, side: str) -> bool:
        """Prüft ob Felder zwischen König und Turm sicher sind"""
        king_from, king_to, _, _ = self._get_castling_positions(color, side)
        
        # Felder die der König passiert prüfen
        if side == 'kingside':
            check_squares = [king_from + 1, king_from + 2]  # f1, g1 für Weiß
        else:  # queenside
            check_squares = [king_from - 1, king_from - 2]  # d1, c1 für Weiß
        
        # Temporär König bewegen und Felder prüfen
        original_pos = king_from
        king = self.engine.get_piece_at(king_from)
        
        for square in check_squares:
            # Temporär König auf Feld bewegen
            self.engine.board[original_pos] = 0
            self.engine.board[square] = 99 * color
            if king:
                king['position'] = square
            
            # Prüfen ob König im Schach
            if self.engine.is_king_in_check(color):
                # Zustand zurücksetzen
                self.engine.board[original_pos] = 99 * color
                self.engine.board[square] = 0
                if king:
                    king['position'] = original_pos
                return False
            
            # Zustand zurücksetzen
            self.engine.board[original_pos] = 99 * color
            self.engine.board[square] = 0
        
        if king:
            king['position'] = original_pos
        
        return True
    
    def _check_castling_squares_empty(self, color: int, side: str) -> bool:
        """Prüft ob Felder zwischen König und Turm frei sind"""
        king_from, king_to, rook_from, rook_to = self._get_castling_positions(color, side)
        
        if side == 'kingside':
            # Felder zwischen König und Turm
            squares = [king_from + 1, king_from + 2]
        else:  # queenside
            # Felder zwischen König und Turm (inkl. b1/c1 für große Rochade)
            squares = [king_from - 1, king_from - 2, king_from - 3]
        
        for square in squares:
            if self.engine.board[square] != 0:  # Nicht EMPTY
                return False
        
        return True
    
    def _get_castling_positions(self, color: int, side: str) -> Tuple[int, int, int, int]:
        """Gibt Positionen für Rochade zurück"""
        if color == 1:  # WHITE
            if side == 'kingside':
                return 25, 27, 28, 26  # e1-g1, h1-f1
            else:  # queenside
                return 25, 23, 21, 24  # e1-c1, a1-d1
        else:  # BLACK
            if side == 'kingside':
                return 95, 97, 98, 96  # e8-g8, h8-f8
            else:  # queenside
                return 95, 93, 91, 94  # e8-c8, a8-d8
    
    def _get_king_rook_start_positions(self, color: int, side: str) -> Tuple[int, int]:
        """Gibt Startpositionen von König und Turm zurück"""
        if color == 1:  # WHITE
            king_pos = 25  # e1
            rook_pos = 28 if side == 'kingside' else 21  # h1 oder a1
        else:  # BLACK
            king_pos = 95  # e8
            rook_pos = 98 if side == 'kingside' else 91  # h8 oder a8
        
        return king_pos, rook_pos
    
    def _has_castling_right(self, color: int, side: str) -> bool:
        """Prüft ob Rochaderecht vorhanden ist"""
        if color == 1:  # WHITE
            return (self.castling_rights['white_kingside'] if side == 'kingside' 
                   else self.castling_rights['white_queenside'])
        else:  # BLACK
            return (self.castling_rights['black_kingside'] if side == 'kingside' 
                   else self.castling_rights['black_queenside'])
    
    def _revoke_castling_rights(self, color: int):
        """Hebt Rochaderechte für eine Farbe auf"""
        if color == 1:  # WHITE
            self.castling_rights['white_kingside'] = False
            self.castling_rights['white_queenside'] = False
        else:  # BLACK
            self.castling_rights['black_kingside'] = False
            self.castling_rights['black_queenside'] = False
    
    def _revoke_rook_castling_rights(self, color: int, rook_pos: int):
        """Hebt spezifisches Rochaderecht basierend auf Turmposition auf"""
        if color == 1:  # WHITE
            if rook_pos == 28:  # h1 - kingside
                self.castling_rights['white_kingside'] = False
            elif rook_pos == 21:  # a1 - queenside
                self.castling_rights['white_queenside'] = False
        else:  # BLACK
            if rook_pos == 98:  # h8 - kingside
                self.castling_rights['black_kingside'] = False
            elif rook_pos == 91:  # a8 - queenside
                self.castling_rights['black_queenside'] = False
    
    def _get_castling_notation(self, color: int, side: str) -> str:
        """Gibt algebraische Notation für Rochade zurück"""
        if side == 'kingside':
            return 'O-O' if color == 1 else 'O-O'
        else:
            return 'O-O-O' if color == 1 else 'O-O-O'
    
    # =========================================================================
    # HILFSFUNKTIONEN - EN PASSANT
    # =========================================================================
    
    def _check_basic_en_passant_requirements(self, pawn: Dict[str, Any], target_pos: int) -> bool:
        """Prüft grundlegende en Passant Voraussetzungen - KORRIGIERT"""
        # Nur Bauern können en Passant
        if pawn['type'] != 1:
            return False
        
        # Ziel muss diagonal sein (aber nicht notwendigerweise besetzt)
        from_pos = pawn['position']
        row_diff = abs((from_pos // 10) - (target_pos // 10))
        col_diff = abs((from_pos % 10) - (target_pos % 10))
        
        # Bauer muss sich diagonal bewegen (eine Reihe vor, eine Spalte seitlich)
        if not (row_diff == 1 and col_diff == 1):
            return False
        
        # Ziel muss leer sein (bei en Passant ist das Zielfeld immer leer)
        if self.engine.board[target_pos] != 0:
            return False
        
        return True
    
    def _get_opponent_pawn_position_for_en_passant(self, pawn: Dict[str, Any], target_pos: int) -> int:
        """Gibt Position des zu schlagenden Bauern zurück"""
        # Bauer steht eine Reihe hinter dem Zielfeld
        if pawn['color'] == 1:  # WHITE
            return target_pos - 10  # Eine Reihe zurück
        else:  # BLACK
            return target_pos + 10  # Eine Reihe vor
    
    def _validate_no_self_check_after_en_passant(self, pawn: Dict[str, Any], target_pos: int, 
                                               opponent_pawn_pos: int) -> bool:
        """Prüft ob en Passant keinen Selbstschach verursacht"""
        # Zustand speichern
        original_board = self.engine.board.copy()
        original_pieces = copy.deepcopy(self.engine.pieces)
        
        # Temporären en Passant ausführen
        from_pos = pawn['position']
        self.engine.board[from_pos] = 0
        self.engine.board[target_pos] = 1 * pawn['color']
        pawn['position'] = target_pos
        
        # Gegnerischen Bauer schlagen
        opponent_pawn = self.engine.get_piece_at(opponent_pawn_pos)
        if opponent_pawn:
            self.engine.board[opponent_pawn_pos] = 0
            opponent_pawn['captured'] = True
        
        # Schach prüfen
        in_check = self.engine.is_king_in_check(pawn['color'])
        
        # Zustand wiederherstellen
        self.engine.board = original_board
        self.engine.pieces = original_pieces
        
        return not in_check
    
    # =========================================================================
    # HILFSFUNKTIONEN - BAUERNUMWANDLUNG
    # =========================================================================
    
    def _can_pawn_promote(self, pawn: Dict[str, Any]) -> bool:
        """Prüft ob Bauer umwandeln kann"""
        if pawn['type'] != 1:  # Nur Bauern
            return False
        
        position = pawn['position']
        row = position // 10
        
        # Weißer Bauer auf 8. Reihe oder schwarzer Bauer auf 1. Reihe
        return (pawn['color'] == 1 and row == 9) or (pawn['color'] == -1 and row == 2)
    
    def _get_promotion_piece_type(self, promotion_piece: str) -> Optional[int]:
        """Konvertiert Figurenname zu Typ"""
        piece_types = {
            'queen': 9,
            'rook': 5, 
            'bishop': 3,
            'knight': 4
        }
        return piece_types.get(promotion_piece.lower())
    
    # =========================================================================
    # ALLGEMEINE HILFSFUNKTIONEN
    # =========================================================================
    
    def _position_to_notation(self, position: int) -> str:
        """Konvertiert interne Position zu algebraischer Notation"""
        files = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', '']
        row = position // 10
        file = position % 10
        return f"{files[file]}{row - 1}"


# Test der Schachregeln
if __name__ == "__main__":
    print("Testing ChessRules...")
    
    from core import ChesstegEngine
    engine = ChesstegEngine()
    rules = ChessRules(engine)
    
    # Test: Rochade-Rechte
    print("Castling rights initialized:", rules.castling_rights)
    
    # Test: En Passant
    print("En passant target:", rules.en_passant_target)
    
    # Test: Umwandlungsfiguren
    print("Available promotion pieces:", rules.get_available_promotion_pieces())
    
    print("ChessRules test completed!")