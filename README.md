# WarEra Dashboard & Editor für offizielle deutsche MUs

Ein clientseitiges Dashboard mit integriertem Struktur-Editor für **[WarEra](https://app.warera.io/)**. Das Tool ermöglicht es, Militäreinheiten (MUs) aus Artikeln auszulesen, deren Live-Daten über die WarEra-API zu aggregieren und benutzerdefinierte Layouts zu verwalten.

## 🚀 Features

* **Automatischer Artikel-Parser:** Liest spezielle `<span data-content-type="mu">`-Strukturen oder Markdown-Formate aus WarEra-Artikeln aus und gruppiert die gefundenen Militäreinheiten nach Divisionen (`<h2>`).
* **Live-API-Dashboard:** Aggregiert Echtzeit-Daten direkt über das WarEra-SDK, inklusive:
* *Einheits-Statistiken:* Wöchentlicher Schaden, HQ- & Kasernen-Level, Kontostände (BTC).
* *Führungsebene:* Übersicht der Inhaber, Manager und Kommandeure mit Avataren.
* *Interaktive Mitgliederliste:* Vollständige Tabelle aller Mitglieder inklusive einer **Live-Sortierung** nach Name, wöchentlichem Schaden, User-Level und Aktivitätsstatus.

* **Erweiterte Caching- & Duplikat-Schutz-Engine:** * Gestaffelter `localStorage`-Cache (Artikel: 5 Min., MUs: 15 Min., User: 60 Min.).
* *Request-Pooling:* Verhindert doppelte API-Anfragen im selben Durchlauf, wenn dieselbe ID in mehreren Divisionen vorkommt, indem laufende Promises geteilt werden.

* **Integrierter Struktur-Editor:** Erlaubt das Umsortieren von Einheiten und den Export des fertigen, exakt formatierten HTML/Markdown-Codes für das WarEra-Artikelsystem.

---

## Tech-Stack

* **Frontend:** React (Vite)
* **Styling:** Custom CSS3 (Grid, Flexbox, Dark-Theme optimiert)
* **API-Anbindung:** [inoffizieller WarEra tRPC Client](https://github.com/WarEraProjects/TRPC)
* **Datenhaltung:** Synchroner `localStorage` für Layouts und Caching

---

## 📁 Projektstruktur

```text
├── src/
│   ├── apiwrapper.js       # Stellt die Verbindung zum WarEra-Client SDK her
│   ├── datahandler.js      # Zentrale Logik: Caching, Parser, API-Bulk-Fetch, Daten-Export
│   ├── App.jsx             # Hauptanwendung, verwaltet App-States und Initialisierung
│   ├── tokenhandler.jsx    # Popup zur API-Token & Article-ID Konfiguration und Validierung
│   ├── tokenhandler.css    # Styling für das Konfigurations-Modal
│   ├── mudashboard.jsx     # Dashboard-Komponenten (Stats, Management, Sortierbare User-Liste)
│   ├── mudashboard.css     # Styling für das gesamte Dashboard-Grid und Tabellen
│   └── main.jsx            # React-Mounting Point
├── README.md               # Projektdokumentation
└── package.json

```

## 🔑 Konfiguration & Nutzung

Beim ersten Start oder über die Einstellungen öffnet sich das **Konfigurations-Modal**:

1. **API-Token:** Gib deinen persönlichen WarEra API-Token ein, um höhere Ratelimits freizuschalten. Alternativ kannst du es auch ohne Token benutzen
2. **Erweiterte Optionen (Article-ID):** Hier kannst du eine  WarEra-Artikel-ID hinterlegen. Wenn das Feld leer bleibt, fällt das System automatisch auf die i `DEFAULT_ARTICLE_ID` zurück.

## Api-Usage

Dieses Projekt ist 95% Ai-Slop und 5% drüberschauen, dass die Ai keine Scheiße baut. Also seit nachsichtig, falls was nicht klappt
