module.exports = [
  {
    "id": "zug_0",
    "chapter_id": "4.2.1",
    "title": "(6) Zug parallel zur Faserrichtung",
    "formula_latex": "\\eta = \\frac{\\sigma_{t,0,d}}{f_{t,0,d}} = \\frac{N_d \\cdot 10^3 / (b \\cdot h)}{k_{mod} \\cdot f_{t,0,k} / \\gamma_M} \\leq 1.0",
    "formula_description": "Zugnachweis parallel zur Faserrichtung (Gl. 6)",
    "compute_expr": "((N_d * 1000) / (b * h)) / ((k_mod * f_t_0_k) / gamma_M)",
    "variables": [
      {
        "name": "N_d",
        "label": "Bemessungszugkraft",
        "unit": "kN",
        "type": "number",
        "default_value": "50",
        "description": "Bemessungswert der Zugnormalkraft"
      },
      {
        "name": "b",
        "label": "Breite",
        "unit": "mm",
        "type": "number",
        "default_value": "120",
        "description": "Querschnittsbreite"
      },
      {
        "name": "h",
        "label": "Höhe",
        "unit": "mm",
        "type": "number",
        "default_value": "200",
        "description": "Querschnittshöhe"
      },
      {
        "name": "f_t_0_k",
        "label": "Zugfestigkeit ‖",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "14",
        "description": "Charakt. Zugfestigkeit parallel zur Faser"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert (Tab. 3)",
        "options": [
          {
            "label": "FK1, permanent (0.60)",
            "value": "0.6",
            "sort_order": 0
          },
          {
            "label": "FK1, langfristig (0.70)",
            "value": "0.7",
            "sort_order": 1
          },
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 2
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 3
          },
          {
            "label": "FK1, sehr kurz (1.10)",
            "value": "1.1",
            "sort_order": 4
          },
          {
            "label": "FK2, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 5
          },
          {
            "label": "FK3, mittelfristig (0.65)",
            "value": "0.65",
            "sort_order": 6
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ]
  },
  {
    "id": "zug_90",
    "chapter_id": "4.2.1",
    "title": "(7) Zug rechtwinklig zur Faserrichtung",
    "formula_latex": "\\sigma_{t,90,d} \\leq f_{t,90,d}",
    "formula_description": "Querzugnachweis (Gl. 7)",
    "compute_expr": "sigma_t_90_d / ((k_mod * f_t_90_k) / gamma_M)",
    "variables": [
      {
        "name": "sigma_t_90_d",
        "label": "σt,90,d",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "0.05",
        "description": "Bemessungswert der Querzugspannung"
      },
      {
        "name": "f_t_90_k",
        "label": "ft,90,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "0.4",
        "description": "Charakt. Querzugfestigkeit"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert",
        "options": [
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 0
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 1
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ]
  },
  {
    "id": "druck_0",
    "chapter_id": "4.2.2",
    "title": "(9) Druck parallel zur Faserrichtung",
    "formula_latex": "\\eta = \\frac{\\sigma_{c,0,d}}{k_c \\cdot f_{c,0,d}} = \\frac{N_d \\cdot 10^3 / (b \\cdot h)}{k_c \\cdot k_{mod} \\cdot f_{c,0,k} / \\gamma_M} \\leq 1.0",
    "formula_description": "Drucknachweis parallel zur Faser (Gl. 9). kc=1 für gedrungene Stäbe ohne Knickgefahr.",
    "compute_expr": "((N_d * 1000) / (b * h)) / (k_c * (k_mod * f_c_0_k) / gamma_M)",
    "variables": [
      {
        "name": "N_d",
        "label": "Bemessungsdruckkraft",
        "unit": "kN",
        "type": "number",
        "default_value": "80",
        "description": "Bemessungswert der Drucknormalkraft"
      },
      {
        "name": "b",
        "label": "Breite",
        "unit": "mm",
        "type": "number",
        "default_value": "120",
        "description": "Querschnittsbreite"
      },
      {
        "name": "h",
        "label": "Höhe",
        "unit": "mm",
        "type": "number",
        "default_value": "160",
        "description": "Querschnittshöhe"
      },
      {
        "name": "f_c_0_k",
        "label": "fc,0,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "21",
        "description": "Charakt. Druckfestigkeit parallel zur Faser"
      },
      {
        "name": "k_c",
        "label": "kc Knickbeiwert",
        "unit": "-",
        "type": "number",
        "default_value": "1.0",
        "description": "Knickbeiwert (1.0 ohne Knicken)"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert",
        "options": [
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 0
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 1
          },
          {
            "label": "FK1, permanent (0.60)",
            "value": "0.6",
            "sort_order": 2
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ],
    "graph_json": "{\"version\":1,\"nodes\":[{\"id\":\"var_N_d\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":40},\"data\":{\"kind\":\"variable\",\"name\":\"N_d\",\"label\":\"Bemessungsdruckkraft\",\"unit\":\"kN\",\"default_value\":\"80\",\"description\":\"Bemessungswert der Drucknormalkraft\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_b\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":170},\"data\":{\"kind\":\"variable\",\"name\":\"b\",\"label\":\"Breite\",\"unit\":\"mm\",\"default_value\":\"120\",\"description\":\"Querschnittsbreite\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_h\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":300},\"data\":{\"kind\":\"variable\",\"name\":\"h\",\"label\":\"Höhe\",\"unit\":\"mm\",\"default_value\":\"160\",\"description\":\"Querschnittshöhe\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_f_c_0_k\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":430},\"data\":{\"kind\":\"variable\",\"name\":\"f_c_0_k\",\"label\":\"fc,0,k\",\"unit\":\"N/mm²\",\"default_value\":\"21\",\"description\":\"Charakt. Druckfestigkeit parallel zur Faser\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_k_c\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":560},\"data\":{\"kind\":\"variable\",\"name\":\"k_c\",\"label\":\"kc Knickbeiwert\",\"unit\":\"-\",\"default_value\":\"1.0\",\"description\":\"Knickbeiwert (1.0 ohne Knicken)\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_k_mod\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":690},\"data\":{\"kind\":\"variable\",\"name\":\"k_mod\",\"label\":\"kmod\",\"unit\":\"-\",\"default_value\":\"0.8\",\"description\":\"Modifikationsbeiwert\",\"inputKind\":\"dropdown\",\"options\":[{\"id\":10,\"variable_id\":\"druck_0__k_mod\",\"label\":\"FK1, mittelfristig (0.80)\",\"value\":\"0.8\",\"sort_order\":0},{\"id\":11,\"variable_id\":\"druck_0__k_mod\",\"label\":\"FK1, kurz (0.90)\",\"value\":\"0.9\",\"sort_order\":1},{\"id\":12,\"variable_id\":\"druck_0__k_mod\",\"label\":\"FK1, permanent (0.60)\",\"value\":\"0.6\",\"sort_order\":2}]}},{\"id\":\"var_gamma_M\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":820},\"data\":{\"kind\":\"variable\",\"name\":\"gamma_M\",\"label\":\"γM\",\"unit\":\"-\",\"default_value\":\"1.3\",\"description\":\"Teilsicherheitsbeiwert\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"calc_result\",\"type\":\"calc\",\"position\":{\"x\":460,\"y\":430},\"data\":{\"kind\":\"calc\",\"name\":\"eta\",\"label\":\"(9) Druck parallel zur Faserrichtung\",\"unit\":\"\",\"latex\":\"\\\\eta = \\\\frac{\\\\sigma_{c,0,d}}{k_c \\\\cdot f_{c,0,d}} = \\\\frac{N_d \\\\cdot 10^3 / (b \\\\cdot h)}{k_c \\\\cdot k_{mod} \\\\cdot f_{c,0,k} / \\\\gamma_M} \\\\leq 1.0\",\"expr\":\"((N_d * 1000) / (b * h)) / (k_c * (k_mod * f_c_0_k) / gamma_M)\",\"description\":\"Drucknachweis parallel zur Faser (Gl. 9). kc=1 für gedrungene Stäbe ohne Knickgefahr.\"}}],\"edges\":[{\"id\":\"e_0\",\"source\":\"var_N_d\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_1\",\"source\":\"var_b\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_2\",\"source\":\"var_h\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_3\",\"source\":\"var_f_c_0_k\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_4\",\"source\":\"var_k_c\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_5\",\"source\":\"var_k_mod\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_6\",\"source\":\"var_gamma_M\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}}]}"
  },
  {
    "id": "druck_90",
    "chapter_id": "4.2.2",
    "title": "(11) Druck rechtwinklig zur Faserrichtung",
    "formula_latex": "\\eta = \\frac{\\sigma_{c,90,d}}{f_{c,90,d}} = \\frac{F_d \\cdot 10^3 / A_{ef}}{k_{mod} \\cdot f_{c,90,k} / \\gamma_M} \\leq 1.0",
    "formula_description": "Querdrucknachweis, z.B. Auflagerpressung (Gl. 11)",
    "compute_expr": "((F_d * 1000) / A_ef) / ((k_mod * f_c_90_k) / gamma_M)",
    "variables": [
      {
        "name": "F_d",
        "label": "Auflagerkraft",
        "unit": "kN",
        "type": "number",
        "default_value": "30",
        "description": "Bemessungswert der Querdruckkraft"
      },
      {
        "name": "A_ef",
        "label": "Aef",
        "unit": "mm²",
        "type": "number",
        "default_value": "14400",
        "description": "Effektive Auflagerfläche (b × Lef)"
      },
      {
        "name": "f_c_90_k",
        "label": "fc,90,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "3.5",
        "description": "Charakt. Druckfestigkeit ⊥ zur Faser"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert",
        "options": [
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 0
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 1
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ]
  },
  {
    "id": "biegung_einachsig",
    "chapter_id": "4.2.3",
    "title": "(14) Biegung einachsig",
    "formula_latex": "\\eta = \\frac{\\sigma_{m,d}}{f_{m,d}} = \\frac{M_d \\cdot 10^6 / W_y}{k_{mod} \\cdot f_{m,k} / \\gamma_M} \\leq 1.0",
    "formula_description": "Biegenachweis bei einachsiger Biegung (Gl. 14, σ_m,z = 0)",
    "compute_expr": "((M_d * 1e6) / ((b * h * h) / 6)) / ((k_mod * f_m_k) / gamma_M)",
    "variables": [
      {
        "name": "M_d",
        "label": "Bemessungsmoment",
        "unit": "kNm",
        "type": "number",
        "default_value": "10",
        "description": "Bemessungswert des Biegemoments"
      },
      {
        "name": "b",
        "label": "Breite",
        "unit": "mm",
        "type": "number",
        "default_value": "120",
        "description": "Querschnittsbreite"
      },
      {
        "name": "h",
        "label": "Höhe",
        "unit": "mm",
        "type": "number",
        "default_value": "240",
        "description": "Querschnittshöhe"
      },
      {
        "name": "f_m_k",
        "label": "fm,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "24",
        "description": "Charakt. Biegefestigkeit"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert",
        "options": [
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 0
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 1
          },
          {
            "label": "FK1, permanent (0.60)",
            "value": "0.6",
            "sort_order": 2
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ],
    "graph_json": "{\"version\":1,\"nodes\":[{\"id\":\"var_M_d\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":40},\"data\":{\"kind\":\"variable\",\"name\":\"M_d\",\"label\":\"Bemessungsmoment\",\"unit\":\"kNm\",\"default_value\":\"10\",\"description\":\"Bemessungswert des Biegemoments\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_b\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":170},\"data\":{\"kind\":\"variable\",\"name\":\"b\",\"label\":\"Breite\",\"unit\":\"mm\",\"default_value\":\"120\",\"description\":\"Querschnittsbreite\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_h\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":300},\"data\":{\"kind\":\"variable\",\"name\":\"h\",\"label\":\"Höhe\",\"unit\":\"mm\",\"default_value\":\"240\",\"description\":\"Querschnittshöhe\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_f_m_k\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":430},\"data\":{\"kind\":\"variable\",\"name\":\"f_m_k\",\"label\":\"fm,k\",\"unit\":\"N/mm²\",\"default_value\":\"24\",\"description\":\"Charakt. Biegefestigkeit\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_k_mod\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":560},\"data\":{\"kind\":\"variable\",\"name\":\"k_mod\",\"label\":\"kmod\",\"unit\":\"-\",\"default_value\":\"0.8\",\"description\":\"Modifikationsbeiwert\",\"inputKind\":\"dropdown\",\"options\":[{\"id\":15,\"variable_id\":\"biegung_einachsig__k_mod\",\"label\":\"FK1, mittelfristig (0.80)\",\"value\":\"0.8\",\"sort_order\":0},{\"id\":16,\"variable_id\":\"biegung_einachsig__k_mod\",\"label\":\"FK1, kurz (0.90)\",\"value\":\"0.9\",\"sort_order\":1},{\"id\":17,\"variable_id\":\"biegung_einachsig__k_mod\",\"label\":\"FK1, permanent (0.60)\",\"value\":\"0.6\",\"sort_order\":2}]}},{\"id\":\"var_gamma_M\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":690},\"data\":{\"kind\":\"variable\",\"name\":\"gamma_M\",\"label\":\"γM\",\"unit\":\"-\",\"default_value\":\"1.3\",\"description\":\"Teilsicherheitsbeiwert\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"calc_result\",\"type\":\"calc\",\"position\":{\"x\":460,\"y\":365},\"data\":{\"kind\":\"calc\",\"name\":\"eta\",\"label\":\"(14) Biegung einachsig\",\"unit\":\"\",\"latex\":\"\\\\eta = \\\\frac{\\\\sigma_{m,d}}{f_{m,d}} = \\\\frac{M_d \\\\cdot 10^6 / W_y}{k_{mod} \\\\cdot f_{m,k} / \\\\gamma_M} \\\\leq 1.0\",\"expr\":\"((M_d * 1e6) / ((b * h * h) / 6)) / ((k_mod * f_m_k) / gamma_M)\",\"description\":\"Biegenachweis bei einachsiger Biegung (Gl. 14, σ_m,z = 0)\"}}],\"edges\":[{\"id\":\"e_0\",\"source\":\"var_M_d\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_1\",\"source\":\"var_b\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_2\",\"source\":\"var_h\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_3\",\"source\":\"var_f_m_k\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_4\",\"source\":\"var_k_mod\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_5\",\"source\":\"var_gamma_M\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}}]}"
  },
  {
    "id": "biegung_zweiachsig",
    "chapter_id": "4.2.3",
    "title": "(14) Biegung zweiachsig",
    "formula_latex": "\\eta = \\frac{\\sigma_{m,y,d}}{f_{m,y,d}} + \\frac{\\sigma_{m,z,d}}{f_{m,z,d}} \\leq 1.0",
    "formula_description": "Biegenachweis bei zweiachsiger Biegung (Gl. 14)",
    "compute_expr": "((M_y_d * 1e6) / ((b * h * h) / 6)) / ((k_mod * f_m_k) / gamma_M) + ((M_z_d * 1e6) / ((h * b * b) / 6)) / ((k_mod * f_m_k) / gamma_M)",
    "variables": [
      {
        "name": "M_y_d",
        "label": "My,d (um starke Achse)",
        "unit": "kNm",
        "type": "number",
        "default_value": "8",
        "description": "Biegemoment um die y-Achse"
      },
      {
        "name": "M_z_d",
        "label": "Mz,d (um schwache Achse)",
        "unit": "kNm",
        "type": "number",
        "default_value": "2",
        "description": "Biegemoment um die z-Achse"
      },
      {
        "name": "b",
        "label": "Breite",
        "unit": "mm",
        "type": "number",
        "default_value": "120",
        "description": "Querschnittsbreite"
      },
      {
        "name": "h",
        "label": "Höhe",
        "unit": "mm",
        "type": "number",
        "default_value": "240",
        "description": "Querschnittshöhe"
      },
      {
        "name": "f_m_k",
        "label": "fm,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "24",
        "description": "Charakt. Biegefestigkeit"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert",
        "options": [
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 0
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 1
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ]
  },
  {
    "id": "biegung_zug",
    "chapter_id": "4.2.4",
    "title": "(21) Biegung + Zug",
    "formula_latex": "\\eta = \\frac{\\sigma_{t,0,d}}{f_{t,0,d}} + \\frac{\\sigma_{m,y,d}}{f_{m,y,d}} + \\frac{\\sigma_{m,z,d}}{f_{m,z,d}} \\leq 1.0",
    "formula_description": "Kombinierter Nachweis Biegung mit Zug (Gl. 21)",
    "compute_expr": "((N_d * 1000) / (b * h)) / ((k_mod * f_t_0_k) / gamma_M) + ((M_y_d * 1e6) / ((b * h * h) / 6)) / ((k_mod * f_m_k) / gamma_M) + ((M_z_d * 1e6) / ((h * b * b) / 6)) / ((k_mod * f_m_k) / gamma_M)",
    "variables": [
      {
        "name": "N_d",
        "label": "Bemessungszugkraft",
        "unit": "kN",
        "type": "number",
        "default_value": "20",
        "description": "Bemessungswert der Zugkraft"
      },
      {
        "name": "M_y_d",
        "label": "My,d",
        "unit": "kNm",
        "type": "number",
        "default_value": "5",
        "description": "Biegemoment um y-Achse"
      },
      {
        "name": "M_z_d",
        "label": "Mz,d",
        "unit": "kNm",
        "type": "number",
        "default_value": "0",
        "description": "Biegemoment um z-Achse"
      },
      {
        "name": "b",
        "label": "Breite",
        "unit": "mm",
        "type": "number",
        "default_value": "120",
        "description": "Querschnittsbreite"
      },
      {
        "name": "h",
        "label": "Höhe",
        "unit": "mm",
        "type": "number",
        "default_value": "240",
        "description": "Querschnittshöhe"
      },
      {
        "name": "f_t_0_k",
        "label": "ft,0,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "14",
        "description": "Charakt. Zugfestigkeit ‖"
      },
      {
        "name": "f_m_k",
        "label": "fm,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "24",
        "description": "Charakt. Biegefestigkeit"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert",
        "options": [
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 0
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 1
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ]
  },
  {
    "id": "biegung_druck",
    "chapter_id": "4.2.4",
    "title": "(22) Biegung + Druck",
    "formula_latex": "\\eta = \\left(\\frac{\\sigma_{c,0,d}}{f_{c,0,d}}\\right)^2 + \\frac{\\sigma_{m,y,d}}{f_{m,y,d}} + \\frac{\\sigma_{m,z,d}}{f_{m,z,d}} \\leq 1.0",
    "formula_description": "Kombinierter Nachweis Biegung mit Druck (Gl. 22)",
    "compute_expr": "Math.pow(((N_d * 1000) / (b * h)) / ((k_mod * f_c_0_k) / gamma_M), 2) + ((M_y_d * 1e6) / ((b * h * h) / 6)) / ((k_mod * f_m_k) / gamma_M) + ((M_z_d * 1e6) / ((h * b * b) / 6)) / ((k_mod * f_m_k) / gamma_M)",
    "variables": [
      {
        "name": "N_d",
        "label": "Bemessungsdruckkraft",
        "unit": "kN",
        "type": "number",
        "default_value": "50",
        "description": "Bemessungswert der Druckkraft"
      },
      {
        "name": "M_y_d",
        "label": "My,d",
        "unit": "kNm",
        "type": "number",
        "default_value": "5",
        "description": "Biegemoment um y-Achse"
      },
      {
        "name": "M_z_d",
        "label": "Mz,d",
        "unit": "kNm",
        "type": "number",
        "default_value": "0",
        "description": "Biegemoment um z-Achse"
      },
      {
        "name": "b",
        "label": "Breite",
        "unit": "mm",
        "type": "number",
        "default_value": "120",
        "description": "Querschnittsbreite"
      },
      {
        "name": "h",
        "label": "Höhe",
        "unit": "mm",
        "type": "number",
        "default_value": "240",
        "description": "Querschnittshöhe"
      },
      {
        "name": "f_c_0_k",
        "label": "fc,0,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "21",
        "description": "Charakt. Druckfestigkeit ‖"
      },
      {
        "name": "f_m_k",
        "label": "fm,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "24",
        "description": "Charakt. Biegefestigkeit"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert",
        "options": [
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 0
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 1
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ]
  },
  {
    "id": "schub",
    "chapter_id": "4.2.5",
    "title": "(23) Schub parallel zur Faserrichtung",
    "formula_latex": "\\eta = \\frac{\\tau_d}{f_{v,d}} = \\frac{3 \\cdot V_d \\cdot 10^3 / (2 \\cdot b \\cdot h)}{k_{mod} \\cdot f_{v,k} / \\gamma_M} \\leq 1.0",
    "formula_description": "Schubnachweis bei Rechteckquerschnitt (Gl. 23)",
    "compute_expr": "((1.5 * V_d * 1000) / (b * h)) / ((k_mod * f_v_k) / gamma_M)",
    "variables": [
      {
        "name": "V_d",
        "label": "Bemessungsquerkraft",
        "unit": "kN",
        "type": "number",
        "default_value": "15",
        "description": "Bemessungswert der Querkraft"
      },
      {
        "name": "b",
        "label": "Breite",
        "unit": "mm",
        "type": "number",
        "default_value": "120",
        "description": "Querschnittsbreite"
      },
      {
        "name": "h",
        "label": "Höhe",
        "unit": "mm",
        "type": "number",
        "default_value": "240",
        "description": "Querschnittshöhe"
      },
      {
        "name": "f_v_k",
        "label": "fv,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "2.5",
        "description": "Charakt. Scherfestigkeit"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert",
        "options": [
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 0
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 1
          },
          {
            "label": "FK1, permanent (0.60)",
            "value": "0.6",
            "sort_order": 2
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ]
  },
  {
    "id": "knicken_vh",
    "chapter_id": "4.2.8",
    "title": "(29) Knicken — Vollholz/Balkenschichtholz",
    "formula_latex": "\\eta = \\frac{\\sigma_{c,0,d}}{k_c \\cdot f_{c,0,d}}, \\quad \\lambda_{rel} = \\frac{\\lambda}{57}, \\quad k_c = \\frac{1}{k + \\sqrt{k^2 - \\lambda_{rel}^2}}",
    "formula_description": "Knicknachweis Vollholz (Gl. 29-35, βc=0.2). Berechnet λrel, k, kc automatisch.",
    "compute_expr": "(function() { var lambda_rel = lambda / 57; if (lambda_rel <= 0.3) return ((N_d * 1000) / (b * h)) / ((k_mod * f_c_0_k) / gamma_M); var k = 0.5 * (1 + 0.2 * (lambda_rel - 0.3) + lambda_rel * lambda_rel); var k_c = 1 / (k + Math.sqrt(k * k - lambda_rel * lambda_rel)); return ((N_d * 1000) / (b * h)) / (k_c * (k_mod * f_c_0_k) / gamma_M); })()",
    "variables": [
      {
        "name": "N_d",
        "label": "Druckkraft",
        "unit": "kN",
        "type": "number",
        "default_value": "80",
        "description": "Bemessungswert der Druckkraft"
      },
      {
        "name": "b",
        "label": "Breite",
        "unit": "mm",
        "type": "number",
        "default_value": "120",
        "description": "Querschnittsbreite"
      },
      {
        "name": "h",
        "label": "Höhe",
        "unit": "mm",
        "type": "number",
        "default_value": "160",
        "description": "Querschnittshöhe"
      },
      {
        "name": "lambda",
        "label": "λ Schlankheit",
        "unit": "-",
        "type": "number",
        "default_value": "80",
        "description": "Geometrische Schlankheit = lk/i"
      },
      {
        "name": "f_c_0_k",
        "label": "fc,0,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "21",
        "description": "Charakt. Druckfestigkeit ‖"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert",
        "options": [
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 0
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 1
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ],
    "graph_json": "{\"version\":1,\"nodes\":[{\"id\":\"var_N_d\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":40},\"data\":{\"kind\":\"variable\",\"name\":\"N_d\",\"label\":\"Druckkraft\",\"unit\":\"kN\",\"default_value\":\"80\",\"description\":\"Bemessungswert der Druckkraft\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_b\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":170},\"data\":{\"kind\":\"variable\",\"name\":\"b\",\"label\":\"Breite\",\"unit\":\"mm\",\"default_value\":\"120\",\"description\":\"Querschnittsbreite\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_h\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":300},\"data\":{\"kind\":\"variable\",\"name\":\"h\",\"label\":\"Höhe\",\"unit\":\"mm\",\"default_value\":\"160\",\"description\":\"Querschnittshöhe\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_lambda\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":430},\"data\":{\"kind\":\"variable\",\"name\":\"lambda\",\"label\":\"λ Schlankheit\",\"unit\":\"-\",\"default_value\":\"80\",\"description\":\"Geometrische Schlankheit = lk/i\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_f_c_0_k\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":560},\"data\":{\"kind\":\"variable\",\"name\":\"f_c_0_k\",\"label\":\"fc,0,k\",\"unit\":\"N/mm²\",\"default_value\":\"21\",\"description\":\"Charakt. Druckfestigkeit ‖\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_k_mod\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":690},\"data\":{\"kind\":\"variable\",\"name\":\"k_mod\",\"label\":\"kmod\",\"unit\":\"-\",\"default_value\":\"0.8\",\"description\":\"Modifikationsbeiwert\",\"inputKind\":\"dropdown\",\"options\":[{\"id\":27,\"variable_id\":\"knicken_vh__k_mod\",\"label\":\"FK1, mittelfristig (0.80)\",\"value\":\"0.8\",\"sort_order\":0},{\"id\":28,\"variable_id\":\"knicken_vh__k_mod\",\"label\":\"FK1, kurz (0.90)\",\"value\":\"0.9\",\"sort_order\":1}]}},{\"id\":\"var_gamma_M\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":820},\"data\":{\"kind\":\"variable\",\"name\":\"gamma_M\",\"label\":\"γM\",\"unit\":\"-\",\"default_value\":\"1.3\",\"description\":\"Teilsicherheitsbeiwert\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"calc_result\",\"type\":\"calc\",\"position\":{\"x\":460,\"y\":430},\"data\":{\"kind\":\"calc\",\"name\":\"eta\",\"label\":\"(29) Knicken — Vollholz/Balkenschichtholz\",\"unit\":\"\",\"latex\":\"\\\\eta = \\\\frac{\\\\sigma_{c,0,d}}{k_c \\\\cdot f_{c,0,d}}, \\\\quad \\\\lambda_{rel} = \\\\frac{\\\\lambda}{57}, \\\\quad k_c = \\\\frac{1}{k + \\\\sqrt{k^2 - \\\\lambda_{rel}^2}}\",\"expr\":\"(function() { var lambda_rel = lambda / 57; if (lambda_rel <= 0.3) return ((N_d * 1000) / (b * h)) / ((k_mod * f_c_0_k) / gamma_M); var k = 0.5 * (1 + 0.2 * (lambda_rel - 0.3) + lambda_rel * lambda_rel); var k_c = 1 / (k + Math.sqrt(k * k - lambda_rel * lambda_rel)); return ((N_d * 1000) / (b * h)) / (k_c * (k_mod * f_c_0_k) / gamma_M); })()\",\"description\":\"Knicknachweis Vollholz (Gl. 29-35, βc=0.2). Berechnet λrel, k, kc automatisch.\"}}],\"edges\":[{\"id\":\"e_0\",\"source\":\"var_N_d\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_1\",\"source\":\"var_b\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_2\",\"source\":\"var_h\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_3\",\"source\":\"var_lambda\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_4\",\"source\":\"var_f_c_0_k\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_5\",\"source\":\"var_k_mod\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_6\",\"source\":\"var_gamma_M\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}}]}"
  },
  {
    "id": "knicken_bsh",
    "chapter_id": "4.2.8",
    "title": "(29) Knicken — Brettschichtholz",
    "formula_latex": "\\eta = \\frac{\\sigma_{c,0,d}}{k_c \\cdot f_{c,0,d}}, \\quad \\lambda_{rel} = \\frac{\\lambda}{60}, \\quad \\beta_c = 0.1",
    "formula_description": "Knicknachweis Brettschichtholz (Gl. 29-36, βc=0.1)",
    "compute_expr": "(function() { var lambda_rel = lambda / 60; if (lambda_rel <= 0.3) return ((N_d * 1000) / (b * h)) / ((k_mod * f_c_0_k) / gamma_M); var k = 0.5 * (1 + 0.1 * (lambda_rel - 0.3) + lambda_rel * lambda_rel); var k_c = 1 / (k + Math.sqrt(k * k - lambda_rel * lambda_rel)); return ((N_d * 1000) / (b * h)) / (k_c * (k_mod * f_c_0_k) / gamma_M); })()",
    "variables": [
      {
        "name": "N_d",
        "label": "Druckkraft",
        "unit": "kN",
        "type": "number",
        "default_value": "100",
        "description": "Bemessungswert der Druckkraft"
      },
      {
        "name": "b",
        "label": "Breite",
        "unit": "mm",
        "type": "number",
        "default_value": "140",
        "description": "Querschnittsbreite"
      },
      {
        "name": "h",
        "label": "Höhe",
        "unit": "mm",
        "type": "number",
        "default_value": "200",
        "description": "Querschnittshöhe"
      },
      {
        "name": "lambda",
        "label": "λ Schlankheit",
        "unit": "-",
        "type": "number",
        "default_value": "80",
        "description": "Geometrische Schlankheit = lk/i"
      },
      {
        "name": "f_c_0_k",
        "label": "fc,0,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "24",
        "description": "Charakt. Druckfestigkeit ‖"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert",
        "options": [
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 0
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 1
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ]
  },
  {
    "id": "kippen_vh",
    "chapter_id": "4.2.9",
    "title": "(38) Kippen — Vollholz",
    "formula_latex": "\\eta = \\frac{\\sigma_{m,d}}{k_m \\cdot f_{m,d}}, \\quad \\lambda_{rel,m} = 0.07 \\cdot \\sqrt{\\frac{a \\cdot h}{b}}",
    "formula_description": "Kippnachweis Vollholz (Gl. 38, 43)",
    "compute_expr": "(function() { var lambda_rel_m = 0.07 * Math.sqrt((a * h) / b); var k_m; if (lambda_rel_m <= 0.75) k_m = 1; else if (lambda_rel_m <= 1.4) k_m = 1.56 - 0.75 * lambda_rel_m; else k_m = 1 / (lambda_rel_m * lambda_rel_m); var sigma_m_d = (M_d * 1e6) / ((b * h * h) / 6); var f_m_d = (k_mod * f_m_k) / gamma_M; return sigma_m_d / (k_m * f_m_d); })()",
    "variables": [
      {
        "name": "M_d",
        "label": "Biegemoment",
        "unit": "kNm",
        "type": "number",
        "default_value": "10",
        "description": "Bemessungswert des Biegemoments"
      },
      {
        "name": "a",
        "label": "Kipplänge a",
        "unit": "mm",
        "type": "number",
        "default_value": "3000",
        "description": "Abstand der seitlichen Abstützungen"
      },
      {
        "name": "b",
        "label": "Breite",
        "unit": "mm",
        "type": "number",
        "default_value": "120",
        "description": "Querschnittsbreite"
      },
      {
        "name": "h",
        "label": "Höhe",
        "unit": "mm",
        "type": "number",
        "default_value": "240",
        "description": "Querschnittshöhe"
      },
      {
        "name": "f_m_k",
        "label": "fm,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "24",
        "description": "Charakt. Biegefestigkeit"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert",
        "options": [
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 0
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 1
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ],
    "graph_json": "{\"version\":1,\"nodes\":[{\"id\":\"woodclass_mq45qxn8_2\",\"type\":\"woodclass\",\"position\":{\"x\":-92.78,\"y\":-156.39},\"data\":{\"kind\":\"woodclass\",\"label\":\"Aktuelle Holzklasse\"}},{\"id\":\"tablevalue_mq42so4g_1\",\"type\":\"tablevalue\",\"position\":{\"x\":211.02,\"y\":-157.41},\"data\":{\"kind\":\"tablevalue\",\"name\":\"E_0_05\",\"label\":\"\",\"unit\":\"N/mm^2\",\"table_col\":0}},{\"id\":\"variable_mq47agrg_1\",\"type\":\"variable\",\"position\":{\"x\":-89.72,\"y\":-18.14},\"data\":{\"kind\":\"variable\",\"name\":\"b\",\"label\":\"Breite\",\"unit\":\"mm\",\"default_value\":\"180\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"variable_mq47nke8_1\",\"type\":\"variable\",\"position\":{\"x\":-90.74,\"y\":179.35},\"data\":{\"kind\":\"variable\",\"name\":\"h\",\"label\":\"Höhe\",\"unit\":\"mm\",\"default_value\":\"1440\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"variable_mq486235_4\",\"type\":\"variable\",\"position\":{\"x\":-86.67,\"y\":369.71},\"data\":{\"kind\":\"variable\",\"name\":\"a\",\"label\":\"Kipplänge\",\"unit\":\"mm\",\"default_value\":\"5000\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"calc_mq47vv10_1\",\"type\":\"calc\",\"position\":{\"x\":802.07,\"y\":-230},\"data\":{\"kind\":\"calc\",\"name\":\"\\\\sigma_{m,\\\\text{crit}}\",\"label\":\"\",\"unit\":\"N/mm^2\",\"latex\":\"\\\\sigma_{m,\\\\text{crit}} = 0{,}75 \\\\cdot E_{0{,}05} \\\\cdot \\\\frac{b^2}{a \\\\cdot h}\",\"expr\":\"0.75 * E_0_05 * ((Math.pow(b,2))/(a * h))\"}},{\"id\":\"woodclass_mq48p87y_1\",\"type\":\"woodclass\",\"position\":{\"x\":210,\"y\":305},\"data\":{\"kind\":\"woodclass\",\"label\":\"Aktuelle Holzklasse\"}},{\"id\":\"tablevalue_mq48pnz6_2\",\"type\":\"tablevalue\",\"position\":{\"x\":420,\"y\":305},\"data\":{\"kind\":\"tablevalue\",\"name\":\"f_m_k\",\"label\":\"\",\"unit\":\"N/mm^2\",\"table_col\":1}},{\"id\":\"calc_mq48sdd3_4\",\"type\":\"calc\",\"position\":{\"x\":886.77,\"y\":210},\"data\":{\"kind\":\"calc\",\"name\":\"\\\\lambda_{\\\\text{rel},m}\",\"label\":\"\",\"unit\":\"[]\",\"latex\":\"\\\\lambda_{\\\\text{rel},m} = \\\\sqrt{\\\\frac{f_{m,k}}{\\\\sigma_{m,\\\\text{crit}}}}\",\"expr\":\"Math.sqrt(f_m_k / sigma_m_crit)\"}},{\"id\":\"calc_km_low\",\"type\":\"calc\",\"position\":{\"x\":1210,\"y\":80},\"data\":{\"kind\":\"calc\",\"name\":\"k_m\",\"label\":\"Kippbeiwert\",\"unit\":\"-\",\"latex\":\"k_m = 1\",\"expr\":\"lambda_rel_m <= 0.75 ? 1 : (lambda_rel_m <= 1.4 ? 1.56 - 0.75 * lambda_rel_m : 1 / Math.pow(lambda_rel_m, 2))\"}},{\"id\":\"calc_result\",\"type\":\"calc\",\"position\":{\"x\":1510,\"y\":210},\"data\":{\"kind\":\"calc\",\"name\":\"\\\\eta\",\"label\":\"Kippen - Vollholz\",\"unit\":\"\",\"latex\":\"\\\\eta = \\\\frac{\\\\sigma_{m,d}}{k_m \\\\cdot f_{m,d}}\",\"expr\":\"((M_d * 1e6) / ((b * h * h) / 6)) / (k_m * ((k_mod * f_m_k) / gamma_M))\"}},{\"id\":\"var_M_d\",\"type\":\"variable\",\"position\":{\"x\":1150,\"y\":420},\"data\":{\"kind\":\"variable\",\"name\":\"M_d\",\"label\":\"Biegemoment\",\"unit\":\"kNm\",\"default_value\":\"10\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_k_mod\",\"type\":\"variable\",\"position\":{\"x\":1150,\"y\":570},\"data\":{\"kind\":\"variable\",\"name\":\"k_mod\",\"label\":\"Modifikationsbeiwert\",\"unit\":\"-\",\"default_value\":\"0.8\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_gamma_M\",\"type\":\"variable\",\"position\":{\"x\":1150,\"y\":720},\"data\":{\"kind\":\"variable\",\"name\":\"gamma_M\",\"label\":\"Teilsicherheitsbeiwert\",\"unit\":\"-\",\"default_value\":\"1.3\",\"inputKind\":\"number\",\"options\":[]}}],\"edges\":[{\"id\":\"e_wc_e\",\"source\":\"woodclass_mq45qxn8_2\",\"target\":\"tablevalue_mq42so4g_1\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_e_sig\",\"source\":\"tablevalue_mq42so4g_1\",\"target\":\"calc_mq47vv10_1\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_b_sig\",\"source\":\"variable_mq47agrg_1\",\"target\":\"calc_mq47vv10_1\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_h_sig\",\"source\":\"variable_mq47nke8_1\",\"target\":\"calc_mq47vv10_1\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_a_sig\",\"source\":\"variable_mq486235_4\",\"target\":\"calc_mq47vv10_1\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_wc_f\",\"source\":\"woodclass_mq48p87y_1\",\"target\":\"tablevalue_mq48pnz6_2\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_sig_lam\",\"source\":\"calc_mq47vv10_1\",\"target\":\"calc_mq48sdd3_4\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_f_lam\",\"source\":\"tablevalue_mq48pnz6_2\",\"target\":\"calc_mq48sdd3_4\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_lam_km\",\"source\":\"calc_mq48sdd3_4\",\"target\":\"calc_km_low\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_km_res\",\"source\":\"calc_km_low\",\"target\":\"calc_result\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_md_res\",\"source\":\"var_M_d\",\"target\":\"calc_result\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_f_res\",\"source\":\"tablevalue_mq48pnz6_2\",\"target\":\"calc_result\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_kmod_res\",\"source\":\"var_k_mod\",\"target\":\"calc_result\",\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_gm_res\",\"source\":\"var_gamma_M\",\"target\":\"calc_result\",\"data\":{\"kind\":\"workflow\"}}]}"
  },
  {
    "id": "kippen_bsh",
    "chapter_id": "4.2.9",
    "title": "(38) Kippen — Brettschichtholz",
    "formula_latex": "\\eta = \\frac{\\sigma_{m,d}}{k_m \\cdot f_{m,d}}, \\quad \\lambda_{rel,m} = 0.06 \\cdot \\sqrt{\\frac{a \\cdot h}{b}}",
    "formula_description": "",
    "compute_expr": "",
    "variables": [
      {
        "name": "M_d",
        "label": "Biegemoment",
        "unit": "kNm",
        "type": "number",
        "default_value": "30",
        "description": "Bemessungswert des Biegemoments"
      },
      {
        "name": "a",
        "label": "Kipplänge a",
        "unit": "mm",
        "type": "number",
        "default_value": "5000",
        "description": "Abstand der seitlichen Abstützungen"
      },
      {
        "name": "b",
        "label": "Breite",
        "unit": "mm",
        "type": "number",
        "default_value": "140",
        "description": "Querschnittsbreite"
      },
      {
        "name": "h",
        "label": "Höhe",
        "unit": "mm",
        "type": "number",
        "default_value": "400",
        "description": "Querschnittshöhe"
      },
      {
        "name": "f_m_k",
        "label": "fm,k",
        "unit": "N/mm²",
        "type": "number",
        "default_value": "24",
        "description": "Charakt. Biegefestigkeit BSH"
      },
      {
        "name": "k_mod",
        "label": "kmod",
        "unit": "-",
        "type": "dropdown",
        "default_value": "0.8",
        "description": "Modifikationsbeiwert",
        "options": [
          {
            "label": "FK1, mittelfristig (0.80)",
            "value": "0.8",
            "sort_order": 0
          },
          {
            "label": "FK1, kurz (0.90)",
            "value": "0.9",
            "sort_order": 1
          }
        ]
      },
      {
        "name": "gamma_M",
        "label": "γM",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": "Teilsicherheitsbeiwert"
      }
    ],
    "graph_json": "{\"version\":1,\"nodes\":[{\"id\":\"var_M_d\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":40},\"data\":{\"kind\":\"variable\",\"name\":\"M_d\",\"label\":\"Biegemoment\",\"unit\":\"kNm\",\"default_value\":\"30\",\"description\":\"Bemessungswert des Biegemoments\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_a\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":170},\"data\":{\"kind\":\"variable\",\"name\":\"a\",\"label\":\"Kipplänge a\",\"unit\":\"mm\",\"default_value\":\"5000\",\"description\":\"Abstand der seitlichen Abstützungen\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_b\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":300},\"data\":{\"kind\":\"variable\",\"name\":\"b\",\"label\":\"Breite\",\"unit\":\"mm\",\"default_value\":\"140\",\"description\":\"Querschnittsbreite\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_h\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":430},\"data\":{\"kind\":\"variable\",\"name\":\"h\",\"label\":\"Höhe\",\"unit\":\"mm\",\"default_value\":\"400\",\"description\":\"Querschnittshöhe\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_f_m_k\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":560},\"data\":{\"kind\":\"variable\",\"name\":\"f_m_k\",\"label\":\"fm,k\",\"unit\":\"N/mm²\",\"default_value\":\"24\",\"description\":\"Charakt. Biegefestigkeit BSH\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_k_mod\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":690},\"data\":{\"kind\":\"variable\",\"name\":\"k_mod\",\"label\":\"kmod\",\"unit\":\"-\",\"default_value\":\"0.8\",\"description\":\"Modifikationsbeiwert\",\"inputKind\":\"dropdown\",\"options\":[{\"id\":115,\"variable_id\":\"kippen_bsh__k_mod\",\"label\":\"FK1, mittelfristig (0.80)\",\"value\":\"0.8\",\"sort_order\":0},{\"id\":116,\"variable_id\":\"kippen_bsh__k_mod\",\"label\":\"FK1, kurz (0.90)\",\"value\":\"0.9\",\"sort_order\":1}]}},{\"id\":\"var_gamma_M\",\"type\":\"variable\",\"position\":{\"x\":40,\"y\":820},\"data\":{\"kind\":\"variable\",\"name\":\"gamma_M\",\"label\":\"γM\",\"unit\":\"-\",\"default_value\":\"1.3\",\"description\":\"Teilsicherheitsbeiwert\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"calc_result\",\"type\":\"calc\",\"position\":{\"x\":460,\"y\":430},\"data\":{\"kind\":\"calc\",\"name\":\"eta\",\"label\":\"(38) Kippen — Brettschichtholz\",\"unit\":\"\",\"latex\":\"\\\\eta = \\\\frac{\\\\sigma_{m,d}}{k_m \\\\cdot f_{m,d}}, \\\\quad \\\\lambda_{rel,m} = 0.06 \\\\cdot \\\\sqrt{\\\\frac{a \\\\cdot h}{b}}\",\"expr\":\"(function() { var lambda_rel_m = 0.06 * Math.sqrt((a * h) / b); var k_m; if (lambda_rel_m <= 0.75) k_m = 1; else if (lambda_rel_m <= 1.4) k_m = 1.56 - 0.75 * lambda_rel_m; else k_m = 1 / (lambda_rel_m * lambda_rel_m); var sigma_m_d = (M_d * 1e6) / ((b * h * h) / 6); var f_m_d = (k_mod * f_m_k) / gamma_M; return sigma_m_d / (k_m * f_m_d); })()\",\"description\":\"Kippnachweis Brettschichtholz (Gl. 38, 44)\"}}],\"edges\":[{\"id\":\"e_0\",\"source\":\"var_M_d\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_1\",\"source\":\"var_a\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_2\",\"source\":\"var_b\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_3\",\"source\":\"var_h\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_4\",\"source\":\"var_f_m_k\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_5\",\"source\":\"var_k_mod\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_6\",\"source\":\"var_gamma_M\",\"target\":\"calc_result\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}}]}"
  },
  {
    "id": "fire_brandabschnitt_loopblock",
    "chapter_id": "fire_2_berechnungsverfahren",
    "title": "Brandabschnittsbildende Bauteile - Schleifenblock Test",
    "formula_latex": "t_{ins} = \\sum_{i=1}^{n-1} t_{prot,i} + t_{ins,n} \\geq t_{erf}",
    "formula_description": "Mehrschichtiger Nachweis nach Kapitel 2.2/2.3: Grundzeiten, Positionsbeiwerte, Zeitdifferenz und Fugenbeiwerte.",
    "compute_expr": "",
    "variables": [],
    "graph_json": "{\"version\":1,\"nodes\":[{\"id\":\"title_fire_loop\",\"type\":\"title\",\"position\":{\"x\":0,\"y\":0},\"data\":{\"kind\":\"title\",\"label\":\"Brandabschnittsbildende Bauteile\",\"color\":\"#c2410c\"},\"style\":{\"width\":360,\"height\":54}},{\"id\":\"t_erf\",\"type\":\"variable\",\"position\":{\"x\":0,\"y\":90},\"data\":{\"kind\":\"variable\",\"name\":\"t_{erf}\",\"label\":\"Erforderliche Feuerwiderstandsdauer\",\"unit\":\"min\",\"default_value\":\"30\",\"inputKind\":\"number\",\"options\":[]},\"style\":{\"width\":250,\"height\":92}},{\"id\":\"fire_layers\",\"type\":\"loopblock\",\"position\":{\"x\":320,\"y\":90},\"data\":{\"kind\":\"loopblock\",\"label\":\"Berechnung brandabschnittsbildendes Bauteil\",\"count_label\":\"Anzahl Schichten n\",\"max_count\":12,\"dropdown_label\":\"Material Schicht i bzw. n\",\"vars\":[{\"id\":\"v_d\",\"name\":\"d\",\"label\":\"Schichtdicke d_i\",\"unit\":\"mm\",\"default_value\":\"15\"},{\"id\":\"v_rho\",\"name\":\"rho\",\"label\":\"Rohdichte rho_i\",\"unit\":\"kg/m^3\",\"default_value\":\"26\"},{\"id\":\"v_beta0\",\"name\":\"beta_0\",\"label\":\"Abbrandrate beta_0\",\"unit\":\"mm/min\",\"default_value\":\"0.65\"},{\"id\":\"v_kpos_unexp\",\"name\":\"k_pos_unexp\",\"label\":\"k_pos,unexp (Tab. 233-1)\",\"unit\":\"-\",\"default_value\":\"1\"},{\"id\":\"v_delta_t\",\"name\":\"delta_t\",\"label\":\"Zeitdifferenz Delta t_i\",\"unit\":\"min\",\"default_value\":\"0\"},{\"id\":\"v_kj\",\"name\":\"k_j\",\"label\":\"Fugenbeiwert k_j\",\"unit\":\"-\",\"default_value\":\"1\"}],\"outputs\":[{\"id\":\"tprot\",\"name\":\"t_{prot,i}\",\"label\":\"Schutzzeit\",\"unit\":\"min\"},{\"id\":\"tins\",\"name\":\"t_{ins,n}\",\"label\":\"Grundisolationsbeitrag\",\"unit\":\"min\"}],\"options\":[{\"id\":\"massivholz\",\"label\":\"Massivholzschalung / Massivholzplatte\",\"formulas\":{\"tprot\":\"((t_prot_0_i * k_pos_exp_i * k_pos_unexp) + delta_t) * k_j\",\"tins\":\"((t_ins_0_i * k_pos_exp_n) + delta_t) * k_j\"},\"calcs\":[{\"id\":\"massiv_tprot0\",\"name\":\"t_{prot,0,i}\",\"label\":\"Grundschutzzeit\",\"unit\":\"min\",\"formula\":\"Math.min(30 * Math.pow(d / 20, 1.1), d / beta_0)\",\"cond_expr\":\"\"},{\"id\":\"massiv_tins0\",\"name\":\"t_{ins,0,i}\",\"label\":\"Grundisolationszeit\",\"unit\":\"min\",\"formula\":\"19 * Math.pow(d / 20, 1.4)\",\"cond_expr\":\"\"},{\"id\":\"massiv_kpos_i_zero\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"1\",\"cond_expr\":\"t_prot_0_i <= 0\"},{\"id\":\"massiv_kpos_i_low\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"1 - 0.6 * sum_tprot_prev / t_prot_0_i\",\"cond_expr\":\"t_prot_0_i > 0 && sum_tprot_prev <= t_prot_0_i / 2\"},{\"id\":\"massiv_kpos_i_high\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"0.5 * Math.sqrt(t_prot_0_i / sum_tprot_prev)\",\"cond_expr\":\"t_prot_0_i > 0 && sum_tprot_prev > t_prot_0_i / 2\"},{\"id\":\"massiv_kpos_n_zero\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"1\",\"cond_expr\":\"t_ins_0_i <= 0\"},{\"id\":\"massiv_kpos_n_low\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"1 - 0.6 * sum_tprot_prev / t_ins_0_i\",\"cond_expr\":\"t_ins_0_i > 0 && sum_tprot_prev <= t_ins_0_i / 2\"},{\"id\":\"massiv_kpos_n_high\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"0.5 * Math.sqrt(t_ins_0_i / sum_tprot_prev)\",\"cond_expr\":\"t_ins_0_i > 0 && sum_tprot_prev > t_ins_0_i / 2\"}]},{\"id\":\"furnier_osb\",\"label\":\"Furniersperrholz / Furnierschichtholz / OSB-Platte\",\"formulas\":{\"tprot\":\"((t_prot_0_i * k_pos_exp_i * k_pos_unexp) + delta_t) * k_j\",\"tins\":\"((t_ins_0_i * k_pos_exp_n) + delta_t) * k_j\"},\"calcs\":[{\"id\":\"furnier_tprot0\",\"name\":\"t_{prot,0,i}\",\"label\":\"Grundschutzzeit\",\"unit\":\"min\",\"formula\":\"Math.min(23 * Math.pow(d / 20, 1.1), d / beta_0)\",\"cond_expr\":\"\"},{\"id\":\"furnier_tins0\",\"name\":\"t_{ins,0,i}\",\"label\":\"Grundisolationszeit\",\"unit\":\"min\",\"formula\":\"16 * Math.pow(d / 20, 1.4)\",\"cond_expr\":\"\"},{\"id\":\"furnier_kpos_i_zero\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"1\",\"cond_expr\":\"t_prot_0_i <= 0\"},{\"id\":\"furnier_kpos_i_low\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"1 - 0.6 * sum_tprot_prev / t_prot_0_i\",\"cond_expr\":\"t_prot_0_i > 0 && sum_tprot_prev <= t_prot_0_i / 2\"},{\"id\":\"furnier_kpos_i_high\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"0.5 * Math.sqrt(t_prot_0_i / sum_tprot_prev)\",\"cond_expr\":\"t_prot_0_i > 0 && sum_tprot_prev > t_prot_0_i / 2\"},{\"id\":\"furnier_kpos_n_zero\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"1\",\"cond_expr\":\"t_ins_0_i <= 0\"},{\"id\":\"furnier_kpos_n_low\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"1 - 0.6 * sum_tprot_prev / t_ins_0_i\",\"cond_expr\":\"t_ins_0_i > 0 && sum_tprot_prev <= t_ins_0_i / 2\"},{\"id\":\"furnier_kpos_n_high\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"0.5 * Math.sqrt(t_ins_0_i / sum_tprot_prev)\",\"cond_expr\":\"t_ins_0_i > 0 && sum_tprot_prev > t_ins_0_i / 2\"}]},{\"id\":\"span_faser\",\"label\":\"Spanplatte / Faserplatte\",\"formulas\":{\"tprot\":\"((t_prot_0_i * k_pos_exp_i * k_pos_unexp) + delta_t) * k_j\",\"tins\":\"((t_ins_0_i * k_pos_exp_n) + delta_t) * k_j\"},\"calcs\":[{\"id\":\"span_tprot0\",\"name\":\"t_{prot,0,i}\",\"label\":\"Grundschutzzeit\",\"unit\":\"min\",\"formula\":\"Math.min(33 * Math.pow(d / 20, 1.1), d / beta_0)\",\"cond_expr\":\"\"},{\"id\":\"span_tins0\",\"name\":\"t_{ins,0,i}\",\"label\":\"Grundisolationszeit\",\"unit\":\"min\",\"formula\":\"22 * Math.pow(d / 20, 1.4)\",\"cond_expr\":\"\"},{\"id\":\"span_kpos_i_zero\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"1\",\"cond_expr\":\"t_prot_0_i <= 0\"},{\"id\":\"span_kpos_i_low\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"1 - 0.6 * sum_tprot_prev / t_prot_0_i\",\"cond_expr\":\"t_prot_0_i > 0 && sum_tprot_prev <= t_prot_0_i / 2\"},{\"id\":\"span_kpos_i_high\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"0.5 * Math.sqrt(t_prot_0_i / sum_tprot_prev)\",\"cond_expr\":\"t_prot_0_i > 0 && sum_tprot_prev > t_prot_0_i / 2\"},{\"id\":\"span_kpos_n_zero\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"1\",\"cond_expr\":\"t_ins_0_i <= 0\"},{\"id\":\"span_kpos_n_low\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"1 - 0.6 * sum_tprot_prev / t_ins_0_i\",\"cond_expr\":\"t_ins_0_i > 0 && sum_tprot_prev <= t_ins_0_i / 2\"},{\"id\":\"span_kpos_n_high\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"0.5 * Math.sqrt(t_ins_0_i / sum_tprot_prev)\",\"cond_expr\":\"t_ins_0_i > 0 && sum_tprot_prev > t_ins_0_i / 2\"}]},{\"id\":\"gips\",\"label\":\"Gipsplatte / Gipsfaserplatte\",\"formulas\":{\"tprot\":\"((t_prot_0_i * k_pos_exp_i * k_pos_unexp) + delta_t) * k_j\",\"tins\":\"((t_ins_0_i * k_pos_exp_n) + delta_t) * k_j\"},\"calcs\":[{\"id\":\"gips_tprot0\",\"name\":\"t_{prot,0,i}\",\"label\":\"Grundschutzzeit\",\"unit\":\"min\",\"formula\":\"30 * Math.pow(d / 15, 1.2)\",\"cond_expr\":\"\"},{\"id\":\"gips_tins0\",\"name\":\"t_{ins,0,i}\",\"label\":\"Grundisolationszeit\",\"unit\":\"min\",\"formula\":\"24 * Math.pow(d / 15, 1.4)\",\"cond_expr\":\"\"},{\"id\":\"gips_kpos_i_zero\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"1\",\"cond_expr\":\"t_prot_0_i <= 0\"},{\"id\":\"gips_kpos_i_low\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"1 - 0.6 * sum_tprot_prev / t_prot_0_i\",\"cond_expr\":\"t_prot_0_i > 0 && sum_tprot_prev <= t_prot_0_i / 2\"},{\"id\":\"gips_kpos_i_high\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"0.5 * Math.sqrt(t_prot_0_i / sum_tprot_prev)\",\"cond_expr\":\"t_prot_0_i > 0 && sum_tprot_prev > t_prot_0_i / 2\"},{\"id\":\"gips_kpos_n_zero\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"1\",\"cond_expr\":\"t_ins_0_i <= 0\"},{\"id\":\"gips_kpos_n_low\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"1 - 0.6 * sum_tprot_prev / t_ins_0_i\",\"cond_expr\":\"t_ins_0_i > 0 && sum_tprot_prev <= t_ins_0_i / 2\"},{\"id\":\"gips_kpos_n_high\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"0.5 * Math.sqrt(t_ins_0_i / sum_tprot_prev)\",\"cond_expr\":\"t_ins_0_i > 0 && sum_tprot_prev > t_ins_0_i / 2\"}]},{\"id\":\"mw_high\",\"label\":\"Mineralwolle rho >= 26 kg/m3, Schmelzpunkt >= 1000 C\",\"formulas\":{\"tprot\":\"((t_prot_0_i * k_pos_exp_i * k_pos_unexp) + delta_t) * k_j\",\"tins\":\"((t_ins_0_i * k_pos_exp_n) + delta_t) * k_j\"},\"calcs\":[{\"id\":\"mw_high_tprot0\",\"name\":\"t_{prot,0,i}\",\"label\":\"Grundschutzzeit\",\"unit\":\"min\",\"formula\":\"0.3 * Math.pow(d, 0.75 * Math.log10(rho) - rho / 400)\",\"cond_expr\":\"\"},{\"id\":\"mw_high_tins0\",\"name\":\"t_{ins,0,i}\",\"label\":\"Grundisolationszeit\",\"unit\":\"min\",\"formula\":\"(0.01 * Math.pow(rho, 0.224) - 0.02) * d * d\",\"cond_expr\":\"\"},{\"id\":\"mw_high_kpos_i_zero\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"1\",\"cond_expr\":\"t_prot_0_i <= 0\"},{\"id\":\"mw_high_kpos_i_low\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"1 - 0.6 * sum_tprot_prev / t_prot_0_i\",\"cond_expr\":\"t_prot_0_i > 0 && sum_tprot_prev <= t_prot_0_i / 2\"},{\"id\":\"mw_high_kpos_i_high\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"0.5 * Math.sqrt(t_prot_0_i / sum_tprot_prev)\",\"cond_expr\":\"t_prot_0_i > 0 && sum_tprot_prev > t_prot_0_i / 2\"},{\"id\":\"mw_high_kpos_n_zero\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"1\",\"cond_expr\":\"t_ins_0_i <= 0\"},{\"id\":\"mw_high_kpos_n_low\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"1 - 0.6 * sum_tprot_prev / t_ins_0_i\",\"cond_expr\":\"t_ins_0_i > 0 && sum_tprot_prev <= t_ins_0_i / 2\"},{\"id\":\"mw_high_kpos_n_high\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"0.5 * Math.sqrt(t_ins_0_i / sum_tprot_prev)\",\"cond_expr\":\"t_ins_0_i > 0 && sum_tprot_prev > t_ins_0_i / 2\"}]},{\"id\":\"mw_low\",\"label\":\"Mineralwolle rho >= 15 kg/m3, Schmelzpunkt < 1000 C, d_i >= 40 mm\",\"formulas\":{\"tprot\":\"((t_prot_0_i * k_pos_exp_i * k_pos_unexp) + delta_t) * k_j\",\"tins\":\"((t_ins_0_i * k_pos_exp_n) + delta_t) * k_j\"},\"calcs\":[{\"id\":\"mw_low_tprot0\",\"name\":\"t_{prot,0,i}\",\"label\":\"Grundschutzzeit\",\"unit\":\"min\",\"formula\":\"d < 40 ? 0 : Math.min((0.0007 * rho + 0.046) * d + 13, 30)\",\"cond_expr\":\"\"},{\"id\":\"mw_low_tins0\",\"name\":\"t_{ins,0,i}\",\"label\":\"Grundisolationszeit\",\"unit\":\"min\",\"formula\":\"0\",\"cond_expr\":\"\"},{\"id\":\"mw_low_kpos_i_zero\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"1\",\"cond_expr\":\"t_prot_0_i <= 0\"},{\"id\":\"mw_low_kpos_i_low\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"1 - 0.8 * sum_tprot_prev / t_prot_0_i\",\"cond_expr\":\"t_prot_0_i > 0 && sum_tprot_prev <= t_prot_0_i / 4\"},{\"id\":\"mw_low_kpos_i_high\",\"name\":\"k_{pos,exp,i}\",\"label\":\"Positionsbeiwert\",\"unit\":\"-\",\"formula\":\"(0.001 * rho + 0.27) * Math.pow(t_prot_0_i / sum_tprot_prev, 0.75 - 0.002 * rho)\",\"cond_expr\":\"t_prot_0_i > 0 && sum_tprot_prev > t_prot_0_i / 4\"},{\"id\":\"mw_low_kpos_n_zero\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"1\",\"cond_expr\":\"t_ins_0_i <= 0\"},{\"id\":\"mw_low_kpos_n_low\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"1 - 0.6 * sum_tprot_prev / t_ins_0_i\",\"cond_expr\":\"t_ins_0_i > 0 && sum_tprot_prev <= t_ins_0_i / 2\"},{\"id\":\"mw_low_kpos_n_high\",\"name\":\"k_{pos,exp,n}\",\"label\":\"Positionsbeiwert letzte Schicht\",\"unit\":\"-\",\"formula\":\"0.5 * Math.sqrt(t_ins_0_i / sum_tprot_prev)\",\"cond_expr\":\"t_ins_0_i > 0 && sum_tprot_prev > t_ins_0_i / 2\"}]}],\"aggregations\":[{\"output_id\":\"sum_tprot\",\"method\":\"expr\",\"expr\":\"sum_tprot_before_last\",\"name\":\"\\\\sum t_{prot,i}\",\"label\":\"Summe Schutzzeiten vor letzter Schicht\",\"unit\":\"min\"},{\"output_id\":\"last_tins_value\",\"method\":\"expr\",\"expr\":\"last_tins\",\"name\":\"t_{ins,n}\",\"label\":\"Isolationszeit letzte Schicht\",\"unit\":\"min\"},{\"output_id\":\"tins_total\",\"method\":\"expr\",\"expr\":\"sum_tprot_before_last + last_tins\",\"name\":\"t_{ins}\",\"label\":\"Zeit bis zum Versagen der brandabschnittsbildenden Funktion\",\"unit\":\"min\"}]},\"style\":{\"width\":520,\"height\":560}},{\"id\":\"check_fire\",\"type\":\"check\",\"position\":{\"x\":900,\"y\":120},\"data\":{\"kind\":\"check\",\"label\":\"Nachweis brandabschnittsbildende Funktion\",\"latex\":\"t_{ins} \\\\geq t_{erf}\",\"expr\":\"t_ins >= t_erf ? 1 : 0\",\"unit\":\"min\"},\"style\":{\"width\":270,\"height\":110}}],\"edges\":[{\"id\":\"e_title_loop\",\"source\":\"title_fire_loop\",\"target\":\"fire_layers\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_req_check\",\"source\":\"t_erf\",\"target\":\"check_fire\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_loop_check\",\"source\":\"fire_layers\",\"target\":\"check_fire\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}}],\"display_order\":[\"title_fire_loop\",\"t_erf\",\"fire_layers\",\"check_fire\"]}"
  }
];
