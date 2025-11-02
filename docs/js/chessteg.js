// chessteg.js - Korrigierte Schach-Engine mit verbesserter KI
class ChesstegEngine {
    constructor() {
        this.brett = this.initialisiereBrett();
        this.figurenListe = [];
        this.weissAmZug = true;
        this.bewertung = 0;
        this.endmatt = false;
        this.patt = false;
        this.letzterZug = null;
        this.zugHistorie = [];
        
        // Optimierte KI-Einstellungen
        this.kiEinstellungen = {
            suchtiefe: 3,
            erweiterteBewertung: true,
            quiescenceSearch: true,
            quiescenceTiefe: 2,
            timeoutMs: 8000 // 8 Sekunden Timeout
        };
        
        // Verbesserte Bewertungstabellen
        this.bewertungsTabelle = {
            material: {
                [BAUER]: 100,
                [SPRINGER]: 320,
                [LAEUFER]: 330,
                [TURM]: 500,
                [DAME]: 900,
                [KOENIG]: 20000
            },
            
            // Optimierte Positionsbewertung
            position: {
                [BAUER]: [
                    [0,   0,   0,   0,   0,   0,   0,   0],
                    [50,  50,  50,  50,  50,  50,  50,  50],
                    [10,  10,  20,  30,  30,  20,  10,  10],
                    [5,   5,  10,  25,  25,  10,   5,   5],
                    [0,   0,   0,  20,  20,   0,   0,   0],
                    [5,  -5, -10,   0,   0, -10,  -5,   5],
                    [5,  10,  10, -20, -20,  10,  10,   5],
                    [0,   0,   0,   0,   0,   0,   0,   0]
                ],
                
                [SPRINGER]: [
                    [-50, -40, -30, -30, -30, -30, -40, -50],
                    [-40, -20,   0,   5,   5,   0, -20, -40],
                    [-30,   5,  10,  15,  15,  10,   5, -30],
                    [-30,   0,  15,  20,  20,  15,   0, -30],
                    [-30,   5,  15,  20,  20,  15,   5, -30],
                    [-30,   0,  10,  15,  15,  10,   0, -30],
                    [-40, -20,   0,   0,   0,   0, -20, -40],
                    [-50, -40, -30, -30, -30, -30, -40, -50]
                ],
                
                [LAEUFER]: [
                    [-20, -10, -10, -10, -10, -10, -10, -20],
                    [-10,   0,   0,   0,   0,   0,   0, -10],
                    [-10,   0,   5,  10,  10,   5,   0, -10],
                    [-10,   5,   5,  10,  10,   5,   5, -10],
                    [-10,   0,  10,  10,  10,  10,   0, -10],
                    [-10,  10,  10,  10,  10,  10,  10, -10],
                    [-10,   5,   0,   0,   0,   0,   5, -10],
                    [-20, -10, -10, -10, -10, -10, -10, -20]
                ],
                
                [TURM]: [
                    [0,   0,   0,   5,   5,   0,   0,   0],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [-5,   0,   0,   0,   0,   0,   0,  -5],
                    [5,  10,  10,  10,  10,  10,  10,   5],
                    [0,   0,   0,   0,   0,   0,   0,   0]
                ],
                
                [DAME]: [
                    [-20, -10, -10, -5, -5, -10, -10, -20],
                    [-10,   0,   5,  0,  0,   0,   0, -10],
                    [-10,   5,   5,  5,  5,   5,   0, -10],
                    [0,     0,   5,  5,  5,   5,   0,  -5],
                    [-5,    0,   5,  5,  5,   5,   0,  -5],
                    [-10,   0,   5,  5,  5,   5,   0, -10],
                    [-10,   0,   0,  0,  0,   0,   0, -10],
                    [-20, -10, -10, -5, -5, -10, -10, -20]
                ],
                
                [KOENIG]: [
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
        };

        this.zugCounter = 0;
        this.knotenZaehler = 0;
        this.berechnungsStartzeit = 0;
        
        this.initialisiereFiguren();
    }

    // Bestehende Methoden (unchanged)
    initialisiereBrett() {
        const brett = new Array(120).fill(DUMMY);
        for (let r = 2; r <= 9; r++) {
            for (let l = 1; l <= 8; l++) {
                brett[r * 10 + l] = LEER;
            }
        }
        return brett;
    }

    fuegeFigurHinzu(art, farbe, position) {
        this.figurenListe.push({ art, farbe, pos: position, geschlagen: false });
        this.brett[position] = art * farbe;
    }

    initialisiereFiguren() {
        this.figurenListe = [];
        // Könige
        this.fuegeFigurHinzu(KOENIG, SCHWARZ, 95);
        this.fuegeFigurHinzu(KOENIG, WEISS, 25);
        // Damen
        this.fuegeFigurHinzu(DAME, SCHWARZ, 94);
        this.fuegeFigurHinzu(DAME, WEISS, 24);
        // Türme
        this.fuegeFigurHinzu(TURM, SCHWARZ, 91);
        this.fuegeFigurHinzu(TURM, SCHWARZ, 98);
        this.fuegeFigurHinzu(TURM, WEISS, 21);
        this.fuegeFigurHinzu(TURM, WEISS, 28);
        // Springer
        this.fuegeFigurHinzu(SPRINGER, SCHWARZ, 92);
        this.fuegeFigurHinzu(SPRINGER, SCHWARZ, 97);
        this.fuegeFigurHinzu(SPRINGER, WEISS, 22);
        this.fuegeFigurHinzu(SPRINGER, WEISS, 27);
        // Läufer
        this.fuegeFigurHinzu(LAEUFER, SCHWARZ, 93);
        this.fuegeFigurHinzu(LAEUFER, SCHWARZ, 96);
        this.fuegeFigurHinzu(LAEUFER, WEISS, 23);
        this.fuegeFigurHinzu(LAEUFER, WEISS, 26);
        // Bauern
        for (let i = 1; i <= 8; i++) {
            this.fuegeFigurHinzu(BAUER, SCHWARZ, 80 + i);
            this.fuegeFigurHinzu(BAUER, WEISS, 30 + i);
        }
    }

    istGegner(farbe, feldWert) {
        if (feldWert === LEER || feldWert === DUMMY) return false;
        return (farbe > 0 && feldWert < 0) || (farbe < 0 && feldWert > 0);
    }

    generiereZuege(farbe) {
        let alleZuege = [];
        
        this.figurenListe.forEach(figur => {
            if (!figur.geschlagen && figur.farbe === farbe) {
                const figurenZuege = this.generiereFigurenZuege(figur);
                alleZuege = alleZuege.concat(figurenZuege);
            }
        });
        
        return alleZuege.filter(zug => this.istZugLegal(zug));
    }

    generiereFigurenZuege(figur) {
        switch (figur.art) {
            case TURM:
                return this.generiereTurmZuege(figur);
            case LAEUFER:
                return this.generiereLaeuferZuege(figur);
            case DAME:
                return this.generiereDameZuege(figur);
            case SPRINGER:
                return this.generiereSpringerZuege(figur);
            case KOENIG:
                return this.generiereKoenigsZuege(figur);
            case BAUER:
                return this.generiereBauernZuege(figur);
            default:
                return [];
        }
    }

    generiereTurmZuege(figur) {
        const zuege = [];
        const richtungen = [1, -1, 10, -10];
        
        for (const richtung of richtungen) {
            let feld = figur.pos + richtung;
            
            while (this.brett[feld] !== DUMMY) {
                if (this.brett[feld] === LEER) {
                    zuege.push(this.erstelleZug(figur, feld));
                } else {
                    if (this.istGegner(figur.farbe, this.brett[feld])) {
                        zuege.push(this.erstelleZug(figur, feld, true));
                    }
                    break;
                }
                feld += richtung;
            }
        }
        return zuege;
    }

    generiereLaeuferZuege(figur) {
        const zuege = [];
        const richtungen = [9, 11, -9, -11];
        
        for (const richtung of richtungen) {
            let feld = figur.pos + richtung;
            
            while (this.brett[feld] !== DUMMY) {
                if (this.brett[feld] === LEER) {
                    zuege.push(this.erstelleZug(figur, feld));
                } else {
                    if (this.istGegner(figur.farbe, this.brett[feld])) {
                        zuege.push(this.erstelleZug(figur, feld, true));
                    }
                    break;
                }
                feld += richtung;
            }
        }
        return zuege;
    }

    generiereDameZuege(figur) {
        return [
            ...this.generiereTurmZuege(figur),
            ...this.generiereLaeuferZuege(figur)
        ];
    }

    generiereSpringerZuege(figur) {
        const zuege = [];
        const springerZuege = [8, 12, 19, 21, -8, -12, -19, -21];
        
        for (const s of springerZuege) {
            const feld = figur.pos + s;
            if (this.brett[feld] !== DUMMY) {
                if (this.brett[feld] === LEER) {
                    zuege.push(this.erstelleZug(figur, feld));
                } else if (this.istGegner(figur.farbe, this.brett[feld])) {
                    zuege.push(this.erstelleZug(figur, feld, true));
                }
            }
        }
        return zuege;
    }

    generiereKoenigsZuege(figur) {
        const zuege = [];
        const koenigZuege = [1, -1, 10, -10, 9, 11, -9, -11];
        
        for (const d of koenigZuege) {
            const feld = figur.pos + d;
            if (this.brett[feld] !== DUMMY) {
                if (this.brett[feld] === LEER) {
                    zuege.push(this.erstelleZug(figur, feld));
                } else if (this.istGegner(figur.farbe, this.brett[feld])) {
                    zuege.push(this.erstelleZug(figur, feld, true));
                }
            }
        }
        return zuege;
    }

    generiereBauernZuege(figur) {
        const zuege = [];
        const vorwaerts = figur.farbe === WEISS ? 10 : -10;
        const startreihe = figur.farbe === WEISS ? 3 : 8;
        const aktuelleReihe = Math.floor(figur.pos / 10);

        // Ein Feld vorwärts
        let feld = figur.pos + vorwaerts;
        if (this.brett[feld] === LEER) {
            zuege.push(this.erstelleZug(figur, feld));
            
            // Zwei Felder vorwärts von Startposition
            if (aktuelleReihe === startreihe) {
                const doppelfeld = feld + vorwaerts;
                if (this.brett[doppelfeld] === LEER) {
                    zuege.push(this.erstelleZug(figur, doppelfeld));
                }
            }
        }

        // Schlagen
        for (const seite of [vorwaerts + 1, vorwaerts - 1]) {
            feld = figur.pos + seite;
            if (this.brett[feld] !== DUMMY && this.brett[feld] !== LEER) {
                if (this.istGegner(figur.farbe, this.brett[feld])) {
                    zuege.push(this.erstelleZug(figur, feld, true));
                }
            }
        }

        return zuege;
    }

    erstelleZug(figur, zielPos, istSchlag = false) {
        const geschlageneFigur = istSchlag ? this.findeGeschlageneFigur(zielPos) : null;
        return {
            vonPos: figur.pos,
            nachPos: zielPos,
            art: figur.art,
            farbe: figur.farbe,
            geschlagen: geschlageneFigur ? {
                art: geschlageneFigur.art,
                farbe: geschlageneFigur.farbe,
                pos: geschlageneFigur.pos
            } : null
        };
    }

    istZugLegal(zug) {
        if (zug.vonPos === zug.nachPos) {
            return false;
        }
        
        if (this.brett[zug.vonPos] === LEER || this.brett[zug.vonPos] === DUMMY) {
            return false;
        }
        
        const figurWert = this.brett[zug.vonPos];
        const istWeissAmZug = this.weissAmZug;
        
        if ((istWeissAmZug && figurWert < 0) || (!istWeissAmZug && figurWert > 0)) {
            return false;
        }
        
        const zielWert = this.brett[zug.nachPos];
        if (zielWert !== LEER && zielWert !== DUMMY) {
            if ((istWeissAmZug && zielWert > 0) || (!istWeissAmZug && zielWert < 0)) {
                return false;
            }
        }

        // KORRIGIERTE Schach-Prüfung
        const originalBrett = [...this.brett];
        const originalFigurenListe = JSON.parse(JSON.stringify(this.figurenListe));

        // Temporären Zug ausführen
        this.brett[zug.vonPos] = LEER;
        this.brett[zug.nachPos] = zug.art * zug.farbe;
        
        const ziehendeFigur = this.figurenListe.find(f => 
            f.pos === zug.vonPos && !f.geschlagen && f.farbe === zug.farbe
        );

        if (ziehendeFigur) {
            const ursprungsPos = ziehendeFigur.pos; // Ursprungsposition speichern
            ziehendeFigur.pos = zug.nachPos;
            
            if (zug.geschlagen) {
                const geschlageneFigurTemp = this.figurenListe.find(f => 
                    f.pos === zug.nachPos && !f.geschlagen && f.farbe === -zug.farbe
                );
                if (geschlageneFigurTemp) {
                    geschlageneFigurTemp.geschlagen = true;
                }
            }
        
            const imSchach = this.istKoenigImSchach(zug.farbe);
        
            // Zustand wiederherstellen - KORRIGIERT
            this.brett = originalBrett;
            this.figurenListe = JSON.parse(JSON.stringify(originalFigurenListe));
            
            return !imSchach;
        }
        
        // Fallback: Zustand wiederherstellen
        this.brett = originalBrett;
        this.figurenListe = JSON.parse(JSON.stringify(originalFigurenListe));
        return false;
    }

    findeGeschlageneFigur(position) {
        return this.figurenListe.find(f => 
            f.pos === position && !f.geschlagen && 
            ((this.weissAmZug && f.farbe === SCHWARZ) || (!this.weissAmZug && f.farbe === WEISS))
        );
    }

    zugAusfuehren(zug) {
        if (!this.istZugLegal(zug)) {
            console.log("Zug ist nicht legal:", this.zugZuNotation(zug));
            return false;
        }

        this.brett[zug.vonPos] = LEER;
        this.brett[zug.nachPos] = zug.art * zug.farbe;

        const figur = this.figurenListe.find(f => 
            f.pos === zug.vonPos && !f.geschlagen && f.farbe === zug.farbe
        );
        
        if (figur) {
            figur.pos = zug.nachPos;
            
            if (zug.geschlagen) {
                const geschlagen = this.figurenListe.find(f => 
                    f.pos === zug.nachPos && !f.geschlagen && f.farbe === -zug.farbe
                );
                if (geschlagen) {
                    geschlagen.geschlagen = true;
                }
            }
        }

        this.weissAmZug = !this.weissAmZug;
        this.letzterZug = {...zug};
        this.zugHistorie.push({...zug});
        
        this.pruefeSpielStatus();
        
        console.log("Zug ausgeführt:", this.zugZuNotation(zug));
        return true;
    }

    kopiereZustand() {
        return {
            brett: [...this.brett],
            figurenListe: JSON.parse(JSON.stringify(this.figurenListe)),
            weissAmZug: this.weissAmZug,
            bewertung: this.bewertung,
            endmatt: this.endmatt,
            patt: this.patt
        };
    }

    zurueckZustand(zustand) {
        this.brett = [...zustand.brett];
        this.figurenListe = JSON.parse(JSON.stringify(zustand.figurenListe));
        this.weissAmZug = zustand.weissAmZug;
        this.bewertung = zustand.bewertung;
        this.endmatt = zustand.endmatt;
        this.patt = zustand.patt;
    }

    zugRueckgaengig() {
        if (!this.letzterZug) return false;

        const zug = this.letzterZug;
        
        this.brett[zug.vonPos] = zug.art * zug.farbe;
        this.brett[zug.nachPos] = zug.geschlagen ? zug.geschlagen.art * zug.geschlagen.farbe : LEER;

        const figur = this.figurenListe.find(f => 
            f.pos === zug.nachPos && !f.geschlagen && f.farbe === zug.farbe
        );
        if (figur) {
            figur.pos = zug.vonPos;
        }

        if (zug.geschlagen) {
            const geschlagen = this.figurenListe.find(f => 
                f.art === zug.geschlagen.art && f.farbe === zug.geschlagen.farbe && f.geschlagen
            );
            if (geschlagen) {
                geschlagen.geschlagen = false;
                geschlagen.pos = zug.nachPos;
            }
        }

        this.weissAmZug = !this.weissAmZug;
        this.letzterZug = null;
        this.endmatt = false;
        this.patt = false;
        
        return true;
    }

    /**
     * VERBESSERTE KI-FUNKTIONEN
     */

    /**
     * Optimierte Computerzug-Berechnung mit Timeout
     */
    computerZug() {
        console.log("=== KI-ZUGBERECHNUNG GESTARTET ===");
        const startZeit = performance.now();
        this.berechnungsStartzeit = startZeit;
        this.knotenZaehler = 0;
        this.zugCounter = 0;
        
        const aktuelleFarbe = this.weissAmZug ? WEISS : SCHWARZ;
        let alleZuege = this.generiereZuege(aktuelleFarbe);
        
        if (alleZuege.length === 0) {
            console.log("Keine legalen Züge verfügbar");
            return null;
        }

        // Einfache Eröffnungslogik
        const eroeffnungsZug = this.pruefeEroeffnungsZug(alleZuege);
        if (eroeffnungsZug) {
            console.log("Eröffnungszug verwendet:", this.zugZuNotation(eroeffnungsZug));
            return eroeffnungsZug;
        }

        // Sortiere Züge für bessere Alpha-Beta Performance
        alleZuege = this.sortiereZuege(alleZuege, aktuelleFarbe);
        
        // Alpha-Beta-Suche
        let besterZug = alleZuege[0]; // Fallback
        let besteBewertung = aktuelleFarbe === WEISS ? -Infinity : Infinity;
        
        console.log(`Suche mit Tiefe ${this.kiEinstellungen.suchtiefe}`);
        console.log(`Verfügbare Züge: ${alleZuege.length}`);
        
        for (const zug of alleZuege) {
            // Timeout-Check
            if (performance.now() - startZeit > this.kiEinstellungen.timeoutMs) {
                console.log("Timeout - verwende besten bisherigen Zug");
                break;
            }
            
            this.zugCounter++;
            
            const zustandVorZug = this.kopiereZustand();
            this.fuehreTempZugAus(zug);
            
            let bewertung;
            if (aktuelleFarbe === WEISS) {
                bewertung = this.alphaBeta(
                    this.kiEinstellungen.suchtiefe - 1, 
                    -Infinity, 
                    Infinity, 
                    false,
                    startZeit
                );
            } else {
                bewertung = this.alphaBeta(
                    this.kiEinstellungen.suchtiefe - 1, 
                    -Infinity, 
                    Infinity, 
                    true,
                    startZeit
                );
            }
            
            this.zurueckZustand(zustandVorZug);
            
            console.log(`Zug ${this.zugCounter}: ${this.zugZuNotation(zug)} -> Bewertung: ${bewertung}`);
            
            if (aktuelleFarbe === WEISS) {
                if (bewertung > besteBewertung) {
                    besteBewertung = bewertung;
                    besterZug = zug;
                }
            } else {
                if (bewertung < besteBewertung) {
                    besteBewertung = bewertung;
                    besterZug = zug;
                }
            }
        }
        
        const endZeit = performance.now();
        console.log(`=== KI-ZUGBERECHNUNG ABGESCHLOSSEN ===`);
        console.log(`Bester Zug: ${this.zugZuNotation(besterZug)}`);
        console.log(`Bewertung: ${besteBewertung}`);
        console.log(`Berechnete Knoten: ${this.knotenZaehler}`);
        console.log(`Benötigte Zeit: ${(endZeit - startZeit).toFixed(0)}ms`);
        
        return besterZug;
    }

    /**
     * Optimierte Alpha-Beta-Suche mit Timeout
     */
    alphaBeta(tiefe, alpha, beta, maximierend, startZeit) {
        // Timeout-Check
        if (performance.now() - startZeit > this.kiEinstellungen.timeoutMs) {
            return maximierend ? -10000 : 10000; // Strafwert bei Timeout
        }
        
        this.knotenZaehler++;
        
        // Blattknoten oder Endstellung
        if (tiefe === 0) {
            if (this.kiEinstellungen.quiescenceSearch) {
                return this.quiescenceSearch(alpha, beta, maximierend, startZeit);
            }
            return this.bewerteStellung();
        }
        
        const aktuelleFarbe = maximierend ? WEISS : SCHWARZ;
        let zuege = this.generiereZuege(aktuelleFarbe);
        
        // Terminale Stellungen
        if (zuege.length === 0) {
            if (this.istKoenigImSchach(aktuelleFarbe)) {
                return maximierend ? -20000 + tiefe : 20000 - tiefe;
            }
            return 0;
        }
        
        // Sortiere Züge für bessere Cutoffs
        zuege = this.sortiereZuege(zuege, aktuelleFarbe);
        
        if (maximierend) {
            let maxBewertung = -Infinity;
            
            for (const zug of zuege) {
                const zustandVorZug = this.kopiereZustand();
                this.fuehreTempZugAus(zug);
                
                const bewertung = this.alphaBeta(tiefe - 1, alpha, beta, false, startZeit);
                
                this.zurueckZustand(zustandVorZug);
                
                maxBewertung = Math.max(maxBewertung, bewertung);
                alpha = Math.max(alpha, bewertung);
                
                if (beta <= alpha) {
                    break; // Beta-Cutoff
                }
            }
            
            return maxBewertung;
        } else {
            let minBewertung = Infinity;
            
            for (const zug of zuege) {
                const zustandVorZug = this.kopiereZustand();
                this.fuehreTempZugAus(zug);
                
                const bewertung = this.alphaBeta(tiefe - 1, alpha, beta, true, startZeit);
                
                this.zurueckZustand(zustandVorZug);
                
                minBewertung = Math.min(minBewertung, bewertung);
                beta = Math.min(beta, bewertung);
                
                if (beta <= alpha) {
                    break; // Alpha-Cutoff
                }
            }
            
            return minBewertung;
        }
    }

    /**
     * Quiescence Search für stabile Stellungen
     */
    quiescenceSearch(alpha, beta, maximierend, startZeit) {
        const standbewertung = this.bewerteStellung();
        
        if (maximierend) {
            if (standbewertung >= beta) return beta;
            alpha = Math.max(alpha, standbewertung);
        } else {
            if (standbewertung <= alpha) return alpha;
            beta = Math.min(beta, standbewertung);
        }
        
        // Nur Schlagzüge generieren
        const schlagZuege = this.generiereSchlagZuege(maximierend ? WEISS : SCHWARZ);
        
        if (schlagZuege.length === 0) {
            return standbewertung;
        }
        
        // Timeout-Check
        if (performance.now() - startZeit > this.kiEinstellungen.timeoutMs) {
            return standbewertung;
        }
        
        if (maximierend) {
            for (const zug of schlagZuege) {
                const zustandVorZug = this.kopiereZustand();
                this.fuehreTempZugAus(zug);
                
                const bewertung = this.quiescenceSearch(alpha, beta, false, startZeit);
                
                this.zurueckZustand(zustandVorZug);
                
                alpha = Math.max(alpha, bewertung);
                if (beta <= alpha) break;
            }
            return alpha;
        } else {
            for (const zug of schlagZuege) {
                const zustandVorZug = this.kopiereZustand();
                this.fuehreTempZugAus(zug);
                
                const bewertung = this.quiescenceSearch(alpha, beta, true, startZeit);
                
                this.zurueckZustand(zustandVorZug);
                
                beta = Math.min(beta, bewertung);
                if (beta <= alpha) break;
            }
            return beta;
        }
    }

    /**
     * Sortiert Züge für bessere Alpha-Beta Performance
     */
    sortiereZuege(zuege, farbe) {
        return zuege.sort((a, b) => {
            // Schlagzüge zuerst
            const aSchlag = a.geschlagen ? this.bewertungsTabelle.material[a.geschlagen.art] : 0;
            const bSchlag = b.geschlagen ? this.bewertungsTabelle.material[b.geschlagen.art] : 0;
            
            if (aSchlag !== bSchlag) {
                return bSchlag - aSchlag; // Höhere Schlagwerte zuerst
            }
            
            // Zentrumszüge bevorzugen
            const aZentrum = this.berechneZentrumsWert(a.nachPos);
            const bZentrum = this.berechneZentrumsWert(b.nachPos);
            
            return bZentrum - aZentrum;
        });
    }

    /**
     * Einfache Eröffnungslogik
     */
    pruefeEroeffnungsZug(zuege) {
        const zugNummer = this.zugHistorie.length;
        
        // Nur in den ersten 8 Zügen Eröffnungslogik anwenden
        if (zugNummer >= 8) return null;
        
        // Zentrumsbauern bevorzugen
        const zentrumsZuege = zuege.filter(zug => 
            zug.art === BAUER && 
            (zug.nachPos === 44 || zug.nachPos === 45 || zug.nachPos === 54 || zug.nachPos === 55)
        );
        
        if (zentrumsZuege.length > 0) {
            return zentrumsZuege[0];
        }
        
        // Springer entwickeln
        const springerZuege = zuege.filter(zug => 
            zug.art === SPRINGER && 
            (zug.nachPos === 33 || zug.nachPos === 36 || zug.nachPos === 63 || zug.nachPos === 66)
        );
        
        if (springerZuege.length > 0) {
            return springerZuege[0];
        }
        
        return null;
    }

    /**
     * Berechnet Zentrumswert für eine Position
     */
    berechneZentrumsWert(position) {
        const [reihe, linie] = this.positionZuKoordinaten(position);
        const mitteReihe = 5.5; // Zwischen Reihe 5 und 6
        const mitteLinie = 4.5; // Zwischen Linie 4 und 5
        
        const distanzReihe = Math.abs(reihe - mitteReihe);
        const distanzLinie = Math.abs(linie - mitteLinie);
        
        // Je näher am Zentrum, desto höher der Wert
        return 10 - (distanzReihe + distanzLinie);
    }

    generiereSchlagZuege(farbe) {
        const alleZuege = this.generiereZuege(farbe);
        return alleZuege.filter(zug => zug.geschlagen !== null);
    }

    /**
     * Verbesserte Bewertungsfunktion
     */
    bewerteStellung() {
        if (this.endmatt) {
            return this.weissAmZug ? -20000 : 20000;
        }
        
        if (this.patt) {
            return 0;
        }
        
        let material = 0;
        let position = 0;
        let entwicklungsVorteil = this.berechneEntwicklungsVorteil();
        let zentrumsKontrolle = this.berechneZentrumsKontrolle();
        let bauernStruktur = this.berechneBauernStruktur();
        
        // Material und Positionsbewertung
        for (const figur of this.figurenListe) {
            if (figur.geschlagen) continue;
            
            const figurWert = this.bewertungsTabelle.material[figur.art];
            const posWert = this.berechnePositionsWert(figur);
            
            if (figur.farbe === WEISS) {
                material += figurWert;
                position += posWert;
            } else {
                material -= figurWert;
                position -= posWert;
            }
        }
        
        // Verbesserte Gewichtung
        const gesamtBewertung = 
            material + 
            position * 0.1 + 
            entwicklungsVorteil * 2 + 
            zentrumsKontrolle * 1.5 +
            bauernStruktur * 0.5;
            
        this.bewertung = Math.round(gesamtBewertung);
        return this.bewertung;
    }

    berechnePositionsWert(figur) {
        if (!this.kiEinstellungen.erweiterteBewertung) {
            return 0;
        }
        
        const [brettReihe, brettLinie] = this.positionZuKoordinaten(figur.pos);
        
        let reihe = figur.farbe === WEISS ? brettReihe - 2 : 7 - (brettReihe - 2);
        let linie = brettLinie - 1;
        
        reihe = Math.max(0, Math.min(7, reihe));
        linie = Math.max(0, Math.min(7, linie));
        
        return this.bewertungsTabelle.position[figur.art][reihe][linie];
    }

    positionZuKoordinaten(position) {
        const reihe = Math.floor(position / 10);
        const linie = position % 10;
        return [reihe, linie];
    }

    berechneEntwicklungsVorteil() {
        let vorteil = 0;
        
        const entwickelteFiguren = this.figurenListe.filter(figur => 
            !figur.geschlagen && 
            (figur.art === SPRINGER || figur.art === LAEUFER) &&
            this.istFigurEntwickelt(figur)
        );
        
        for (const figur of entwickelteFiguren) {
            vorteil += figur.farbe === WEISS ? 20 : -20;
        }
        
        return vorteil;
    }

    istFigurEntwickelt(figur) {
        const startReihe = figur.farbe === WEISS ? 2 : 9;
        return Math.floor(figur.pos / 10) !== startReihe;
    }

    berechneZentrumsKontrolle() {
        const zentrumsFelder = [44, 45, 54, 55];
        let kontrolle = 0;
        
        for (const feld of zentrumsFelder) {
            if (this.brett[feld] !== LEER) {
                const figur = this.figurenListe.find(f => f.pos === feld && !f.geschlagen);
                if (figur) {
                    // Höhere Werte für stärkere Figuren
                    const figurWert = this.bewertungsTabelle.material[figur.art] / 100;
                    kontrolle += figur.farbe === WEISS ? figurWert * 5 : -figurWert * 5;
                }
            }
        }
        
        return kontrolle;
    }

    /**
     * Einfache Bauernstruktur-Bewertung
     */
    berechneBauernStruktur() {
        let bewertung = 0;
        
        // Doppelbauern bestrafen
        const bauernProLinie = {};

        for (const figur of this.figurenListe) {
            if (!figur.geschlagen && figur.art === BAUER) {
                const linie = figur.pos % 10;
                const key = `${linie}-${figur.farbe}`;
                bauernProLinie[key] = (bauernProLinie[key] || 0) + 1;
            }
        }

        for (const key in bauernProLinie) {
            if (bauernProLinie[key] > 1) {
                const farbe = key.includes(WEISS) ? WEISS : SCHWARZ;
                bewertung += farbe === WEISS ? -20 : 20;
            }
        }
        
        return bewertung;
    }

    zugZuNotation(zug) {
        const von = this.positionZuNotation(zug.vonPos);
        const nach = this.positionZuNotation(zug.nachPos);
        return `${von}${nach}`;
    }

    fuehreTempZugAus(zug) {
        this.brett[zug.vonPos] = LEER;
        this.brett[zug.nachPos] = zug.art * zug.farbe;
        
        const figur = this.figurenListe.find(f => 
            f.pos === zug.vonPos && !f.geschlagen && f.farbe === zug.farbe
        );
        
        if (figur) {
            figur.pos = zug.nachPos;
            
            if (zug.geschlagen) {
                const geschlagen = this.figurenListe.find(f => 
                    f.pos === zug.nachPos && !f.geschlagen && f.farbe === -zug.farbe
                );
                if (geschlagen) {
                    geschlagen.geschlagen = true;
                }
            }
        }
    }

    // Bestehende Methoden für Spielregeln
    istSchachmatt(farbe) {
        if (this.istKoenigImSchach(farbe)) {
            const legaleZuege = this.generiereZuege(farbe);
            return legaleZuege.length === 0;
        }
        return false;
    }

    istPatt(farbe) {
        if (!this.istKoenigImSchach(farbe)) {
            const legaleZuege = this.generiereZuege(farbe);
            return legaleZuege.length === 0;
        }
        return false;
    }

    istKoenigImSchach(farbe) {
        const koenig = this.figurenListe.find(f => 
            f.art === KOENIG && f.farbe === farbe && !f.geschlagen
        );
        
        if (!koenig) return false;

        const gegnerFarbe = -farbe;
        
        for (const figur of this.figurenListe) {
            if (figur.geschlagen || figur.farbe !== gegnerFarbe) continue;
            
            const angriffsZuege = this.generiereFigurenZuege(figur);

            for (const zug of angriffsZuege) {
                if (zug.nachPos === koenig.pos) {
                    return true;
                }
            }
        }
        
        return false;
    }

    pruefeSpielStatus() {
        const aktuelleFarbe = this.weissAmZug ? WEISS : SCHWARZ;
        
        if (this.istSchachmatt(aktuelleFarbe)) {
            this.endmatt = true;
            this.patt = false;
        } else if (this.istPatt(aktuelleFarbe)) {
            this.patt = true;
            this.endmatt = false;
        } else {
            this.endmatt = false;
            this.patt = false;
        }
    }

    positionZuNotation(position) {
        const dateien = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', ''];
        const reihe = Math.floor(position / 10);
        const datei = position % 10;
        return `${dateien[datei]}${reihe - 1}`;
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
        
        return `${farbe} ${namen[art] || 'Unbekannt'}`;
    }

    // Debug-Funktionen (unchanged)
    debugBrettDetail() {
        console.log("=== BRETT DETAIL DEBUG ===");
        for (let reihe = 9; reihe >= 2; reihe--) {
            let line = `Reihe ${reihe - 1}: `;
            for (let linie = 1; linie <= 8; linie++) {
                const pos = reihe * 10 + linie;
                const figur = this.brett[pos];
                let symbol = '.';
                if (figur !== LEER && figur !== DUMMY) {
                    const namen = { [BAUER]: 'p', [TURM]: 'r', [LAEUFER]: 'b', [SPRINGER]: 'n', [DAME]: 'q', [KOENIG]: 'k' };
                    symbol = namen[Math.abs(figur)] || '?';
                    if (figur > 0) symbol = symbol.toUpperCase();
                }
                line += symbol + ' ';
            }
            console.log(line);
        }
        
        console.log("\n=== FIGURENLISTE ===");
        this.figurenListe.forEach((figur, index) => {
            if (!figur.geschlagen) {
                console.log(`${index}: ${this.getFigurName(figur.art * figur.farbe)} auf ${this.positionZuNotation(figur.pos)}`);
            }
        });
        
        console.log(`Am Zug: ${this.weissAmZug ? 'Weiß' : 'Schwarz'}`);
        console.log(`Status: ${this.endmatt ? 'Schachmatt' : (this.patt ? 'Patt' : (this.istKoenigImSchach(this.weissAmZug ? WEISS : SCHWARZ) ? 'Schach' : 'Normal'))}`);
        console.log("====================");
    }

    debugZugGenerierung() {
        console.log("=== ZUGGENERIERUNG DEBUG ===");
        const farbe = this.weissAmZug ? WEISS : SCHWARZ;
        const zuege = this.generiereZuege(farbe);
        
        console.log(`Farbe ${this.weissAmZug ? 'Weiß' : 'Schwarz'} am Zug: ${zuege.length} legale Züge.`);
        
        zuege.slice(0, 8).forEach((zug, i) => {
            console.log(`Zug ${i + 1}: ${this.zugZuNotation(zug)}`);
        });
        console.log("====================");
    }
}

// Konstanten
const WEISS = 1;
const SCHWARZ = -1;
const LEER = 0;
const DUMMY = 100;
const BAUER = 1;
const LAEUFER = 3;
const SPRINGER = 4;
const TURM = 5;
const DAME = 9;
const KOENIG = 99;

let chessEngine = new ChesstegEngine();