import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
from chessteg import ChesstegEngine, WHITE, BLACK, EMPTY, PAWN, ROOK, BISHOP, KNIGHT, QUEEN, KING, DUMMY  # DUMMY hinzufügen

class ChessBoard(tk.Canvas):
    def __init__(self, parent, engine, gui, cell_size=60):
        self.cell_size = cell_size
        self.board_size = cell_size * 8
        super().__init__(parent, width=self.board_size, height=self.board_size, 
                        bg='white', highlightthickness=2, highlightbackground='black')
        
        self.engine = engine
        self.gui = gui  # Referenz zur Haupt-GUI
        
        self.selected_cell = None
        self.from_pos = None
        self.possible_moves = []
        
        # Farben
        self.white_color = '#f0d9b5'
        self.black_color = '#b58863'
        self.highlight_color = '#ffeb3b'
        self.possible_move_color = '#90ee90'
        self.possible_capture_color = '#ffb6c1'
        
        # Figuren-Symbole (Unicode) - KORRIGIERTE DARSTELLUNG
        self.piece_symbols = {
            'wP': '♙', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wQ': '♕', 'wK': '♔',
            'bP': '♟', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bQ': '♛', 'bK': '♚'
        }

        
        self.bind('<Button-1>', self.on_click)
        self.draw_board()
        self.draw_pieces()
    
    def get_piece_code(self, piece_value):
        if piece_value == EMPTY:
            return None
            
        color = 'w' if piece_value > 0 else 'b'  # Weiß = positive Werte
        piece_type = abs(piece_value)
        
        types = {
            PAWN: 'P',
            ROOK: 'R', 
            BISHOP: 'B',
            KNIGHT: 'N',
            QUEEN: 'Q',
            KING: 'K'
        }
        
        return color + types.get(piece_type, '?')
    
    def position_to_coords(self, position):
        """Konvertiert interne Position zu Brett-Koordinaten"""
        row = position // 10
        col = position % 10
        # Umrechnung für UI-Darstellung
        ui_row = 8 - (row - 1)  # Von unten nach oben
        ui_col = col - 1         # Von links nach rechts
        return ui_row, ui_col
    
    def screen_to_board_pos(self, x, y):
        """Konvertiert Bildschirm-Koordinaten zu Brett-Position"""
        col = x // self.cell_size
        row = y // self.cell_size
        
        # Umrechnung in interne Position
        board_row = 8 - row
        board_col = col + 1
        position = (board_row + 1) * 10 + board_col
        
        return position
    
    def draw_board(self):
        """Zeichnet das Schachbrett"""
        self.delete("all")
        
        # Zeichne Felder
        for row in range(8):
            for col in range(8):
                x1 = col * self.cell_size
                y1 = row * self.cell_size
                x2 = x1 + self.cell_size
                y2 = y1 + self.cell_size
                
                color = self.white_color if (row + col) % 2 == 0 else self.black_color
                self.create_rectangle(x1, y1, x2, y2, fill=color, outline='')
        
        # Zeichne Koordinaten
        files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
        for i, file in enumerate(files):
            x = i * self.cell_size + self.cell_size // 2
            self.create_text(x, self.board_size + 15, text=file, font=('Arial', 10))
            
        for i in range(8):
            y = i * self.cell_size + self.cell_size // 2
            self.create_text(-15, y, text=str(8 - i), font=('Arial', 10))
    
    def draw_pieces(self):
        """Zeichnet die Schachfiguren"""
        self.delete('piece')  # Alte Figuren entfernen
    
        for piece in self.engine.pieces:
            if piece['captured']:
                continue
            
            row, col = self.position_to_coords(piece['pos'])
            x = col * self.cell_size + self.cell_size // 2
            y = row * self.cell_size + self.cell_size // 2
        
            piece_code = self.get_piece_code(piece['type'] * piece['color'])
            if piece_code in self.piece_symbols:
                symbol = self.piece_symbols[piece_code]
                # KORREKTUR: Richtige Farbzuordnung
                # Weiße Figuren (WHITE = 1) sollen weißen Text haben
                # Schwarze Figuren (BLACK = -1) sollen schwarzen Text haben
                fill_color = 'white' if piece['color'] == WHITE else 'black'
                self.create_text(x, y, text=symbol, font=('Arial', 32), 
                               fill=fill_color, tags='piece')
    
    def highlight_cell(self, position, color):
        """Hervorhebung einer Zelle"""
        row, col = self.position_to_coords(position)
        x1 = col * self.cell_size
        y1 = row * self.cell_size
        x2 = x1 + self.cell_size
        y2 = y1 + self.cell_size
        
        self.create_rectangle(x1, y1, x2, y2, fill=color, outline='', tags='highlight')
        # Stelle sicher, dass die Hervorhebung unter den Figuren liegt
        self.tag_lower('highlight')
    
    def show_possible_moves(self, from_position):
        """Zeigt mögliche Züge für eine Figur an"""
        piece = next((p for p in self.engine.pieces 
                     if p['pos'] == from_position and not p['captured']), None)
        
        if not piece:
            return
        
        self.possible_moves = [move for move in self.engine.generate_moves(piece['color']) 
                              if move['from_pos'] == from_position]
        
        for move in self.possible_moves:
            if move['captured']:
                self.highlight_cell(move['to_pos'], self.possible_capture_color)
            else:
                self.highlight_cell(move['to_pos'], self.possible_move_color)
        
        # Hervorhebung der ausgewählten Figur
        self.highlight_cell(from_position, self.highlight_color)
    
    def clear_highlights(self):
        """Entfernt alle Hervorhebungen"""
        self.delete('highlight')
        self.possible_moves = []
    
    def on_click(self, event):
        """Behandelt Mausklicks auf dem Brett"""
        board_pos = self.screen_to_board_pos(event.x, event.y)
        
        # Prüfe Spielmodus-Beschränkungen
        if self.gui.game_mode == 'ai_vs_ai':
            messagebox.showinfo("Info", "Im KI vs KI Modus sind keine manuellen Züge möglich")
            return
            
        if self.gui.game_mode == 'human_vs_ai':
            human_color = WHITE  # Annahme: Mensch spielt Weiß
            current_color = WHITE if self.engine.white_turn else BLACK
            if current_color != human_color:
                messagebox.showinfo("Info", "Computer ist am Zug - bitte warten")
                return
        
        # Zurücksetzen der visuellen Auswahl
        self.clear_highlights()
        
        # Prüfe ob auf eine eigene Figur geklickt wurde
        piece_value = self.engine.board[board_pos]
        is_own_piece = ((self.engine.white_turn and piece_value > 0) or 
                       (not self.engine.white_turn and piece_value < 0))
        
        # KORREKTUR: DUMMY wurde importiert
        if is_own_piece and piece_value != EMPTY and piece_value != DUMMY:
            # Startfeld ausgewählt
            self.selected_cell = board_pos
            self.from_pos = board_pos
            
            # Mögliche Züge anzeigen
            self.show_possible_moves(board_pos)
        else:
            # Zielfeld ausgewählt
            self.to_pos = board_pos
            
            # Automatisch ausführen wenn beide Felder ausgefüllt sind
            if self.from_pos and self.to_pos:
                # Finde den entsprechenden Zug
                piece = next((p for p in self.engine.pieces 
                            if p['pos'] == self.from_pos and not p['captured']), None)
                
                if piece:
                    possible_moves = self.engine.generate_moves(piece['color'])
                    valid_moves = [move for move in possible_moves 
                                 if move['from_pos'] == self.from_pos and move['to_pos'] == self.to_pos]
                    
                    if valid_moves:
                        move = valid_moves[0]
                        if self.engine.execute_move(move):
                            self.gui.update_display()
                            # Automatischer Computerzug
                            self.gui.automatic_computer_move()
                        else:
                            messagebox.showerror("Fehler", "Ungültiger Zug!")
                    else:
                        messagebox.showerror("Fehler", "Ungültiger Zug für diese Figur!")
                else:
                    messagebox.showerror("Fehler", "Keine Figur auf dem Startfeld!")
                
                self.clear_selection()
    
    def clear_selection(self):
        """Setzt die Auswahl zurück"""
        self.from_pos = None
        self.to_pos = None
        self.selected_cell = None
        self.clear_highlights()
    
    def update_display(self):
        """Aktualisiert die Anzeige"""
        self.draw_board()
        self.draw_pieces()

class ChessGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Chessteg - Didaktisches Schachprogramm")
        self.root.geometry("800x600")
        
        self.engine = ChesstegEngine()
        self.game_mode = 'human_vs_human'
        self.ai_thinking = False
        
        self.create_widgets()
        self.update_display()
    
    def create_widgets(self):
        """Erstellt die GUI-Elemente"""
        # Haupt-Frame
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Linke Seite: Schachbrett
        left_frame = ttk.Frame(main_frame)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        self.chess_board = ChessBoard(left_frame, self.engine, self)
        self.chess_board.pack(pady=10)
        
        # Rechte Seite: Steuerung
        right_frame = ttk.Frame(main_frame, width=250)
        right_frame.pack(side=tk.RIGHT, fill=tk.Y, padx=(10, 0))
        right_frame.pack_propagate(False)
        
        # Titel
        title_label = ttk.Label(right_frame, text="Chessteg Schach", 
                               font=('Arial', 16, 'bold'))
        title_label.pack(pady=(0, 20))
        
        # Status-Anzeige
        self.status_frame = ttk.LabelFrame(right_frame, text="Spielstatus", padding=10)
        self.status_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.turn_label = ttk.Label(self.status_frame, text="Weiß am Zug")
        self.turn_label.pack(anchor=tk.W)
        
        self.eval_label = ttk.Label(self.status_frame, text="Bewertung: 0")
        self.eval_label.pack(anchor=tk.W)
        
        self.status_label = ttk.Label(self.status_frame, text="Status: Läuft")
        self.status_label.pack(anchor=tk.W)
        
        # Spielmodus
        mode_frame = ttk.LabelFrame(right_frame, text="Spielmodus", padding=10)
        mode_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.mode_label = ttk.Label(mode_frame, text="Modus: Mensch vs Mensch")
        self.mode_label.pack(anchor=tk.W)
        
        ttk.Button(mode_frame, text="Computerzug", 
                  command=self.computer_move).pack(fill=tk.X, pady=2)
        ttk.Button(mode_frame, text="Spieler vs KI", 
                  command=lambda: self.set_game_mode('human_vs_ai')).pack(fill=tk.X, pady=2)
        ttk.Button(mode_frame, text="KI vs KI", 
                  command=lambda: self.set_game_mode('ai_vs_ai')).pack(fill=tk.X, pady=2)
        
        # Steuerung
        control_frame = ttk.LabelFrame(right_frame, text="Steuerung", padding=10)
        control_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Button(control_frame, text="Neues Spiel", 
                  command=self.new_game).pack(fill=tk.X, pady=2)
        ttk.Button(control_frame, text="Reset", 
                  command=self.reset_game).pack(fill=tk.X, pady=2)
        ttk.Button(control_frame, text="Zug zurück", 
                  command=self.undo_move).pack(fill=tk.X, pady=2)
        
        # KI-Status
        self.thinking_label = ttk.Label(right_frame, text="", foreground='red')
        self.thinking_label.pack(pady=5)
    
    def get_mode_name(self):
        names = {
            'human_vs_human': 'Mensch vs Mensch',
            'human_vs_ai': 'Mensch vs KI', 
            'ai_vs_ai': 'KI vs KI'
        }
        return names.get(self.game_mode, 'Unbekannt')
    
    def update_status(self):
        """Aktualisiert die Status-Anzeige"""
        turn_text = "Weiß am Zug" if self.engine.white_turn else "Schwarz am Zug"
        self.turn_label.config(text=turn_text)
        
        self.eval_label.config(text=f"Bewertung: {self.engine.evaluation}")
        
        if self.engine.checkmate:
            status_text = "SCHACHMATT!"
        elif self.engine.stalemate:
            status_text = "Patt!"
        elif self.engine.is_king_in_check(WHITE if self.engine.white_turn else BLACK):
            status_text = "SCHACH!"
        else:
            status_text = "Läuft"
        self.status_label.config(text=f"Status: {status_text}")
        
        self.mode_label.config(text=f"Modus: {self.get_mode_name()}")
        
        if self.ai_thinking:
            self.thinking_label.config(text="KI denkt nach...")
        else:
            self.thinking_label.config(text="")
    
    def computer_move(self):
        """Führt einen Computerzug aus"""
        if self.ai_thinking:
            return
            
        self.ai_thinking = True
        self.update_status()
        
        def ai_thread():
            best_move = self.engine.computer_move()
            if best_move:
                self.engine.execute_move(best_move)
            
            self.ai_thinking = False
            self.root.after(0, self.update_display)
        
        # Starte KI-Berechnung in separatem Thread
        thread = threading.Thread(target=ai_thread)
        thread.daemon = True
        thread.start()
    
    def automatic_computer_move(self):
        """Startet automatischen Computerzug nach Spielerzug"""
        if self.game_mode in ['human_vs_ai', 'ai_vs_ai']:
            current_color = WHITE if self.engine.white_turn else BLACK
            
            # Prüfe ob Computer am Zug ist
            if ((self.game_mode == 'human_vs_ai' and current_color == BLACK) or 
                self.game_mode == 'ai_vs_ai'):
                
                # Kurze Verzögerung
                self.root.after(1000, self.computer_move)
    
    def set_game_mode(self, mode):
        """Setzt den Spielmodus"""
        self.game_mode = mode
        self.update_status()
        
        if mode == 'ai_vs_ai':
            self.start_ai_vs_ai()
    
    def start_ai_vs_ai(self):
        """Startet KI vs KI Modus"""
        if self.game_mode == 'ai_vs_ai' and not self.ai_thinking:
            self.computer_move()
    
    def new_game(self):
        """Startet ein neues Spiel"""
        self.engine = ChesstegEngine()
        self.chess_board.engine = self.engine
        self.chess_board.clear_selection()
        self.game_mode = 'human_vs_human'
        self.update_display()
    
    def reset_game(self):
        """Setzt das Spiel zurück"""
        self.engine.initialize_pieces()
        self.engine.white_turn = True
        self.engine.checkmate = False
        self.engine.stalemate = False
        self.chess_board.clear_selection()
        self.game_mode = 'human_vs_human'
        self.update_display()
    
    def undo_move(self):
        """Macht den letzten Zug rückgängig"""
        if self.engine.undo_move():
            self.update_display()
    
    def update_display(self):
        """Aktualisiert die gesamte Anzeige"""
        self.chess_board.update_display()
        self.update_status()
    
    def run(self):
        """Startet die Hauptschleife"""
        self.root.mainloop()

if __name__ == "__main__":
    gui = ChessGUI()
    gui.run()