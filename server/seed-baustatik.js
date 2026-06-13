module.exports = {
  chapters: [
  [
    "baustatik_1",
    null,
    "1",
    "Baustatik"
  ],
  [
    "baustatik_1_1",
    "baustatik_1",
    "1.1",
    "Schubfluss"
  ]
],
  verifications: [
  {
    "id": "baustatik_schubfluss",
    "chapter_id": "baustatik_1_1",
    "title": "Schubflussnachweis",
    "formula_latex": "q_d = \\frac{V_d \\cdot S_y}{I_y}",
    "formula_description": "Schubflussnachweis fuer zusammengesetzte Querschnitte. Aus den geloeschten Daten als Grundnachweis wiederhergestellt.",
    "compute_expr": "V_d * S_y / I_y",
    "variables": [
      {
        "name": "V_d",
        "label": "Querkraft",
        "unit": "N",
        "type": "number",
        "default_value": "10000",
        "description": ""
      },
      {
        "name": "S_y",
        "label": "Statisches Moment",
        "unit": "mm^3",
        "type": "number",
        "default_value": "100000",
        "description": ""
      },
      {
        "name": "I_y",
        "label": "Flächenträgheitsmoment",
        "unit": "mm^4",
        "type": "number",
        "default_value": "10000000",
        "description": ""
      }
    ],
    "graph_json": "{\"version\":1,\"nodes\":[{\"id\":\"var_V_d\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":40},\"data\":{\"kind\":\"variable\",\"name\":\"V_d\",\"label\":\"Querkraft\",\"unit\":\"N\",\"default_value\":\"10000\",\"description\":\"\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_S_y\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":170},\"data\":{\"kind\":\"variable\",\"name\":\"S_y\",\"label\":\"Statisches Moment\",\"unit\":\"mm^3\",\"default_value\":\"100000\",\"description\":\"\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_I_y\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":300},\"data\":{\"kind\":\"variable\",\"name\":\"I_y\",\"label\":\"Flächenträgheitsmoment\",\"unit\":\"mm^4\",\"default_value\":\"10000000\",\"description\":\"\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"calc_result\",\"type\":\"calc\",\"position\":{\"x\":460,\"y\":170},\"data\":{\"kind\":\"calc\",\"name\":\"eta\",\"label\":\"Schubflussnachweis\",\"unit\":\"\",\"latex\":\"q_d = \\frac{V_d cdot S_y}{I_y}\",\"expr\":\"V_d * S_y / I_y\",\"description\":\"Schubflussnachweis für zusammengesetzte Querschnitte. Aus den gelöschten Daten als Grundnachweis wiederhergestellt.\"}}],\"edges\":[{\"id\":\"e_0\",\"source\":\"var_V_d\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_1\",\"source\":\"var_S_y\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_2\",\"source\":\"var_I_y\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}}]}",
    "notes": "rekonstruiert nach Datenverlust"
  }
]
};
