#!/usr/bin/env python3
"""
Chessteg - Didaktisches Schachprogramm
Original in Pascal (1994-1995), portiert zu Python mit Tkinter GUI
"""

from chess_gui import ChessGUI

def main():
    print("Chessteg - Didaktisches Schachprogramm")
    print("Original in Pascal (1994-1995), portiert zu Python")
    print("=" * 50)
    
    gui = ChessGUI()
    gui.run()

if __name__ == "__main__":
    main()