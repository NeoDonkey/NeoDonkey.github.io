# Verfahrensdokumentation (GoBD)

## 1. Einleitung

Diese Verfahrensdokumentation beschreibt das ERP-System NeoDonkey gemäß den Anforderungen der Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern, Aufzeichnungen und Unterlagen in elektronischer Form sowie zum Datenzugriff (GoBD).

**System:** NeoDonkey ERP  
**Version:** 0.1  
**Lizenz:** EUPL-1.2 (Open Source)  
**Datenstandort:** Lokal im Browser des Nutzers (OPFS)  
**Datenformat:** Git-Repository mit signierten Commits

## 2. Systembeschreibung

### 2.1 Architektur

NeoDonkey ist ein headless ERP-System, das vollständig im Browser des Nutzers läuft:

- **Speicher:** Origin Private File System (OPFS) des Browsers
- **Versionskontrolle:** Git-Repository pro Unternehmen
- **Kryptographie:** Ed25519-Signaturen auf jedem Commit
- **Datenmodell:** Markdown-basiertes Operating Model mit validierten Prozessen
- **Geldbeträge:** Exakte Dezimalarithmetik mit BigInt (keine Fließkommazahlen)

### 2.2 Datenfluss

```
Benutzer → Browser → OPFS → Git-Repository → Signierter Commit
```

Jede Buchung erzeugt einen signierten Git-Commit mit:
- Vollständiger Dokumentation der Änderung
- Kryptographischer Signatur (Ed25519)
- Zeitstempel und Autor
- Unveränderbarer Audit-Trail

## 3. Buchführungsprozesse

### 3.1 Journalbuchung (Doppelte Buchführung)

**Prozess:** `journal-posting.md`

1. Erfassung des Belegs mit Pflichtfeldern:
   - Belegnummer, Belegdatum, Buchungsdatum
   - Buchungsperiode, Kontenrahmen, Währung
   - Soll- und Haben-Summe (müssen übereinstimmen)
   - Anzahl der Buchungssätze

2. Validierung durch das Operating Model:
   - `debit-amount == sum(debit postings)`
   - `credit-amount == sum(credit postings)`
   - `debit-amount == credit-amount`
   - `posting-count == actual postings`

3. Status-Transition: `draft → posted` (mit Prozessregel)

4. Persistenz als signierter Git-Commit

### 3.2 DATEV-Export

**Modul:** `runtime/export/datev-extf.js`

- Exportformat: DATEV EXTF v700
- Konsulentennummer, Mandantennummer, Wirtschaftsjahr
- Automatische Konvertierung von Geldbeträgen in Ganzzahlen (Cent)
- Markierung bereits exportierter Buchungen
- Filter: Zeitraum, nur geänderte Buchungen

### 3.3 XRechnung

**Modul:** `runtime/export/xrechnung.js`

- Format: XRechnung 3.0 (EN 16931 / UBL 2.1)
- Pflichtangaben: Sender/Empfänger, VAT-ID, Rechnungsnummer, Datum
- Positionen mit Mengen, Preisen, USt-Sätzen
- Gesamtsummen: Netto, USt, Brutto

## 4. Aufbewahrung und Archivierung

### 4.1 Aufbewahrungsfristen

- **Bücher und Aufzeichnungen:** 10 Jahre (§ 257 Abs. 1 Nr. 1 HGB)
- **Handelsbriefe:** 6 Jahre (§ 257 Abs. 1 Nr. 2 HGB)
- **Steuerliche Unterlagen:** 10 Jahre (§ 147 Abs. 1 Nr. 1 AO)

### 4.2 Datensicherung

Da NeoDonkey ein lokales Git-Repository verwendet:

- **Backup:** Standard-Git-Operationen (`git clone`, `git bundle`, `git archive`)
- **Export:** ZIP-Archiv des Repository-Verzeichnisses
- **Remote:** Möglichkeit zur Synchronisation auf eigenen Server

### 4.3 Unveränderbarkeit

- Jede Buchung ist ein signierter Git-Commit
- Commits sind kryptographisch an die Vorgänger gebunden
- Änderungen erzeugen neue Commits (alte bleiben erhalten)
- Signaturprüfung via `git verify-commit`

## 5. Datenzugriff (GoBD § 4)

### 5.1 Vollständigkeit

Alle Geschäftsvorfälle werden vollständig erfasst:
- Keine Buchung ohne Beleg
- Keine Belegänderung ohne Nachvollziehbarkeit
- Alle Postings sind mit Journal-Eintrag verknüpft

### 5.2 Richtigkeit

- Validierung durch Operating Model bei jedem `perform()`
- Typprüfung aller Felder
- Pflichtfeldprüfung
- Bilanzgleichheit (Soll = Haben)

### 5.3 Rechtzeitigkeit

- Zeitstempel auf Commit-Ebene (nicht änderbar)
- Chronologische Reihenfolge durch Git-History
- Keine nachträgliche Manipulation möglich

### 5.4 Ordnungsmäßigkeit

- Doppelte Buchführung mit automatischer Bilanzprüfung
- Kontenrahmen (SKR03/SKR04) mit validierten Kontonummern
- Periodenbezogene Buchungen

## 6. IT-System-Dokumentation

### 6.1 Technische Spezifikation

| Komponente | Technologie | Version |
|-----------|-------------|---------|
| Laufzeitumgebung | Browser (JavaScript) | ES2022+ |
| Speicher | OPFS (File System Access API) | Living Standard |
| Kryptographie | Web Crypto API (Ed25519) | W3C |
| Versionskontrolle | Git (Pure JS Implementation) | 2.x |
| Datenformat | Markdown + YAML Frontmatter | CommonMark |

### 6.2 Schnittstellen

- **Import:** CSV, CAMT.053 (geplant)
- **Export:** DATEV EXTF, XRechnung XML, CSV
- **Sync:** Git-Remote (SSH/HTTPS)

### 6.3 Benutzerrollen

| Rolle | Berechtigungen |
|-------|---------------|
| managing-director | Alle Prozesse |
| accountant | Buchhaltung, Export |
| warehouse-clerk | Lager, Wareneingang |
| controller | Auswertungen, Reportings |

## 7. Änderungshistorie

| Datum | Version | Änderung | Autor |
|-------|---------|----------|-------|
| 2026-08-21 | 0.1 | Erstversion | NeoDonkey |

---

*Diese Verfahrensdokumentation wurde automatisch aus dem NeoDonkey Operating Model generiert. Für Fragen wenden Sie sich an Ihren Steuerberater oder an hallo@lilazebra.de.*
