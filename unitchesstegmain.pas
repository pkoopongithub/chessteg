unit unitChesstegMain;
(****************************************************************)
(* (c) 1994 1995 Paul Koop chessteg didaktisches Schachprogramm *)
(* das didaktische Schachprogramm chessteg wurde                *)
(* urspruenglisch im rahmen der entwicklung der                 *)
(* Algorithmisch Rekursive Sequenzanalyse                       *)
(* zur ueberpruefung der verwendbarkeit von                     *)
(* spielbaeumen und alpha beta suche entwickelt                 *)
(* nicht als spielstarkes programm beabsichtigt                 *)
(* liegt seine staerke in der didaktischen verwendbarkeit       *)
(*                                                              *)
(* mit enpassant als bewerterer Zug innerhalb Suchbaum          *)
(* Bauernumwandlung in Dame, Turm, Springer oder Laeufer        *)
(* nach umwandlungsfaehigem Bauernzug wird separat bewertet und *)
(* umgewandelt in Dame, Turm, Springer oder Laeufer             *)
(* Rochade als Figurenumstellung an Stelle von bewertetem Zug   *)
(* fuer dos (derivate) unix (derivate) turbo-pascal free-pascal *)
(* das programm darf mit copyright paul koop kostenfrei zu      *)
(* nicht kommerziellen zwecken verwendet werden                 *)
(****************************************************************)

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, FileUtil, Forms, Controls, Graphics, Dialogs, ComCtrls,
  Grids, StdCtrls, FPImage, FPCanvas, FPImgCanv,
     FPWritePNG, FPReadPNG,UnitChesstegEngine;

type

  { TfrmChessteg }

  TfrmChessteg = class(TForm)
    btnNaechsterZug: TButton;
    amZug: TLabel;
    LabelSpielerzug1: TLabel;
    SpielerZieht: TButton;
    SchwarzerZug: TButton;
    WeisserZug: TButton;
    StaticText1: TStaticText;
    StaticText10: TStaticText;
    StaticText11: TStaticText;
    StaticText12: TStaticText;
    StaticText13: TStaticText;
    StaticText14: TStaticText;
    StaticText15: TStaticText;
    StaticText16: TStaticText;
    StaticText2: TStaticText;
    StaticText3: TStaticText;
    StaticText4: TStaticText;
    StaticText5: TStaticText;
    StaticText6: TStaticText;
    StaticText7: TStaticText;
    StaticText8: TStaticText;
    StaticText9: TStaticText;
    von: TEdit;
    nach: TEdit;
    grdBrettansicht: TStringGrid;
    LabelSpielerzug: TLabel;
    LabelZugVon: TLabel;
    LabelZugNach: TLabel;
    procedure btnNaechsterZugClick(Sender: TObject);
    procedure SchwarzerZugClick(Sender: TObject);
    procedure SpielerZiehtClick(Sender: TObject);
    procedure WeisserZugClick(Sender: TObject);
    procedure FormCreate(Sender: TObject);
    procedure FormDestroy(Sender: TObject);
    procedure grdBrettansichtDrawCell(Sender: TObject; aCol, aRow: Integer;
      aRect: TRect; aState: TGridDrawState);
    procedure grdBrettansichtSelectCell(Sender: TObject; aCol, aRow: Integer;
      var CanSelect: Boolean);
    procedure grdZeigebrett();

  private
    { private declarations }
  public
    { public declarations }
  end;

var
  frmChessteg: TfrmChessteg;
  weissAmZug: boolean;
  SpielerSetztZug,SpielerWaehltZug:boolean;
  pltBauerWeiss,
  rltTurmWeiss,
  bltLaeuferWeiss,
  nltSpringerWeiss,
  qdtDameWeiss,
  kltKoenigWeiss,
  pdtBauerSchwarz,
  rdtTurmSchwarz,
  bdtLaeuferSchwarz,
  ndtSpringerSchwarz,
  qdtDameSchwarz,
  kdtKoenigSchwarz : TPortableNetworkGraphic;





