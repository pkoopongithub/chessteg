"""
Chessteg GUI Module - KORRIGIERTE VERSION (Behebt KI-Probleme)
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time

# KORREKTUR: Korrekter Import über das 'engine' Paket
from engine.core import ChesstegEngine, WHITE, BLACK, EMPTY, PAWN, ROOK, BISHOP, KNIGHT, QUEEN, KING, DUMMY
from .chess_board import ChessBoard

class ChessGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Chessteg - Didaktisches Schachprogramm")
        self.root.geometry("800x600")
        
        self.engine = ChesstegEngine()
        self.game_mode = 'human_vs_human'  # Standard: Mensch vs Mensch
        self.ai_thinking = False
        self.editor_mode = False
        self.selected_editor_piece = {'type': PAWN, 'color': WHITE}
        
        # 🚨 KORREKTUR: Thread-Synchronisation
        self.thread_lock = threading.Lock()
        
        self.create_widgets()
        self.setup_editor_controls()
        self.update_display()
    
    def create_widgets(self):
        """Erstellt die GUI-Elemente"""
        # Haupt-Frame
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Linke Seite: Schachbrett
        left_frame = ttk.Frame(main_frame)
        left_frame.pack(side=tk.LEFT, padx=10, pady=10)
        
        self.chess_board = ChessBoard(left_frame, self.engine, self)
        self.chess_board.pack()

        # Rechte Seite: Steuerung und Status
        right_frame = ttk.Frame(main_frame)
        right_frame.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)
        
        # Status
        status_frame = ttk.LabelFrame(right_frame, text="Status & Bewertung")
        status_frame.pack(fill=tk.X, pady=5)
        
        self.status_label = ttk.Label(status_frame, text="Status: Neues Spiel")
        self.status_label.pack(fill=tk.X, padx=5, pady=5)
        
        self.turn_label = ttk.Label(status_frame, text="Am Zug: Weiß (Human)")
        self.turn_label.pack(fill=tk.X, padx=5, pady=5)

        # Bewertung
        self.eval_label = ttk.Label(status_frame, text="Bewertung: N/A")
        self.eval_label.pack(fill=tk.X, padx=5, pady=5)

        # Spielmodus-Steuerung
        mode_frame = ttk.LabelFrame(right_frame, text="Spielmodus")
        mode_frame.pack(fill=tk.X, pady=10)
        
        ttk.Button(mode_frame, text="Mensch vs Mensch", 
                   command=lambda: self.set_game_mode('human_vs_human')).pack(fill=tk.X, pady=2)
        ttk.Button(mode_frame, text="Mensch vs KI", 
                   command=lambda: self.set_game_mode('human_vs_ai')).pack(fill=tk.X, pady=2)
        ttk.Button(mode_frame, text="KI vs KI", 
                   command=lambda: self.set_game_mode('ai_vs_ai')).pack(fill=tk.X, pady=2)

        # Aktionen
        action_frame = ttk.LabelFrame(right_frame, text="Aktionen")
        action_frame.pack(fill=tk.X, pady=10)
        
        ttk.Button(action_frame, text="Neues Spiel", command=self.new_game).pack(fill=tk.X, pady=2)
        ttk.Button(action_frame, text="Zurücksetzen", command=self.reset_game).pack(fill=tk.X, pady=2)
        ttk.Button(action_frame, text="Zug zurück", command=self.undo_move).pack(fill=tk.X, pady=2)
        ttk.Button(action_frame, text="Brett drehen (visuell)", command=self.chess_board.flip_board).pack(fill=tk.X, pady=2)
        
        # Editor-Steuerung
        self.editor_frame = ttk.LabelFrame(right_frame, text="Editor", style='TFrame')
        self.editor_toggle_button = ttk.Button(right_frame, text="Editor AN/AUS", command=self.toggle_editor_mode)
        self.editor_toggle_button.pack(fill=tk.X, pady=10)


    def setup_editor_controls(self):
        """Erstellt die Steuerelemente für den Editor-Modus"""
        
        # Figurenauswahl
        piece_options_frame = ttk.Frame(self.editor_frame)
        piece_options_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(piece_options_frame, text="Figur:").pack(side=tk.LEFT, padx=5)
        
        self.piece_var = tk.StringVar(self.root, 'P')
        pieces = ['P', 'N', 'B', 'R', 'Q', 'K', 'E'] # 'E' für Empty/Entfernen
        piece_menu = ttk.OptionMenu(piece_options_frame, self.piece_var, 'P', *pieces, command=self._update_selected_piece)
        piece_menu.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        ttk.Label(piece_options_frame, text="Farbe:").pack(side=tk.LEFT, padx=5)
        self.color_var = tk.StringVar(self.root, 'W')
        colors = ['W', 'B']
        color_menu = ttk.OptionMenu(piece_options_frame, self.color_var, 'W', *colors, command=self._update_selected_piece)
        color_menu.pack(side=tk.LEFT, fill=tk.X, expand=True)

        self._update_selected_piece()
        
        # Aktionen
        editor_actions_frame = ttk.Frame(self.editor_frame)
        editor_actions_frame.pack(fill=tk.X, padx=5, pady=5)

        ttk.Button(editor_actions_frame, text="Brett leeren", command=self._editor_clear).pack(fill=tk.X, pady=2)
        ttk.Button(editor_actions_frame, text="Standardstellung", command=self._editor_standard).pack(fill=tk.X, pady=2)


    def _get_piece_code(self, symbol):
        """Hilfsfunktion, um Symbole in Engine-Typen zu übersetzen"""
        mapping = {'P': PAWN, 'N': KNIGHT, 'B': BISHOP, 'R': ROOK, 'Q': QUEEN, 'K': KING, 'E': EMPTY}
        return mapping.get(symbol, PAWN)

    def _get_color_code(self, symbol):
        """Hilfsfunktion, um Symbole in Engine-Farben zu übersetzen"""
        return WHITE if symbol == 'W' else BLACK
        
    def _update_selected_piece(self, *args):
        """Aktualisiert die Figur, die im Editor platziert werden soll."""
        self.selected_editor_piece = {
            'type': self._get_piece_code(self.piece_var.get()),
            'color': self._get_color_code(self.color_var.get())
        }

    def _editor_clear(self):
        self.engine.editor_clear_board()
        self.update_display()
        self.update_status()

    def _editor_standard(self):
        self.engine.editor_standard_position()
        self.update_display()
        self.update_status()

    def toggle_editor_mode(self):
        """Schaltet den Editor-Modus um"""
        self.editor_mode = not self.editor_mode
        if self.editor_mode:
            self.chess_board.enable_editor_mode()
            self.editor_frame.pack(fill=tk.X, pady=5)
            self.set_game_mode('editor')
            self.editor_toggle_button.config(text="Editor AN/AUS (Editor Modus aktiv)")
        else:
            self.chess_board.disable_editor_mode()
            self.editor_frame.pack_forget()
            self.set_game_mode('human_vs_human')
            self.editor_toggle_button.config(text="Editor AN/AUS")

    def set_game_mode(self, mode):
        """Setzt den aktuellen Spielmodus."""
        self.game_mode = mode
        if mode != 'editor':
            # Verhindert, dass der Editor-Modus aktiv bleibt
            self.editor_mode = False
            self.chess_board.disable_editor_mode() 
            self.editor_frame.pack_forget()
            self.editor_toggle_button.config(text="Editor AN/AUS")
            
            # Startet ggf. den KI vs KI Modus
            if self.game_mode == 'ai_vs_ai':
                self.start_ai_vs_ai()
        
        self.chess_board.clear_selection()
        self.update_status()
        self.check_ai_turn()

    def update_status(self):
        """Aktualisiert die Status-Labels."""
        current_turn = "Weiß" if self.engine.white_turn else "Schwarz"
        current_color = WHITE if self.engine.white_turn else BLACK
        
        mode_text = f" ({self.game_mode})"
        if self.game_mode == 'human_vs_human':
            mode_text = " (Mensch vs Mensch)"
        elif self.game_mode == 'human_vs_ai':
            opponent = "KI" if current_color == BLACK else "Mensch"
            mode_text = f" (Mensch vs KI - {opponent} am Zug)"
        elif self.game_mode == 'ai_vs_ai':
            mode_text = " (KI vs KI)"
        elif self.game_mode == 'editor':
            mode_text = " (Editor Modus)"

        self.turn_label.config(text=f"Am Zug: {current_turn}{mode_text}")
        
        if self.engine.checkmate:
            winner = "Schwarz" if self.engine.white_turn else "Weiß"
            self.status_label.config(text=f"Status: Schachmatt! {winner} gewinnt.")
        elif self.engine.stalemate:
            self.status_label.config(text="Status: Patt!")
        elif self.engine.is_king_in_check(current_color):
            self.status_label.config(text="Status: Schach!")
        else:
            self.status_label.config(text="Status: Im Spiel")

        # KORREKTUR: Aufruf der Methode evaluate_position() im Evaluator-Objekt
        if self.engine.evaluator:
            evaluation_score = self.engine.evaluator.evaluate_position()
            self.eval_label.config(text=f"Bewertung: {evaluation_score:.2f}")
        else:
            self.eval_label.config(text="Bewertung: N/A")

    def computer_move(self):
        """Lässt die KI einen Zug berechnen und ausführen (in einem Thread)"""
        if self.ai_thinking:
            return

        self.ai_thinking = True
        print("🤖 KI beginnt mit Zugberechnung...")
        
        # 🚨 KORREKTUR: Thread-Safe GUI Updates
        def calculate_move():
            try:
                with self.thread_lock:
                    best_move = self.engine.search_algorithm.computer_move()
                
                # 🚨 KORREKTUR: Thread-sicheres GUI-Update
                if self.root and self.root.winfo_exists():
                    self.root.after(0, lambda: self._process_computer_move(best_move))
                    
            except Exception as e:
                print(f"❌ KI-Berechnungsfehler: {e}")
                import traceback
                traceback.print_exc()
                # 🚨 KORREKTUR: Immer sicherstellen, dass ai_thinking zurückgesetzt wird
                if self.root and self.root.winfo_exists():
                    self.root.after(0, self._reset_ai_thinking)
            
        threading.Thread(target=calculate_move, daemon=True).start()

    def _process_computer_move(self, best_move):
        """Verarbeitet das Ergebnis des KI-Zugs - KORRIGIERTE VERSION"""
        print("🔄 Verarbeite KI-Zug...")
        self.ai_thinking = False
        
        if best_move:
            print(f"🔧 KI möchte Zug ausführen: {self._move_to_notation(best_move)}")
            if self.engine.make_move(best_move):
                print(f"✅ KI-Zug ausgeführt: {self._move_to_notation(best_move)}")
                self.update_display()
                self.update_status()
                
                # Im KI vs KI Modus sofort nächsten Zug starten
                if self.game_mode == 'ai_vs_ai' and not self.engine.is_game_over():
                    print("🔄 KI vs KI: Starte nächsten Zug...")
                    self.root.after(1000, self.computer_move)  # 1 Sekunde Pause zwischen Zügen
                else:
                    self.check_ai_turn() # Normale Prüfung für Mensch vs KI
            else:
                print("❌ KI-Zug fehlgeschlagen - Zug konnte nicht ausgeführt werden")
                # Im KI vs KI Modus trotzdem weitermachen
                if self.game_mode == 'ai_vs_ai' and not self.engine.is_game_over():
                    fallback_move = self._get_fallback_move()
                    if fallback_move:
                        print(f"🔄 Versuche Fallback-Zug: {self._move_to_notation(fallback_move)}")
                        if self.engine.make_move(fallback_move):
                            self.update_display()
                            self.update_status()
                            self.root.after(1000, self.computer_move)
        else:
            print("❌ Kein KI-Zug gefunden")
            # Prüfe ob Spiel vorbei ist
            if self.engine.checkmate:
                print("🏁 Schachmatt erkannt!")
                messagebox.showinfo("Spielende", "Schachmatt!")
            elif self.engine.stalemate:
                print("🏁 Patt erkannt!")
                messagebox.showinfo("Spielende", "Patt!")
            else:
                print("⚠️  KI Problem - kein Zug gefunden aber Spiel nicht beendet")
                # Im KI vs KI Modus trotzdem weitermachen mit Fallback
                if self.game_mode == 'ai_vs_ai':
                    fallback_move = self._get_fallback_move()
                    if fallback_move:
                        print(f"🔄 Verwende Fallback-Zug: {self._move_to_notation(fallback_move)}")
                        if self.engine.make_move(fallback_move):
                            self.update_display()
                            self.update_status()
                            self.root.after(1000, self.computer_move)
                        else:
                            print("💥 Fallback-Zug auch fehlgeschlagen - KI vs KI gestoppt")
                    else:
                        print("💥 Kein Fallback-Zug verfügbar - KI vs KI gestoppt")
    
    def _get_fallback_move(self):
        """Findet einen einfachen Fallback-Zug falls die KI versagt - KORRIGIERTE VERSION"""
        current_color = -1 if self.engine.white_turn else 1  # Gegenteilige Farbe (KI war am Zug)
        moves = self.engine.generate_all_moves(current_color)
        if moves:
            # Nimm den ersten verfügbaren Zug (einfacher Algorithmus)
            print(f"🔄 Fallback: {len(moves)} Züge verfügbar, nehme ersten")
            return moves[0]
        else:
            print("💥 Fallback: Keine Züge verfügbar!")
            return None

    def _reset_ai_thinking(self):
        """Setzt den KI-Denkstatus zurück (Fehlerbehandlung)."""
        self.ai_thinking = False
        print("🔄 KI-Denkstatus zurückgesetzt")

    def check_ai_turn(self):
        """Prüft, ob die KI am Zug ist und startet ggf. die Berechnung."""
        # 🚨 KORREKTUR: Prüfe ob KI bereits denkt
        if self.ai_thinking:
            return
            
        current_turn_color = WHITE if self.engine.white_turn else BLACK
        
        is_ai_turn = False
        if self.game_mode == 'human_vs_ai' and current_turn_color == BLACK:
            is_ai_turn = True
        elif self.game_mode == 'ai_vs_ai':
            is_ai_turn = True
            
        if is_ai_turn and not self.engine.checkmate and not self.engine.stalemate:
            # 🚨 KORREKTUR: Verzögerung für GUI-Responsiveness
            print(f"🤖 KI ist am Zug (Farbe: {'Schwarz' if current_turn_color == BLACK else 'Weiß'})")
            self.root.after(500, self.computer_move) 
            
    def start_ai_vs_ai(self):
        """Startet KI vs KI Modus - KORRIGIERTE VERSION"""
        if self.game_mode == 'ai_vs_ai' and not self.ai_thinking:
            print("🎮 Starte KI vs KI Modus...")
            # Kurze Verzögerung für bessere GUI-Responsiveness
            self.root.after(2000, self.computer_move)
            
    def new_game(self):
        """Startet ein neues Spiel"""
        # 🚨 KORREKTUR: Thread-Safe Engine-Reset
        with self.thread_lock:
            self.engine = ChesstegEngine()
            self.chess_board.engine = self.engine
            self.chess_board.clear_selection()
            self.game_mode = 'human_vs_human'
            self.update_display()
            print("🔄 Neues Spiel gestartet")
    
    def reset_game(self):
        """Setzt das Spiel zurück"""
        # 🚨 KORREKTUR: Thread-Safe Reset
        with self.thread_lock:
            self.engine.initialize_pieces()
            self.engine.white_turn = True
            self.engine.checkmate = False
            self.engine.stalemate = False
            self.chess_board.clear_selection()
            self.game_mode = 'human_vs_human'
            self.update_display()
            print("🔄 Spiel zurückgesetzt")
    
    def undo_move(self):
        """Macht den letzten Zug rückgängig"""
        # 🚨 KORREKTUR: Thread-Safe Undo
        with self.thread_lock:
            if self.engine.undo_move():
                self.update_display()
                self.update_status() # Status nach Undo aktualisieren
                print("↩️  Zug rückgängig gemacht")
    
    def update_display(self):
        """Aktualisiert die gesamte Anzeige"""
        try:
            self.chess_board.update_display()
            self.update_status()
            # 🚨 KORREKTUR: Explizites Update des Hauptfensters
            self.root.update_idletasks()
        except Exception as e:
            print(f"❌ Fehler beim GUI-Update: {e}")

    def _move_to_notation(self, move):
        """Konvertiert Zug zu algebraischer Notation"""
        files = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', '']
        from_pos = move['from_pos']
        to_pos = move['to_pos']
        
        from_file = files[from_pos % 10]
        from_rank = str(from_pos // 10 - 1)
        to_file = files[to_pos % 10]
        to_rank = str(to_pos // 10 - 1)
        
        return f"{from_file}{from_rank}{to_file}{to_rank}"

    def run(self):
        """Startet die Tkinter-Hauptschleife"""
        try:
            print("🎮 Chessteg GUI gestartet")
            self.root.mainloop()
        except KeyboardInterrupt:
            print("Programm durch Benutzer beendet")
        except Exception as e:
            print(f"Unerwarteter Fehler: {e}")
        finally:
            # 🚨 KORREKTUR: Sauberes Beenden
            if hasattr(self, 'root') and self.root:
                self.root.quit()
            print("👋 Chessteg beendet")