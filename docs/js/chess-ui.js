// chess-ui.js - Vereinfachte Benutzeroberfläche mit Feld-zu-Eingabe-Übertragung
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
        
        // SVG-Figuren als Data URLs (unchanged)
        this.figurenSVG = {
            'wb': this.bauerWeissSVG(),
            'wT': this.turmWeissSVG(),
            'wL': this.laeuferWeissSVG(),
            'wS': this.springerWeissSVG(),
            'wD': this.dameWeissSVG(),
            'wK': this.koenigWeissSVG(),
            'sb': this.bauerSchwarzSVG(),
            'sT': this.turmSchwarzSVG(),
            'sL': this.laeuferSchwarzSVG(),
            'sS': this.springerSchwarzSVG(),
            'sD': this.dameSchwarzSVG(),
            'sK': this.koenigSchwarzSVG()
        };

        this.initialisiereBrett();
        this.initialisiereEventListeners();
        this.initialisiereKIModi();
        this.aktualisiereAnzeige();
    }

    // SVG-Figuren Methoden (unchanged - same as before)
    bauerWeissSVG() {
        return "data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45">
                <path d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 H 34 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z" 
                      style="opacity:1; fill:#ffffff; fill-opacity:1; fill-rule:nonzero; stroke:#000000; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:miter; stroke-miterlimit:4; stroke-dasharray:none; stroke-opacity:1;"/>
            </svg>
        `);
    }

    turmWeissSVG() {
        return "data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45">
                <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z " 
                      style="fill:#ffffff; stroke:#000000; stroke-width:1.5; stroke-linecap:round;"/>
                <path d="M 12.5,32 L 14,29.5 L 31,29.5 L 32.5,32 L 12.5,32 z " 
                      style="fill:#ffffff; stroke:#000000; stroke-width:1.5; stroke-linecap:round;"/>
                <path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z " 
                      style="fill:#ffffff; stroke:#000000; stroke-width:1.5; stroke-linecap:round;"/>
                <path d="M 14,29.5 L 14,16.5 L 31,16.5 L 31,29.5 L 14,29.5 z " 
                      style="fill:#ffffff; stroke:#000000; stroke-width:1.5; stroke-linecap:round;"/>
                <path d="M 14,16.5 L 11,14 L 34,14 L 31,16.5 L 14,16.5 z " 
                      style="fill:#ffffff; stroke:#000000; stroke-width:1.5; stroke-linecap:round;"/>
                <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 L 11,14 z " 
                      style="fill:#ffffff; stroke:#000000; stroke-width:1.5; stroke-linecap:round;"/>
            </svg>
        `);
    }

    laeuferWeissSVG() {
        return "data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45">
                <g style="opacity:1; fill:none; fill-rule:evenodd; fill-opacity:1; stroke:#000000; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; stroke-miterlimit:4; stroke-dasharray:none; stroke-opacity:1;" transform="translate(0,0.6)">
                    <g style="fill:#ffffff; stroke:#000000; stroke-linecap:butt;">
                        <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.65,38.99 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 z"/>
                        <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z"/>
                        <path d="M 25 8 A 2.5 2.5 0 1 1  20,8 A 2.5 2.5 0 1 1  25 8 z"/>
                    </g>
                    <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" style="fill:none; stroke:#000000; stroke-linejoin:miter;"/>
                </g>
            </svg>
        `);
    }

    springerWeissSVG() {
        return "data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45">
                <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" style="fill:#ffffff; stroke:#000000;"/>
                <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" style="fill:#ffffff; stroke:#000000;"/>
                <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" style="fill:#000000; stroke:#000000;"/>
                <path d="M 15 15.5 A 0.5 1.5 0 1 1  14,15.5 A 0.5 1.5 0 1 1  15 15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" style="fill:#000000; stroke:#000000;"/>
            </svg>
        `);
    }

    dameWeissSVG() {
        return "data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45">
                <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" 
                      style="fill:#ffffff; stroke:#000000; stroke-linecap:round; stroke-linejoin:round;"/>
                <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17,39.5 27.5,39.5 33.5,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" 
                      style="fill:#ffffff; stroke:#000000;"/>
                <path d="M 11.5,30 C 15,29 30,29 33.5,30" style="fill:none; stroke:#000000;"/>
                <path d="M 12,33.5 C 18,32.5 27,32.5 33,33.5" style="fill:none; stroke:#000000;"/>
            </svg>
        `);
    }

    koenigWeissSVG() {
        return "data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45">
                <path d="M 22.5,11.63 L 22.5,6" style="fill:none; stroke:#000000; stroke-linejoin:miter;"/>
                <path d="M 20,8 L 25,8" style="fill:none; stroke:#000000; stroke-linejoin:miter;"/>
                <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" style="fill:#ffffff; stroke:#000000; stroke-linecap:butt; stroke-linejoin:miter;"/>
                <path d="M 12.5,37 C 18,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 20,16 10.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 L 12.5,37" style="fill:#ffffff; stroke:#000000;"/>
                <path d="M 12.5,30 C 18,27 27,27 32.5,30" style="fill:none; stroke:#000000;"/>
                <path d="M 12.5,33.5 C 18,30.5 27,30.5 32.5,33.5" style="fill:none; stroke:#000000;"/>
                <path d="M 12.5,37 C 18,34 27,34 32.5,37" style="fill:none; stroke:#000000;"/>
            </svg>
        `);
    }

    bauerSchwarzSVG() {
        return "data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45">
                <path d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 H 34 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z" 
                      style="opacity:1; fill:#000000; fill-opacity:1; fill-rule:nonzero; stroke:#ffffff; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:miter; stroke-miterlimit:4; stroke-dasharray:none; stroke-opacity:1;"/>
            </svg>
        `);
    }

    turmSchwarzSVG() {
        return "data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45">
                <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z " 
                      style="fill:#000000; stroke:#ffffff; stroke-width:1.5; stroke-linecap:round;"/>
                <path d="M 12.5,32 L 14,29.5 L 31,29.5 L 32.5,32 L 12.5,32 z " 
                      style="fill:#000000; stroke:#ffffff; stroke-width:1.5; stroke-linecap:round;"/>
                <path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z " 
                      style="fill:#000000; stroke:#ffffff; stroke-width:1.5; stroke-linecap:round;"/>
                <path d="M 14,29.5 L 14,16.5 L 31,16.5 L 31,29.5 L 14,29.5 z " 
                      style="fill:#000000; stroke:#ffffff; stroke-width:1.5; stroke-linecap:round;"/>
                <path d="M 14,16.5 L 11,14 L 34,14 L 31,16.5 L 14,16.5 z " 
                      style="fill:#000000; stroke:#ffffff; stroke-width:1.5; stroke-linecap:round;"/>
                <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 L 11,14 z " 
                      style="fill:#000000; stroke:#ffffff; stroke-width:1.5; stroke-linecap:round;"/>
            </svg>
        `);
    }

    laeuferSchwarzSVG() {
        return "data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45">
                <g style="opacity:1; fill:none; fill-rule:evenodd; fill-opacity:1; stroke:#ffffff; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; stroke-miterlimit:4; stroke-dasharray:none; stroke-opacity:1;" transform="translate(0,0.6)">
                    <g style="fill:#000000; stroke:#ffffff; stroke-linecap:butt;">
                        <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.65,38.99 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 z"/>
                        <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z"/>
                        <path d="M 25 8 A 2.5 2.5 0 1 1  20,8 A 2.5 2.5 0 1 1  25 8 z"/>
                    </g>
                    <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" style="fill:none; stroke:#ffffff; stroke-linejoin:miter;"/>
                </g>
            </svg>
        `);
    }

    springerSchwarzSVG() {
        return "data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45">
                <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" style="fill:#000000; stroke:#ffffff;"/>
                <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" style="fill:#000000; stroke:#ffffff;"/>
                <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" style="fill:#ffffff; stroke:#ffffff;"/>
                <path d="M 15 15.5 A 0.5 1.5 0 1 1  14,15.5 A 0.5 1.5 0 1 1  15 15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" style="fill:#ffffff; stroke:#ffffff;"/>
            </svg>
        `);
    }

    dameSchwarzSVG() {
        return "data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45">
                <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" 
                      style="fill:#000000; stroke:#ffffff; stroke-linecap:round; stroke-linejoin:round;"/>
                <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17,39.5 27.5,39.5 33.5,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" 
                      style="fill:#000000; stroke:#ffffff;"/>
                <path d="M 11.5,30 C 15,29 30,29 33.5,30" style="fill:none; stroke:#ffffff;"/>
                <path d="M 12,33.5 C 18,32.5 27,32.5 33,33.5" style="fill:none; stroke:#ffffff;"/>
            </svg>
        `);
    }

    koenigSchwarzSVG() {
        return "data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45">
                <path d="M 22.5,11.63 L 22.5,6" style="fill:none; stroke:#ffffff; stroke-linejoin:miter;"/>
                <path d="M 20,8 L 25,8" style="fill:none; stroke:#ffffff; stroke-linejoin:miter;"/>
                <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" style="fill:#000000; stroke:#ffffff; stroke-linecap:butt; stroke-linejoin:miter;"/>
                <path d="M 12.5,37 C 18,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 20,16 10.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 L 12.5,37" style="fill:#000000; stroke:#ffffff;"/>
                <path d="M 12.5,30 C 18,27 27,27 32.5,30" style="fill:none; stroke:#ffffff;"/>
                <path d="M 12.5,33.5 C 18,30.5 27,30.5 32.5,33.5" style="fill:none; stroke:#ffffff;"/>
                <path d="M 12.5,37 C 18,34 27,34 32.5,37" style="fill:none; stroke:#ffffff;"/>
            </svg>
        `);
    }

    /**
     * NEUE METHODEN FÜR KI-INTEGRATION
     */

    /**
     * Initialisiert KI-Modi und Event-Listener
     */
    initialisiereKIModi() {
        // Event-Listener für KI-Buttons
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

        // Status-Anzeige für Spielmodus
        this.erstelleModusAnzeige();
    }

    /**
     * Setzt den Spielmodus und aktualisiert die UI
     */
    setSpielModus(modus) {
        this.spielModus = modus;
        this.aktualisiereModusAnzeige();
        
        console.log(`Spielmodus geändert: ${modus}`);
        
        // Starte automatischen Computerzug wenn nötig
        if (modus === 'kiVsKI') {
            this.starteKIVsKI();
        } else if (modus === 'menschVsKI' && !chessEngine.weissAmZug) {
            // Wenn Schwarz am Zug ist und Mensch vs KI Modus, dann Computer zieht
            setTimeout(() => this.automatischerComputerzug(), 500);
        }
    }

    /**
     * Erstellt die Modus-Anzeige in der UI
     */
    erstelleModusAnzeige() {
        const statusInfo = document.querySelector('.status-info');
        const modusAnzeige = document.createElement('div');
        modusAnzeige.id = 'modusAnzeige';
        modusAnzeige.className = 'modus-info';
        modusAnzeige.innerHTML = `<strong>Modus:</strong> <span id="aktuellerModus">Mensch vs Mensch</span>`;
        statusInfo.appendChild(modusAnzeige);
    }

    /**
     * Aktualisiert die Modus-Anzeige
     */
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

    /**
     * Führt einen Computerzug aus
     */
    async computerZugAusfuehren() {
        if (this.kiLaeuft) {
            console.log("KI berechnet bereits einen Zug...");
            return;
        }

        this.kiLaeuft = true;
        this.zeigeLadeIndikator(true);

        try {
            const startZeit = performance.now();
            
            // Timeout für KI-Berechnung (10 Sekunden)
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('KI-Berechnung timeout')), 10000);
            });
            
            // KI-Zug-Berechnung
            const zugPromise = new Promise((resolve) => {
                // Verwende setTimeout um Blockieren der UI zu vermeiden
                setTimeout(() => {
                    const zug = chessEngine.computerZug();
                    resolve(zug);
                }, 100);
            });
            
            const besterZug = await Promise.race([zugPromise, timeoutPromise]);
            const berechnungsZeit = performance.now() - startZeit;
            
            if (besterZug) {
                console.log(`KI-Zug berechnet in ${berechnungsZeit.toFixed(0)}ms: ${this.zugZuNotation(besterZug)}`);
                this.fuehreZugAus(besterZug);
                
                // Zeige Berechnungszeit an
                this.zeigeBerechnungszeit(berechnungsZeit);
            } else {
                console.log("KI konnte keinen Zug finden");
                this.zeigeFehler("KI konnte keinen Zug finden");
            }
            
        } catch (error) {
            console.error("KI-Berechnungsfehler:", error);
            this.zeigeFehler("KI-Berechnung fehlgeschlagen");
            
            // Fallback: Ersten legalen Zug nehmen
            const alleZuege = chessEngine.generiereZuege(chessEngine.weissAmZug ? WEISS : SCHWARZ);
            if (alleZuege.length > 0) {
                const fallbackZug = alleZuege[0];
                console.log("Fallback-Zug:", this.zugZuNotation(fallbackZug));
                this.fuehreZugAus(fallbackZug);
            }
        } finally {
            this.kiLaeuft = false;
            this.zeigeLadeIndikator(false);
        }
    }

    /**
     * Automatischer Computerzug nach Spielerzug
     */
    automatischerComputerzug() {
        if (this.spielModus === 'menschVsKI' || this.spielModus === 'kiVsKI') {
            const aktuelleFarbe = chessEngine.weissAmZug ? WEISS : SCHWARZ;
            
            // Prüfe ob Computer am Zug ist
            if ((this.spielModus === 'menschVsKI' && aktuelleFarbe === SCHWARZ) || 
                this.spielModus === 'kiVsKI') {
                
                // Kurze Verzögerung für bessere UX
                setTimeout(() => {
                    if (!chessEngine.endmatt && !chessEngine.patt) {
                        this.computerZugAusfuehren();
                    }
                }, 1000);
            }
        }
    }

    /**
     * Startet KI vs KI Modus
     */
    starteKIVsKI() {
        if (this.spielModus === 'kiVsKI' && !this.kiLaeuft) {
            this.computerZugAusfuehren();
        }
    }

    /**
     * Zeigt Lade-Indikator während KI-Berechnung
     */
    zeigeLadeIndikator(anzeigen) {
        let ladeIndikator = document.getElementById('kiLadeIndikator');
        
        if (anzeigen && !ladeIndikator) {
            ladeIndikator = document.createElement('div');
            ladeIndikator.id = 'kiLadeIndikator';
            ladeIndikator.innerHTML = '🤔 KI denkt nach...';
            ladeIndikator.style.cssText = `
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
            document.body.appendChild(ladeIndikator);
        } else if (!anzeigen && ladeIndikator) {
            ladeIndikator.remove();
        }
    }

    /**
     * Zeigt Berechnungszeit an
     */
    zeigeBerechnungszeit(zeit) {
        const statusInfo = document.querySelector('.status-info');
        let zeitAnzeige = document.getElementById('kiBerechnungszeit');
        
        if (!zeitAnzeige) {
            zeitAnzeige = document.createElement('div');
            zeitAnzeige.id = 'kiBerechnungszeit';
            zeitAnzeige.className = 'berechnungszeit';
            statusInfo.appendChild(zeitAnzeige);
        }
        
        zeitAnzeige.innerHTML = `<strong>KI-Zeit:</strong> ${zeit.toFixed(0)}ms`;
        
        // Nach 5 Sekunden ausblenden
        setTimeout(() => {
            if (zeitAnzeige.parentNode) {
                zeitAnzeige.remove();
            }
        }, 5000);
    }

    /**
     * Brett-Initialisierung
     */
    initialisiereBrett() {
        this.chessboard.innerHTML = '';
        
        const linien = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        
        for (let reihe = 0; reihe < 8; reihe++) {
            for (let linie = 0; linie < 8; linie++) {
                const cell = document.createElement('div');
                cell.className = `chess-cell ${(reihe + linie) % 2 === 0 ? 'white' : 'gray'}`;
                cell.dataset.reihe = reihe;
                cell.dataset.linie = linie;
                cell.dataset.position = this.zuBrettPosition(reihe, linie);
                
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

    aktualisiereAnzeige() {
        const uiBrett = this.getBrettForUI();
        const cells = this.chessboard.querySelectorAll('.chess-cell');
        
        cells.forEach(cell => {
            const reihe = parseInt(cell.dataset.reihe);
            const linie = parseInt(cell.dataset.linie);
            const figurWert = uiBrett[reihe][linie];
            
            const oldImg = cell.querySelector('.chess-piece');
            if (oldImg) {
                oldImg.remove();
            }
            
            if (figurWert !== LEER) {
                const figurImg = document.createElement('img');
                figurImg.className = 'chess-piece';
                
                const figurCode = this.getFigurCode(figurWert);
                figurImg.src = this.figurenSVG[figurCode];
                figurImg.alt = this.getFigurName(figurWert);
                
                figurImg.onerror = () => {
                    this.zeigeFigurAlsText(cell, figurWert);
                };
                
                cell.appendChild(figurImg);
            }
        });
        
        this.aktualisiereStatus();
        
        // Automatischen Computerzug auslösen wenn nötig
        this.automatischerComputerzug();
    }

    zeigeFigurAlsText(cell, figurWert) {
        const figurText = document.createElement('div');
        figurText.className = 'chess-piece-text';
        figurText.style.cssText = `
            font-size: 35px;
            font-weight: bold;
            text-align: center;
            line-height: 50px;
            color: ${figurWert > 0 ? '#000000' : '#FFFFFF'};
            text-shadow: ${figurWert > 0 ? '1px 1px 2px #666' : '1px 1px 2px #000'};
        `;
        
        const symbole = {
            [BAUER]: '♟',
            [TURM]: '♜', 
            [LAEUFER]: '♝',
            [SPRINGER]: '♞',
            [DAME]: '♛',
            [KOENIG]: '♚'
        };
        
        figurText.textContent = symbole[Math.abs(figurWert)] || '?';
        cell.appendChild(figurText);
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
        
        return farbe + arten[art];
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
        
        amZugElement.textContent = chessEngine.weissAmZug ? 'Weiß am Zug' : 'Schwarz am Zug';
        bewertungElement.textContent = chessEngine.bewertung;
        
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

    /**
     * VEREINFACHTE EVENT-LISTENER - ÜBERTRÄGT NUR IN EINGABEFELDER
     */
    initialisiereEventListeners() {
        // Vereinfachte Brett-Klicks - Übertragung in Eingabefelder
        this.chessboard.addEventListener('click', (e) => {
            const cell = e.target.closest('.chess-cell');
            if (cell) {
                this.zelleAngeklickt(cell);
            }
        });

        // Bestehende Steuerungs-Buttons
        document.getElementById('btnNaechsterZug').addEventListener('click', () => {
            this.naechsterZug();
        });

        document.getElementById('btnWeisserZug').addEventListener('click', () => {
            this.weisserZug();
        });

        document.getElementById('btnSchwarzerZug').addEventListener('click', () => {
            this.schwarzerZug();
        });

        document.getElementById('btnSpielerZieht').addEventListener('click', () => {
            this.spielerZieht();
        });

        document.getElementById('btnNeuesSpiel').addEventListener('click', () => {
            this.neuesSpiel();
        });

        document.getElementById('btnReset').addEventListener('click', () => {
            this.resetSpiel();
        });

        // Clear-Button für Eingabefelder hinzufügen
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Eingabe löschen';
        clearButton.className = 'btn';
        clearButton.style.margin = '5px';
        clearButton.addEventListener('click', () => {
            this.eingabeZuruecksetzen();
        });
        
        const zugInput = document.querySelector('.zug-input');
        zugInput.parentNode.insertBefore(clearButton, zugInput.nextSibling);
    }

    /**
     * VEREINFACHTE KLICK-LOGIK - ÜBERTRÄGT IN EINGABEFELDER
     */
    zelleAngeklickt(cell) {
        // Nur Klicks erlauben wenn Mensch am Zug
        if (this.spielModus === 'kiVsKI') {
            this.zeigeFehler("Im KI vs KI Modus sind keine manuellen Züge möglich");
            return;
        }
        
        if (this.spielModus === 'menschVsKI') {
            const menschFarbe = WEISS; // Annahme: Mensch spielt Weiß
            const aktuelleFarbe = chessEngine.weissAmZug ? WEISS : SCHWARZ;
            if (aktuelleFarbe !== menschFarbe) {
                this.zeigeFehler("Computer ist am Zug - bitte warten");
                return;
            }
        }

        const position = parseInt(cell.dataset.position);
        const notation = this.positionZuNotation(position);
        
        // Zurücksetzen der visuellen Auswahl
        this.moeglicheZuegeZuruecksetzen();
        
        // Prüfen ob auf eine eigene Figur geklickt wurde
        const figurWert = chessEngine.brett[position];
        const istEigeneFigur = (chessEngine.weissAmZug && figurWert > 0) || 
                              (!chessEngine.weissAmZug && figurWert < 0);
        
        if (istEigeneFigur && figurWert !== LEER && figurWert !== DUMMY) {
            // Startfeld ausgewählt - in "Von" Feld eintragen
            document.getElementById('vonInput').value = notation;
            this.selectedCell = cell;
            this.vonPos = position;
            cell.classList.add('selected');
            
            // Mögliche Züge anzeigen
            this.zeigeMoeglicheZuege(position);
        } else {
            // Zielfeld ausgewählt - in "Nach" Feld eintragen
            document.getElementById('nachInput').value = notation;
            this.nachPos = position;
            
            // Visuelles Feedback für Zielfeld
            cell.classList.add('possible-move');
            
            // Automatisch ausführen wenn beide Felder ausgefüllt sind
            const vonInput = document.getElementById('vonInput').value;
            const nachInput = document.getElementById('nachInput').value;
            
            if (vonInput && nachInput) {
                // Kurze Verzögerung für visuelles Feedback
                setTimeout(() => {
                    this.spielerZieht();
                    this.eingabeZuruecksetzen();
                }, 300);
            }
        }
    }

    zeigeMoeglicheZuege(vonPosition) {
        const figur = chessEngine.figurenListe.find(f => 
            f.pos === vonPosition && !f.geschlagen
        );
        
        if (!figur) return;
        
        this.moeglicheZuege = chessEngine.generiereZuege(figur.farbe).filter(
            zug => zug.vonPos === vonPosition
        );
        
        this.moeglicheZuege.forEach(zug => {
            const cell = this.findCellByPosition(zug.nachPos);
            if (cell) {
                if (zug.geschlagen) {
                    cell.classList.add('possible-capture');
                } else {
                    cell.classList.add('possible-move');
                }
            }
        });
    }

    findCellByPosition(position) {
        const cells = this.chessboard.querySelectorAll('.chess-cell');
        for (const cell of cells) {
            if (parseInt(cell.dataset.position) === position) {
                return cell;
            }
        }
        return null;
    }

    moeglicheZuegeZuruecksetzen() {
        const cells = this.chessboard.querySelectorAll('.chess-cell');
        cells.forEach(cell => {
            cell.classList.remove('selected', 'possible-move', 'possible-capture');
        });
        this.moeglicheZuege = [];
        this.selectedCell = null;
    }

    eingabeZuruecksetzen() {
        document.getElementById('vonInput').value = '';
        document.getElementById('nachInput').value = '';
        this.moeglicheZuegeZuruecksetzen();
        this.vonPos = null;
        this.nachPos = null;
    }

    fuehreZugAus(zug) {
        if (chessEngine.zugAusfuehren(zug)) {
            this.aktualisiereAnzeige();
            return true;
        } else {
            this.zeigeFehler("Ungültiger Zug!");
            return false;
        }
    }

    zeigeFehler(nachricht) {
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
    }

    positionZuNotation(position) {
        const dateien = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', ''];
        const reihe = Math.floor(position / 10);
        const datei = position % 10;
        return `${dateien[datei]}${reihe - 1}`;
    }

    zugZuNotation(zug) {
        const von = this.positionZuNotation(zug.vonPos);
        const nach = this.positionZuNotation(zug.nachPos);
        return `${von}${nach}`;
    }

    notationZuPosition(notation) {
        if (!notation || notation.length < 2) return -1;
        
        const dateien = { 'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5, 'f': 6, 'g': 7, 'h': 8 };
        const dateiChar = notation[0].toLowerCase();
        const reihe = parseInt(notation[1]);
        
        if (!dateien[dateiChar] || isNaN(reihe)) return -1;
        
        return (reihe + 1) * 10 + dateien[dateiChar];
    }

    // Bestehende Methoden
    naechsterZug() {
        this.computerZugAusfuehren();
    }

    weisserZug() {
        chessEngine.weissAmZug = true;
        this.aktualisiereStatus();
    }

    schwarzerZug() {
        chessEngine.weissAmZug = false;
        this.aktualisiereStatus();
    }

    spielerZieht() {
        const von = document.getElementById('vonInput').value.toLowerCase();
        const nach = document.getElementById('nachInput').value.toLowerCase();
        
        if (!von || !nach) {
            this.zeigeFehler("Bitte beide Felder ausfüllen!");
            return;
        }
        
        const vonPos = this.notationZuPosition(von);
        const nachPos = this.notationZuPosition(nach);
        
        if (vonPos === -1 || nachPos === -1) {
            this.zeigeFehler("Ungültige Position! Verwende z.B. 'e2' 'e4'");
            return;
        }
        
        const figur = chessEngine.figurenListe.find(f => 
            f.pos === vonPos && !f.geschlagen
        );
        
        if (!figur) {
            this.zeigeFehler("Keine Figur auf dem Startfeld!");
            return;
        }
        
        // Prüfen ob der Zug legal ist
        const moeglicheZuege = chessEngine.generiereZuege(figur.farbe).filter(
            zug => zug.vonPos === vonPos && zug.nachPos === nachPos
        );
        
        if (moeglicheZuege.length === 0) {
            this.zeigeFehler("Ungültiger Zug für diese Figur!");
            return;
        }
        
        const zug = moeglicheZuege[0];
        
        if (this.fuehreZugAus(zug)) {
            // Erfolgreich - Eingabe zurücksetzen
            this.eingabeZuruecksetzen();
        }
    }

    neuesSpiel() {
        chessEngine = new ChesstegEngine();
        this.aktualisiereAnzeige();
        this.setSpielModus('menschVsMensch');
        this.eingabeZuruecksetzen();
    }

    resetSpiel() {
        chessEngine.initialisiereFiguren();
        chessEngine.weissAmZug = true;
        chessEngine.endmatt = false;
        chessEngine.patt = false;
        this.aktualisiereAnzeige();
        this.setSpielModus('menschVsMensch');
        this.eingabeZuruecksetzen();
    }
}

// UI beim Laden initialisieren
document.addEventListener('DOMContentLoaded', () => {
    window.chessUI = new ChessUI();
});