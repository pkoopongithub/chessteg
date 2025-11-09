"""
Chessteg Search Module - KORRIGIERTE VERSION MIT DEBUG
Vollständiger Alpha-Beta Suchalgorithmus mit Quiescence Search
"""

import math
import time
import copy
from typing import List, Dict, Any, Optional, Tuple


class SearchAlgorithm:
    """
    Vollständiger Alpha-Beta Suchalgorithmus mit erweiterten Features
    """
    
    # Konstanten für Alpha-Beta
    MATE_SCORE = 20000000
    MAX_DEPTH = 30

    # Figuren-Typen und Werte
    PAWN = 1
    KNIGHT = 4
    BISHOP = 3
    ROOK = 5
    QUEEN = 9
    KING = 99

    # Figurenwerte für Move Ordering
    PIECE_VALUES = {
        PAWN: 100,
        KNIGHT: 320, 
        BISHOP: 330,
        ROOK: 500,
        QUEEN: 900,
        KING: 20000
    }

    def __init__(self, engine):
        self.engine = engine
        self.ai_settings = {
            'search_depth': 3,
            'extended_evaluation': True,
            'quiescence_search': False,  # 🚨 KORREKTUR: Erstmal deaktivieren für Stabilität
            'quiescence_depth': 2,
            'timeout_ms': 5000  # 🚨 KORREKTUR: Mehr Zeit für Debugging
        }
        
        # Suchstatistiken
        self.node_counter = 0
        self.move_counter = 0
        self.calculation_start_time = 0
        self.transposition_table = {}
        
        # Move Ordering Cache
        self.move_ordering_cache = {}
    
    def computer_move(self) -> Optional[Dict[str, Any]]:
        """
        Berechnet den besten Zug für den Computer mit vollständiger Alpha-Beta-Suche
        """
        print("=== KI MOVE CALCULATION STARTED ===")
        start_time = time.time()
        self.calculation_start_time = start_time
        self.node_counter = 0
        self.move_counter = 0
        self.transposition_table = {}
        
        current_color = 1 if self.engine.white_turn else -1
        
        # 1. Alle legalen Züge generieren
        all_moves = self.engine.generate_all_moves(current_color)
        if not all_moves:
            print("❌ Keine legalen Züge gefunden - Matt oder Patt?")
            print(f"Checkmate: {self.engine.checkmate}, Stalemate: {self.engine.stalemate}")
            print(f"King in check: {self.engine.is_king_in_check(current_color)}")
            return None
            
        print(f"🔍 {len(all_moves)} legale Züge verfügbar für {'Weiß' if current_color == 1 else 'Schwarz'}")
        
        # 2. Züge sortieren (Move Ordering)
        sorted_moves = self._order_moves(all_moves)
        
        best_move = None
        best_score = -self.MATE_SCORE - 1
        
        # 3. Iterative Deepening
        depth = self.ai_settings['search_depth']
        
        # 4. Alpha-Beta-Suche starten
        alpha = -self.MATE_SCORE - 1
        beta = self.MATE_SCORE + 1
        
        print(f"🎯 Starte Alpha-Beta-Suche mit Tiefe {depth}, {len(sorted_moves)} Zügen")
        
        for i, move in enumerate(sorted_moves):
            self.move_counter += 1
            
            # Zug ausführen (transaktional)
            if not self.engine.make_move(move):
                print(f"❌ Zug {i+1}/{len(sorted_moves)}: {self._move_to_notation(move)} konnte nicht ausgeführt werden")
                continue
            
            # Rufe Alpha-Beta für die nächste Tiefe auf
            score = -self._alpha_beta(depth - 1, -beta, -alpha)
            
            # Zug rückgängig machen
            self.engine.undo_move()
            
            print(f"🔍 Zug {i+1}/{len(sorted_moves)}: {self._move_to_notation(move)} -> Score: {score}")
            
            # Timeout-Check
            if self._check_timeout():
                print(f"⏰ Timeout erreicht nach {self.move_counter} Zügen")
                break
                
            # Alpha-Beta Update
            if score > best_score:
                best_score = score
                best_move = move
                print(f"🏆 NEUER BESTER ZUG: {self._move_to_notation(move)} mit Score {score}")
                
            if score > alpha:
                alpha = score
                
            # Beta-Cutoff
            if alpha >= beta:
                print(f"✂️ Beta-Cutoff bei Zug {i+1}")
                break

        end_time = time.time()
        duration = end_time - start_time
        
        print(f"=== KI MOVE CALCULATION FINISHED ===")
        print(f"Best Score: {best_score}")
        print(f"Best Move: {self._move_to_notation(best_move) if best_move else 'None'}")
        print(f"Search Depth: {depth}")
        print(f"Nodes Visited: {self.node_counter}")
        print(f"Moves Evaluated: {self.move_counter}")
        print(f"Calculation Time: {duration:.2f}s")
        print(f"NPS: {self.node_counter / duration if duration > 0 else 0:.0f}")

        if best_move:
            print(f"✅ KI hat Zug gefunden: {self._move_to_notation(best_move)}")
        else:
            print("❌ KI konnte keinen Zug finden")
            
        return best_move

    def _alpha_beta(self, depth: int, alpha: int, beta: int) -> int:
        """
        Der rekursive Alpha-Beta-Suchalgorithmus.
        """
        self.node_counter += 1
        
        # Timeout-Check
        if self._check_timeout():
            return 0
        
        # 1. Prüfe auf Spielende (Matt/Patt)
        if self.engine.is_game_over():
            score = self._mate_or_stalemate_score(depth)
            # 🚨 DEBUG: Zeige Matt/Patt-Erkennung
            if abs(score) > 1000000:
                print(f"  🏁 Terminalstellung: Score {score} (Tiefe {depth})")
            return score
        
        # 2. Basisfall: Tiefe erreicht
        if depth <= 0:
            score = self.engine.evaluator.evaluate_position()
            # 🚨 DEBUG: Zeige erste Bewertungen
            if self.node_counter < 10:
                print(f"  📊 Blattevaluation: {score} (Tiefe {depth})")
            return score
            
        # 3. Zuggenerierung
        current_color = 1 if self.engine.white_turn else -1
        all_moves = self.engine.generate_all_moves(current_color)
        
        if not all_moves:
            score = self._mate_or_stalemate_score(depth)
            print(f"  ❌ Keine Züge in Tiefe {depth}: Score {score}")
            return score

        # 4. Move Ordering
        sorted_moves = self._order_moves(all_moves)
        
        # 5. Haupt-Alpha-Beta-Loop
        best_score = -self.MATE_SCORE - 1
        
        for move in sorted_moves:
            # 🚨 DEBUG: Zeige ersten paar Züge
            if self.node_counter < 5 and depth == self.ai_settings['search_depth'] - 1:
                print(f"    🔍 Prüfe Zug: {self._move_to_notation(move)} in Tiefe {depth}")
            
            if not self.engine.make_move(move):
                continue
            
            # Rekursiver Aufruf
            score = -self._alpha_beta(depth - 1, -beta, -alpha)
            
            self.engine.undo_move()
            
            # Alpha-Beta Update
            if score > best_score:
                best_score = score
                
            if score > alpha:
                alpha = score
                
            if alpha >= beta:
                break
        
        return best_score

    def _mate_or_stalemate_score(self, depth: int) -> int:
        """Berechnet den Score bei Matt oder Patt - KORRIGIERTE VERSION"""
        current_color = 1 if self.engine.white_turn else -1
        
        # Prüfe auf Schach
        if self.engine.is_king_in_check(current_color):
            # Matt - sehr schlecht für den aktuellen Spieler
            mate_score = -self.MATE_SCORE + (self.MAX_DEPTH - depth)
            print(f"    ♟️  MATT erkannt! Score: {mate_score} (Tiefe {depth})")
            return mate_score
        else:
            # Patt - Unentschieden
            print(f"    🤝 PATT erkannt! Score: 0 (Tiefe {depth})")
            return 0

    def _check_timeout(self) -> bool:
        """Prüft, ob das Timeout erreicht ist."""
        if self.ai_settings['timeout_ms'] <= 0:
            return False
        
        elapsed_time_ms = (time.time() - self.calculation_start_time) * 1000
        return elapsed_time_ms >= self.ai_settings['timeout_ms']

    def _order_moves(self, moves: List[Dict[str, Any]], quiescence: bool = False) -> List[Dict[str, Any]]:
        """
        Sortiert Züge für bessere Alpha-Beta-Performance.
        """
        scored_moves = []
        for move in moves:
            score = 0
            
            # Schlagzüge priorisieren
            if move.get('is_capture') or move.get('special_type') == 'en_passant':
                # MVV-LVA Scoring
                if move.get('special_type') == 'en_passant':
                    victim_value = self.PIECE_VALUES[1]  # Bauer
                else:
                    victim = self.engine.get_piece_at(move['to_pos'])
                    victim_value = self.PIECE_VALUES.get(victim['type'], 0) if victim else 0
                
                attacker_value = self.PIECE_VALUES.get(move['piece']['type'], 0)
                score += 10 * victim_value - attacker_value
                score += 10000  # Hoher Bonus für Schläge
                
            # Umwandlungen priorisieren
            elif move.get('promotion_piece'):
                promotion_value = self.PIECE_VALUES.get(move['promotion_piece'], 0)
                score += 900 + promotion_value
                
            scored_moves.append((score, move))
            
        # Absteigend sortieren nach Score
        scored_moves.sort(key=lambda x: x[0], reverse=True)
        
        return [move for score, move in scored_moves]

    def _get_move_key(self, move: Dict[str, Any]) -> Tuple[int, int, int]:
        """Erzeugt einen eindeutigen Schlüssel für einen Zug."""
        promo = move.get('promotion_type', 0)
        return (move['from_pos'], move['to_pos'], promo)
    
    def _move_to_notation(self, move: Dict[str, Any]) -> str:
        """Konvertiert Zug zu algebraischer Notation"""
        from_pos = self._position_to_notation(move['from_pos'])
        to_pos = self._position_to_notation(move['to_pos'])
        return f"{from_pos}{to_pos}"
    
    def _position_to_notation(self, position: int) -> str:
        """Konvertiert interne Position zu algebraischer Notation"""
        files = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', '']
        row = position // 10
        file = position % 10
        return f"{files[file]}{row - 1}"


