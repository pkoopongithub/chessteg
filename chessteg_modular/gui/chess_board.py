"""
Chess Board Module - KORRIGIERTE VERSION (Behebt GUI-Aktualisierungsproblem)
"""

import tkinter as tk
from tkinter import ttk, messagebox
import tkinter.simpledialog

# KORREKTUR: Korrekter Import über das 'engine.core' Paket
from engine.core import ChesstegEngine, WHITE, BLACK, EMPTY, PAWN, ROOK, BISHOP, KNIGHT, QUEEN, KING, DUMMY
from engine.core import PIECE_SYMBOLS # Annahme, dass PIECE_SYMBOLS aus core importiert wird


class ChessBoard(tk.Frame):
    def __init__(self, parent, engine, gui, cell_size=60):
        super().__init__(parent)

        self.cell_size = cell_size
        self.board_size = cell_size * 8
        self.engine = engine
        self.gui = gui

        self.selected_cell = None
        self.from_pos = None
        self.possible_moves = []
        self.editor_mode = False

        # Farben
        self.white_color = '#f0d9b5'
        self.black_color = '#b58863'
        self.highlight_color = '#ffeb3b'
        self.possible_move_color = '#90ee90'
        self.possible_capture_color = '#ffb6c1'

        # Figuren-Symbole
        self.piece_symbols = PIECE_SYMBOLS

        # Canvas
        self.canvas = tk.Canvas(self, width=self.board_size, height=self.board_size, bg='white')
        self.canvas.pack(padx=5, pady=5)
        self.canvas.bind("<Button-1>", self.on_square_click)

        # 🚨 KORREKTUR: Initialisiere das Board sofort
        self.draw_board()
        self.draw_pieces()

    # =========================================================================
    # ZEICHNEN
    # =========================================================================

    def draw_board(self):
        """Zeichnet das 8x8 Schachbrett"""
        self.canvas.delete("square")
        self.canvas.delete("coord")  # 🚨 KORREKTUR: Lösche auch Koordinaten
        
        for row in range(8):
            for col in range(8):
                # Wechsle die Farbe für Schachbrettmuster
                color = self.white_color if (row + col) % 2 == 0 else self.black_color

                x1 = col * self.cell_size
                y1 = row * self.cell_size
                x2 = x1 + self.cell_size
                y2 = y1 + self.cell_size

                # Speichere die interne 10x10-Position im Tag
                engine_row = 9 - row
                engine_col = col + 1
                pos_10x10 = engine_row * 10 + engine_col

                self.canvas.create_rectangle(x1, y1, x2, y2, fill=color, tags=("square", f"cell_{pos_10x10}"))

        # Zeichne Achsenbeschriftungen
        self._draw_coordinates()

    def _draw_coordinates(self):
        """Zeichnet die algebraischen Koordinaten (a1, b1, ...)"""
        font = ("Arial", 10)
        offset = 5 # Abstand zum Rand

        # Dateien (a-h)
        files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
        for i, file in enumerate(files):
            x = i * self.cell_size + self.cell_size // 2
            # Unten
            self.canvas.create_text(x, self.board_size - offset, text=file, tags="coord", fill="black", anchor=tk.S, font=font)
            # Oben
            self.canvas.create_text(x, offset, text=file, tags="coord", fill="black", anchor=tk.N, font=font)

        # Reihen (1-8)
        for i in range(8):
            rank = str(i + 1)
            y = (7 - i) * self.cell_size + self.cell_size // 2
            # Links
            self.canvas.create_text(offset, y, text=rank, tags="coord", fill="black", anchor=tk.W, font=font)
            # Rechts
            self.canvas.create_text(self.board_size - offset, y, text=rank, tags="coord", fill="black", anchor=tk.E, font=font)

    def draw_pieces(self):
        """Zeichnet alle Figuren auf das Brett."""
        self.canvas.delete("piece") # 🚨 KORREKTUR: Entferne NUR Figuren, nicht das ganze Board
        
        # Debug-Ausgabe zur Überprüfung
        piece_count = 0
        
        # Iteriere durch alle Figuren der Engine
        for piece in self.engine.pieces:
            # Überspringe geschlagene Figuren und Figuren außerhalb des Spielfeldes
            if piece.get('captured', False) or not self.engine.is_valid_position(piece['position']):
                continue

            # Die interne 10x10 Position
            pos = piece['position']

            # 10x10 zu 8x8 Koordinaten
            row = pos // 10
            gui_row = 9 - row 
            col = pos % 10
            gui_col = col - 1

            # Position auf dem Canvas
            x = gui_col * self.cell_size + self.cell_size // 2
            y = gui_row * self.cell_size + self.cell_size // 2

            # Figur zeichnen
            symbol = piece.get('symbol', '?')
            fill_color = "black" if piece['color'] == BLACK else "black"  # 🚨 KORREKTUR: Immer schwarz für bessere Sichtbarkeit
            
            self.canvas.create_text(
                x, y,
                text=symbol,
                font=("Arial", int(self.cell_size * 0.6), "bold"),  # 🚨 KORREKTUR: Kleinere Schrift mit Bold
                fill=fill_color,
                tags=("piece", f"piece_{piece['id']}", f"cell_{pos}")
            )
            piece_count += 1
        
        # 🚨 DEBUG: Überprüfe ob Figuren gezeichnet werden
        if piece_count == 0:
            print("⚠️  WARNUNG: Keine Figuren auf dem Brett gezeichnet!")
        else:
            print(f"✅ {piece_count} Figuren auf dem Brett gezeichnet")
            
    # =========================================================================
    # EREIGNISBEHANDLUNG
    # =========================================================================

    def on_square_click(self, event):
        """Behandelt Mausklicks auf dem Schachbrett."""
        # 🚨 KORREKTUR: Prüfe ob KI denkt - blockiere Benutzerinteraktion
        if self.gui.ai_thinking:
            messagebox.showinfo("KI denkt", "Die KI berechnet einen Zug. Bitte warten...")
            return
            
        # Finde die 8x8 Koordinate
        col = event.x // self.cell_size
        row = event.y // self.cell_size

        # Konvertiere zu 10x10 Engine-Position
        engine_row = 9 - row
        engine_col = col + 1
        clicked_pos = engine_row * 10 + engine_col
        
        if not self.engine.is_valid_position(clicked_pos):
            return
            
        print(f"🎯 Klick auf Position: {self._position_to_notation(clicked_pos)}")  # 🚨 DEBUG
        
        # Wenn der Editor-Modus aktiv ist
        if self.editor_mode:
            self._handle_editor_click(clicked_pos)
        else:
            self._handle_game_click(clicked_pos)


    def _handle_editor_click(self, clicked_pos):
        """Behandelt Klicks im Editor-Modus."""
        # Wähle die zu platzierende Figur
        piece_type = self.gui.selected_editor_piece['type']
        color = self.gui.selected_editor_piece['color']
        
        # Leere Feld (EMPTY) oder Klick auf dieselbe Figur entfernt
        piece_at_pos = self.engine.get_piece_at(clicked_pos)
        is_same_piece = piece_at_pos and piece_at_pos['type'] == piece_type and piece_at_pos['color'] == color

        if piece_type == EMPTY or is_same_piece:
            # Figur entfernen
            self.engine.editor_remove_piece(clicked_pos)
        else:
            # Figur platzieren
            self.engine.editor_place_piece(piece_type, color, clicked_pos)
        
        self.update_display()
        self.gui.update_status()

    def _handle_game_click(self, clicked_pos):
        """Behandelt Klicks im Spielmodus (Zugausführung)."""
        # 🚨 KORREKTUR: Prüfe ob KI denkt
        if self.gui.ai_thinking:
            messagebox.showinfo("KI denkt", "Die KI berechnet einen Zug. Bitte warten...")
            return
            
        piece_at_pos = self.engine.get_piece_at(clicked_pos)
        current_turn_color = WHITE if self.engine.white_turn else BLACK
        
        # Prüfe ob Spieler am Zug ist (nicht KI)
        if self.gui.game_mode == 'human_vs_ai' and current_turn_color == BLACK:
            messagebox.showinfo("KI am Zug", "Die KI ist am Zug. Bitte warten...")
            return
            
        print(f"🎮 Spielzug: Position {self._position_to_notation(clicked_pos)}, Figur: {piece_at_pos['type'] if piece_at_pos else 'leer'}")  # 🚨 DEBUG
            
        # 1. ERSTER KLICK: Auswahl der eigenen Figur
        if not self.from_pos:
            if piece_at_pos and piece_at_pos['color'] == current_turn_color:
                self.from_pos = clicked_pos
                self.selected_cell = f"cell_{clicked_pos}"
                self.highlight_selection(self.selected_cell)
                self.possible_moves = self._get_possible_moves_for_pos(self.from_pos)
                self.highlight_possible_moves()
                print(f"✅ Figur ausgewählt: {self._position_to_notation(clicked_pos)}")
            else:
                print(f"❌ Keine eigene Figur auf {self._position_to_notation(clicked_pos)}")
            
        # 2. ZWEITER KLICK: Zugausführung oder neue Auswahl
        elif self.from_pos:
            # Wenn auf die gleiche Figur geklickt wird (Abwahl)
            if clicked_pos == self.from_pos:
                self.clear_selection()
                print("✅ Auswahl aufgehoben")
            # Wenn auf eine andere eigene Figur geklickt wird (Neue Auswahl)
            elif piece_at_pos and piece_at_pos['color'] == current_turn_color:
                self.clear_selection()
                self.from_pos = clicked_pos
                self.selected_cell = f"cell_{clicked_pos}"
                self.highlight_selection(self.selected_cell)
                self.possible_moves = self._get_possible_moves_for_pos(self.from_pos)
                self.highlight_possible_moves()
                print(f"✅ Neue Figur ausgewählt: {self._position_to_notation(clicked_pos)}")
            # Wenn auf ein Zielfeld geklickt wird (Zugversuch)
            else:
                self.to_pos = clicked_pos
                move = self._find_move_in_list(self.from_pos, self.to_pos)
                
                if move:
                    print(f"✅ Zug gefunden: {self._position_to_notation(self.from_pos)} -> {self._position_to_notation(self.to_pos)}")
                    if self._handle_special_move_prompt(move):
                        self._execute_move(move)
                    else:
                        print("❌ Spezieller Zug abgebrochen")
                else:
                    print(f"❌ Kein legaler Zug von {self._position_to_notation(self.from_pos)} nach {self._position_to_notation(self.to_pos)}")
                    messagebox.showwarning("Ungültiger Zug", "Dieser Zug ist nicht erlaubt.")
                
                self.clear_selection()

    def _handle_special_move_prompt(self, move: dict) -> bool:
        """Behandelt spezielle Züge wie Bauernumwandlung."""
        if move.get('special_type') == 'promotion':
            choice = tk.simpledialog.askstring("Bauernumwandlung", "Wähle eine Figur (Dame, Turm, Läufer, Springer):", parent=self)
            
            if choice:
                # Annahme: engine.rules._get_promotion_piece_type existiert und ist korrekt
                promotion_type = self.engine.rules._get_promotion_piece_type(choice) 
                if promotion_type:
                    move['promotion_type'] = promotion_type
                    return True
                else:
                    messagebox.showerror("Fehler", "Ungültige Figur gewählt. Standard: Dame.")
                    move['promotion_type'] = QUEEN # Standard: Dame
                    return True
            else:
                return False # Abbruch der Umwandlung
        
        return True

    def _execute_move(self, move):
        """Führt den Zug aus und aktualisiert die Anzeige."""
        print(f"🔧 Führe Zug aus: {self._position_to_notation(move['from_pos'])} -> {self._position_to_notation(move['to_pos'])}")
        
        if self.engine.make_move(move):
            print("✅ Zug erfolgreich ausgeführt")
            self.update_display()
            self.gui.update_status()

            # Prüfe, ob die KI an der Reihe ist (nur im Mensch vs KI Modus)
            self.gui.check_ai_turn()
        else:
            print("❌ Zug fehlgeschlagen")
            messagebox.showwarning("Illegaler Zug", "Dieser Zug ist nicht erlaubt.")

    # =========================================================================
    # ZUG-HILFSFUNKTIONEN
    # =========================================================================

    def _get_possible_moves_for_pos(self, from_pos):
        """Filtert legale Züge nach Startposition - KORRIGIERTE VERSION"""
        color = WHITE if self.engine.white_turn else BLACK
        all_legal_moves = self.engine.generate_all_moves(color) 
        moves_for_pos = [move for move in all_legal_moves if move['from_pos'] == from_pos]
        
        # 🚨 DEBUG: Zeige alle gefundenen Züge
        print(f"🔍 {len(moves_for_pos)} mögliche Züge für Position {self._position_to_notation(from_pos)}")
        for move in moves_for_pos:
            move_type = "Normal"
            if move.get('special_type') == 'castling':
                move_type = "Rochade"
            elif move.get('special_type') == 'en_passant':
                move_type = "En Passant" 
            elif move.get('promotion_piece'):
                move_type = f"Umwandlung zu {move['promotion_piece']}"
            print(f"   - {self._position_to_notation(move['from_pos'])} -> {self._position_to_notation(move['to_pos'])} [{move_type}]")
        
        return moves_for_pos

    def _find_move_in_list(self, from_pos, to_pos):
        """Findet den entsprechenden Zug in der Liste der möglichen Züge."""
        for move in self.possible_moves:
            if move['to_pos'] == to_pos:
                return move
        return None

    # =========================================================================
    # MARKIERUNG (HIGHLIGHTING)
    # =========================================================================

    def clear_highlights(self):
        """Entfernt alle Markierungen vom Brett."""
        self.canvas.delete("highlight")
        self.canvas.delete("possible_move")
        # 🚨 KORREKTUR: Zeichne das Brett NICHT neu, da dies die Figuren löscht
        # Stattdessen setze nur die Umrandungen zurück
        highlighted_items = self.canvas.find_withtag("square")
        for item in highlighted_items:
            if self.canvas.type(item) == "rectangle":
                # Setze Umrandung auf Standard (keine Umrandung)
                self.canvas.itemconfig(item, outline="", width=1)

    def highlight_selection(self, tag):
        """Markiert die ausgewählte Zelle (Rechteck)."""
        self.clear_highlights()  # 🚨 KORREKTUR: Entferne zuerst alle Highlights
        
        self.canvas.addtag_withtag("highlight", tag)
        self.canvas.tag_raise("highlight") # Highlights über Figuren zeichnen
        
        # KORREKTUR: Finde alle Rechtecke mit dem Highlight-Tag und konfiguriere sie
        highlighted_items = self.canvas.find_withtag("highlight")
        for item in highlighted_items:
            # Prüfe ob es sich um ein Rechteck handelt
            if self.canvas.type(item) == "rectangle":
                self.canvas.itemconfig(item, outline=self.highlight_color, width=3)

    def highlight_possible_moves(self):
        """Markiert mögliche Zielfelder."""
        for move in self.possible_moves:
            to_pos = move['to_pos']
            tag = f"cell_{to_pos}"

            piece_at_target = self.engine.get_piece_at(to_pos)

            if piece_at_target:
                # Markierung für Schlag (Kreis)
                color = self.possible_capture_color
                self._draw_circle_highlight(to_pos, color)
            else:
                # Markierung für normalen Zug (Punkt)
                color = self.possible_move_color
                self._draw_circle_highlight(to_pos, color)
            
            # Markierung für das Feld selbst (Rückseite)
            self.canvas.addtag_withtag("possible_move", tag)
            self.canvas.tag_lower("possible_move") # Unter die Figuren/Kreise

    def _draw_circle_highlight(self, pos_10x10, color):
        """Zeichnet einen Kreis auf einem Zielfeld."""
        # Konvertiere 10x10-Position zu Canvas-Koordinaten
        row = pos_10x10 // 10
        col = pos_10x10 % 10
        gui_row = 9 - row
        gui_col = col - 1

        x = gui_col * self.cell_size + self.cell_size // 2
        y = gui_row * self.cell_size + self.cell_size // 2
        radius = self.cell_size * 0.15  # 🚨 KORREKTUR: Kleinere Kreise

        # Zeichne Kreis
        self.canvas.create_oval(
            x - radius, y - radius, 
            x + radius, y + radius, 
            fill=color, 
            outline="black",
            width=1,
            tags=("possible_move")
        )

    # =========================================================================
    # HILFSFUNKTIONEN
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
    # ZUSAMMENFASSUNG / EDITOR-FUNKTIONEN
    # =========================================================================

    def enable_editor_mode(self):
        """Aktiviert den Editor-Modus"""
        self.editor_mode = True
        self.canvas.config(cursor="hand2")
        self.clear_selection()

    def disable_editor_mode(self):
        """Deaktiviert den Editor-Modus"""
        self.editor_mode = False
        self.canvas.config(cursor="")
        self.clear_selection()

    def flip_board(self):
        """Dreht das Brett um (visuell)"""
        self.update_display()

    def clear_selection(self):
        """Setzt die Auswahl zurück"""
        self.from_pos = None
        self.to_pos = None
        self.selected_cell = None
        self.possible_moves = []
        self.clear_highlights()

    def update_display(self):
        """Aktualisiert die Anzeige - 🚨 KORREKTUR: Vereinfachte Methode"""
        print("🔄 Aktualisiere Brett-Anzeige...")
        
        # 🚨 KORREKTUR: Zeichne zuerst das Brett, dann die Figuren
        self.draw_board()
        self.draw_pieces()
        
        # 🚨 KORREKTUR: Erzwinge Canvas-Update
        self.canvas.update_idletasks()
        
        print("✅ Brett-Anzeige aktualisiert")
