#!/usr/bin/env python3
"""
Chessteg - Didaktisches Schachprogramm
Original in Pascal (1994-1995), portiert zu Python mit Tkinter GUI
"""

# ✅ KORREKTUR: Import aus gui Modul statt direkt
from gui.chess_gui import ChessGUI

def validate_engine():
    """Validiert die Engine-Komponenten vor GUI-Start - ERWEITERTE VERSION"""
    try:
        from engine.core import ChesstegEngine
        engine = ChesstegEngine()
        
        # Teste Zug-Generierung mit Debug-Info
        moves_white = engine.generate_all_moves(1)
        moves_black = engine.generate_all_moves(-1)
        
        print(f"✅ Validierung: {len(moves_white)} Züge für Weiß, {len(moves_black)} Züge für Schwarz")
        
        # Zähle spezielle Züge
        castling_moves = [m for m in moves_white if m.get('special_type') == 'castling']
        promotion_moves = [m for m in moves_white if m.get('promotion_piece')]
        
        print(f"✅ Rochade-Züge verfügbar: {len(castling_moves)}")
        print(f"✅ Umwandlungs-Züge verfügbar: {len(promotion_moves)}")
        
        # Teste Zug-Struktur
        if moves_white:
            test_move = moves_white[0]
            required_keys = ['type', 'color', 'from_pos', 'to_pos', 'piece_id']
            missing_keys = [key for key in required_keys if key not in test_move]
            
            if missing_keys:
                print(f"❌ FEHLENDE KEYS im Zug: {missing_keys}")
                print(f"   Vorhandene Keys: {list(test_move.keys())}")
                return False
            else:
                print(f"✅ Zug-Struktur validiert: {list(test_move.keys())}")
                return True
        else:
            print("❌ KEINE ZÜGE generiert")
            return False
            
    except Exception as e:
        print(f"❌ CRITICAL ENGINE ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("Chessteg - Didaktisches Schachprogramm")
    print("Original in Pascal (1994-1995), portiert zu Python")
    print("=" * 50)
    
    # Engine vor GUI-Start validieren
    print("🔧 Engine-Validierung wird durchgeführt...")
    if not validate_engine():
        print("❌ ENGINE VALIDIERUNG FEHLGESCHLAGEN - Programm wird beendet")
        return
    
    print("✅ Engine validiert - Starte GUI...")
    gui = ChessGUI()
    gui.run()

if __name__ == "__main__":
    main()
