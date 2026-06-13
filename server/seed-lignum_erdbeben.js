module.exports = {
  chapters: [
  [
    "lignum_erdbeben_1",
    null,
    "1",
    "Lignum Erdbeben"
  ],
  [
    "lignum_erdbeben_1_1_mq4ywo6u",
    "lignum_erdbeben_1",
    "1.1",
    "Schub"
  ],
  [
    "lignum_erdbeben_2_1",
    "lignum_erdbeben_1",
    "2.1",
    "Beplankung"
  ]
],
  verifications: [
  {
    "id": "lignum_erdbeben_schubnachweis",
    "chapter_id": "lignum_erdbeben_1_1_mq4ywo6u",
    "title": "Schubnachweis nach DIN 1995-1-1/NA",
    "formula_latex": "f_{v,d} = \\frac {\\eta_{mod}}{\\gamma_M} \\cdot f_{v,k}",
    "formula_description": "",
    "compute_expr": "",
    "variables": [
      {
        "name": "eta_mod",
        "label": "Beiwert",
        "unit": "-",
        "type": "number",
        "default_value": "1",
        "description": ""
      },
      {
        "name": "gamma_M",
        "label": "Teilsicherheitsbeiwert",
        "unit": "-",
        "type": "number",
        "default_value": "1.3",
        "description": ""
      },
      {
        "name": "f_v_k",
        "label": "charakteristische Schubfestigkeit",
        "unit": "N/mm^2",
        "type": "table_column",
        "default_value": "6.8",
        "description": "",
        "table_ref": "neue_tabelle_mq50vcse",
        "table_col": 1
      }
    ],
    "graph_json": "{\"version\":1,\"nodes\":[{\"id\":\"variable_mq4yx52s_1\",\"type\":\"variable\",\"position\":{\"x\":84.59,\"y\":130.82},\"data\":{\"kind\":\"variable\",\"name\":\"eta_mod\",\"label\":\"Beiwert\",\"unit\":\"-\",\"default_value\":\"1\",\"inputKind\":\"number_image\",\"options\":[],\"imageSource\":\"Fadri\"}},{\"id\":\"variable_gamma_m\",\"type\":\"variable\",\"position\":{\"x\":82.33884301552419,\"y\":422.64177627489903},\"data\":{\"kind\":\"variable\",\"name\":\"gamma_M\",\"label\":\"Teilsicherheitsbeiwert\",\"unit\":\"-\",\"default_value\":\"1.3\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"dropdown_plattenart\",\"type\":\"dropdown\",\"position\":{\"x\":84.59,\"y\":650},\"data\":{\"kind\":\"dropdown\",\"name\":\"\",\"label\":\"Plattenart\",\"mode\":\"table_column\",\"options\":[],\"table_ref\":\"neue_tabelle_mq50vcse\",\"label_col\":0}},{\"id\":\"tablevalue_fvk\",\"type\":\"tablevalue\",\"position\":{\"x\":340,\"y\":650},\"data\":{\"kind\":\"tablevalue\",\"name\":\"f_v_k\",\"label\":\"\",\"unit\":\"N/mm^2\",\"table_col\":1}},{\"id\":\"calc_fvd\",\"type\":\"calc\",\"position\":{\"x\":620,\"y\":390},\"data\":{\"kind\":\"calc\",\"name\":\"f_{v,d}\",\"label\":\"Schubnachweis nach DIN 1995-1-1/NA\",\"unit\":\"N/mm^2\",\"latex\":\"f_{v,d} = \\\\frac {\\\\eta_{mod}}{\\\\gamma_M} \\\\cdot f_{v,k}\",\"expr\":\"(eta_mod / gamma_M) * f_v_k\"}}],\"edges\":[{\"id\":\"e_eta\",\"source\":\"variable_mq4yx52s_1\",\"target\":\"calc_fvd\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_gamma\",\"source\":\"variable_gamma_m\",\"target\":\"calc_fvd\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_drop_table\",\"source\":\"dropdown_plattenart\",\"target\":\"tablevalue_fvk\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_fvk\",\"source\":\"tablevalue_fvk\",\"target\":\"calc_fvd\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}}]}",
    "notes": "rekonstruiert aus korrupter DB"
  },
  {
    "id": "lignum_erdbeben_beplankung",
    "chapter_id": "lignum_erdbeben_2_1",
    "title": "Beplankungsnachweis",
    "formula_latex": "f_{v,0,d} = \\min\\left(k_{v1} \\frac{R_d}{a_v} n_{Reihe} n_{Beplankung}, k_{v1} k_{v2} f_{v,d} t n_{Beplankung}, k_{v1} k_{v2} f_{v,d} \\frac{35 t^2}{a_r} n_{Beplankung}\\right)",
    "formula_description": "Lignum-Erdbeben Beplankungsnachweis; Formel und Plattenart-Tabelle aus der alten DB rekonstruiert.",
    "compute_expr": "Math.min(k_v1 * R_d / a_v * n_Reihe * n_Beplankung, k_v1 * k_v2 * f_v_d * t * n_Beplankung, k_v1 * k_v2 * f_v_d * 35 * Math.pow(t,2) / a_r * n_Beplankung)",
    "variables": [
      {
        "name": "k_v1",
        "label": "Beiwert k_v1",
        "unit": "-",
        "type": "number",
        "default_value": "1",
        "description": ""
      },
      {
        "name": "k_v2",
        "label": "Beiwert k_v2",
        "unit": "-",
        "type": "number",
        "default_value": "1",
        "description": ""
      },
      {
        "name": "R_d",
        "label": "Verbindungsmittelwiderstand",
        "unit": "N",
        "type": "number",
        "default_value": "340",
        "description": ""
      },
      {
        "name": "a_v",
        "label": "Verbindungsmittelabstand",
        "unit": "mm",
        "type": "number",
        "default_value": "50",
        "description": ""
      },
      {
        "name": "n_Reihe",
        "label": "Anzahl Klammernreihe",
        "unit": "-",
        "type": "number",
        "default_value": "1",
        "description": ""
      },
      {
        "name": "n_Beplankung",
        "label": "Einseitig (1), Beidseitig (2)",
        "unit": "-",
        "type": "number",
        "default_value": "2",
        "description": ""
      },
      {
        "name": "f_v_d",
        "label": "Bemessungswert Schubfestigkeit",
        "unit": "N/mm^2",
        "type": "number",
        "default_value": "5.23",
        "description": ""
      },
      {
        "name": "t",
        "label": "Plattendicke",
        "unit": "mm",
        "type": "number",
        "default_value": "15",
        "description": ""
      },
      {
        "name": "a_r",
        "label": "Sprungmass Ständer",
        "unit": "mm",
        "type": "number",
        "default_value": "600",
        "description": ""
      }
    ],
    "graph_json": "{\"version\":1,\"nodes\":[{\"id\":\"var_kv1\",\"type\":\"variable\",\"position\":{\"x\":80,\"y\":80},\"data\":{\"kind\":\"variable\",\"name\":\"k_v1\",\"label\":\"Beiwert k_v1\",\"unit\":\"-\",\"default_value\":\"1\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_kv2\",\"type\":\"variable\",\"position\":{\"x\":80,\"y\":250},\"data\":{\"kind\":\"variable\",\"name\":\"k_v2\",\"label\":\"Beiwert k_v2\",\"unit\":\"-\",\"default_value\":\"1\",\"inputKind\":\"number\",\"options\":[]}},{\"id\":\"var_Rd\",\"type\":\"variable\",\"position\":{\"x\":80,\"y\":420},\"data\":{\"kind\":\"variable\",\"name\":\"R_d\",\"label\":\"Verbindungsmittelwiderstand\",\"unit\":\"N\",\"default_value\":\"340\",\"inputKind\":\"number\",\"options\":[],\"hasDefault\":true}},{\"id\":\"var_av\",\"type\":\"variable\",\"position\":{\"x\":80,\"y\":590},\"data\":{\"kind\":\"variable\",\"name\":\"a_v\",\"label\":\"Verbindungsmittelabstand\",\"unit\":\"mm\",\"default_value\":\"50\",\"inputKind\":\"number\",\"options\":[],\"hasDefault\":true}},{\"id\":\"var_ar\",\"type\":\"variable\",\"position\":{\"x\":300,\"y\":590},\"data\":{\"kind\":\"variable\",\"name\":\"a_r\",\"label\":\"Sprungmass-Ständer\",\"unit\":\"mm\",\"default_value\":\"600\",\"inputKind\":\"number\",\"options\":[],\"hasDefault\":true}},{\"id\":\"var_nreihe\",\"type\":\"variable\",\"position\":{\"x\":80,\"y\":760},\"data\":{\"kind\":\"variable\",\"name\":\"n_Reihe\",\"label\":\"Anzahl Klammernreihe\",\"unit\":\"-\",\"default_value\":\"1\",\"inputKind\":\"number\",\"options\":[],\"hasDefault\":true}},{\"id\":\"var_nbepl\",\"type\":\"variable\",\"position\":{\"x\":300,\"y\":760},\"data\":{\"kind\":\"variable\",\"name\":\"n_Beplankung\",\"label\":\"Einseitig (1), Beidseitig (2)\",\"unit\":\"-\",\"default_value\":\"2\",\"inputKind\":\"number\",\"options\":[],\"hasDefault\":true}},{\"id\":\"var_t\",\"type\":\"variable\",\"position\":{\"x\":80,\"y\":930},\"data\":{\"kind\":\"variable\",\"name\":\"t\",\"label\":\"Plattendicke\",\"unit\":\"mm\",\"default_value\":\"15\",\"inputKind\":\"number\",\"options\":[],\"hasDefault\":true}},{\"id\":\"var_eta_mod\",\"type\":\"variable\",\"position\":{\"x\":80,\"y\":1160},\"data\":{\"kind\":\"variable\",\"name\":\"eta_mod\",\"label\":\"Beiwert\",\"unit\":\"-\",\"default_value\":\"1\",\"inputKind\":\"number_image\",\"options\":[],\"hasDefault\":true,\"imageSource\":\"Fadri\"}},{\"id\":\"var_gamma\",\"type\":\"variable\",\"position\":{\"x\":300,\"y\":1160},\"data\":{\"kind\":\"variable\",\"name\":\"gamma_M\",\"label\":\"Teilsicherheitsbeiwert\",\"unit\":\"-\",\"default_value\":\"1.3\",\"inputKind\":\"number\",\"options\":[],\"hasDefault\":true}},{\"id\":\"dropdown_plattenart\",\"type\":\"dropdown\",\"position\":{\"x\":80,\"y\":1390},\"data\":{\"kind\":\"dropdown\",\"name\":\"\",\"label\":\"Plattenart\",\"mode\":\"table_column\",\"options\":[],\"table_ref\":\"neue_tabelle_mq50vcse\",\"label_col\":0}},{\"id\":\"table_fvk\",\"type\":\"tablevalue\",\"position\":{\"x\":340,\"y\":1390},\"data\":{\"kind\":\"tablevalue\",\"name\":\"f_v_k\",\"label\":\"\",\"unit\":\"N/mm^2\",\"table_col\":1}},{\"id\":\"calc_fvd\",\"type\":\"calc\",\"position\":{\"x\":650,\"y\":1240},\"data\":{\"kind\":\"calc\",\"name\":\"f_{v,d}\",\"label\":\"\",\"unit\":\"N/mm^2\",\"latex\":\"f_{v,d} = \\\\frac {\\\\eta_{mod}}{\\\\gamma_M} \\\\cdot f_{v,k}\",\"expr\":\"(eta_mod / gamma_M) * f_v_k\"}},{\"id\":\"minmax_mq50mzw5_1\",\"type\":\"minmax\",\"position\":{\"x\":1030,\"y\":680},\"data\":{\"kind\":\"minmax\",\"name\":\"f_{v,0,d}\",\"label\":\"Bemessungswert der längenbezogenen Schubfestigkeit\",\"unit\":\"N/mm\",\"latex\":\"f_{v,0,d} = \\\\min \\\\begin{cases} k_{v1} \\\\cdot R_d / a_v \\\\cdot n_{Reihe} \\\\cdot n_{Beplankung} \\\\\\\\ k_{v1} \\\\cdot k_{v2} \\\\cdot f_{v,d} \\\\cdot t \\\\cdot n_{Beplankung} \\\\\\\\ k_{v1} \\\\cdot k_{v2} \\\\cdot f_{v,d} \\\\cdot 35 \\\\cdot t^2 / a_r \\\\cdot n_{Beplankung} \\\\end{cases}\",\"expr\":\"Math.min(k_v1 * R_d / a_v * n_Reihe * n_Beplankung, k_v1 * k_v2 * f_v_d * t * n_Beplankung, k_v1 * k_v2 * f_v_d * 35 * Math.pow(t,2) / a_r * n_Beplankung)\"}}],\"edges\":[{\"id\":\"e_bepl_0\",\"source\":\"var_eta_mod\",\"target\":\"calc_fvd\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_bepl_1\",\"source\":\"var_gamma\",\"target\":\"calc_fvd\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_bepl_2\",\"source\":\"dropdown_plattenart\",\"target\":\"table_fvk\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_bepl_3\",\"source\":\"table_fvk\",\"target\":\"calc_fvd\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_bepl_4\",\"source\":\"var_kv1\",\"target\":\"minmax_mq50mzw5_1\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_bepl_5\",\"source\":\"var_kv2\",\"target\":\"minmax_mq50mzw5_1\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_bepl_6\",\"source\":\"var_Rd\",\"target\":\"minmax_mq50mzw5_1\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_bepl_7\",\"source\":\"var_av\",\"target\":\"minmax_mq50mzw5_1\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_bepl_8\",\"source\":\"var_ar\",\"target\":\"minmax_mq50mzw5_1\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_bepl_9\",\"source\":\"var_nreihe\",\"target\":\"minmax_mq50mzw5_1\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_bepl_10\",\"source\":\"var_nbepl\",\"target\":\"minmax_mq50mzw5_1\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_bepl_11\",\"source\":\"var_t\",\"target\":\"minmax_mq50mzw5_1\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}},{\"id\":\"e_bepl_12\",\"source\":\"calc_fvd\",\"target\":\"minmax_mq50mzw5_1\",\"sourceHandle\":null,\"targetHandle\":null,\"data\":{\"kind\":\"workflow\"}}]}",
    "notes": "rekonstruiert aus korrupter DB"
  }
]
};