# Test des Search-Algorithmus
if __name__ == "__main__":
    print("Testing SearchAlgorithm...")
    
    # Benötigt alle Engine-Komponenten für einen vollständigen Test
    try:
        from core import ChesstegEngine
        
        engine = ChesstegEngine()
        searcher = SearchAlgorithm(engine)
        
        # Test: Standardstellung, Tiefe 3
        print(f"\n--- Test: Startstellung, Tiefe {searcher.ai_settings['search_depth']} ---")
        best_move = searcher.computer_move()
        
        if best_move:
            print(f"Bester Zug gefunden: {searcher._move_to_notation(best_move)}")
            # Führe den Zug aus
            engine.make_move(best_move)
            
            # Test: Nach einem Zug, Tiefe 3
            print(f"\n--- Test: Nach erstem Zug, Tiefe {searcher.ai_settings['search_depth']} ---")
            best_move_2 = searcher.computer_move()
            if best_move_2:
                print(f"Bester Zug für Schwarz gefunden: {searcher._move_to_notation(best_move_2)}")
            else:
                print("Kein Zug für Schwarz gefunden.")
        else:
            print("Kein Zug für Weiß gefunden.")

    except ImportError as e:
        print(f"ERROR: Full test requires all engine components (core, __init__, etc.). Failed to import: {e}")