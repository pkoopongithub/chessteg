"""
Chessteg Evaluation Module - KORRIGIERTE VERSION MIT DEBUG
Vollständige Bewertungsfunktion für Schachstellungen
"""

import math
from typing import Dict, Any, List


class PositionEvaluator:
    """
    Bewertet Schachstellungen basierend auf Material, Position und strategischen Faktoren
    """
    
    def __init__(self, engine):
        self.engine = engine
        
        # Erweiterte Bewertungstabellen
        self.evaluation_table = {
            'material': {
                1: 100,    # PAWN
                4: 320,    # KNIGHT
                3: 330,    # BISHOP
                5: 500,    # ROOK
                9: 900,    # QUEEN
                99: 20000  # KING
            },
            
            'position': {
                # Bauer - Positionstabelle
                1: [
                    [0,   0,   0,   0,   0,   0,   0,   0],
                    [50,  50,  50,  50,  50,  50,  50,  50],
                    [10,  10,  20,  30,  30,  20,  10,  10],
                    [5,   5,  10,  25,  25,  10,   5,   5],
                    [0,   0,   0,  20,  20,   0,   0,   0],
                    [5,  -5, -10,   0,   0, -10,  -5,   5],
                    [5,  10,  10, -20, -20,  10,  10,   5],
                    [0,   0,   0,   0,   0,   0,   0,   0]
                ],
                
                # Springer - Positionstabelle
                4: [
                    [-50, -40, -30, -30, -30, -30, -40, -50],
                    [-40, -20,   0,   5,   5,   0, -20, -40],
                    [-30,   5,  10,  15,  15,  10,   5, -30],
                    [-30,   0,  15,  20,  20,  15,   0, -30],
                    [-30,   5,  15,  20,  20,  15,   5, -30],
                    [-30,   0,  10,  15,  15,  10,   0, -30],
                    [-40, -20,   0,   0,   0,   0, -20, -40],
                    [-50, -40, -30, -30, -30, -30, -40, -50]
                ],
                
                # Läufer - Positionstabelle
                3: [
                    [-20, -10, -10, -10, -10, -10, -10, -20],
                    [-10,   0,   0,   0,   0,   0,   0, -10],
                    [-10,   0,   5,  10,  10,   5,   0, -10],
                    [-10,   5,   5,  10,  10,   5,   5, -10],
                    [-10,   0,  10,  10,  10,  10,   0, -10],
                    [-10,  10,  10,  10,  10,  10,  10, -10],
                    [-10,   5,   0,   0,   0,   0,   5, -10],
                    [-20, -10, -10, -10, -10, -10, -10, -20]
                ],
                
                # Turm - Positionstabelle
                5: [
                    [0,   0,   0,   5,   5,   0,   0,   0],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [5,  10,  10,  10,  10,  10,  10,   5],
                    [0,   0,   0,   0,   0,   0,   0,   0]
                ],
                
                # Dame - Positionstabelle
                9: [
                    [-20, -10, -10, -5, -5, -10, -10, -20],
                    [-10,   0,   5,  0,  0,   0,   0, -10],
                    [-10,   5,   5,  5,  5,   5,   0, -10],
                    [0,     0,   5,  5,  5,   5,   0,  -5],
                    [-5,    0,   5,  5,  5,   5,   0,  -5],
                    [-10,   0,   5,  5,  5,   5,   0, -10],
                    [-10,   0,   0,  0,  0,   0,   0, -10],
                    [-20, -10, -10, -5, -5, -10, -10, -20]
                ],
                
                # König - Positionstabelle
                99: [
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
        
        # Debug-Zähler
        self.eval_counter = 0
    
    def evaluate_position(self) -> int:
        """
        Vollständige Stellungsbewertung - KORRIGIERTE VERSION MIT DEBUG
        """
        self.eval_counter += 1
        
        # Terminal-Stellungen zuerst prüfen
        if self.engine.checkmate:
            current_color = 1 if self.engine.white_turn else -1
            if self.engine.is_king_in_check(current_color):
                score = -30000 if current_color == 1 else 30000
                if self.eval_counter <= 5:
                    print(f"  ♟️  MATT Bewertung: {score}")
                return score
        
        if self.engine.stalemate:
            if self.eval_counter <= 5:
                print(f"  🤝 PATT Bewertung: 0")
            return 0
        
        # Einfache Materialbewertung zuerst testen
        material = self._evaluate_material()
        
        # 🚨 DEBUG: Zeige erste Bewertungen
        if self.eval_counter <= 5:
            print(f"  📊 Bewertung #{self.eval_counter}: Material = {material}")
        
        # Nur Material für erste Tests - später erweitern
        total_score = material
        
        if self.eval_counter <= 5:
            print(f"  📈 Gesamtbewertung: {total_score}")
        
        return total_score
    
    def _evaluate_material(self) -> int:
        """
        Einfache Materialbewertung - KORRIGIERTE VERSION
        """
        material = 0
        
        for piece in self.engine.pieces:
            if piece['captured']:
                continue
            
            piece_value = self.evaluation_table['material'].get(piece['type'], 0)
            
            if piece['color'] == 1:  # WHITE
                material += piece_value
            else:  # BLACK
                material -= piece_value
        
        return material
    
    def _evaluate_piece_squares(self) -> int:
        """
        Bewertet die Position der Figuren auf dem Brett
        """
        position_score = 0
        
        for piece in self.engine.pieces:
            if piece['captured']:
                continue
            
            board_row, board_col = self._position_to_coordinates(piece['position'])
            
            # Für weiße Figuren: Tabelle von unten nach oben
            # Für schwarze Figuren: Tabelle spiegeln
            if piece['color'] == 1:  # WHITE
                row = board_row - 2  # 0-7 von weißer Seite
            else:  # BLACK
                row = 7 - (board_row - 2)  # 0-7 von schwarzer Seite
            
            col = board_col - 1  # 0-7
            
            # Sicherstellen, dass Indizes im gültigen Bereich
            row = max(0, min(7, row))
            col = max(0, min(7, col))
            
            # Positionswert aus Tabelle holen
            pos_value = self.evaluation_table['position'][piece['type']][row][col]
            
            if piece['color'] == 1:
                position_score += pos_value
            else:
                position_score -= pos_value
        
        return position_score
    
    def _evaluate_attacks(self) -> int:
        """
        Bewertet Angriffe auf gegnerische Figuren
        """
        attack_score = 0
        
        for piece in self.engine.pieces:
            if piece['captured']:
                continue
            
            # Angriffene Felder dieser Figur
            attacked_squares = self._get_attacked_squares(piece)
            
            for square in attacked_squares:
                target_piece = self._get_piece_at(square)
                if target_piece and target_piece['color'] != piece['color']:
                    # Bonus für Angriff auf gegnerische Figur
                    target_value = self.evaluation_table['material'][target_piece['type']]
                    attack_bonus = target_value * 0.1  # 10% des Figurenwerts
                    
                    if piece['color'] == 1:
                        attack_score += attack_bonus
                    else:
                        attack_score -= attack_bonus
        
        return attack_score
    
    def _evaluate_defense(self) -> int:
        """
        Bewertet Verteidigung eigener Figuren
        """
        defense_score = 0
        
        for piece in self.engine.pieces:
            if piece['captured']:
                continue
            
            # Zähle Verteidiger dieser Figur
            defenders = self._get_defenders(piece)
            piece_value = self.evaluation_table['material'][piece['type']]
            
            # Bonus für verteidigte Figuren
            defense_bonus = len(defenders) * piece_value * 0.05  # 5% pro Verteidiger
            
            if piece['color'] == 1:
                defense_score += defense_bonus
            else:
                defense_score -= defense_bonus
        
        return defense_score
    
    def _evaluate_king_safety(self) -> int:
        """
        Bewertet Sicherheit der Könige
        """
        safety_score = 0
        
        for color in [1, -1]:
            king = self._get_king(color)
            if not king:
                continue
            
            king_pos = king['position']
            king_row, king_col = self._position_to_coordinates(king_pos)
            
            # Strafe für exponierten König in der Mitte
            if 3 <= king_col <= 6:  # König in der Mitte
                safety_penalty = -30
            else:  # König am Rand (sicherer)
                safety_penalty = 10
            
            # Zusätzliche Strafe wenn keine Bauern um den König
            pawn_shield = self._count_pawn_shield(king_pos, color)
            safety_penalty += (3 - pawn_shield) * -10  # Bis zu -30 Strafe
            
            if color == 1:
                safety_score += safety_penalty
            else:
                safety_score -= safety_penalty
        
        return safety_score
    
    def _evaluate_mobility(self) -> int:
        """
        Bewertet Bewegungsfreiheit der Figuren
        """
        mobility_score = 0
        
        for piece in self.engine.pieces:
            if piece['captured'] or piece['type'] == 99:  # König ausgeschlossen
                continue
            
            # KORREKTUR: Verwende move_generator statt engine direkt
            possible_moves = self.engine.move_generator.generate_piece_moves(piece)
            move_count = len(possible_moves)
            
            # Mobilitätsbonus basierend auf Figurentyp
            mobility_bonus = move_count * self._get_mobility_weight(piece['type'])
            
            if piece['color'] == 1:
                mobility_score += mobility_bonus
            else:
                mobility_score -= mobility_bonus
        
        return mobility_score
    
    def _evaluate_center_control(self) -> int:
        """
        Bewertet Kontrolle des Zentrums
        """
        center_score = 0
        center_fields = [44, 45, 54, 55]  # d4, e4, d5, e5
        
        for field in center_fields:
            # Figur auf Zentrumsfeld
            piece = self._get_piece_at(field)
            if piece:
                piece_value = self.evaluation_table['material'][piece['type']] / 100
                if piece['color'] == 1:
                    center_score += piece_value * 5
                else:
                    center_score -= piece_value * 5
            
            # Angriffe auf Zentrumsfelder
            attackers = self._get_attackers(field)
            for attacker in attackers:
                attacker_value = self.evaluation_table['material'][attacker['type']] / 100
                if attacker['color'] == 1:
                    center_score += attacker_value * 2
                else:
                    center_score -= attacker_value * 2
        
        return center_score
    
    def _evaluate_pawn_structure(self) -> int:
        """
        Bewertet Bauernstruktur
        """
        structure_score = 0
        
        # Doppelbauern bestrafen
        pawns_per_file = {}
        
        for piece in self.engine.pieces:
            if not piece['captured'] and piece['type'] == 1:  # PAWN
                file = piece['position'] % 10
                key = f"{file}-{piece['color']}"
                pawns_per_file[key] = pawns_per_file.get(key, 0) + 1
        
        for key, count in pawns_per_file.items():
            if count > 1:
                color = 1 if key.endswith("1") else -1
                double_pawn_penalty = -20 * (count - 1)  # -20 pro zusätzlichem Bauer
                
                if color == 1:
                    structure_score += double_pawn_penalty
                else:
                    structure_score -= double_pawn_penalty
        
        return structure_score
    
    # =========================================================================
    # HILFSFUNKTIONEN
    # =========================================================================
    
    def _position_to_coordinates(self, position: int) -> tuple:
        """Konvertiert interne Position zu (row, col)"""
        row = position // 10
        col = position % 10
        return row, col
    
    def _get_piece_at(self, position: int) -> Any:
        """Gibt Figur an einer Position zurück"""
        for piece in self.engine.pieces:
            if piece['position'] == position and not piece['captured']:
                return piece
        return None
    
    def _get_attacked_squares(self, piece: Dict[str, Any]) -> List[int]:
        """Gibt alle von einer Figur angegriffenen Felder zurück"""
        # Verwende die MoveGenerator-Funktion falls verfügbar
        if hasattr(self.engine.move_generator, 'get_attacked_squares'):
            return self.engine.move_generator.get_attacked_squares(piece)
        
        # Fallback: Einfache Implementierung
        attacked_squares = []
        piece_type = piece['type']
        
        if piece_type == 1:  # PAWN
            color = piece['color']
            forward = 10 if color == 1 else -10
            for side in [forward + 1, forward - 1]:
                field = piece['position'] + side
                if self.engine.board[field] != 100:  # Nicht DUMMY
                    attacked_squares.append(field)
        
        # Für andere Figurentypen: Vereinfachte Logik
        # In der Praxis sollte dies vom MoveGenerator kommen
        return attacked_squares
    
    def _get_defenders(self, piece: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Findet Verteidiger einer Figur"""
        defenders = []
        
        for potential_defender in self.engine.pieces:
            if (potential_defender['captured'] or 
                potential_defender['color'] != piece['color']):
                continue
            
            attacked_squares = self._get_attacked_squares(potential_defender)
            if piece['position'] in attacked_squares:
                defenders.append(potential_defender)
        
        return defenders
    
    def _get_king(self, color: int) -> Any:
        """Findet König einer Farbe"""
        for piece in self.engine.pieces:
            if (piece['type'] == 99 and 
                piece['color'] == color and 
                not piece['captured']):
                return piece
        return None
    
    def _count_pawn_shield(self, king_pos: int, color: int) -> int:
        """Zählt Bauern in der Nähe des Königs"""
        king_row, king_col = self._position_to_coordinates(king_pos)
        pawn_count = 0
        
        # Prüfe Bauern vor dem König
        for file_offset in [-1, 0, 1]:
            check_file = king_col + file_offset
            if 1 <= check_file <= 8:
                if color == 1:  # Weißer König
                    pawn_row = king_row - 1  # Reihe vor dem König
                else:  # Schwarzer König
                    pawn_row = king_row + 1  # Reihe vor dem König
                
                pawn_pos = pawn_row * 10 + check_file
                pawn = self._get_piece_at(pawn_pos)
                if pawn and pawn['type'] == 1 and pawn['color'] == color:
                    pawn_count += 1
        
        return pawn_count
    
    def _get_mobility_weight(self, piece_type: int) -> int:
        """Gibt Mobilitätsgewicht für Figurentyp zurück"""
        weights = {
            1: 1,   # PAWN
            4: 3,   # KNIGHT
            3: 2,   # BISHOP
            5: 2,   # ROOK
            9: 1    # QUEEN
        }
        return weights.get(piece_type, 1)
    
    def _get_attackers(self, position: int) -> List[Dict[str, Any]]:
        """Findet alle Figuren, die ein Feld angreifen"""
        attackers = []
        
        for piece in self.engine.pieces:
            if piece['captured']:
                continue
            
            attacked_squares = self._get_attacked_squares(piece)
            if position in attacked_squares:
                attackers.append(piece)
        
        return attackers


# Test des Evaluators
if __name__ == "__main__":
    print("Testing PositionEvaluator...")
    
    from core import ChesstegEngine
    engine = ChesstegEngine()
    evaluator = PositionEvaluator(engine)
    
    eval = evaluator.evaluate_position()
    print(f"Initial position evaluation: {eval}")
    
    # Test spezifischer Komponenten
    material = evaluator._evaluate_material()
    position = evaluator._evaluate_piece_squares()
    print(f"Material: {material}, Position: {position}")