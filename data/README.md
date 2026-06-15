# JSON-Datenablage

Diese Dateien sind die dauerhafte Datenquelle fuer das Frontend.

- `norms.json`: Normen und Bereiche in der oberen Navigation
- `units.json`: Einheiten-Auswahl
- `wood.json`: Holzarten, Holzklassen und Materialwerte
- `chapters/<norm>.json`: Kapitelbaum pro Norm
- `tables/<norm>.json`: Tabellen und Diagramm-Daten pro Norm
- `../nachweise/<norm>/*.json`: einzelne Nachweise mit Block-Graph, Variablen und eingebundenen Tabellen

Das Frontend liest diese Dateien direkt ueber `src/api.ts`.

Wichtig: Das statische Browser-Frontend kann nicht direkt in diese Dateien schreiben. Admin-Aenderungen werden lokal im Browser gespeichert. Fuer dauerhafte Aenderungen einen Nachweis als JSON exportieren und unter `nachweise/<norm>/` ablegen oder eine bestehende JSON-Datei ersetzen.
