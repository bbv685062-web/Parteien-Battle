# Parteien-Battle

Live-Overlay für ein "Parteien-Battle" auf TikTok Live: eine Kontroll-Oberfläche
für dich (z.B. auf einem Tablet als Browser-Quelle in OBS/TikTok Live Studio)
und eine öffentliche, anonyme Abstimmungs-Website für deine Zuschauer:innen.
Beide Seiten sind per Echtzeit-Verbindung (Socket.IO) miteinander verbunden –
jede Stimme poppt sofort als Punkt und Effekt auf deinem Kontrollbildschirm auf.

## Funktionen

- **Kontroll-Bildschirm** (`/control.html`): Parteien-Liste wie im Vorbild-Screenshot,
  sortiert nach Punktestand, mit Rang-Anzeige und Krone für die Führende.
- **Punkte vergeben per Klick**: Klick auf eine Partei öffnet ein Menü mit
  `+1`, `+5`, `+10` oder einer frei wählbaren Zahl. Jede Vergabe löst einen
  Partikel-/Konfetti-Effekt und eine fliegende "+N"-Animation aus.
- **Battle beenden**: Ein Klick auf "Battle beenden" kürt die aktuell führende
  Partei zur Siegerin mit einem großen Sieger-Effekt (Krone, Konfetti-Regen,
  Statistiken: Gesamt vergebene Punkte, Anzahl Aktionen, größter Einzel-Burst,
  Vorsprung zum Zweitplatzierten und ggf. eine "Aufholjagd"-Anzeige, falls die
  Siegerpartei zwischenzeitlich im Rückstand war) sowie einen QR-Code/Link zur
  Abstimmungsseite.
- **Einstellungen** (Zahnrad-Icon): Parteien hinzufügen/löschen sowie pro
  Partei Name, Emoji/Logo, Farbe und eine optionale Website (z.B. Infoseite)
  bearbeiten. Außerdem Titel/Untertitel des Streams und die
  Abstimmungs-Sperrzeit einstellbar.
- **Anonyme Zuschauer-Abstimmung** (`/vote.html`): Mobile-optimierte Seite,
  auf der Zuschauer:innen ohne Login/Anmeldung für eine Partei abstimmen
  können. Jede Stimme zählt live als 1 Punkt auf dem Kontrollbildschirm.
- **"Neues Battle starten"**: Setzt alle Punkte/Statistiken zurück, ohne die
  angelegten Parteien zu löschen.

## Installation & Start

```bash
npm install
npm start
```

Der Server läuft danach standardmäßig auf Port `3000`:

- Kontroll-/Overlay-Bildschirm: `http://localhost:3000/control.html`
- Anonyme Abstimmungsseite: `http://localhost:3000/vote.html`

Einen anderen Port festlegen:

```bash
PORT=4000 npm start
```

## Nutzung im Stream

1. Öffne `control.html` auf dem Gerät, das du im Livestream zeigst (z.B. als
   Browser-Quelle in OBS/TikTok Live Studio, oder direkt auf einem Tablet).
2. Klicke auf das 🔗-Icon oben rechts, um den Voting-Link bzw. QR-Code für
   deine Zuschauer:innen anzuzeigen und zu teilen (z.B. im Stream-Titel, in
   der Bio oder als eingeblendeter QR-Code).
3. Passe über das ⚙️-Icon die Parteien (Name, Farbe, Emoji, Website) an
   deinen Battle an.
4. Vergib während des Streams manuell Punkte per Klick, oder lass Zuschauer:innen
   über die Abstimmungsseite live mitpunkten.
5. Klicke am Ende auf "Battle beenden", um den Sieger-Effekt auszulösen.

## Damit Zuschauer:innen von außen abstimmen können

Standardmäßig ist der Server nur lokal erreichbar. Für echte Zuschauer:innen
brauchst du eine öffentlich erreichbare Adresse, z.B.:

- einen Tunnel-Dienst wie `ngrok` oder `cloudflared` während des Streams, oder
- ein dauerhaftes Hosting (z.B. Render, Railway, Fly.io, ein eigener VPS) und
  `npm start` dort laufen lassen.

## Hinweis zur Anonymität der Abstimmung

Die Abstimmungsseite verlangt bewusst **keine Anmeldung, keinen Namen, keine
E-Mail** – jede:r kann direkt abstimmen. Um versehentliches Mehrfachklicken
etwas einzudämmen, merkt sich der Browser der abstimmenden Person lokal
(`localStorage`) den Zeitpunkt der letzten Stimme pro Partei und sperrt den
Button für die in den Einstellungen konfigurierte Sperrzeit (Standard: 20
Sekunden). Das ist **kein Schutz vor absichtlichem Mehrfachvotieren** über
mehrere Geräte/Tabs/Browser hinweg – echte Fälschungssicherheit würde
Nutzerkonten erfordern, was dem Wunsch nach voller Anonymität widerspricht.
Für ein privates/spaßiges TikTok-Battle ist dieser Kompromiss in der Regel
ausreichend.

## Datenspeicherung

Der aktuelle Zustand (Parteien, Punkte, Statistiken) wird in
`data/state.runtime.json` gespeichert, damit er einen Server-Neustart
übersteht. Diese Datei ist bewusst nicht Teil des Git-Repositories
(`.gitignore`), da sie sich mit jedem Battle ändert.