implementation

{$R *.lfm}

{ TfrmChessteg }
procedure TfrmChessteg.FormDestroy(Sender: TObject);
begin
   abbauFigurenListe(figurenliste);
end;

procedure TfrmChessteg.grdBrettansichtDrawCell(Sender: TObject; aCol,
  aRow: Integer; aRect: TRect; aState: TGridDrawState);
begin
       IF (trunc(aCol mod 2)= trunc(aRow mod 2))
        THEN
         BEGIN
         grdBrettansicht.Canvas.Brush.Color:= clWhite;
         grdBrettansicht.Canvas.fillrect(aRect);
         (*StringGrid1.Cells[aCol, aRow] :=StringGrid1.Cells[aCol, aRow]*)
         END

        ELSE
         BEGIN
         grdBrettansicht.Canvas.Brush.Color:= clGray;
         grdBrettansicht.Canvas.fillrect(aRect);
         (*StringGrid1.Cells[aCol, aRow] :=StringGrid1.Cells[aCol, aRow]*)
         END;

         CASE grdBrettansicht.Cells[aCol, aRow] OF
               'sb':BEGIN grdBrettansicht.Canvas.StretchDraw(aRect,pdtBauerSchwarz);   END;
               'sD':BEGIN grdBrettansicht.Canvas.StretchDraw(aRect,qdtDameSchwarz);   END;
               'sK':BEGIN grdBrettansicht.Canvas.StretchDraw(aRect,kdtKoenigSchwarz);  END;
               'sL':BEGIN grdBrettansicht.Canvas.StretchDraw(aRect,bdtLaeuferSchwarz);   END;
               'sS':BEGIN grdBrettansicht.Canvas.StretchDraw(aRect,ndtSpringerSchwarz);   END;
               'sT':BEGIN grdBrettansicht.Canvas.StretchDraw(aRect,rdtTurmSchwarz);   END;
               'wb':BEGIN grdBrettansicht.Canvas.StretchDraw(aRect,pltBauerWeiss);   END;
               'wD':BEGIN grdBrettansicht.Canvas.StretchDraw(aRect,qdtDameWeiss);   END;
               'wK':BEGIN grdBrettansicht.Canvas.StretchDraw(aRect,kltKoenigWeiss);   END;
               'wL':BEGIN grdBrettansicht.Canvas.StretchDraw(aRect,bltLaeuferWeiss);   END;
               'wS':BEGIN grdBrettansicht.Canvas.StretchDraw(aRect,nltSpringerWeiss);   END;
               'wT':BEGIN grdBrettansicht.Canvas.StretchDraw(aRect,rltTurmWeiss);   END;

         ELSE
                 //write('fehler bei art   ');
         END;


end;

procedure TfrmChessteg.grdBrettansichtSelectCell(Sender: TObject; aCol,
  aRow: Integer; var CanSelect: Boolean);

function feld (i:integer):String;
var idiv,imod:Integer;
BEGIN
  idiv:= i div 10;
  imod:= i mod 10;
  CASE imod of
     1: feld:='A';
     2: feld:='B';
     3: feld:='C';
     4: feld:='D';
     5: feld:='E';
     6: feld:='F';
     7: feld:='G';
     8: feld:='H';
  END;
  feld:= feld+ inttostr(idiv-1);
END;
begin
IF (SpielerWaehltZug)
THEN
BEGIN (*von *)
  SpielerWaehltZug := false;
  SpielerSetztZug:=false;
  von.Text:= feld((10*aRow+20)+8-aCol);
  Spielerzug.vonpos:= ((10*aRow+20)+8-aCol);
  nach.Text:=' ';


END
ELSE
BEGIN (* nach *)
SpielerWaehltZug := true;
SpielerSetztZug:=true;
nach.Text:= feld((10*aRow+20)+8-aCol);
Spielerzug.nachpos:= ((10*aRow+20)+8-aCol);
END
end;


