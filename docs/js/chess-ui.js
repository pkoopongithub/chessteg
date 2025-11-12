// chess-ui.js - Erweiterte UI mit Zugrücknahme-Funktionalität und Brett-Editor
class ChessUI {
    constructor() {
        this.chessboard = document.getElementById('chessboard');
        this.selectedCell = null;
        this.vonPos = null;
        this.nachPos = null;
        this.moeglicheZuege = [];
        this.spielModus = 'menschVsMensch';
        this.kiLaeuft = false;
        this.kiTimeout = null;
        
        // NEU: EDITOR-VARIABLEN
        this.editorModus = false;
        this.ausgewaehlteFigur = null;
        this.editorBrettKopie = null;
        
        // Unicode-Figuren als zuverlässiger Fallback
        this.unicodeFiguren = {
            'wb': '♙', // Weißer Bauer
            'wT': '♖', // Weißer Turm
            'wL': '♗', // Weißer Läufer
            'wS': '♘', // Weißer Springer
            'wD': '♕', // Weiße Dame
            'wK': '♔', // Weißer König
            'sb': '♟', // Schwarzer Bauer
            'sT': '♜', // Schwarzer Turm
            'sL': '♝', // Schwarzer Läufer
            'sS': '♞', // Schwarzer Springer
            'sD': '♛', // Schwarze Dame
            'sK': '♚'  // Schwarzer König
        };

        console.log("🔄 ChessUI Constructor gestartet...");
        
        try {
            this.initialisiereBrett();
            this.initialisiereEventListeners();
            this.initialisiereKIModi();
            this.initialisiereDebugTools();
            this.initialisiereRuecknahmeUI();
            // NEU: Editor initialisieren
            this.initialisiereBrettEditor();
            this.aktualisiereAnzeige();
            console.log("✅ ChessUI erfolgreich initialisiert");
        } catch (error) {
            console.error("❌ Fehler bei ChessUI Initialisierung:", error);
            this.zeigeFehler("Initialisierungsfehler: " + error.message);
        }
    }

    /**
     * NEU: BRETT-EDITOR INITIALISIEREN
     */
    initialisiereBrettEditor() {
        console.log("🎨 Initialisiere Brett-Editor...");
        
        // Editor-Buttons erstellen
        const editorButton = document.getElementById('btnBrettEditor');
        if (editorButton) {
            editorButton.addEventListener('click', () => {
                this.aktiviereEditorModus();
            });
        }

        // Editor-Controls Event-Listener
        document.getElementById('btnEditorSpielen')?.addEventListener('click', () => {
            this.deaktiviereEditorModus();
        });

        document.getElementById('btnEditorLeeresBrett')?.addEventListener('click', () => {
            this.editorLeeresBrett();
        });

        document.getElementById('btnEditorGrundstellung')?.addEventListener('click', () => {
            this.editorGrundstellung();
        });

        document.getElementById('btnEditorUebernehmen')?.addEventListener('click', () => {
            this.editorStellungUebernehmen();
        });

        document.getElementById('btnEditorVerwerfen')?.addEventListener('click', () => {
            this.editorStellungVerwerfen();
        });

        // Toolbar mit Figuren erstellen
        this.erstelleEditorToolbar();

        console.log("✅ Brett-Editor initialisiert");
    }

    /**
     * NEU: EDITOR TOOLBAR ERSTELLEN
     */
    erstelleEditorToolbar() {
        const toolbar = document.getElementById('editorToolbar');
        if (!toolbar) return;

        const figuren = [
            { code: 'wK', name: 'Weißer König', symbol: '♔' },
            { code: 'wD', name: 'Weiße Dame', symbol: '♕' },
            { code: 'wT', name: 'Weißer Turm', symbol: '♖' },
            { code: 'wL', name: 'Weißer Läufer', symbol: '♗' },
            { code: 'wS', name: 'Weißer Springer', symbol: '♘' },
            { code: 'wb', name: 'Weißer Bauer', symbol: '♙' },
            { code: 'sK', name: 'Schwarzer König', symbol: '♚' },
            { code: 'sD', name: 'Schwarze Dame', symbol: '♛' },
            { code: 'sT', name: 'Schwarzer Turm', symbol: '♜' },
            { code: 'sL', name: 'Schwarzer Läufer', symbol: '♝' },
            { code: 'sS', name: 'Schwarzer Springer', symbol: '♞' },
            { code: 'sb', name: 'Schwarzer Bauer', symbol: '♟' }
        ];

        toolbar.innerHTML = '<strong>Figuren:</strong>';

        figuren.forEach(figur => {
            const figurElement = document.createElement('div');
            figurElement.className = 'editor-figur';
            figurElement.title = figur.name;
            figurElement.innerHTML = figur.symbol;
            figurElement.dataset.figur = figur.code;
            
            figurElement.addEventListener('click', () => {
                this.editorFigurAuswaehlen(figur.code);
            });

            toolbar.appendChild(figurElement);
        });

        // Löschen-Button hinzufügen
        const loeschenElement = document.createElement('div');
        loeschenElement.className = 'editor-figur';
        loeschenElement.title = 'Figur entfernen';
        loeschenElement.innerHTML = '❌';
        loeschenElement.dataset.figur = 'loeschen';
        
        loeschenElement.addEventListener('click', () => {
            this.editorFigurAuswaehlen('loeschen');
        });

        toolbar.appendChild(loeschenElement);
    }

    /**
     * NEU: EDITOR-MODUS AKTIVIEREN
     */
    aktiviereEditorModus() {
        console.log("🎨 Aktiviere Editor-Modus");
        
        this.editorModus = true;
        this.editorBrettKopie = chessEngine.erstelleZustandSnapshot();
        
        // UI anpassen für Editor-Modus
        document.getElementById('editorControls').style.display = 'block';
        this.chessboard.classList.add('editor-mode');
        
        // Spiel-Controls ausblenden
        document.querySelectorAll('.controls button').forEach(btn => {
            if (btn.id !== 'btnBrettEditor') {
                btn.style.display = 'none';
            }
        });

        // Editor-Status aktualisieren
        this.aktualisiereEditorStatus();
        
        this.zeigeNachricht("Editor-Modus aktiviert. Wähle eine Figur und klicke auf das Brett.");
    }

    /**
     * NEU: EDITOR-MODUS DEAKTIVIEREN
     */
    deaktiviereEditorModus() {
        console.log("🎮 Deaktiviere Editor-Modus");
        
        this.editorModus = false;
        this.ausgewaehlteFigur = null;
        
        // UI zurücksetzen
        document.getElementById('editorControls').style.display = 'none';
        this.chessboard.classList.remove('editor-mode');
        
        // Spiel-Controls wieder einblenden
        document.querySelectorAll('.controls button').forEach(btn => {
            btn.style.display = 'inline-block';
        });

        // Toolbar zurücksetzen
        document.querySelectorAll('.editor-figur').forEach(figur => {
            figur.classList.remove('aktiv');
        });

        this.zeigeNachricht("Editor-Modus beendet.");
    }

