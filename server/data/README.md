# JSON-Datenablage

Diese Dateien sind die dauerhafte Datenquelle fuer das Backend.

- `norms.json`: Normen und Bereiche in der oberen Navigation
- `units.json`: Einheiten-Auswahl
- `wood.json`: Holzarten, Holzklassen und Materialwerte
- `chapters/<norm>.json`: Kapitelbaum pro Norm
- `tables/<norm>.json`: Tabellen und Diagramm-Daten pro Norm
- `../nachweise/<norm>/*.json`: einzelne Nachweise mit Block-Graph, Variablen und eingebundenen Tabellen

Beim Start liest das Backend diese JSON-Dateien ein und baut daraus den SQLite-Cache `sia265.db`.
Wenn du im Backend etwas bearbeitest, wird die passende JSON-Datei automatisch aktualisiert.