procedure TfrmChessteg.grdZeigebrett();
var x,y:integer; figur:string[2];
PROCEDURE schreibeFigur (art:INTEGER);
BEGIN
 CASE abs(art) OF
       cb:figur:=figur + 'b';
       cl:figur:=figur + 'L';
       cs:figur:=figur + 'S';
       ct:figur:=figur + 'T';
       cd:figur:=figur + 'D';
       ck:figur:=figur + 'K';


 ELSE
         //write('fehler bei art   ');
 END;
END;

begin

   For x:=0 to 7 do
    for y:=0 to 7 do
     BEGIN
       figur:= ' ';
       if brett[(10*(x+1)+10)+(9-(y+1))]<>0
       then
       begin
       if brett[(10*(x+1)+10)+(9-(y+1))]<0 then figur:='s' else figur := 'w';
       schreibeFigur (brett[(10*(x+1)+10)+(9-(y+1))]);
       end;
       grdBrettansicht.Cells[y, x] := figur;
     END; (* Cells[aCol, aRow]  *)

end;





procedure TfrmChessteg.FormCreate(Sender: TObject);
var x:integer;
begin
 figurenliste:=figurenListeGenerieren();
 endmatt:=false;patt:=false; rochiertweiss:=false;rochiertschwarz:=false;


  weissAmZug:=true;
  SpielerSetztZug:=false;
  SpielerWaehltZug:=true;

  grdBrettansicht.Row:=1;
  grdBrettansicht.Col:=3;
  grdZeigebrett();