    /**
     * NEU: FIGUR IM EDITOR AUSWÄHLEN
     */
    editorFigurAuswaehlen(figurCode) {
        console.log(`🎯 Wähle Figur aus: ${figurCode}`);
        
        this.ausgewaehlteFigur = figurCode;
        
        // Visuelles Feedback in Toolbar
        document.querySelectorAll('.editor-figur').forEach(figur => {
            figur.classList.remove('aktiv');
        });
        
        const aktiveFigur = document.querySelector(`.editor-figur[data-figur="${figurCode}"]`);
        if (aktiveFigur) {
            aktiveFigur.classList.add('aktiv');
        }

        let nachricht = "";
        if (figurCode === 'loeschen') {
            nachricht = "Klicke auf eine Figur zum Entfernen";
        } else {
            const figurName = this.getFigurNameFromCode(figurCode);
            nachricht = `Ausgewählt: ${figurName}. Klicke auf ein Feld zum Platzieren.`;
        }
        
        this.zeigeNachricht(nachricht);
    }

    /**
     * NEU: EDITOR-KLICK-HANDLING
     */
    editorZelleAngeklickt(cell) {
        if (!this.editorModus || !this.ausgewaehlteFigur) {
            return;
        }

        const position = parseInt(cell.dataset.position);
        console.log(`🎨 Editor-Klick: Position ${position}, Figur: ${this.ausgewaehlteFigur}`);

        if (this.ausgewaehlteFigur === 'loeschen') {
            // Figur entfernen
            this.editorFigurEntfernen(position);
        } else {
            // Figur platzieren
            this.editorFigurPlatzieren(position, this.ausgewaehlteFigur);
        }

        // Validierung und Status-Update
        this.aktualisiereEditorStatus();
        this.aktualisiereAnzeige();
    }

    /**
     * NEU: FIGUR IM EDITOR PLATZIEREN
     */
    editorFigurPlatzieren(position, figurCode) {
        // Bestehende Figur an dieser Position entfernen
        this.editorFigurEntfernen(position);

        // Neue Figur hinzufügen
        const [farbe, art] = this.parseFigurCode(figurCode);
        const figurWert = art * farbe;

        // Figur zur Engine hinzufügen
        chessEngine.brett[position] = figurWert;
        
        // Zur Figurenliste hinzufügen
        const figur = {
            art: art,
            farbe: farbe,
            pos: position,
            geschlagen: false
        };
        chessEngine.figurenListe.push(figur);

        console.log(`✅ Figur platziert: ${this.getFigurNameFromCode(figurCode)} auf ${this.positionZuNotation(position)}`);
    }

    /**
     * NEU: FIGUR IM EDITOR ENTFERNEN
     */
    editorFigurEntfernen(position) {
        // Aus Brett entfernen
        chessEngine.brett[position] = LEER;
        
        // Aus Figurenliste entfernen
        chessEngine.figurenListe = chessEngine.figurenListe.filter(figur => 
            !(figur.pos === position && !figur.geschlagen)
        );

        console.log(`🗑️ Figur entfernt von ${this.positionZuNotation(position)}`);
    }

    /**
     * NEU: EDITOR - LEERES BRETT
     */
    editorLeeresBrett() {
        console.log("🧹 Erstelle leeres Brett");
        
        // Brett leeren
        for (let pos = 0; pos < chessEngine.brett.length; pos++) {
            if (chessEngine.brett[pos] !== DUMMY) {
                chessEngine.brett[pos] = LEER;
            }
        }
        
        // Figurenliste leeren
        chessEngine.figurenListe = [];
        
        // Rochade-Rechte zurücksetzen
        chessEngine.rochadeRechte = {
            weissKurz: false, weissLang: false,
            schwarzKurz: false, schwarzLang: false
        };
        
        // En Passant zurücksetzen
        chessEngine.enPassantTarget = null;
        
        this.aktualisiereEditorStatus();
        this.aktualisiereAnzeige();
        
        this.zeigeNachricht("Leeres Brett erstellt. Platziere Figuren manuell.");
    }

    /**
     * NEU: EDITOR - GRUNDSTELLUNG
     */
    editorGrundstellung() {
        console.log("♟️ Setze Grundstellung");
        
        // Zur ursprünglichen Engine-Kopie zurückkehren
        if (this.editorBrettKopie) {
            chessEngine.wiederherstelleZustand(this.editorBrettKopie);
        } else {
            chessEngine.initialisiereFiguren();
        }
        
        this.aktualisiereEditorStatus();
        this.aktualisiereAnzeige();
        
        this.zeigeNachricht("Grundstellung geladen.");
    }

    /**
     * NEU: EDITOR-STELLUNG ÜBERNEHMEN
     */
    editorStellungUebernehmen() {
        console.log("✅ Übernehme Editor-Stellung");
        
        // Validierung
        if (!this.istStellungValide()) {
            this.zeigeFehler("Ungültige Stellung! Bitte korrigieren.");
            return;
        }

        // Spielstatus neu berechnen
        chessEngine.pruefeSpielStatus();
        
        // Am-Zug-Einstellung übernehmen
        const amZugWeiss = document.querySelector('input[name="amZugEditor"]:checked').value === 'weiss';
        chessEngine.weissAmZug = amZugWeiss;
        
        // Editor-Modus beenden
        this.deaktiviereEditorModus();
        
        this.zeigeNachricht("Stellung übernommen. Spiel kann fortgesetzt werden.");
    }

    /**
     * NEU: EDITOR-STELLUNG VERWERFEN
     */
    editorStellungVerwerfen() {
        console.log("❌ Verwerfe Editor-Änderungen");
        
        // Zur ursprünglichen Stellung zurückkehren
        if (this.editorBrettKopie) {
            chessEngine.wiederherstelleZustand(this.editorBrettKopie);
        }
        
        // Editor-Modus beenden
        this.deaktiviereEditorModus();
        this.aktualisiereAnzeige();
        
        this.zeigeNachricht("Änderungen verworfen. Ursprüngliche Stellung wiederhergestellt.");
    }

    /**
     * NEU: EDITOR-STATUS AKTUALISIEREN
     */
    aktualisiereEditorStatus() {
        const statusElement = document.getElementById('editorStatus');
        if (!statusElement) return;

        const isValid = this.istStellungValide();
        const fehler = this.findeStellungsFehler();

        if (isValid) {
            statusElement.className = 'editor-status valid';
            statusElement.innerHTML = '✅ <strong>Gültige Stellung</strong><br>Stellung kann übernommen werden.';
        } else {
            statusElement.className = 'editor-status invalid';
            let fehlerText = '❌ <strong>Ungültige Stellung:</strong><br>';
            fehler.forEach(f => fehlerText += `• ${f}<br>`);
            statusElement.innerHTML = fehlerText;
        }
    }

    /**
     * NEU: STELLUNG VALIDIEREN
     */
    istStellungValide() {
        const fehler = this.findeStellungsFehler();
        return fehler.length === 0;
    }

    /**
     * NEU: STELLUNGSFEHLER FINDEN
     */
    findeStellungsFehler() {
        const fehler = [];
        
        // Zähle Könige
        let weissKoenige = 0;
        let schwarzKoenige = 0;
        
        for (const figur of chessEngine.figurenListe) {
            if (figur.geschlagen) continue;
            
            if (figur.art === KOENIG) {
                if (figur.farbe === WEISS) weissKoenige++;
                else schwarzKoenige++;
            }
        }
        
        // Prüfe König-Anzahl
        if (weissKoenige !== 1) {
            fehler.push(`Weiß muss genau einen König haben (aktuell: ${weissKoenige})`);
        }
        if (schwarzKoenige !== 1) {
            fehler.push(`Schwarz muss genau einen König haben (aktuell: ${schwarzKoenige})`);
        }
        
        // Prüfe auf Bauern in erster/letzter Reihe
        for (const figur of chessEngine.figurenListe) {
            if (figur.geschlagen) continue;
            
            const reihe = Math.floor(figur.pos / 10);
            if (figur.art === BAUER) {
                if (reihe === 2 || reihe === 9) {
                    fehler.push("Bauern dürfen nicht auf der Grundreihe stehen");
                    break;
                }
            }
        }
        
        // Prüfe auf Könige im Schach
        if (weissKoenige === 1 && chessEngine.istKoenigImSchach(WEISS)) {
            fehler.push("Weißer König steht im Schach");
        }
        if (schwarzKoenige === 1 && chessEngine.istKoenigImSchach(SCHWARZ)) {
            fehler.push("Schwarzer König steht im Schach");
        }
        
        return fehler;
    }

