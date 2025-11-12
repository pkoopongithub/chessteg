// chessteg.js - Erweiterte Schach-Engine mit verbesserter KI
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
        this.historieIndex = -1;
        
        // Spezialzug-Variablen
        this.rochadeRechte = {
            weissKurz: true,
            weissLang: true,  
            schwarzKurz: true,
            schwarzLang: true
        };
        this.enPassantTarget = null;
        this.halbzugCounter = 0;
        this.vollzugCounter = 1;
        
        // ERWEITERT: KI-Einstellungen
        this.kiEinstellungen = {
            suchtiefe: 3, // Erhöhte Standardtiefe
            erweiterteBewertung: true,
            timeoutMs: 5000,
            useMoveOrdering: true,
            useQuiescenceSearch: true
        };

        this.zugCounter = 0;
        this.knotenZaehler = 0;
        this.berechnungsStartzeit = 0;
        
        // NEU: Transposition Table Vorbereitung
        this.transpositionTable = new Map();
        this.zobristKeys = this.initialisiereZobristKeys();
        
        // NEU: History Heuristic für Move Ordering
        this.historyHeuristic = new Array(120).fill().map(() => new Array(120).fill(0));
        
        this.initialisiereFiguren();
    }

    // NEU: Zobrist Hashing für Transposition Table
    initialisiereZobristKeys() {
        const keys = {
            figuren: {},
            schwarzAmZug: Math.floor(Math.random() * 2**32),
            rochade: {},
            enPassant: {}
        };
        
        // Zufallszahlen für jede Figur auf jedem Feld
        for (let pos = 0; pos < 120; pos++) {
            if (this.brett[pos] !== DUMMY) {
                keys.figuren[pos] = {};
                [-KOENIG, -DAME, -TURM, -LAEUFER, -SPRINGER, -BAUER, 
                 BAUER, SPRINGER, LAEUFER, TURM, DAME, KOENIG].forEach(figur => {
                    if (figur !== 0) {
                        keys.figuren[pos][figur] = Math.floor(Math.random() * 2**32);
                    }
                });
            }
        }
        
        // Rochade-Rechte
        ['weissKurz', 'weissLang', 'schwarzKurz', 'schwarzLang'].forEach(recht => {
            keys.rochade[recht] = Math.floor(Math.random() * 2**32);
        });
        
        // En Passant
        for (let pos = 0; pos < 120; pos++) {
            keys.enPassant[pos] = Math.floor(Math.random() * 2**32);
        }
        
        return keys;
    }

    // NEU: Berechne Zobrist Hash für aktuelle Stellung
    berechneZobristHash() {
        let hash = 0;
        
        // Figuren
        for (const figur of this.figurenListe) {
            if (!figur.geschlagen) {
                hash ^= this.zobristKeys.figuren[figur.pos][figur.art * figur.farbe];
            }
        }
        
        // Spieler am Zug
        if (!this.weissAmZug) {
            hash ^= this.zobristKeys.schwarzAmZug;
        }
        
        // Rochade-Rechte
        if (this.rochadeRechte.weissKurz) hash ^= this.zobristKeys.rochade.weissKurz;
        if (this.rochadeRechte.weissLang) hash ^= this.zobristKeys.rochade.weissLang;
        if (this.rochadeRechte.schwarzKurz) hash ^= this.zobristKeys.rochade.schwarzKurz;
        if (this.rochadeRechte.schwarzLang) hash ^= this.zobristKeys.rochade.schwarzLang;
        
        // En Passant
        if (this.enPassantTarget !== null) {
            hash ^= this.zobristKeys.enPassant[this.enPassantTarget];
        }
        
        return hash;
    }

    // Grundlegende Methoden
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
        // Grundstellung
        this.fuegeFigurHinzu(KOENIG, SCHWARZ, 95);
        this.fuegeFigurHinzu(KOENIG, WEISS, 25);
        this.fuegeFigurHinzu(DAME, SCHWARZ, 94);
        this.fuegeFigurHinzu(DAME, WEISS, 24);
        this.fuegeFigurHinzu(TURM, SCHWARZ, 91);
        this.fuegeFigurHinzu(TURM, SCHWARZ, 98);
        this.fuegeFigurHinzu(TURM, WEISS, 21);
        this.fuegeFigurHinzu(TURM, WEISS, 28);
        this.fuegeFigurHinzu(SPRINGER, SCHWARZ, 92);
        this.fuegeFigurHinzu(SPRINGER, SCHWARZ, 97);
        this.fuegeFigurHinzu(SPRINGER, WEISS, 22);
        this.fuegeFigurHinzu(SPRINGER, WEISS, 27);
        this.fuegeFigurHinzu(LAEUFER, SCHWARZ, 93);
        this.fuegeFigurHinzu(LAEUFER, SCHWARZ, 96);
        this.fuegeFigurHinzu(LAEUFER, WEISS, 23);
        this.fuegeFigurHinzu(LAEUFER, WEISS, 26);
        for (let i = 1; i <= 8; i++) {
            this.fuegeFigurHinzu(BAUER, SCHWARZ, 80 + i);
            this.fuegeFigurHinzu(BAUER, WEISS, 30 + i);
        }
        
        // Reset Spezialzüge
        this.rochadeRechte = { weissKurz: true, weissLang: true, schwarzKurz: true, schwarzLang: true };
        this.enPassantTarget = null;
        this.halbzugCounter = 0;
        this.vollzugCounter = 1;
        this.zugHistorie = [];
        this.historieIndex = -1;
        this.zugCounter = 0;
        this.transpositionTable.clear();
    }

    istGegner(farbe, feldWert) {
        if (feldWert === LEER || feldWert === DUMMY) return false;
        return (farbe > 0 && feldWert < 0) || (farbe < 0 && feldWert > 0);
    }

    // ZUGGENERIERUNG
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
            case TURM: return this.generiereTurmZuege(figur);
            case LAEUFER: return this.generiereLaeuferZuege(figur);
            case DAME: return this.generiereDameZuege(figur);
            case SPRINGER: return this.generiereSpringerZuege(figur);
            case KOENIG: return this.generiereKoenigsZuege(figur);
            case BAUER: return this.generiereBauernZuege(figur);
            default: return [];
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
        return [...this.generiereTurmZuege(figur), ...this.generiereLaeuferZuege(figur)];
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

    generiereBauernZuege(figur) {
        const zuege = [];
        const vorwaerts = figur.farbe === WEISS ? 10 : -10;
        const startreihe = figur.farbe === WEISS ? 3 : 8;
        const aktuelleReihe = Math.floor(figur.pos / 10);

        // Ein Feld vorwärts
        let feld = figur.pos + vorwaerts;
        if (this.brett[feld] === LEER) {
            const zielReihe = Math.floor(feld / 10);
            
            if ((figur.farbe === WEISS && zielReihe === 9) || 
                (figur.farbe === SCHWARZ && zielReihe === 2)) {
                // Umwandlung
                [DAME, TURM, LAEUFER, SPRINGER].forEach(umwandlungsFigur => {
                    zuege.push(this.erstelleZug(figur, feld, false, umwandlungsFigur));
                });
            } else {
                zuege.push(this.erstelleZug(figur, feld));
                
                // Zwei Felder von Startposition
                if (aktuelleReihe === startreihe) {
                    const doppelfeld = feld + vorwaerts;
                    if (this.brett[doppelfeld] === LEER) {
                        zuege.push(this.erstelleZug(figur, doppelfeld));
                    }
                }
            }
        }

        // Schlagzüge
        for (const seite of [vorwaerts + 1, vorwaerts - 1]) {
            feld = figur.pos + seite;
            if (this.brett[feld] !== DUMMY && this.brett[feld] !== LEER) {
                if (this.istGegner(figur.farbe, this.brett[feld])) {
                    const zielReihe = Math.floor(feld / 10);
                    
                    if ((figur.farbe === WEISS && zielReihe === 9) || 
                        (figur.farbe === SCHWARZ && zielReihe === 2)) {
                        // Umwandlung bei Schlag
                        [DAME, TURM, LAEUFER, SPRINGER].forEach(umwandlungsFigur => {
                            zuege.push(this.erstelleZug(figur, feld, true, umwandlungsFigur));
                        });
                    } else {
                        zuege.push(this.erstelleZug(figur, feld, true));
                    }
                }
            }
        }

        // En Passant
        if (this.enPassantTarget) {
            for (const seite of [vorwaerts + 1, vorwaerts - 1]) {
                feld = figur.pos + seite;
                if (feld === this.enPassantTarget) {
                    const enPassantZug = this.erstelleZug(figur, feld, true);
                    const geschlagenPos = figur.farbe === WEISS ? feld - 10 : feld + 10;
                    enPassantZug.geschlagen = this.findeGeschlageneFigur(geschlagenPos);
                    enPassantZug.enPassant = true;
                    zuege.push(enPassantZug);
                }
            }
        }

        return zuege;
    }

    generiereKoenigsZuege(figur) {
        const zuege = [];
        const koenigZuege = [1, -1, 10, -10, 9, 11, -9, -11];
        
        // Normale Königszüge
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

        // ROCHADE
        if (!this.istKoenigImSchach(figur.farbe)) {
            const istWeiss = figur.farbe === WEISS;
            const startReihe = istWeiss ? 2 : 9;
            
            // Kurze Rochade (Königsseite)
            if (this.istRochadeMoeglich(figur.farbe, 'kurz')) {
                const rochadeZug = this.erstelleZug(figur, startReihe * 10 + 7);
                rochadeZug.rochade = 'kurz';
                zuege.push(rochadeZug);
            }
            
            // Lange Rochade (Dameneseite)
            if (this.istRochadeMoeglich(figur.farbe, 'lang')) {
                const rochadeZug = this.erstelleZug(figur, startReihe * 10 + 3);
                rochadeZug.rochade = 'lang';
                zuege.push(rochadeZug);
            }
        }

        return zuege;
    }

    istRochadeMoeglich(farbe, seite) {
        const istWeiss = farbe === WEISS;
        const startReihe = istWeiss ? 2 : 9;
        
        // Rochade-Rechte prüfen
        if (seite === 'kurz') {
            if (!(istWeiss ? this.rochadeRechte.weissKurz : this.rochadeRechte.schwarzKurz)) {
                return false;
            }
        } else {
            if (!(istWeiss ? this.rochadeRechte.weissLang : this.rochadeRechte.schwarzLang)) {
                return false;
            }
        }

        // König muss auf Startposition sein
        const koenigPos = startReihe * 10 + 5;
        const koenig = this.figurenListe.find(f => 
            f.art === KOENIG && f.farbe === farbe && f.pos === koenigPos && !f.geschlagen
        );
        if (!koenig) return false;

        // Felder zwischen König und Turm müssen leer sein
        let felderZuPruefen = [];
        let turmPos;
        
        if (seite === 'kurz') {
            turmPos = startReihe * 10 + 8;
            felderZuPruefen = [koenigPos + 1, koenigPos + 2];
        } else {
            turmPos = startReihe * 10 + 1;
            felderZuPruefen = [koenigPos - 1, koenigPos - 2, koenigPos - 3];
        }

        // Turm muss existieren
        const turm = this.figurenListe.find(f => 
            f.art === TURM && f.farbe === farbe && f.pos === turmPos && !f.geschlagen
        );
        if (!turm) return false;

        // Felder müssen leer sein
        for (const feld of felderZuPruefen) {
            if (this.brett[feld] !== LEER) {
                return false;
            }
        }

        // König darf nicht durch Schach ziehen
        const felderFuerSchachPruefung = seite === 'kurz' 
            ? [koenigPos, koenigPos + 1, koenigPos + 2]
            : [koenigPos, koenigPos - 1, koenigPos - 2];
            
        for (const feld of felderFuerSchachPruefung) {
            if (this.istFeldBedroht(feld, farbe)) {
                return false;
            }
        }

        return true;
    }

    istFeldBedroht(feld, farbe) {
        const gegnerFarbe = -farbe;
        
        for (const figur of this.figurenListe) {
            if (figur.geschlagen || figur.farbe !== gegnerFarbe) continue;
            
            const zuege = this.generiereFigurenZuegeOhneSchachpruefung(figur);
            for (const zug of zuege) {
                if (zug.nachPos === feld) {
                    return true;
                }
            }
        }
        
        return false;
    }

    erstelleZug(figur, zielPos, istSchlag = false, umwandlungsFigur = null) {
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
            } : null,
            umwandlungsFigur: umwandlungsFigur,
            enPassant: false,
            rochade: null,
            istBauernDoppelschritt: figur.art === BAUER && Math.abs(zielPos - figur.pos) === 20
        };
    }

    findeGeschlageneFigur(position) {
        return this.figurenListe.find(f => 
            f.pos === position && !f.geschlagen && 
            ((this.weissAmZug && f.farbe === SCHWARZ) || (!this.weissAmZug && f.farbe === WEISS))
        );
    }

    istKoenigImSchach(farbe) {
        const koenig = this.figurenListe.find(f => 
            f.art === KOENIG && f.farbe === farbe && !f.geschlagen
        );
        
        if (!koenig) return false;

        const gegnerFarbe = -farbe;
        
        for (const figur of this.figurenListe) {
            if (figur.geschlagen || figur.farbe !== gegnerFarbe) continue;
            
            const zuege = this.generiereFigurenZuegeOhneSchachpruefung(figur);
            for (const zug of zuege) {
                if (zug.nachPos === koenig.pos) {
                    return true;
                }
            }
        }
        
        return false;
    }

    generiereFigurenZuegeOhneSchachpruefung(figur) {
        switch (figur.art) {
            case TURM: return this.generiereTurmZuege(figur);
            case LAEUFER: return this.generiereLaeuferZuege(figur);
            case DAME: return this.generiereDameZuege(figur);
            case SPRINGER: return this.generiereSpringerZuege(figur);
            case BAUER: return this.generiereBauernZuegeOhneEnPassant(figur);
            case KOENIG: 
                const zuege = [];
                const koenigZuege = [1, -1, 10, -10, 9, 11, -9, -11];
                for (const d of koenigZuege) {
                    const feld = figur.pos + d;
                    if (this.brett[feld] !== DUMMY) {
                        if (this.brett[feld] === LEER || this.istGegner(figur.farbe, this.brett[feld])) {
                            zuege.push({ vonPos: figur.pos, nachPos: feld });
                        }
                    }
                }
                return zuege;
            default: return [];
        }
    }

    generiereBauernZuegeOhneEnPassant(figur) {
        const zuege = [];
        const vorwaerts = figur.farbe === WEISS ? 10 : -10;
        
        // Schlagzüge
        for (const seite of [vorwaerts + 1, vorwaerts - 1]) {
            const feld = figur.pos + seite;
            if (this.brett[feld] !== DUMMY && this.brett[feld] !== LEER) {
                if (this.istGegner(figur.farbe, this.brett[feld])) {
                    zuege.push({ vonPos: figur.pos, nachPos: feld });
                }
            }
        }
        return zuege;
    }

    istZugLegal(zug) {
        const originalBrett = [...this.brett];
        const originalFigurenListe = JSON.parse(JSON.stringify(this.figurenListe));

        this.brett[zug.vonPos] = LEER;
        this.brett[zug.nachPos] = zug.art * zug.farbe;
        
        const ziehendeFigur = this.figurenListe.find(f => 
            f.pos === zug.vonPos && !f.geschlagen && f.farbe === zug.farbe
        );

        if (ziehendeFigur) {
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
        
            this.brett = originalBrett;
            this.figurenListe = JSON.parse(JSON.stringify(originalFigurenListe));
            
            return !imSchach;
        }
        
        this.brett = originalBrett;
        this.figurenListe = JSON.parse(JSON.stringify(originalFigurenListe));
        return false;
    }

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

    erstelleZustandSnapshot() {
        return {
            brett: [...this.brett],
            figurenListe: JSON.parse(JSON.stringify(this.figurenListe)),
            weissAmZug: this.weissAmZug,
            bewertung: this.bewertung,
            endmatt: this.endmatt,
            patt: this.patt,
            rochadeRechte: {...this.rochadeRechte},
            enPassantTarget: this.enPassantTarget,
            halbzugCounter: this.halbzugCounter,
            vollzugCounter: this.vollzugCounter,
            zugCounter: this.zugCounter
        };
    }

    wiederherstelleZustand(snapshot) {
        this.brett = [...snapshot.brett];
        this.figurenListe = JSON.parse(JSON.stringify(snapshot.figurenListe));
        this.weissAmZug = snapshot.weissAmZug;
        this.bewertung = snapshot.bewertung;
        this.endmatt = snapshot.endmatt;
        this.patt = snapshot.patt;
        this.rochadeRechte = {...snapshot.rochadeRechte};
        this.enPassantTarget = snapshot.enPassantTarget;
        this.halbzugCounter = snapshot.halbzugCounter;
        this.vollzugCounter = snapshot.vollzugCounter;
        this.zugCounter = snapshot.zugCounter;
    }

    zugAusfuehren(zug) {
        if (!this.istZugLegal(zug)) {
            console.log("Zug ist nicht legal:", this.zugZuNotation(zug));
            return false;
        }

        const zustandVorZug = this.erstelleZustandSnapshot();

        if (this.historieIndex < this.zugHistorie.length - 1) {
            this.zugHistorie = this.zugHistorie.slice(0, this.historieIndex + 1);
        }

        this.brett[zug.vonPos] = LEER;
        const endgueltigeFigurArt = zug.umwandlungsFigur || zug.art;
        this.brett[zug.nachPos] = endgueltigeFigurArt * zug.farbe;

        const figur = this.figurenListe.find(f => 
            f.pos === zug.vonPos && !f.geschlagen && f.farbe === zug.farbe
        );
        
        if (figur) {
            figur.pos = zug.nachPos;
            
            if (zug.enPassant && zug.geschlagen) {
                const geschlagen = this.figurenListe.find(f => 
                    f.pos === zug.geschlagen.pos && !f.geschlagen
                );
                if (geschlagen) {
                    geschlagen.geschlagen = true;
                    this.brett[zug.geschlagen.pos] = LEER;
                }
            }
            else if (zug.geschlagen) {
                const geschlagen = this.figurenListe.find(f => 
                    f.pos === zug.nachPos && !f.geschlagen && f.farbe === -zug.farbe
                );
                if (geschlagen) {
                    geschlagen.geschlagen = true;
                }
            }

            if (zug.umwandlungsFigur) {
                figur.art = zug.umwandlungsFigur;
            }
        }

        if (zug.rochade) {
            this.fuehreRochadeAus(zug.farbe, zug.rochade);
        }

        this.aktualisiereRochadeRechte(zug);

        this.enPassantTarget = null;
        if (zug.istBauernDoppelschritt) {
            this.enPassantTarget = zug.farbe === WEISS ? zug.nachPos - 10 : zug.nachPos + 10;
        }

        if (zug.art === BAUER || zug.geschlagen) {
            this.halbzugCounter = 0;
        } else {
            this.halbzugCounter++;
        }

        if (zug.farbe === SCHWARZ) {
            this.vollzugCounter++;
        }

        this.weissAmZug = !this.weissAmZug;
        this.zugCounter++;

        const erweiterterZug = {
            ...zug,
            zustandVorZug: zustandVorZug,
            zugNummer: this.zugCounter,
            vollzugNummer: this.vollzugCounter
        };
        
        this.letzterZug = erweiterterZug;
        this.zugHistorie.push(erweiterterZug);
        this.historieIndex = this.zugHistorie.length - 1;

        if (this.zugHistorie.length > 50) {
            this.zugHistorie.shift();
            this.historieIndex--;
        }

        this.pruefeSpielStatus();
        
        console.log("Zug ausgeführt:", this.zugZuNotation(zug), "Zug-Nr:", this.zugCounter);
        if (zug.rochade) console.log("♜ Rochade ausgeführt:", zug.rochade);
        if (zug.enPassant) console.log("♟ En Passant ausgeführt");
        if (zug.umwandlungsFigur) console.log("👑 Bauernumwandlung zu:", this.getFigurName(zug.umwandlungsFigur * zug.farbe));
        
        return true;
    }

    zugZuruecknehmen() {
        if (this.zugHistorie.length === 0 || this.historieIndex < 0) {
            console.log("❌ Keine Züge zum Zurücknehmen verfügbar");
            return false;
        }

        const letzterZug = this.zugHistorie[this.historieIndex];
        console.log("↩️ Nehme Zug zurück:", this.zugZuNotation(letzterZug));

        this.wiederherstelleZustand(letzterZug.zustandVorZug);
        
        this.historieIndex--;
        
        this.pruefeSpielStatus();
        
        console.log("✅ Zug erfolgreich zurückgenommen. Verbleibende Züge:", this.historieIndex + 1);
        return true;
    }

    zugWiederherstellen() {
        if (this.historieIndex >= this.zugHistorie.length - 1) {
            console.log("❌ Keine Züge zum Wiederherstellen verfügbar");
            return false;
        }

        this.historieIndex++;
        const naechsterZug = this.zugHistorie[this.historieIndex];
        
        this.wiederherstelleZustand(naechsterZug.zustandVorZug);
        
        this.brett[naechsterZug.vonPos] = LEER;
        const endgueltigeFigurArt = naechsterZug.umwandlungsFigur || naechsterZug.art;
        this.brett[naechsterZug.nachPos] = endgueltigeFigurArt * naechsterZug.farbe;

        const figur = this.figurenListe.find(f => 
            f.pos === naechsterZug.vonPos && !f.geschlagen && f.farbe === naechsterZug.farbe
        );
        
        if (figur) {
            figur.pos = naechsterZug.nachPos;
            
            if (naechsterZug.umwandlungsFigur) {
                figur.art = naechsterZug.umwandlungsFigur;
            }
        }

        console.log("↪️ Zug wiederhergestellt:", this.zugZuNotation(naechsterZug));
        return true;
    }

    istRuecknahmeMoeglich() {
        return this.historieIndex >= 0;
    }

    istWiederherstellungMoeglich() {
        return this.historieIndex < this.zugHistorie.length - 1;
    }

    getZugInfo() {
        return {
            aktuelleZugNummer: this.zugCounter,
            historieLaenge: this.zugHistorie.length,
            historieIndex: this.historieIndex,
            kannZurueck: this.istRuecknahmeMoeglich(),
            kannVorwaerts: this.istWiederherstellungMoeglich(),
            vollzugNummer: this.vollzugCounter
        };
    }

    fuehreRochadeAus(farbe, seite) {
        const istWeiss = farbe === WEISS;
        const startReihe = istWeiss ? 2 : 9;
        
        let turmStart, turmZiel;
        
        if (seite === 'kurz') {
            turmStart = startReihe * 10 + 8;
            turmZiel = startReihe * 10 + 6;
        } else {
            turmStart = startReihe * 10 + 1;
            turmZiel = startReihe * 10 + 4;
        }

        const turm = this.figurenListe.find(f => 
            f.art === TURM && f.farbe === farbe && f.pos === turmStart && !f.geschlagen
        );
        if (turm) {
            this.brett[turmStart] = LEER;
            this.brett[turmZiel] = TURM * farbe;
            turm.pos = turmZiel;
        }
    }

    aktualisiereRochadeRechte(zug) {
        if (zug.art === KOENIG) {
            if (zug.farbe === WEISS) {
                this.rochadeRechte.weissKurz = false;
                this.rochadeRechte.weissLang = false;
            } else {
                this.rochadeRechte.schwarzKurz = false;
                this.rochadeRechte.schwarzLang = false;
            }
        }
        
        if (zug.art === TURM) {
            if (zug.farbe === WEISS) {
                if (zug.vonPos === 21) this.rochadeRechte.weissLang = false;
                if (zug.vonPos === 28) this.rochadeRechte.weissKurz = false;
            } else {
                if (zug.vonPos === 91) this.rochadeRechte.schwarzLang = false;
                if (zug.vonPos === 98) this.rochadeRechte.schwarzKurz = false;
            }
        }
    }

    // PHASE 3.1: ERWEITERTE BEWERTUNGSFUNKTION
    bewerteStellung() {
        if (!this.kiEinstellungen.erweiterteBewertung) {
            return this.einfacheMaterialbewertung();
        }
        
        let bewertung = 0;
        
        // 1. MATERIALBEWERTUNG (Grundlage)
        bewertung += this.einfacheMaterialbewertung();
        
        // 2. POSITIONSBEWERTUNG
        bewertung += this.bewertePositionen();
        
        // 3. FIGURENSPEZIFISCHE BEWERTUNG
        bewertung += this.bewerteFigurenSpezifisch();
        
        // 4. BAUERNSTRUKTUR
        bewertung += this.bewerteBauernStruktur();
        
        // 5. KÖNIGSSICHERHEIT
        bewertung += this.bewerteKoenigsSicherheit();
        
        this.bewertung = bewertung;
        return bewertung;
    }

    einfacheMaterialbewertung() {
        let material = 0;
        for (const figur of this.figurenListe) {
            if (figur.geschlagen) continue;
            
            const figurWert = this.getFigurWert(figur.art);
            material += figur.farbe === WEISS ? figurWert : -figurWert;
        }
        return material;
    }

    // 2. POSITIONSBEWERTUNG
    bewertePositionen() {
        let positionsBewertung = 0;
        
        // Zentrumskontrolle (Felder d4,d5,e4,e5)
        const zentrumsFelder = [44, 45, 54, 55];
        for (const feld of zentrumsFelder) {
            if (this.brett[feld] !== LEER && this.brett[feld] !== DUMMY) {
                const figurWert = this.brett[feld];
                if (figurWert > 0) positionsBewertung += 15;
                else positionsBewertung -= 15;
            }
        }
        
        // Entwicklungsvorteil
        positionsBewertung += this.bewerteEntwicklung();
        
        // Raumvorteil
        positionsBewertung += this.bewerteRaumvorteil();
        
        return positionsBewertung;
    }

    bewerteEntwicklung() {
        let entwicklungsBonus = 0;
        
        const weissGrundreihe = [21, 22, 23, 24, 25, 26, 27, 28];
        const schwarzGrundreihe = [91, 92, 93, 94, 95, 96, 97, 98];
        
        for (const figur of this.figurenListe) {
            if (figur.geschlagen || figur.art === BAUER || figur.art === KOENIG) continue;
            
            if (figur.farbe === WEISS && !weissGrundreihe.includes(figur.pos)) {
                entwicklungsBonus += 10;
            } else if (figur.farbe === SCHWARZ && !schwarzGrundreihe.includes(figur.pos)) {
                entwicklungsBonus -= 10;
            }
        }
        
        return entwicklungsBonus;
    }

    bewerteRaumvorteil() {
        let raumBewertung = 0;
        
        for (const figur of this.figurenListe) {
            if (figur.geschlagen || figur.art === KOENIG) continue;
            
            const reihe = Math.floor(figur.pos / 10);
            if (figur.farbe === WEISS && reihe >= 6) {
                raumBewertung += 5;
            } else if (figur.farbe === SCHWARZ && reihe <= 5) {
                raumBewertung -= 5;
            }
        }
        
        return raumBewertung;
    }

    // 3. FIGURENSPEZIFISCHE BEWERTUNG
    bewerteFigurenSpezifisch() {
        let figurenBewertung = 0;
        
        for (const figur of this.figurenListe) {
            if (figur.geschlagen) continue;
            
            const multiplikator = figur.farbe === WEISS ? 1 : -1;
            
            switch (figur.art) {
                case LAEUFER:
                    figurenBewertung += this.bewerteLaeufer(figur) * multiplikator;
                    break;
                case SPRINGER:
                    figurenBewertung += this.bewerteSpringer(figur) * multiplikator;
                    break;
                case TURM:
                    figurenBewertung += this.bewerteTurm(figur) * multiplikator;
                    break;
                case BAUER:
                    figurenBewertung += this.bewerteBauer(figur) * multiplikator;
                    break;
            }
        }
        
        // Läuferpaar-Bonus
        if (this.hatLaeuferpaar(WEISS)) figurenBewertung += 30;
        if (this.hatLaeuferpaar(SCHWARZ)) figurenBewertung -= 30;
        
        return figurenBewertung;
    }

    bewerteLaeufer(figur) {
        let bewertung = 0;
        
        const position = figur.pos;
        const istZentrumsnahe = [44, 45, 54, 55, 33, 36, 63, 66].includes(position);
        if (istZentrumsnahe) bewertung += 10;
        
        return bewertung;
    }

    bewerteSpringer(figur) {
        let bewertung = 0;
        
        const position = figur.pos;
        const zentrumsFelder = [44, 45, 54, 55, 33, 34, 35, 36, 43, 46, 53, 56, 63, 64, 65, 66];
        if (zentrumsFelder.includes(position)) {
            bewertung += 15;
        }
        
        return bewertung;
    }

    bewerteTurm(figur) {
        let bewertung = 0;
        
        if (this.istOffeneLinie(figur.pos)) {
            bewertung += 20;
        }
        
        return bewertung;
    }

    bewerteBauer(figur) {
        let bewertung = 0;
        
        const position = figur.pos;
        const zentrumsFelder = [44, 45, 54, 55];
        if (zentrumsFelder.includes(position)) {
            bewertung += 10;
        }
        
        const reihe = Math.floor(position / 10);
        if (figur.farbe === WEISS) {
            if (reihe >= 6) bewertung += 5;
            if (reihe >= 7) bewertung += 10;
        } else {
            if (reihe <= 5) bewertung += 5;
            if (reihe <= 4) bewertung += 10;
        }
        
        return bewertung;
    }

    istOffeneLinie(position) {
        const datei = position % 10;
        
        for (let reihe = 2; reihe <= 9; reihe++) {
            const feld = reihe * 10 + datei;
            const figurWert = this.brett[feld];
            if (Math.abs(figurWert) === BAUER) {
                return false;
            }
        }
        
        return true;
    }

    hatLaeuferpaar(farbe) {
        let laeuferCount = 0;
        for (const figur of this.figurenListe) {
            if (!figur.geschlagen && figur.farbe === farbe && figur.art === LAEUFER) {
                laeuferCount++;
            }
        }
        return laeuferCount >= 2;
    }

    // 4. BAUERNSTRUKTUR
    bewerteBauernStruktur() {
        let bauernBewertung = 0;
        
        bauernBewertung += this.bewerteDoppelbauern();
        bauernBewertung += this.bewerteIsolanis();
        bauernBewertung += this.bewerteFreibauern();
        
        return bauernBewertung;
    }

    bewerteDoppelbauern() {
        let strafe = 0;
        
        for (let datei = 1; datei <= 8; datei++) {
            let weissBauern = 0;
            let schwarzBauern = 0;
            
            for (let reihe = 2; reihe <= 9; reihe++) {
                const feld = reihe * 10 + datei;
                const figurWert = this.brett[feld];
                
                if (figurWert === BAUER) weissBauern++;
                else if (figurWert === -BAUER) schwarzBauern++;
            }
            
            if (weissBauern > 1) strafe -= 10 * (weissBauern - 1);
            if (schwarzBauern > 1) strafe += 10 * (schwarzBauern - 1);
        }
        
        return strafe;
    }

    bewerteIsolanis() {
        let strafe = 0;
        
        for (const figur of this.figurenListe) {
            if (figur.geschlagen || figur.art !== BAUER) continue;
            
            const datei = figur.pos % 10;
            const hatNachbarBauer = this.hatNachbarBauer(datei, figur.farbe);
            
            if (!hatNachbarBauer) {
                if (figur.farbe === WEISS) strafe -= 15;
                else strafe += 15;
            }
        }
        
        return strafe;
    }

    hatNachbarBauer(datei, farbe) {
        const nachbarDateien = [datei - 1, datei + 1].filter(d => d >= 1 && d <= 8);
        
        for (const nd of nachbarDateien) {
            for (let reihe = 2; reihe <= 9; reihe++) {
                const feld = reihe * 10 + nd;
                if (this.brett[feld] === BAUER * farbe) {
                    return true;
                }
            }
        }
        
        return false;
    }

    bewerteFreibauern() {
        let bonus = 0;
        
        for (const figur of this.figurenListe) {
            if (figur.geschlagen || figur.art !== BAUER) continue;
            
            if (this.istFreibauer(figur)) {
                if (figur.farbe === WEISS) bonus += 20;
                else bonus -= 20;
            }
        }
        
        return bonus;
    }

    istFreibauer(figur) {
        const datei = figur.pos % 10;
        const vorwaerts = figur.farbe === WEISS ? 10 : -10;
        
        for (let reiheOffset = 1; reiheOffset <= 8; reiheOffset++) {
            const feldVor = figur.pos + vorwaerts * reiheOffset;
            if (this.brett[feldVor] === DUMMY) break;
            
            if (Math.abs(this.brett[feldVor]) === BAUER && 
                this.brett[feldVor] * figur.farbe < 0) {
                return false;
            }
            
            for (const seite of [-1, 1]) {
                const feldDiag = feldVor + seite;
                if (this.brett[feldDiag] !== DUMMY && 
                    Math.abs(this.brett[feldDiag]) === BAUER &&
                    this.brett[feldDiag] * figur.farbe < 0) {
                    return false;
                }
            }
        }
        
        return true;
    }

    // 5. KÖNIGSSICHERHEIT
    bewerteKoenigsSicherheit() {
        let sicherheitsBewertung = 0;
        
        sicherheitsBewertung += this.bewerteBauernschild();
        sicherheitsBewertung += this.bewerteKoenigsAngriff();
        
        return sicherheitsBewertung;
    }

    bewerteBauernschild() {
        let bewertung = 0;
        
        for (const farbe of [WEISS, SCHWARZ]) {
            const koenig = this.figurenListe.find(f => 
                !f.geschlagen && f.art === KOENIG && f.farbe === farbe
            );
            
            if (!koenig) continue;
            
            const multiplikator = farbe === WEISS ? 1 : -1;
            const bauernschildFelder = this.getBauernschildFelder(koenig.pos, farbe);
            let bauernAnzahl = 0;
            
            for (const feld of bauernschildFelder) {
                if (this.brett[feld] === BAUER * farbe) {
                    bauernAnzahl++;
                }
            }
            
            bewertung += bauernAnzahl * 5 * multiplikator;
        }
        
        return bewertung;
    }

    getBauernschildFelder(koenigPos, farbe) {
        const richtung = farbe === WEISS ? -10 : 10;
        const felder = [];
        
        for (const seite of [-1, 1]) {
            felder.push(koenigPos + richtung + seite);
        }
        
        return felder.filter(feld => this.brett[feld] !== DUMMY);
    }

    bewerteKoenigsAngriff() {
        let bewertung = 0;
        
        for (const farbe of [WEISS, SCHWARZ]) {
            const koenig = this.figurenListe.find(f => 
                !f.geschlagen && f.art === KOENIG && f.farbe === farbe
            );
            
            if (!koenig) continue;
            
            const gegnerFarbe = -farbe;
            const multiplikator = farbe === WEISS ? -1 : 1;
            
            let angreifer = 0;
            for (const figur of this.figurenListe) {
                if (figur.geschlagen || figur.farbe !== gegnerFarbe) continue;
                
                if (this.istFigurAngriffsnah(figur, koenig.pos)) {
                    angreifer++;
                }
            }
            
            bewertung += angreifer * 10 * multiplikator;
        }
        
        return bewertung;
    }

    istFigurAngriffsnah(figur, koenigPos) {
        const abstand = Math.abs(figur.pos - koenigPos);
        return abstand <= 30;
    }

    // PHASE 3.2: OPTIMIERTER SUCHALGORITHMUS
    
    /**
     * OPTIMIERTE ALPHA-BETA-SUCHE MIT MOVE ORDERING
     */
    alphaBetaSuchen(tiefe, alpha, beta, maximierenderSpieler) {
        this.knotenZaehler++;
        
        // Timeout-Prüfung
        if (Date.now() - this.berechnungsStartzeit > this.kiEinstellungen.timeoutMs) {
            return 0;
        }
        
        // Transposition Table Lookup
        const hash = this.berechneZobristHash();
        const ttEintrag = this.transpositionTable.get(hash);
        if (ttEintrag && ttEintrag.tiefe >= tiefe) {
            if (ttEintrag.typ === 'EXACT') return ttEintrag.bewertung;
            if (ttEintrag.typ === 'LOWER' && ttEintrag.bewertung >= beta) return beta;
            if (ttEintrag.typ === 'UPPER' && ttEintrag.bewertung <= alpha) return alpha;
        }
        
        // Blattknoten oder Endstellung
        if (tiefe === 0) {
            return this.kiEinstellungen.useQuiescenceSearch ? 
                   this.quiescenceSearch(alpha, beta, maximierenderSpieler) : 
                   this.bewerteStellung();
        }
        
        const aktuelleFarbe = maximierenderSpieler ? (this.weissAmZug ? WEISS : SCHWARZ) : 
                                                    (this.weissAmZug ? SCHWARZ : WEISS);
        const zuege = this.generiereZuege(aktuelleFarbe);
        
        if (zuege.length === 0) {
            if (this.istKoenigImSchach(aktuelleFarbe)) {
                return maximierenderSpieler ? -20000 : 20000;
            }
            return 0;
        }
        
        // MOVE ORDERING: Sortiere Züge für bessere Cutoffs
        const geordneteZuege = this.kiEinstellungen.useMoveOrdering ? 
                              this.ordneZuege(zuege, hash) : zuege;
        
        let besterWert = maximierenderSpieler ? -Infinity : Infinity;
        let besterZug = null;
        let ttTyp = 'UPPER';
        
        for (const zug of geordneteZuege) {
            const zustandVorZug = this.erstelleZustandSnapshot();
            this.zugAusfuehren(zug);
            
            const wert = this.alphaBetaSuchen(tiefe - 1, alpha, beta, !maximierenderSpieler);
            
            this.wiederherstelleZustand(zustandVorZug);
            
            if (maximierenderSpieler) {
                if (wert > besterWert) {
                    besterWert = wert;
                    besterZug = zug;
                }
                alpha = Math.max(alpha, besterWert);
            } else {
                if (wert < besterWert) {
                    besterWert = wert;
                    besterZug = zug;
                }
                beta = Math.min(beta, besterWert);
            }
            
            // Alpha-Beta Cutoff
            if (alpha >= beta) {
                this.historyHeuristic[zug.vonPos][zug.nachPos] += tiefe * tiefe;
                break;
            }
        }
        
        // Transposition Table Store
        let typ = 'EXACT';
        if (besterWert <= alpha) typ = 'UPPER';
        else if (besterWert >= beta) typ = 'LOWER';
        
        this.transpositionTable.set(hash, {
            bewertung: besterWert,
            tiefe: tiefe,
            typ: typ,
            besterZug: besterZug
        });
        
        return besterWert;
    }

    /**
     * MOVE ORDERING: Sortiert Züge für bessere Alpha-Beta Performance
     */
    ordneZuege(zuege, hash) {
        const bewerteteZuege = [];
        
        // TT Move zuerst
        const ttEintrag = this.transpositionTable.get(hash);
        if (ttEintrag && ttEintrag.besterZug) {
            const ttMoveIndex = zuege.findIndex(zug => 
                zug.vonPos === ttEintrag.besterZug.vonPos && 
                zug.nachPos === ttEintrag.besterZug.nachPos
            );
            if (ttMoveIndex !== -1) {
                bewerteteZuege.push({ zug: zuege[ttMoveIndex], score: 10000 });
                zuege.splice(ttMoveIndex, 1);
            }
        }
        
        for (const zug of zuege) {
            let score = 0;
            
            // MVV-LVA: Most Valuable Victim - Least Valuable Attacker
            if (zug.geschlagen) {
                const opferWert = this.getFigurWert(zug.geschlagen.art);
                const angreiferWert = this.getFigurWert(zug.art);
                score += 1000 + opferWert - angreiferWert;
            }
            
            // Schachgebote priorisieren
            if (this.istSchachGebot(zug)) {
                score += 500;
            }
            
            // History Heuristic
            score += this.historyHeuristic[zug.vonPos][zug.nachPos];
            
            // Bauernumwandlung priorisieren
            if (zug.umwandlungsFigur) {
                score += this.getFigurWert(zug.umwandlungsFigur) - this.getFigurWert(BAUER);
            }
            
            bewerteteZuege.push({ zug, score });
        }
        
        // Absteigend nach Score sortieren
        bewerteteZuege.sort((a, b) => b.score - a.score);
        return bewerteteZuege.map(item => item.zug);
    }

    /**
     * QUIESCENCE SEARCH: Vermeidet Horizonteffekt
     */
    quiescenceSearch(alpha, beta, maximierenderSpieler) {
        this.knotenZaehler++;
        
        const standbewertung = this.bewerteStellung();
        
        if (maximierenderSpieler) {
            if (standbewertung >= beta) return beta;
            alpha = Math.max(alpha, standbewertung);
        } else {
            if (standbewertung <= alpha) return alpha;
            beta = Math.min(beta, standbewertung);
        }
        
        // Nur Schlagzüge in Quiescence Search
        const aktuelleFarbe = maximierenderSpieler ? (this.weissAmZug ? WEISS : SCHWARZ) : 
                                                    (this.weissAmZug ? SCHWARZ : WEISS);
        const schlagZuege = this.generiereZuege(aktuelleFarbe).filter(zug => zug.geschlagen);
        
        const geordneteSchlagZuege = this.ordneZuege(schlagZuege, this.berechneZobristHash());
        
        for (const zug of geordneteSchlagZuege) {
            const zustandVorZug = this.erstelleZustandSnapshot();
            this.zugAusfuehren(zug);
            
            const wert = this.quiescenceSearch(alpha, beta, !maximierenderSpieler);
            
            this.wiederherstelleZustand(zustandVorZug);
            
            if (maximierenderSpieler) {
                if (wert >= beta) return beta;
                alpha = Math.max(alpha, wert);
            } else {
                if (wert <= alpha) return alpha;
                beta = Math.min(beta, wert);
            }
        }
        
        return standbewertung;
    }

    istSchachGebot(zug) {
        const zustandVorZug = this.erstelleZustandSnapshot();
        this.zugAusfuehren(zug);
        
        const imSchach = this.istKoenigImSchach(-zug.farbe);
        
        this.wiederherstelleZustand(zustandVorZug);
        return imSchach;
    }

    /**
     * VERBESSERTE COMPUTERZUG-BERECHNUNG
     */
    computerZug() {
        console.log("🤖 KI startet erweiterte Zugberechnung...");
        
        try {
            this.knotenZaehler = 0;
            this.berechnungsStartzeit = Date.now();
            this.transpositionTable.clear();
            
            const aktuelleFarbe = this.weissAmZug ? WEISS : SCHWARZ;
            const alleZuege = this.generiereZuege(aktuelleFarbe);
            
            if (alleZuege.length === 0) {
                console.log("❌ Keine legalen Züge verfügbar");
                return null;
            }
            
            // Iterative Deepening mit Zeitkontrolle
            let besterZug = alleZuege[0];
            let besteBewertung = -Infinity;
            
            for (let tiefe = 1; tiefe <= this.kiEinstellungen.suchtiefe; tiefe++) {
                console.log(`🔍 Suche in Tiefe ${tiefe}...`);
                
                let aktuellerBesterZug = null;
                let aktuellBesteBewertung = -Infinity;
                let alpha = -Infinity;
                let beta = Infinity;
                
                const geordneteZuege = this.ordneZuege(alleZuege, this.berechneZobristHash());
                
                for (const zug of geordneteZuege) {
                    const zustandVorZug = this.erstelleZustandSnapshot();
                    this.zugAusfuehren(zug);
                    
                    const bewertung = -this.alphaBetaSuchen(tiefe - 1, -beta, -alpha, false);
                    
                    this.wiederherstelleZustand(zustandVorZug);
                    
                    if (bewertung > aktuellBesteBewertung) {
                        aktuellBesteBewertung = bewertung;
                        aktuellerBesterZug = zug;
                    }
                    
                    alpha = Math.max(alpha, bewertung);
                    
                    // Timeout-Prüfung
                    if (Date.now() - this.berechnungsStartzeit > this.kiEinstellungen.timeoutMs) {
                        console.log("⏰ Zeitüberschreitung - verwende bisher beste Lösung");
                        break;
                    }
                }
                
                if (aktuellerBesterZug && Date.now() - this.berechnungsStartzeit <= this.kiEinstellungen.timeoutMs) {
                    besterZug = aktuellerBesterZug;
                    besteBewertung = aktuellBesteBewertung;
                    console.log(`✅ Tiefe ${tiefe}: ${this.zugZuNotation(besterZug)} (Bewertung: ${besteBewertung})`);
                }
                
                // Frühzeitiger Abbruch bei klarer Entscheidung
                if (besteBewertung > 1000 || besteBewertung < -1000) {
                    console.log("🎯 Klare Entscheidung gefunden - breche Suche ab");
                    break;
                }
                
                if (Date.now() - this.berechnungsStartzeit > this.kiEinstellungen.timeoutMs) {
                    break;
                }
            }
            
            const berechnungsZeit = Date.now() - this.berechnungsStartzeit;
            console.log(`🤖 KI wählt: ${this.zugZuNotation(besterZug)} ` +
                       `(Bewertung: ${besteBewertung}, Knoten: ${this.knotenZaehler}, Zeit: ${berechnungsZeit}ms)`);
            
            return besterZug;
            
        } catch (error) {
            console.error("❌ Fehler in erweiterter computerZug:", error);
            // Fallback zu einfacher KI
            return this.einfacherComputerZug();
        }
    }

    /**
     * FALLBACK: EINFACHE KI FÜR NOTFÄLLE
     */
    einfacherComputerZug() {
        const aktuelleFarbe = this.weissAmZug ? WEISS : SCHWARZ;
        const alleZuege = this.generiereZuege(aktuelleFarbe);
        
        if (alleZuege.length === 0) return null;
        
        // Wähle zufälligen Zug aus legalen Zügen
        const zufallsIndex = Math.floor(Math.random() * alleZuege.length);
        return alleZuege[zufallsIndex];
    }

    getFigurWert(art) {
        const werte = {
            [BAUER]: 100,
            [SPRINGER]: 320,
            [LAEUFER]: 330,
            [TURM]: 500,
            [DAME]: 900,
            [KOENIG]: 20000
        };
        return werte[art] || 0;
    }

    // Hilfsmethoden
    zugZuNotation(zug) {
        const von = this.positionZuNotation(zug.vonPos);
        const nach = this.positionZuNotation(zug.nachPos);
        return `${von}${nach}`;
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
            [BAUER]: 'Bauer', [TURM]: 'Turm', [LAEUFER]: 'Läufer',
            [SPRINGER]: 'Springer', [DAME]: 'Dame', [KOENIG]: 'König'
        };
        return `${farbe} ${namen[art] || 'Unbekannt'}`;
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