{Die Abbildungen der Figuren sind verfuegbar unter
https://commons.m.wikimedia.org/wiki/Category:PNG_chess_pieces/Standard_transparent
https://creativecommons.org/licenses/by-sa/3.0/}

 For X:=1 To 12
  DO
    BEGIN
     CASE x OF
       1:BEGIN
          pltBauerWeiss:=TPortableNetworkGraphic.Create;
          pltBauerWeiss.LoadFromFile('Chess_plt60.png');
         END;

       2:BEGIN
          rltTurmWeiss:=TPortableNetworkGraphic.Create;
          rltTurmWeiss.LoadFromFile('Chess_rlt60.png');
         END;
       3:BEGIN
          bltLaeuferWeiss:=TPortableNetworkGraphic.Create;
          bltLaeuferWeiss.LoadFromFile('Chess_blt60.png');
         END;
       4:BEGIN
          nltSpringerWeiss:=TPortableNetworkGraphic.Create;
          nltSpringerWeiss.LoadFromFile('Chess_nlt60.png');
         END;
       5:BEGIN
          qdtDameWeiss:=TPortableNetworkGraphic.Create;
          qdtDameWeiss.LoadFromFile('Chess_qlt60.png');
         END;
       6:BEGIN
          kltKoenigWeiss:=TPortableNetworkGraphic.Create;
          kltKoenigWeiss.LoadFromFile('Chess_klt60.png');
         END;

       7:BEGIN
          pdtBauerSchwarz:=TPortableNetworkGraphic.Create;
          pdtBauerSchwarz.LoadFromFile('Chess_pdt60.png');
         END;
       8:BEGIN
          rdtTurmSchwarz:=TPortableNetworkGraphic.Create;
          rdtTurmSchwarz.LoadFromFile('Chess_rdt60.png');
         END;
      9:BEGIN
          bdtLaeuferSchwarz:=TPortableNetworkGraphic.Create;
          bdtLaeuferSchwarz.LoadFromFile('Chess_bdt60.png');
         END;
      10:BEGIN
          ndtSpringerSchwarz:=TPortableNetworkGraphic.Create;
          ndtSpringerSchwarz.LoadFromFile('Chess_ndt60.png');
         END;
      11:BEGIN
          qdtDameSchwarz:=TPortableNetworkGraphic.Create;
          qdtDameSchwarz.LoadFromFile('Chess_qdt60.png');
         END;
      12:BEGIN
          kdtKoenigSchwarz:=TPortableNetworkGraphic.Create;
          kdtKoenigSchwarz.LoadFromFile('Chess_kdt60.png');
         END;

     END;
    END;

end;

procedure TfrmChessteg.btnNaechsterZugClick(Sender: TObject);
begin
 von.text:='von';
  nach.text:='nach';
 IF weissAmZug THEN
  BEGIN (* weisAmZug *)
   amZug.Caption:='Schwarz am Zug';
   IF (NOT(endmatt)OR(patt))
   THEN
   BEGIN
    IF (kleinerochademoeglich(figurenliste,cweiss) OR grosserochademoeglich(figurenliste,cweiss)) AND(NOT rochiertweiss)
     THEN
      BEGIN
        IF kleinerochademoeglich(figurenliste,cweiss)
        THEN
        BEGIN
        //writeln(' Kleine Rochade Weiss');
        kleinerochade(figurenliste,cweiss);
        grdZeigebrett();
        (*figuren(figurenliste); *)
        //readln;clrscr;
        END
        ELSE
        BEGIN
        //writeln(' Grosse Rochade Weiss');
        grosserochade(figurenliste,cweiss);
        grdZeigebrett();
        (*figuren(figurenliste); *)
        //readln;clrscr;
        END
      END
     ELSE
      BEGIN
       bewertung:=computerzug(cweiss,cminInteger,cmaxInteger,1,ctiefe,'-');
       //writeln(bewertung,' computerzug');
       grdZeigebrett();
       (*figuren(figurenliste);*)
       //readln;clrscr;
      END;
     weissAmZug:=false;
   END;
   END (* weissAmZug  *)
   ELSE
   BEGIN (* schwarzAmZug  *)
   amZug.Caption:='Weiss am Zug';
   IF (NOT(endmatt)OR(patt))
   THEN
   BEGIN
    IF (kleinerochademoeglich(figurenliste,cschwarz) OR grosserochademoeglich(figurenliste,cschwarz)) AND(NOT rochiertschwarz)
     THEN
      BEGIN
        IF kleinerochademoeglich(figurenliste,cschwarz)
        THEN
        BEGIN
        //writeln(bewertung,' Kleine Rochade Schwarz');
        kleinerochade(figurenliste,cschwarz);
        grdZeigebrett();
        (*figuren(figurenliste);*)
        //readln;clrscr;
        END
        ELSE
        BEGIN
        //writeln(bewertung,' Grosse Rochade Schwarz');
        grosserochade(figurenliste,cschwarz);
        grdZeigebrett();
        (*figuren(figurenliste);*)
        //readln;clrscr;
        END
      END
     ELSE
      BEGIN
       bewertung:=computerzug(cschwarz,cmaxInteger,cminInteger,1,ctiefe,'-');
       //writeln(bewertung,' computerzug');
       grdZeigebrett();
       (*figuren(figurenliste);*)
       //readln;clrscr;
      END;
      weissAmZug:=true;
    END
   END;(* schwarzAmZug *)
end;





procedure TfrmChessteg.SchwarzerZugClick(Sender: TObject);
BEGIN (* schwarzAmZug  *)
   amZug.Caption:='Weiss am Zug';
   IF (NOT(endmatt)OR(patt))
   THEN
   BEGIN
    IF (kleinerochademoeglich(figurenliste,cschwarz) OR grosserochademoeglich(figurenliste,cschwarz)) AND(NOT rochiertschwarz)
     THEN
      BEGIN
        IF kleinerochademoeglich(figurenliste,cschwarz)
        THEN
        BEGIN
        //writeln(bewertung,' Kleine Rochade Schwarz');
        kleinerochade(figurenliste,cschwarz);
        grdZeigebrett();
        (*figuren(figurenliste);*)
        //readln;clrscr;
        END
        ELSE
        BEGIN
        //writeln(bewertung,' Grosse Rochade Schwarz');
        grosserochade(figurenliste,cschwarz);
        grdZeigebrett();
        (*figuren(figurenliste);*)
        //readln;clrscr;
        END
      END
     ELSE
      BEGIN
       bewertung:=computerzug(cschwarz,cmaxInteger,cminInteger,1,ctiefe,'-');
       //writeln(bewertung,' computerzug');
       grdZeigebrett();
       (*figuren(figurenliste);*)
       //readln;clrscr;
      END;
      weissAmZug:=true;
    END
   END;(* schwarzAmZug *)

procedure TfrmChessteg.SpielerZiehtClick(Sender: TObject);
 var SpielerHatGezogen: Boolean;
 var farbe: Integer;
begin
 (*   *)
 (*  Spielt hat gezogen false *)
 SpielerHatGezogen := false;
 IF (NOT(endmatt)OR(patt))
 THEN
 BEGIN (*  (NOT(endmatt)OR(patt))  *)
   IF weissAmZug THEN farbe := cweiss ELSE farbe := cschwarz;
 (* Rochade Weiss *)
   IF weissAmZug THEN
    BEGIN
    IF (kleinerochademoeglich(figurenliste,cweiss) OR grosserochademoeglich(figurenliste,cweiss)) AND(NOT rochiertweiss)
     THEN
      BEGIN
        IF kleinerochademoeglich(figurenliste,cweiss) AND ((Spielerzug.vonpos=E1)AND(Spielerzug.nachpos=G1))
        THEN
        BEGIN
        //writeln(' Kleine Rochade Weiss');
        kleinerochade(figurenliste,cweiss);
        SpielerHatGezogen := true;
        grdZeigebrett();
        (*figuren(figurenliste); *)
        //readln;clrscr;
        END
        ELSE
        BEGIN
        //writeln(' Grosse Rochade Weiss');
        IF ((Spielerzug.vonpos=E1)AND(Spielerzug.nachpos=C1)) THEN
        BEGIN
        grosserochade(figurenliste,cweiss);
        SpielerHatGezogen := true;
        grdZeigebrett();
        END;
        (*figuren(figurenliste); *)
        //readln;clrscr;
        END
      END
    (* SpielerHatGezogen := true;*)
    END
   ELSE
 (* Rochade Schwarz*)
    BEGIN
    IF (kleinerochademoeglich(figurenliste,cschwarz) OR grosserochademoeglich(figurenliste,cschwarz)) AND(NOT rochiertschwarz)
     THEN
      BEGIN
        IF kleinerochademoeglich(figurenliste,cschwarz) AND ((Spielerzug.vonpos=E8)AND(Spielerzug.nachpos=G8))
        THEN
        BEGIN
        //writeln(' Kleine Rochade Weiss');
        kleinerochade(figurenliste,cschwarz);
        SpielerHatGezogen := true;
        grdZeigebrett();
        (*figuren(figurenliste); *)
        //readln;clrscr;
        END
        ELSE
        BEGIN
        //writeln(' Grosse Rochade Weiss');
        IF ((Spielerzug.vonpos=E8)AND(Spielerzug.nachpos=C8)) THEN
        BEGIN
        grosserochade(figurenliste,cschwarz);
        SpielerHatGezogen := true;
        grdZeigebrett();
        END;
        (*figuren(figurenliste); *)
        //readln;clrscr;
        END
      END
    (* SpielerHatGezogen := true;*)
    (* SpielerHatGezogen := true;  *)
    END;

 (* andere Zuege *)
 IF NOT(SpielerHatGezogen) THEN
  BEGIN
 (* Hier Spielerzug: prüfen 1. In zugliste 2. setzt nicht ins Schach *)
  SpielerHatGezogen:=computerzugSPIELER (Spielerzug,farbe,'-');
  END;
 (* Zug andere Farbe *)

  IF SpielerHatGezogen THEN
  BEGIN
      IF (NOT(endmatt)OR(patt))
   THEN
   BEGIN
       SpielerHatGezogen :=false;
       IF weissAmZug THEN farbe := cweiss ELSE farbe := cschwarz;
     (* Rochade Weiss *)
       IF weissAmZug THEN
        BEGIN
        IF (kleinerochademoeglich(figurenliste,cweiss) OR grosserochademoeglich(figurenliste,cweiss)) AND(NOT rochiertweiss)
         THEN
          BEGIN
            IF kleinerochademoeglich(figurenliste,cweiss)
            THEN
            BEGIN
            //writeln(' Kleine Rochade Weiss');
            kleinerochade(figurenliste,cweiss);
            SpielerHatGezogen := true;
            grdZeigebrett();
            (*figuren(figurenliste); *)
            //readln;clrscr;
            END
            ELSE
            BEGIN
            //writeln(' Grosse Rochade Weiss');
            grosserochade(figurenliste,cweiss);
            SpielerHatGezogen := true;
            grdZeigebrett();
            (*figuren(figurenliste); *)
            //readln;clrscr;
            END
          END
        (* SpielerHatGezogen := true;*)
        END
       ELSE
     (* Rochade Schwarz*)
        BEGIN
        IF (kleinerochademoeglich(figurenliste,cschwarz) OR grosserochademoeglich(figurenliste,cschwarz)) AND(NOT rochiertschwarz)
         THEN
          BEGIN
            IF kleinerochademoeglich(figurenliste,cschwarz)
            THEN
            BEGIN
            //writeln(' Kleine Rochade Weiss');
            kleinerochade(figurenliste,cschwarz);
            SpielerHatGezogen := true;
            grdZeigebrett();
            (*figuren(figurenliste); *)
            //readln;clrscr;
            END
            ELSE
            BEGIN
            //writeln(' Grosse Rochade Weiss');
            grosserochade(figurenliste,cschwarz);
            SpielerHatGezogen := true;
            grdZeigebrett();
            (*figuren(figurenliste); *)
            //readln;clrscr;
            END
          END
        (* SpielerHatGezogen := true;*)
        (* SpielerHatGezogen := true;  *)
        END;
     IF NOT(SpielerHatGezogen) THEN
      BEGIN
       IF -farbe = cschwarz
       THEN
        bewertung:=computerzug(cschwarz,cmaxInteger,cminInteger,1,ctiefe,'-')
       ELSE
        bewertung:=computerzug(cweiss,cminInteger,cmaxInteger,1,ctiefe,'-');
       //writeln(bewertung,' computerzug');
       grdZeigebrett();
       (*figuren(figurenliste);*)
       //readln;clrscr;
      END;
    END;

  END;
  END; (*  (NOT(endmatt)OR(patt))  *)
end;

procedure TfrmChessteg.WeisserZugClick(Sender: TObject);
BEGIN (* weisAmZug *)
   amZug.Caption:='Schwarz am Zug';
   IF (NOT(endmatt)OR(patt))
   THEN
   BEGIN
    IF (kleinerochademoeglich(figurenliste,cweiss) OR grosserochademoeglich(figurenliste,cweiss)) AND(NOT rochiertweiss)
     THEN
      BEGIN
        IF kleinerochademoeglich(figurenliste,cweiss)
        THEN
        BEGIN
        //writeln(' Kleine Rochade Weiss');
        kleinerochade(figurenliste,cweiss);
        grdZeigebrett();
        (*figuren(figurenliste); *)
        //readln;clrscr;
        END
        ELSE
        BEGIN
        //writeln(' Grosse Rochade Weiss');
        grosserochade(figurenliste,cweiss);
        grdZeigebrett();
        (*figuren(figurenliste); *)
        //readln;clrscr;
        END
      END
     ELSE
      BEGIN
       bewertung:=computerzug(cweiss,cminInteger,cmaxInteger,1,ctiefe,'-');
       //writeln(bewertung,' computerzug');
       grdZeigebrett();
       (*figuren(figurenliste);*)
       //readln;clrscr;
      END;
     weissAmZug:=false;
   END;
   END; (* weissAmZug  *)



end.

