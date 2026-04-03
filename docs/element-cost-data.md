# Element Cost Data

Cost-per-kilogram data for all 118 elements, stored in the `cost_usd_per_kg` and `cost_date` columns of `public/data/science/chemistry/periodic-table.csv`.

## Value format

Values use uncertainty markers:
- **Plain number** (e.g. `6.0`): well-established commodity or exchange price
- **`~` prefix** (e.g. `~3460`): approximate — older data, specialty supplier, lab-grade chemical, or institutional production cost
- **`~` prefix + `?` suffix** (e.g. `~1e25?`): order-of-magnitude estimate based on extrapolated production costs; no actual market or published price exists

The parser strips `~` and `?` to extract the numeric value. Color scaling uses `log10(value)`.

Scientific notation is used for values >= 1 billion USD/kg.

## Source tiers

### Tier 1: Commodity and industrial prices (no marker)

Primary source: [Wikipedia — Prices of chemical elements](https://en.wikipedia.org/wiki/Prices_of_chemical_elements), which aggregates from:
- **USGS Mineral Commodity Summaries** — most metals and industrial minerals
- **London Metal Exchange (LME)** — Cu, Zn, Ni, Sn, Pb, Al, Co
- **London Bullion Market (LBMA)** — Au, Ag, Pt, Pd
- **Shanghai Metals Market** — rare earths, minor metals
- Specialty gas suppliers — noble gases (Ar)
- Industrial chemical pricing — Cl, S, N, O, H, F, P

Data years range 2001–2025 (most are 2019–2020). Prices are for the cheapest commercially available form (e.g. Ba priced as barite ore, C as coal, H from steam methane reforming). The Wikipedia table reports cost per kilogram of contained element, not per kilogram of compound.

#### Elements using Tier 1 pricing

| Z | Element | USD/kg | Year | Form |
|---|---------|--------|------|------|
| 1 | Hydrogen | 1.39 | 2012 | Steam methane reforming |
| 2 | Helium | 24 | 2018 | Industrial grade |
| 3 | Lithium | 81.4 | 2020 | Metal ingot |
| 4 | Beryllium | 857 | 2020 | USGS |
| 5 | Boron | 3.68 | 2019 | Crystalline |
| 6 | Carbon | 0.122 | 2018 | Anthracite coal (~90% C) |
| 7 | Nitrogen | 0.14 | 2001 | Liquid |
| 8 | Oxygen | 0.154 | 2001 | Liquid |
| 9 | Fluorine | 1.84 | 2017 | Industrial |
| 11 | Sodium | 2.57 | 2020 | Metallic |
| 12 | Magnesium | 2.32 | 2019 | USGS |
| 13 | Aluminum | 1.79 | 2019 | LME |
| 14 | Silicon | 1.7 | 2019 | Metallurgical grade |
| 15 | Phosphorus | 2.69 | 2019 | White phosphorus |
| 16 | Sulfur | 0.0926 | 2019 | Industrial |
| 17 | Chlorine | 0.082 | 2013 | Industrial |
| 18 | Argon | 0.931 | 2019 | Liquid |
| 19 | Potassium | 12.1 | 2020 | Metallic |
| 20 | Calcium | 2.21 | 2020 | USGS |
| 22 | Titanium | 11.1 | 2020 | Sponge |
| 23 | Vanadium | 357 | 2020 | Ferrovanadium |
| 24 | Chromium | 9.4 | 2019 | Ferrochromium |
| 25 | Manganese | 1.82 | 2019 | Electrolytic |
| 26 | Iron | 0.424 | 2020 | Pig iron |
| 27 | Cobalt | 32.8 | 2019 | LME |
| 28 | Nickel | 13.9 | 2019 | LME |
| 29 | Copper | 6.0 | 2019 | LME |
| 30 | Zinc | 2.55 | 2019 | LME |
| 31 | Gallium | 148 | 2019 | Pure metal |
| 32 | Germanium | 914 | 2020 | Metal |
| 34 | Selenium | 21.4 | 2019 | Industrial |
| 35 | Bromine | 4.39 | 2019 | Industrial |
| 38 | Strontium | 6.53 | 2019 | Metallic |
| 39 | Yttrium | 31 | 2019 | Rare earth |
| 40 | Zirconium | 35.7 | 2020 | Sponge |
| 41 | Niobium | 61.4 | 2020 | Ferroniobium |
| 42 | Molybdenum | 40.1 | 2019 | Oxide |
| 44 | Ruthenium | 10400 | 2020 | PGM market |
| 45 | Rhodium | 147000 | 2019 | PGM market |
| 46 | Palladium | 49500 | 2019 | LBMA |
| 47 | Silver | 521 | 2019 | LBMA |
| 48 | Cadmium | 2.73 | 2019 | Metallic |
| 49 | Indium | 167 | 2019 | Metal |
| 50 | Tin | 18.7 | 2019 | LME |
| 51 | Antimony | 5.79 | 2019 | Metal |
| 52 | Tellurium | 63.5 | 2019 | Metal |
| 53 | Iodine | 35 | 2019 | Industrial |
| 56 | Barium | 0.246 | 2016 | As barite (BaSO4) |
| 57 | Lanthanum | 4.78 | 2020 | Rare earth oxide |
| 58 | Cerium | 4.57 | 2020 | Rare earth oxide |
| 59 | Praseodymium | 103 | 2019 | Rare earth oxide |
| 60 | Neodymium | 57.5 | 2019 | Rare earth oxide |
| 62 | Samarium | 13.9 | 2019 | Rare earth oxide |
| 63 | Europium | 31.4 | 2020 | Rare earth oxide |
| 64 | Gadolinium | 28.6 | 2020 | Rare earth oxide |
| 65 | Terbium | 658 | 2019 | Rare earth oxide |
| 66 | Dysprosium | 307 | 2019 | Rare earth oxide |
| 67 | Holmium | 57.1 | 2020 | Rare earth oxide |
| 68 | Erbium | 26.4 | 2020 | Rare earth oxide |
| 70 | Ytterbium | 17.1 | 2020 | Rare earth oxide |
| 71 | Lutetium | 643 | 2020 | Rare earth oxide |
| 73 | Tantalum | 298 | 2019 | Metal |
| 74 | Tungsten | 35.3 | 2019 | APT |
| 75 | Rhenium | 3010 | 2020 | Metal |
| 76 | Osmium | 30000 | 2025 | Precious metal |
| 77 | Iridium | 144000 | 2025 | Precious metal |
| 78 | Platinum | 27800 | 2019 | LBMA |
| 79 | Gold | 75430 | 2024 | London PM fix |
| 80 | Mercury | 30.2 | 2017 | Metallic |
| 82 | Lead | 2.0 | 2019 | LME |
| 83 | Bismuth | 6.36 | 2019 | Metal |
| 90 | Thorium | 287 | 2010 | Oxide |
| 92 | Uranium | 101 | 2018 | Yellowcake (U3O8) |

### Tier 2: Approximate prices (`~` marker)

These have published prices but from less liquid markets, specialty suppliers, older data (pre-2010), or institutional (ORNL) production cost schedules. Sources are the same Wikipedia article aggregating from CRC Handbook and ORNL catalogs.

| Z | Element | USD/kg | Year | Notes |
|---|---------|--------|------|-------|
| 10 | Neon | 240 | 1999 | Specialty gas; 1999 data |
| 21 | Scandium | 3460 | 2020 | Very small market |
| 33 | Arsenic | 1.0 | 2020 | Priced as trioxide |
| 36 | Krypton | 290 | 1999 | Specialty gas; 1999 data |
| 37 | Rubidium | 15500 | 2018 | Lab-grade metal |
| 43 | Technetium | 100000 | 2004 | ORNL reactor production |
| 54 | Xenon | 1800 | 1999 | Specialty gas; 1999 data |
| 55 | Cesium | 61800 | 2018 | Lab-grade metal |
| 61 | Promethium | 460000 | 2003 | ORNL, Pm-147 |
| 69 | Thulium | 3000 | 2003 | Rare earth; old data |
| 72 | Hafnium | 900 | 2017 | Unwrought sponge |
| 81 | Thallium | 4200 | 2017 | Lab-grade metal |
| 84 | Polonium | 4.92e13 | 2004 | ORNL, Po-209 production cost |
| 89 | Actinium | 2.9e13 | 2004 | ORNL, Ac-225 production cost |
| 93 | Neptunium | 660000 | 2003 | ORNL |
| 94 | Plutonium | 6490000 | 2019 | Pu-239, certified reference material |
| 95 | Americium | 750000 | 2004 | Am-243, ORNL |
| 96 | Curium | 1.6e11 | 2004 | Cm-248, ORNL |
| 97 | Berkelium | 1.85e11 | 2004 | Bk-249, ORNL |
| 98 | Californium | 6e10 | 2004 | Cf-252, ORNL |

### Tier 3: Estimated production costs (`~...?` marker)

No published price exists. Values are order-of-magnitude estimates based on:
- **Accelerator beam time**: ~$50,000–$150,000/day for a heavy-ion facility (inferred from institutional budgets)
- **Target material costs**: ranges from cheap (Bi, Pb) to extremely expensive (Cf-249 at $185B/kg)
- **Production cross-sections**: nanobarns for Z=104–108, picobarns for Z=109–112, sub-picobarns for Z=113–118
- **Number of atoms ever produced**: from thousands (Rf, Db) down to ~5 (Og)
- **Mass per atom**: atomic weight × 1.66×10⁻²⁷ kg

Methodology: (experiment cost) ÷ (number of atoms produced × mass per atom) = cost per kg.

| Z | Element | Estimated USD/kg | Basis |
|---|---------|-----------------|-------|
| 85 | Astatine | 1e12 | Cyclotron production of At-211 (~µg yields); 8.1h half-life |
| 86 | Radon | 1e13 | Collected from Ra-226 decay sources; 3.8d half-life limits accumulation |
| 87 | Francium | 1e23 | ~200K atoms per accelerator run; 22min half-life; cannot accumulate |
| 88 | Radium | 1e7 | Available from legacy sources and uranium ore processing; disposal liability |
| 91 | Protactinium | 2.8e8 | Extremely rare; extracted from U ore waste; gram quantities exist |
| 99 | Einsteinium | 1e10 | mg quantities from HFIR reactor campaigns at Oak Ridge |
| 100 | Fermium | 1e17 | Picogram quantities from HFIR; requires multiple neutron captures past Cf |
| 101 | Mendelevium | 1e19 | Femtogram quantities; accelerator bombardment of Es targets |
| 102 | Nobelium | 1e19 | Atoms only; accelerator + Cf-249 target |
| 103 | Lawrencium | 1e19 | Atoms only; accelerator + Cf/Bk target |
| 104 | Rutherfordium | 1e25 | σ ≈ nanobarns; thousands of atoms produced over decades |
| 105 | Dubnium | 1e25 | σ ≈ nanobarns; thousands of atoms |
| 106 | Seaborgium | 1e26 | σ ≈ 0.3 nb; hundreds of atoms |
| 107 | Bohrium | 1e27 | σ ≈ picobarns; hundreds of atoms |
| 108 | Hassium | 1e27 | σ ≈ 20 pb; hundreds of atoms |
| 109 | Meitnerium | 1e28 | σ ≈ picobarns; tens of atoms |
| 110 | Darmstadtium | 1e29 | ~15–20 atoms total; σ sub-picobarn |
| 111 | Roentgenium | 1e29 | ~10 atoms total |
| 112 | Copernicium | 1e29 | ~15 atoms total |
| 113 | Nihonium | 1e31 | ~10 atoms; RIKEN spent ~9 years for 3 atoms |
| 114 | Flerovium | 1e30 | ~20–30 atoms; σ ≈ 5–10 pb |
| 115 | Moscovium | 1e30 | ~100+ atoms; most prolific superheavy |
| 116 | Livermorium | 1e30 | ~15–20 atoms |
| 117 | Tennessine | 1e31 | ~15–20 atoms; requires Bk-249 target ($185B/kg) |
| 118 | Oganesson | 1e31 | ~5–6 atoms ever made; 4 months beam time per campaign |

### Notable pricing quirks

- **Chlorine** ($0.082/kg) and **sulfur** ($0.093/kg) are the cheapest elements by mass.
- **Rhodium** ($147,000/kg) is the most expensive non-radioactive element.
- **Francium** is the most expensive element that could theoretically be "produced" (though only atoms at a time).
- **Radium** has "negative commercial value" — disposal costs exceed any sale price. The estimate here ($10M/kg) reflects the cost of acquiring research-grade Ra-226, not commercial value.
- **Barium** is priced as barite ore, making it appear cheaper than its metallic form would suggest.
- **Gold**'s 2024 price ($75,430/kg) is notably higher than its 2019 peers due to recent price surges.

## UI display

The dropdown shows the date range of the cost data: "Cost per kg (1999–2025)" computed from the min/max of the `cost_date` column. Elements without a `cost_date` (Tier 3 estimates) are excluded from the range.