    /**
     * NEU: FIGUR-CODE PARSEN
     */
    parseFigurCode(figurCode) {
        const farbe = figurCode[0] === 'w' ? WEISS : SCHWARZ;
        let art;
        
        switch (figurCode[1]) {
            case 'K': art = KOENIG; break;
            case 'D': art = DAME; break;
            case 'T': art = TURM; break;
            case 'L': art = LAEUFER; break;
            case 'S': art = SPRINGER; break;
            case 'b': art = BAUER; break;
            default: art = BAUER;
        }
        
        return [farbe, art];
    }

    /**
     * NEU: FIGURNAME AUS CODE
     */
    getFigurNameFromCode(figurCode) {
        const namen = {
            'wK': 'Weißer König', 'wD': 'Weiße Dame', 'wT': 'Weißer Turm',
            'wL': 'Weißer Läufer', 'wS': 'Weißer Springer', 'wb': 'Weißer Bauer',
            'sK': 'Schwarzer König', 'sD': 'Schwarze Dame', 'sT': 'Schwarzer Turm',
            'sL': 'Schwarzer Läufer', 'sS': 'Schwarzer Springer', 'sb': 'Schwarzer Bauer'
        };
        return namen[figurCode] || 'Unbekannte Figur';
    }

    /**
     * NEU: NACHRICHT ANZEIGEN
     */
    zeigeNachricht(nachricht) {
        console.log("💬 " + nachricht);
        
        // Einfache Nachrichten-Anzeige
        const nachrichtElement = document.createElement('div');
        nachrichtElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007bff;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 1000;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        nachrichtElement.textContent = nachricht;
        document.body.appendChild(nachrichtElement);
        
        setTimeout(() => {
            if (document.body.contains(nachrichtElement)) {
                document.body.removeChild(nachrichtElement);
            }
        }, 3000);
    }

    /**
     * NEU: RÜCKNAHME-UI INITIALISIEREN
     */
    initialisiereRuecknahmeUI() {
        console.log("🔄 Initialisiere Rücknahme-UI...");
        
        // Rücknahme-Buttons zur Steuerung hinzufügen
        const ruecknahmeGroup = document.createElement('div');
        ruecknahmeGroup.className = 'control-group';
        ruecknahmeGroup.innerHTML = `
            <h3>Zugrücknahme</h3>
            <div class="zug-navigation">
                <button class="btn" id="btnZugZurueck" title="Zug zurück (Strg+Z)">
                    ↩️ Zug zurück
                </button>
                <button class="btn" id="btnZugVorwaerts" title="Zug vorwärts (Strg+Y)">
                    ↪️ Zug vorwärts  
                </button>
                <button class="btn btn-danger" id="btnZurStart" title="Zurück zur Grundstellung">
                    🏁 Startstellung
                </button>
            </div>
            <div class="zug-info" style="margin-top: 10px; padding: 8px; background: #e9ecef; border-radius: 4px; font-size: 12px;">
                <div><strong>Zug:</strong> <span id="zugNummer">1</span> • <strong>Vollzug:</strong> <span id="vollzugNummer">1</span></div>
                <div><strong>Historie:</strong> <span id="historieStatus">0/0</span></div>
            </div>
        `;
        
        const controls = document.querySelector('.controls');
        if (controls) {
            // Vor der System-Group einfügen
            const systemGroup = controls.querySelector('.control-group:last-child');
            if (systemGroup) {
                controls.insertBefore(ruecknahmeGroup, systemGroup);
            } else {
                controls.appendChild(ruecknahmeGroup);
            }
            
            // Event-Listener für Rücknahme-Buttons
            document.getElementById('btnZugZurueck').addEventListener('click', () => {
                this.zugZurueck();
            });
            
            document.getElementById('btnZugVorwaerts').addEventListener('click', () => {
                this.zugVorwaerts();
            });
            
            document.getElementById('btnZurStart').addEventListener('click', () => {
                this.zurStartstellung();
            });

            // Tastatur-Shortcuts
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                    e.preventDefault();
                    this.zugZurueck();
                }
                if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                    e.preventDefault();
                    this.zugVorwaerts();
                }
            });
        }
        
        console.log("✅ Rücknahme-UI initialisiert");
    }

    /**
     * NEU: ZUG ZURÜCKNEHMEN
     */
    zugZurueck() {
        console.log("↩️ Versuche Zug zurückzunehmen...");
        
        if (!chessEngine.istRuecknahmeMoeglich()) {
            console.log("❌ Keine Züge zum Zurücknehmen verfügbar");
            this.zeigeFehler("Keine Züge zum Zurücknehmen verfügbar");
            return;
        }

        try {
            // Visuelles Feedback
            this.zeigeAnimation('zurueck');
            
            if (chessEngine.zugZuruecknehmen()) {
                console.log("✅ Zug erfolgreich zurückgenommen");
                this.aktualisiereAnzeige();
                this.aktualisiereRuecknahmeButtons();
            } else {
                console.error("❌ Zugrücknahme fehlgeschlagen");
                this.zeigeFehler("Zugrücknahme fehlgeschlagen");
            }
        } catch (error) {
            console.error("❌ Fehler bei Zugrücknahme:", error);
            this.zeigeFehler("Fehler bei Zugrücknahme: " + error.message);
        }
    }

    /**
     * NEU: ZUG WIEDERHERSTELLEN (VORWÄRTS)
     */
    zugVorwaerts() {
        console.log("↪️ Versuche Zug wiederherzustellen...");
        
        if (!chessEngine.istWiederherstellungMoeglich()) {
            console.log("❌ Keine Züge zum Wiederherstellen verfügbar");
            this.zeigeFehler("Keine Züge zum Wiederherstellen verfügbar");
            return;
        }

        try {
            // Visuelles Feedback
            this.zeigeAnimation('vorwaerts');
            
            if (chessEngine.zugWiederherstellen()) {
                console.log("✅ Zug erfolgreich wiederhergestellt");
                this.aktualisiereAnzeige();
                this.aktualisiereRuecknahmeButtons();
            } else {
                console.error("❌ Zugwiederherstellung fehlgeschlagen");
                this.zeigeFehler("Zugwiederherstellung fehlgeschlagen");
            }
        } catch (error) {
            console.error("❌ Fehler bei Zugwiederherstellung:", error);
            this.zeigeFehler("Fehler bei Zugwiederherstellung: " + error.message);
        }
    }

    /**
     * NEU: ZUR STARTSTELLUNG ZURÜCK
     */
    zurStartstellung() {
        console.log("🏁 Gehe zur Startstellung zurück...");
        
        if (chessEngine.zugHistorie.length === 0) {
            console.log("ℹ️ Bereits in Startstellung");
            return;
        }

        try {
            // Visuelles Feedback
            this.zeigeAnimation('start');
            
            // Gehe so lange zurück bis Startstellung
            while (chessEngine.istRuecknahmeMoeglich()) {
                chessEngine.zugZuruecknehmen();
            }
            
            console.log("✅ Zurück zur Startstellung");
            this.aktualisiereAnzeige();
            this.aktualisiereRuecknahmeButtons();
        } catch (error) {
            console.error("❌ Fehler beim Zurückgehen zur Startstellung:", error);
            this.zeigeFehler("Fehler beim Zurückgehen zur Startstellung: " + error.message);
        }
    }

    /**
     * NEU: RÜCKNAHME-BUTTONS AKTUALISIEREN
     */
    aktualisiereRuecknahmeButtons() {
        const btnZurueck = document.getElementById('btnZugZurueck');
        const btnVorwaerts = document.getElementById('btnZugVorwaerts');
        const zugInfo = chessEngine.getZugInfo();

        // Buttons aktivieren/deaktivieren
        if (btnZurueck) {
            btnZurueck.disabled = !zugInfo.kannZurueck;
            btnZurueck.title = zugInfo.kannZurueck ? 
                "Zug zurück (Strg+Z)" : "Keine Züge zum Zurücknehmen";
        }

        if (btnVorwaerts) {
            btnVorwaerts.disabled = !zugInfo.kannVorwaerts;
            btnVorwaerts.title = zugInfo.kannVorwaerts ? 
                "Zug vorwärts (Strg+Y)" : "Keine Züge zum Wiederherstellen";
        }

        // Zug-Info aktualisieren
        this.aktualisiereZugInfo();
    }

    /**
     * NEU: ZUG-INFORMATIONEN AKTUALISIEREN
     */
    aktualisiereZugInfo() {
        const zugInfo = chessEngine.getZugInfo();
        
        const zugNummerElement = document.getElementById('zugNummer');
        const vollzugNummerElement = document.getElementById('vollzugNummer');
        const historieStatusElement = document.getElementById('historieStatus');

        if (zugNummerElement) {
            zugNummerElement.textContent = zugInfo.aktuelleZugNummer;
        }
        if (vollzugNummerElement) {
            vollzugNummerElement.textContent = zugInfo.vollzugNummer;
        }
        if (historieStatusElement) {
            historieStatusElement.textContent = `${zugInfo.historieIndex + 1}/${zugInfo.historieLaenge}`;
        }
    }

    /**
     * NEU: ANIMATION FÜR RÜCKNAHME ZEIGEN
     */
    zeigeAnimation(richtung) {
        const animation = document.createElement('div');
        animation.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 0.8s ease-out forwards;
        `;
        
        if (richtung === 'zurueck') {
            animation.textContent = '↩️';
            animation.style.color = '#dc3545';
        } else if (richtung === 'vorwaerts') {
            animation.textContent = '↪️';
            animation.style.color = '#28a745';
        } else {
            animation.textContent = '🏁';
            animation.style.color = '#007bff';
        }

        document.body.appendChild(animation);

        // CSS Animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                70% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);

        // Nach Animation entfernen
        setTimeout(() => {
            if (document.body.contains(animation)) {
                document.body.removeChild(animation);
            }
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        }, 800);
    }

    /**
     * DEBUG TOOLS INITIALISIERUNG
     */
    initialisiereDebugTools() {
        console.log("🛠️ Initialisiere Debug-Tools...");
        
        // Debug-Buttons zur Steuerung hinzufügen
        const debugGroup = document.createElement('div');
        debugGroup.className = 'control-group';
        debugGroup.innerHTML = `
            <h3>Debug-Tools</h3>
            <button class="btn" id="btnDebugBrett">Debug Brett</button>
            <button class="btn" id="btnDebugZuege">Debug Züge</button>
            <button class="btn" id="btnDebugFiguren">Debug Figuren</button>
            <div class="debug-info" style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                <strong>Debug-Info:</strong> <span id="debugStatus">Bereit</span>
            </div>
        `;
        
        const controls = document.querySelector('.controls');
        if (controls) {
            controls.appendChild(debugGroup);
            
            // Debug-Event-Listener
            document.getElementById('btnDebugBrett').addEventListener('click', () => {
                this.debugBrettZustand();
            });
            
            document.getElementById('btnDebugZuege').addEventListener('click', () => {
                this.debugZugGenerierung();
            });
            
            document.getElementById('btnDebugFiguren').addEventListener('click', () => {
                this.debugFigurenListe();
            });
        }
        
        console.log("✅ Debug-Tools initialisiert");
    }

    /**
     * DETAILLIERTE DEBUG-FUNKTIONEN
     */
    debugBrettZustand() {
        console.log("=== 🎯 DEBUG BRETTZUSTAND ===");
        console.log("Aktuelle Brettpositionen:");
        
        for (let reihe = 0; reihe < 8; reihe++) {
            let line = "";
            for (let linie = 0; linie < 8; linie++) {
                const position = this.zuBrettPosition(reihe, linie);
                const figurWert = chessEngine.brett[position];
                let symbol = '.';
                
                if (figurWert !== LEER && figurWert !== DUMMY) {
                    const namen = { 
                        [BAUER]: 'P', [TURM]: 'R', [LAEUFER]: 'B', 
                        [SPRINGER]: 'N', [DAME]: 'Q', [KOENIG]: 'K' 
                    };
                    symbol = namen[Math.abs(figurWert)] || '?';
                    if (figurWert > 0) symbol = symbol.toUpperCase();
                    else symbol = symbol.toLowerCase();
                }
                line += symbol + " ";
            }
            console.log(`${8-reihe}: ${line}`);
        }
        
        console.log("Am Zug:", chessEngine.weissAmZug ? "Weiß" : "Schwarz");
        console.log("Bewertung:", chessEngine.bewertung);
        console.log("Endmatt:", chessEngine.endmatt, "Patt:", chessEngine.patt);
        console.log("======================");
        
        this.updateDebugStatus("Brettzustand ausgegeben");
    }

    debugZugGenerierung() {
        console.log("=== 🔍 DEBUG ZUGGENERIERUNG ===");
        const aktuelleFarbe = chessEngine.weissAmZug ? WEISS : SCHWARZ;
        const alleZuege = chessEngine.generiereZuege(aktuelleFarbe);
        
        console.log(`📊 ${chessEngine.weissAmZug ? 'Weiß' : 'Schwarz'} am Zug: ${alleZuege.length} legale Züge`);
        
        alleZuege.forEach((zug, index) => {
            const von = this.positionZuNotation(zug.vonPos);
            const nach = this.positionZuNotation(zug.nachPos);
            const figurName = this.getFigurName(zug.art * zug.farbe);
            const schlagInfo = zug.geschlagen ? ` [SCHLAG: ${this.getFigurName(zug.geschlagen.art * zug.geschlagen.farbe)}]` : '';
            const umwandlungInfo = zug.umwandlungsFigur ? ` [UMWANDLUNG: ${this.getFigurName(zug.umwandlungsFigur * zug.farbe)}]` : '';
            
            console.log(`  ${index + 1}. ${von}→${nach} (${figurName})${schlagInfo}${umwandlungInfo}`);
        });
        
        // Zeige auch mögliche Züge für jede Figur
        console.log("--- Einzelne Figuren und ihre Züge ---");
        chessEngine.figurenListe.forEach((figur, index) => {
            if (!figur.geschlagen && figur.farbe === aktuelleFarbe) {
                const figurenZuege = chessEngine.generiereFigurenZuege(figur);
                const legaleZuege = figurenZuege.filter(zug => chessEngine.istZugLegal(zug));
                
                if (legaleZuege.length > 0) {
                    console.log(`  ${this.getFigurName(figur.art * figur.farbe)} auf ${this.positionZuNotation(figur.pos)}: ${legaleZuege.length} Züge`);
                }
            }
        });
        
        console.log("======================");
        this.updateDebugStatus(`${alleZuege.length} Züge gefunden`);
    }

    debugFigurenListe() {
        console.log("=== 👑 DEBUG FIGURENLISTE ===");
        
        let weissCount = 0, schwarzCount = 0;
        
        chessEngine.figurenListe.forEach((figur, index) => {
            if (!figur.geschlagen) {
                const farbe = figur.farbe === WEISS ? "Weiß" : "Schwarz";
                if (figur.farbe === WEISS) weissCount++;
                else schwarzCount++;
                
                console.log(`  ${index}: ${this.getFigurName(figur.art * figur.farbe)} auf ${this.positionZuNotation(figur.pos)} ${figur.geschlagen ? '(GESCHLAGEN)' : ''}`);
            }
        });
        
        console.log(`Zusammenfassung: ${weissCount} weiße Figuren, ${schwarzCount} schwarze Figuren`);
        console.log("======================");
        this.updateDebugStatus(`${weissCount} weiß, ${schwarzCount} schwarz`);
    }

    updateDebugStatus(nachricht) {
        const debugStatus = document.getElementById('debugStatus');
        if (debugStatus) {
            debugStatus.textContent = nachricht;
            // Auto-Reset nach 5 Sekunden
            setTimeout(() => {
                debugStatus.textContent = "Bereit";
            }, 5000);
        }
    }

    /**
     * BRETT-INITIALISIERUNG
     */
    initialisiereBrett() {
        if (!this.chessboard) {
            throw new Error("Chessboard Element nicht gefunden!");
        }
        
        this.chessboard.innerHTML = '';
        
        const linien = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        
        for (let reihe = 0; reihe < 8; reihe++) {
            for (let linie = 0; linie < 8; linie++) {
                const cell = document.createElement('div');
                cell.className = `chess-cell ${(reihe + linie) % 2 === 0 ? 'white' : 'gray'}`;
                cell.dataset.reihe = reihe;
                cell.dataset.linie = linie;
                cell.dataset.position = this.zuBrettPosition(reihe, linie);
                
                // Koordinaten hinzufügen
                if (reihe === 7) {
                    const fileCoord = document.createElement('span');
                    fileCoord.className = 'coordinate file';
                    fileCoord.textContent = linien[linie];
                    cell.appendChild(fileCoord);
                }
                
                if (linie === 0) {
                    const rankCoord = document.createElement('span');
                    rankCoord.className = 'coordinate rank';
                    rankCoord.textContent = 8 - reihe;
                    cell.appendChild(rankCoord);
                }
                
                this.chessboard.appendChild(cell);
            }
        }
        
        console.log("✅ Brett initialisiert: 64 Felder erstellt");
    }

    zuBrettPosition(reihe, linie) {
        const brettReihe = 8 - reihe;
        const brettLinie = linie + 1;
        return (brettReihe + 1) * 10 + brettLinie;
    }

    getBrettForUI() {
        const uiBrett = Array(8).fill().map(() => Array(8).fill(LEER));
        
        for (let uiReihe = 0; uiReihe < 8; uiReihe++) {
            for (let uiLinie = 0; uiLinie < 8; uiLinie++) {
                const brettReihe = 8 - uiReihe;
                const brettLinie = uiLinie + 1;
                const position = (brettReihe + 1) * 10 + brettLinie;
                uiBrett[uiReihe][uiLinie] = chessEngine.brett[position];
            }
        }
        
        return uiBrett;
    }

    /**
     * ERWEITERT: ANZEIGE AKTUALISIEREN MIT RÜCKNAHME-INFO UND EDITOR-UNTERSTÜTZUNG
     */
    aktualisiereAnzeige() {
        // Bestehende Anzeige-Logik
        const uiBrett = this.getBrettForUI();
        const cells = this.chessboard.querySelectorAll('.chess-cell');
        
        cells.forEach(cell => {
            const reihe = parseInt(cell.dataset.reihe);
            const linie = parseInt(cell.dataset.linie);
            const figurWert = uiBrett[reihe][linie];
            
            // Alte Figuren entfernen
            const oldUnicode = cell.querySelector('.chess-piece-unicode');
            const oldImg = cell.querySelector('.chess-piece');
            if (oldUnicode) oldUnicode.remove();
            if (oldImg) oldImg.remove();
            
            // Editor: Markierung für Felder mit Figuren
            if (this.editorModus) {
                if (figurWert !== LEER && figurWert !== DUMMY) {
                    cell.classList.add('has-figur');
                } else {
                    cell.classList.remove('has-figur');
                }
            }
            
            // Neue Figur anzeigen falls vorhanden
            if (figurWert !== LEER && figurWert !== DUMMY) {
                const unicodeFigur = document.createElement('div');
                unicodeFigur.className = 'chess-piece-unicode';
                
                const figurCode = this.getFigurCode(figurWert);
                unicodeFigur.textContent = this.unicodeFiguren[figurCode] || '?';
                
                if (figurWert > 0) {
                    unicodeFigur.style.color = '#FFFFFF';
                    unicodeFigur.style.textShadow = '1px 1px 2px #000000, 0 0 4px rgba(0,0,0,0.7)';
                } else {
                    unicodeFigur.style.color = '#000000';
                    unicodeFigur.style.textShadow = '1px 1px 2px #FFFFFF, 0 0 4px rgba(255,255,255,0.7)';
                }
                
                cell.appendChild(unicodeFigur);
            }
        });
        
        this.aktualisiereStatus();
        this.aktualisiereRuecknahmeButtons();
        this.automatischerComputerzug();
    }

    getFigurCode(figurWert) {
        const farbe = figurWert > 0 ? 'w' : 's';
        const art = Math.abs(figurWert);
        
        const arten = {
            [BAUER]: 'b',
            [TURM]: 'T',
            [LAEUFER]: 'L',
            [SPRINGER]: 'S',
            [DAME]: 'D',
            [KOENIG]: 'K'
        };
        
        return farbe + (arten[art] || '?');
    }

    getFigurName(figurWert) {
        const farbe = figurWert > 0 ? 'Weiß' : 'Schwarz';
        const art = Math.abs(figurWert);
        
        const namen = {
            [BAUER]: 'Bauer',
            [TURM]: 'Turm',
            [LAEUFER]: 'Läufer',
            [SPRINGER]: 'Springer',
            [DAME]: 'Dame',
            [KOENIG]: 'König'
        };
        
        return `${farbe} ${namen[art]}`;
    }

    aktualisiereStatus() {
        const amZugElement = document.getElementById('amZug');
        const bewertungElement = document.getElementById('bewertung');
        const spielStatusElement = document.getElementById('spielStatus');
        
        if (amZugElement) {
            amZugElement.textContent = chessEngine.weissAmZug ? 'Weiß am Zug' : 'Schwarz am Zug';
        }
        if (bewertungElement) {
            bewertungElement.textContent = chessEngine.bewertung;
        }
        if (spielStatusElement) {
            const imSchach = chessEngine.istKoenigImSchach(chessEngine.weissAmZug ? WEISS : SCHWARZ);
            
            if (chessEngine.istSchachmatt(chessEngine.weissAmZug ? WEISS : SCHWARZ)) {
                spielStatusElement.textContent = chessEngine.weissAmZug ? 
                    'Schachmatt! Schwarz gewinnt!' : 'Schachmatt! Weiß gewinnt!';
                spielStatusElement.style.color = '#dc3545';
                spielStatusElement.style.fontWeight = 'bold';
            } else if (chessEngine.istPatt(chessEngine.weissAmZug ? WEISS : SCHWARZ)) {
                spielStatusElement.textContent = 'Patt! Unentschieden.';
                spielStatusElement.style.color = '#ffc107';
                spielStatusElement.style.fontWeight = 'bold';
            } else if (imSchach) {
                spielStatusElement.textContent = 'SCHACH!';
                spielStatusElement.style.color = '#dc3545';
                spielStatusElement.style.fontWeight = 'bold';
            } else {
                spielStatusElement.textContent = 'Läuft';
                spielStatusElement.style.color = '#28a745';
                spielStatusElement.style.fontWeight = 'normal';
            }
        }
    }

    /**
     * ROBUSTES EVENT-HANDLING MIT DETAILLIERTEM LOGGING
     */
    initialisiereEventListeners() {
        console.log("🔧 Initialisiere Event-Listener...");
        
        try {
            // Brett-Klicks mit robustem Error-Handling
            if (this.chessboard) {
                this.chessboard.addEventListener('click', (e) => {
                    try {
                        const cell = e.target.closest('.chess-cell');
                        if (cell) {
                            console.log("🎯 Brett-Klick erkannt:", {
                                reihe: cell.dataset.reihe,
                                linie: cell.dataset.linie,
                                position: cell.dataset.position
                            });
                            this.zelleAngeklickt(cell);
                        } else {
                            console.log("🖱️ Klick nicht auf einem Brettfeld");
                        }
                    } catch (error) {
                        console.error("❌ Fehler bei Brett-Klick:", error);
                        this.zeigeFehler("Klick-Fehler: " + error.message);
                    }
                });
            } else {
                console.error("❌ Chessboard Element nicht gefunden!");
            }

            // Steuerungs-Buttons mit Null-Checks und Logging
            const buttons = [
                { id: 'btnNaechsterZug', method: 'naechsterzug' },
                { id: 'btnWeisserZug', method: 'weissenzug' },
                { id: 'btnSchwarzerZug', method: 'schwarzerzug' },
                { id: 'btnSpielerZieht', method: 'spielerZieht' },
                { id: 'btnNeuesSpiel', method: 'neuesspiel' },
                { id: 'btnReset', method: 'resetspiel' },
                { id: 'btnComputerZug', method: 'computerZugAusfuehren' },
                { id: 'btnSpielerVsKI', method: () => this.setSpielModus('menschVsKI') },
                { id: 'btnKIVsKI', method: () => this.setSpielModus('kiVsKI') }
            ];

            buttons.forEach(btn => {
                const element = document.getElementById(btn.id);
                if (element) {
                    element.addEventListener('click', (e) => {
                        console.log(`🔘 Button geklickt: ${btn.id}`);
                        try {
                            if (typeof btn.method === 'function') {
                                btn.method();
                            } else {
                                this[btn.method]();
                            }
                        } catch (error) {
                            console.error(`❌ Fehler bei Button ${btn.id}:`, error);
                            this.zeigeFehler(`Button-Fehler (${btn.id}): ${error.message}`);
                        }
                    });
                } else {
                    console.warn(`⚠️ Button nicht gefunden: ${btn.id}`);
                }
            });

            // Clear-Button für Eingabefelder
            this.erstelleClearButton();

            console.log("✅ Event-Listener initialisiert");

        } catch (error) {
            console.error("❌ Fehler bei Event-Listener Initialisierung:", error);
            throw error;
        }
    }

    erstelleClearButton() {
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Eingabe löschen';
        clearButton.className = 'btn';
        clearButton.style.margin = '5px';
        clearButton.addEventListener('click', () => {
            console.log("🗑️ Eingabe gelöscht");
            this.eingabeZuruecksetzen();
        });
        
        const zugInput = document.querySelector('.zug-input');
        if (zugInput) {
            zugInput.parentNode.insertBefore(clearButton, zugInput.nextSibling);
        }
    }

    /**
     * ERWEITERTE KLICK-LOGIK MIT DETAILLIERTEM FEEDBACK UND EDITOR-UNTERSTÜTZUNG
     */
    zelleAngeklickt(cell) {
        // Editor-Modus hat Priorität
        if (this.editorModus) {
            this.editorZelleAngeklickt(cell);
            return;
        }

        console.log("=== 🎯 ZELLE ANGEKLICKT ===");
        
        try {
            const position = parseInt(cell.dataset.position);
            const notation = this.positionZuNotation(position);
            const figurWert = chessEngine.brett[position];
            const figurName = figurWert !== LEER && figurWert !== DUMMY ? this.getFigurName(figurWert) : "Leer";
            
            console.log(`📋 Klick-Details:`, {
                position: position,
                notation: notation,
                figur: figurName,
                figurWert: figurWert,
                weissAmZug: chessEngine.weissAmZug
            });

            // Modus-Validierung
            if (this.spielModus === 'kiVsKI') {
                const msg = "Im KI vs KI Modus sind keine manuellen Züge möglich";
                console.warn("⚠️ " + msg);
                this.zeigeFehler(msg);
                return;
            }
            
            if (this.spielModus === 'menschVsKI') {
                const menschFarbe = WEISS;
                const aktuelleFarbe = chessEngine.weissAmZug ? WEISS : SCHWARZ;
                if (aktuelleFarbe !== menschFarbe) {
                    const msg = "Computer ist am Zug - bitte warten";
                    console.warn("⚠️ " + msg);
                    this.zeigeFehler(msg);
                    return;
                }
            }

            this.moeglicheZuegeZuruecksetzen();
            
            const istEigeneFigur = (chessEngine.weissAmZug && figurWert > 0) || 
                                  (!chessEngine.weissAmZug && figurWert < 0);
            
            if (istEigeneFigur && figurWert !== LEER && figurWert !== DUMMY) {
                // Startfeld ausgewählt
                console.log(`🎯 Eigene Figur ausgewählt: ${figurName} auf ${notation}`);
                
                const vonInput = document.getElementById('vonInput');
                if (vonInput) vonInput.value = notation;
                this.selectedCell = cell;
                this.vonPos = position;
                cell.classList.add('selected');
                
                this.zeigeMoeglicheZuege(position);
                
            } else {
                // Zielfeld ausgewählt
                console.log(`🎯 Zielfeld ausgewählt: ${notation} (${figurName})`);
                
                const nachInput = document.getElementById('nachInput');
                if (nachInput) nachInput.value = notation;
                this.nachPos = position;
                
                // Visuelles Feedback für Zielfeld
                if (figurWert !== LEER && figurWert !== DUMMY) {
                    cell.classList.add('possible-capture');
                    console.log(`💥 Schlagzug möglich auf ${notation}`);
                } else {
                    cell.classList.add('possible-move');
                }
                
                // Automatische Ausführung wenn beide Felder ausgefüllt
                const vonInput = document.getElementById('vonInput');
                const nachInput2 = document.getElementById('nachInput');
                if (vonInput && nachInput2 && vonInput.value && nachInput2.value) {
                    console.log("⚡ Beide Felder ausgefüllt - führe Zug aus...");
                    setTimeout(() => {
                        this.spielerZieht();
                        this.eingabeZuruecksetzen();
                    }, 300);
                }
            }
            
        } catch (error) {
            console.error("❌ Fehler in zelleAngeklickt:", error);
            this.zeigeFehler("Klick-Fehler: " + error.message);
        }
    }

    /**
     * KORRIGIERT: MÖGLICHE ZÜGE ANZEIGE OHNE DOPPELTE ZÜGE
     */
    zeigeMoeglicheZuege(vonPosition) {
        console.log(`🔍 Zeige mögliche Züge für Position ${this.positionZuNotation(vonPosition)}`);
        
        try {
            const figur = chessEngine.figurenListe.find(f => 
                f.pos === vonPosition && !f.geschlagen
            );
            
            if (!figur) {
                console.warn("⚠️ Keine Figur auf der ausgewählten Position gefunden");
                return;
            }
            
            console.log(`📊 Gefundene Figur: ${this.getFigurName(figur.art * figur.farbe)}`);
            
            this.moeglicheZuege = chessEngine.generiereZuege(figur.farbe).filter(
                zug => zug.vonPos === vonPosition
            );
            
            // ENTFERNE DOPPELTE ZÜGE
            const einzigartigeZuege = [];
            const geseheneZuege = new Set();
            
            this.moeglicheZuege.forEach(zug => {
                const zugKey = `${zug.vonPos}-${zug.nachPos}-${zug.umwandlungsFigur || ''}`;
                if (!geseheneZuege.has(zugKey)) {
                    geseheneZuege.add(zugKey);
                    einzigartigeZuege.push(zug);
                }
            });
            
            this.moeglicheZuege = einzigartigeZuege;
            
            console.log(`🎯 ${this.moeglicheZuege.length} mögliche Züge gefunden:`);
            
            this.moeglicheZuege.forEach((zug, index) => {
                const zielNotation = this.positionZuNotation(zug.nachPos);
                const zielFigur = chessEngine.brett[zug.nachPos];
                const schlagInfo = zug.geschlagen ? ` [SCHLAG: ${this.getFigurName(zug.geschlagen.art * zug.geschlagen.farbe)}]` : '';
                const umwandlungInfo = zug.umwandlungsFigur ? ` [UMWANDLUNG: ${this.getFigurName(zug.umwandlungsFigur * zug.farbe)}]` : '';
                
                console.log(`  ${index + 1}. ${zielNotation}${schlagInfo}${umwandlungInfo}`);
                
                const cell = this.findCellByPosition(zug.nachPos);
                if (cell) {
                    if (zug.geschlagen) {
                        cell.classList.add('possible-capture');
                    } else {
                        cell.classList.add('possible-move');
                    }
                }
            });
            
        } catch (error) {
            console.error("❌ Fehler in zeigeMoeglicheZuege:", error);
        }
    }

    /**
     * ERWEITERT: SPIELERZUG MIT RÜCKNAHME-UPDATE
     */
    spielerZieht() {
        console.log("=== 🚀 SPIELERZUG AUSFÜHREN ===");
        
        try {
            const vonInput = document.getElementById('vonInput');
            const nachInput = document.getElementById('nachInput');
            
            if (!vonInput || !nachInput) {
                this.zeigeFehler("Eingabefelder nicht gefunden!");
                return;
            }
            
            const von = vonInput.value.toLowerCase();
            const nach = nachInput.value.toLowerCase();
            
            console.log(`📥 Zug-Eingabe: ${von} → ${nach}`);
            
            if (!von || !nach) {
                const msg = "Bitte beide Felder ausfüllen!";
                console.warn("⚠️ " + msg);
                this.zeigeFehler(msg);
                return;
            }
            
            const vonPos = this.notationZuPosition(von);
            const nachPos = this.notationZuPosition(nach);
            
            console.log(`🔍 Konvertierte Positionen: ${vonPos} → ${nachPos}`);
            
            if (vonPos === -1 || nachPos === -1) {
                const msg = "Ungültige Position! Verwende z.B. 'e2' 'e4'";
                console.warn("⚠️ " + msg);
                this.zeigeFehler(msg);
                return;
            }
            
            const figur = chessEngine.figurenListe.find(f => 
                f.pos === vonPos && !f.geschlagen
            );
            
            if (!figur) {
                const msg = "Keine Figur auf dem Startfeld!";
                console.warn("⚠️ " + msg);
                this.zeigeFehler(msg);
                return;
            }
            
            console.log(`🎯 Gefundene Figur: ${this.getFigurName(figur.art * figur.farbe)}`);
            
            const moeglicheZuege = chessEngine.generiereZuege(figur.farbe).filter(
                zug => zug.vonPos === vonPos && zug.nachPos === nachPos
            );
            
            console.log(`📊 ${moeglicheZuege.length} passende Züge in generierten Zügen gefunden`);
            
            if (moeglicheZuege.length === 0) {
                const msg = "Ungültiger Zug für diese Figur!";
                console.warn("⚠️ " + msg);
                this.zeigeFehler(msg);
                return;
            }
            
            const zug = moeglicheZuege[0];
            console.log(`✅ Zug gefunden: ${this.zugZuNotation(zug)}`);
            
            if (this.fuehreZugAus(zug)) {
                console.log("🎉 Zug erfolgreich ausgeführt!");
                this.eingabeZuruecksetzen();
                this.aktualisiereRuecknahmeButtons();
            } else {
                console.error("❌ Zugausführung fehlgeschlagen!");
            }
            
        } catch (error) {
            console.error("❌ Fehler in spielerZieht:", error);
            this.zeigeFehler("Zug-Fehler: " + error.message);
        }
    }

    fuehreZugAus(zug) {
        console.log(`🔄 Führe Zug aus: ${this.zugZuNotation(zug)}`);
        
        try {
            if (chessEngine.zugAusfuehren(zug)) {
                console.log("✅ Zug erfolgreich in Engine ausgeführt");
                this.aktualisiereAnzeige();
                return true;
            } else {
                console.error("❌ Zug in Engine fehlgeschlagen");
                this.zeigeFehler("Ungültiger Zug!");
                return false;
            }
        } catch (error) {
            console.error("❌ Fehler in fuehreZugAus:", error);
            this.zeigeFehler("Zugausführungs-Fehler: " + error.message);
            return false;
        }
    }

    /**
     * RESTLICHE METHODEN MIT VERBESSERTEM ERROR-HANDLING
     */
    findCellByPosition(position) {
        try {
            const cells = this.chessboard.querySelectorAll('.chess-cell');
            for (const cell of cells) {
                if (parseInt(cell.dataset.position) === position) {
                    return cell;
                }
            }
            console.warn(`⚠️ Zelle für Position ${position} nicht gefunden`);
            return null;
        } catch (error) {
            console.error("❌ Fehler in findCellByPosition:", error);
            return null;
        }
    }

    moeglicheZuegeZuruecksetzen() {
        try {
            const cells = this.chessboard.querySelectorAll('.chess-cell');
            cells.forEach(cell => {
                cell.classList.remove('selected', 'possible-move', 'possible-capture');
            });
            this.moeglicheZuege = [];
            this.selectedCell = null;
            console.log("🔄 Mögliche Züge zurückgesetzt");
        } catch (error) {
            console.error("❌ Fehler in moeglicheZuegeZuruecksetzen:", error);
        }
    }

    eingabeZuruecksetzen() {
        try {
            const vonInput = document.getElementById('vonInput');
            const nachInput = document.getElementById('nachInput');
            if (vonInput) vonInput.value = '';
            if (nachInput) nachInput.value = '';
            this.moeglicheZuegeZuruecksetzen();
            this.vonPos = null;
            this.nachPos = null;
            console.log("🗑️ Eingabe zurückgesetzt");
        } catch (error) {
            console.error("❌ Fehler in eingabeZuruecksetzen:", error);
        }
    }

    zeigeFehler(nachricht) {
        try {
            console.error("💥 Fehler angezeigt:", nachricht);
            
            const fehlerAnzeige = document.createElement('div');
            fehlerAnzeige.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #ff4444;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 1000;
                font-weight: bold;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            `;
            fehlerAnzeige.textContent = nachricht;
            document.body.appendChild(fehlerAnzeige);
            
            setTimeout(() => {
                if (document.body.contains(fehlerAnzeige)) {
                    document.body.removeChild(fehlerAnzeige);
                }
            }, 3000);
        } catch (error) {
            console.error("❌ Fehler in zeigeFehler:", error);
        }
    }

    positionZuNotation(position) {
        try {
            const dateien = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', ''];
            const reihe = Math.floor(position / 10);
            const datei = position % 10;
            return `${dateien[datei]}${reihe - 1}`;
        } catch (error) {
            console.error("❌ Fehler in positionZuNotation:", error);
            return "??";
        }
    }

    notationZuPosition(notation) {
        try {
            if (!notation || notation.length < 2) return -1;
            
            const dateien = { 'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5, 'f': 6, 'g': 7, 'h': 8 };
            const dateiChar = notation[0].toLowerCase();
            const reihe = parseInt(notation[1]);
            
            if (!dateien[dateiChar] || isNaN(reihe)) return -1;
            
            return (reihe + 1) * 10 + dateien[dateiChar];
        } catch (error) {
            console.error("❌ Fehler in notationZuPosition:", error);
            return -1;
        }
    }

    zugZuNotation(zug) {
        const von = this.positionZuNotation(zug.vonPos);
        const nach = this.positionZuNotation(zug.nachPos);
        return `${von}${nach}`;
    }

    // KI-Methoden
    initialisiereKIModi() {
        document.getElementById('btnComputerZug').addEventListener('click', () => {
            this.computerZugAusfuehren();
        });

        document.getElementById('btnSpielerVsKI').addEventListener('click', () => {
            this.setSpielModus('menschVsKI');
        });

        document.getElementById('btnKIVsKI').addEventListener('click', () => {
            this.setSpielModus('kiVsKI');
            this.starteKIVsKI();
        });

        this.erstelleModusAnzeige();
    }

    setSpielModus(modus) {
        this.spielModus = modus;
        this.aktualisiereModusAnzeige();
        console.log(`🎮 Spielmodus geändert: ${modus}`);
    }

    erstelleModusAnzeige() {
        const statusInfo = document.querySelector('.status-info');
        if (statusInfo) {
            const modusAnzeige = document.createElement('div');
            modusAnzeige.id = 'modusAnzeige';
            modusAnzeige.className = 'modus-info';
            modusAnzeige.innerHTML = `<strong>Modus:</strong> <span id="aktuellerModus">Mensch vs Mensch</span>`;
            statusInfo.appendChild(modusAnzeige);
        }
    }

    aktualisiereModusAnzeige() {
        const modusNamen = {
            'menschVsMensch': 'Mensch vs Mensch',
            'menschVsKI': 'Mensch vs KI',
            'kiVsKI': 'KI vs KI'
        };
        
        const modusElement = document.getElementById('aktuellerModus');
        if (modusElement) {
            modusElement.textContent = modusNamen[this.spielModus];
        }
    }

    async computerZugAusfuehren() {
        if (this.kiLaeuft) {
            console.log("⏳ KI berechnet bereits einen Zug...");
            return;
        }

        this.kiLaeuft = true;
        this.zeigeLadeIndikator(true);

        try {
            const startZeit = performance.now();
            const besterZug = chessEngine.computerZug();
            const berechnungsZeit = performance.now() - startZeit;
            
            if (besterZug) {
                console.log(`🤖 KI-Zug berechnet in ${berechnungsZeit.toFixed(0)}ms: ${this.zugZuNotation(besterZug)}`);
                this.fuehreZugAus(besterZug);
            }
        } catch (error) {
            console.error("❌ KI-Berechnungsfehler:", error);
        } finally {
            this.kiLaeuft = false;
            this.zeigeLadeIndikator(false);
        }
    }

    automatischerComputerzug() {
        if ((this.spielModus === 'menschVsKI' && !chessEngine.weissAmZug) || this.spielModus === 'kiVsKI') {
            setTimeout(() => this.computerZugAusfuehren(), 1000);
        }
    }

    starteKIVsKI() {
        if (this.spielModus === 'kiVsKI' && !this.kiLaeuft) {
            this.computerZugAusfuehren();
        }
    }

zeigeLadeIndikator(anzeigen) {
    let ladeIndikator = document.getElementById('ladeIndikator');
    
    if (anzeigen) {
        if (!ladeIndikator) {
            ladeIndikator = document.createElement('div');
            ladeIndikator.id = 'ladeIndikator';
            ladeIndikator.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px 30px;
                border-radius: 10px;
                z-index: 10000;
                font-size: 18px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            ladeIndikator.innerHTML = `
                <div style="animation: spin 1s linear infinite;">⏳</div>
                KI berechnet Zug...
            `;
            
            // CSS für die Animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
            ladeIndikator.dataset.styleId = 'ladeAnimation';
            
            document.body.appendChild(ladeIndikator);
        } else {
            ladeIndikator.style.display = 'flex';
        }
    } else {
        if (ladeIndikator) {
            ladeIndikator.style.display = 'none';
            
            // CSS-Animation entfernen
            const style = document.getElementById('ladeAnimation');
            if (style) {
                style.remove();
            }
        }
    }
}

    // Grundfunktionen
    naechsterzug() { this.computerZugAusfuehren(); }
    weissenzug() { 
        chessEngine.weissAmZug = true; 
        this.aktualisiereStatus(); 
    }
    schwarzerzug() { 
        chessEngine.weissAmZug = false; 
        this.aktualisiereStatus(); 
    }
    neuesspiel() { 
        chessEngine = new ChesstegEngine(); 
        this.aktualisiereAnzeige(); 
    }
    resetspiel() { 
        chessEngine.initialisiereFiguren(); 
        chessEngine.weissAmZug = true; 
        this.aktualisiereAnzeige(); 
    }
}

// UI beim Laden initialisieren mit Error-Handling
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 DOM geladen - initialisiere ChessUI...");
    try {
        window.chessUI = new ChessUI();
        console.log("🎉 ChessUI erfolgreich gestartet!");
    } catch (error) {
        console.error("💥 KRITISCHER FEHLER bei ChessUI Initialisierung:", error);
        alert("Schwerwiegender Fehler: " + error.message);
    }
});