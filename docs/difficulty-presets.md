# Difficulty presets per quiz

One table per quiz (or quiz base). Each row is one difficulty slot — label, mode, and a short summary of toggles/overrides that the preset sets.

Mode shorthand:
- **MC** — multiple-choice
- **Identify** — click on the element when prompted
- **PR** — prompted-recall (see highlight/dot, name it)
- **FRU** — free-recall-unordered (type names from memory)
- **FRO** — free-recall-ordered (type in sorted order)
- **Locate** — click where the element is on the visualization (no prompt)

Source of truth: `src/quiz-definitions/quizRegistry.ts` — the `difficultyPresets.slots` field on each quiz definition or base object.

---

## Geography

### Capitals (`capitalsQuizBase`)
Applies to: World Capitals, and each regional capitals quiz.

| Label | Mode | Other overrides |
|---|---|---|
| Easy | FRU | flags on map **on**, region colors **off**, city dots **on** |
| Medium | Identify | flags on map **on**, region colors **off**, city dots **on** |
| Hard | PR | flags on map **off**, region colors **off**, city dots **on** |

### Countries (`countriesQuizBase`)
Applies to: World Countries, and each regional countries quiz.

| Label | Mode | Other overrides |
|---|---|---|
| Easy | FRU | flags on map **on** |
| Medium | Identify | flags on map **on** |
| Hard | PR | flags on map **off** |

### Largest Cities
| Label | Mode | Other overrides |
|---|---|---|
| Easy | Identify | flags **off**, region colors **off**, city dots **on**, top **20** cities |
| Medium | FRU | flags **off**, region colors **off**, city dots **on**, top **40** cities |
| Hard | PR | flags **off**, region colors **off**, city dots **on**, top **100** cities |

### World Rivers
| Label | Mode | Other overrides |
|---|---|---|
| Easy | Identify | include smaller rivers **on**; merge tributaries **on**, segments **on**, distributaries **on**; top **20** rivers |
| Medium | FRU | include smaller rivers **on**; merge tributaries **off**, segments **on**, distributaries **on**; top **40** |
| Hard | PR | include smaller rivers **on**; merge tributaries **off**, segments **off**, distributaries **off**; top **100** |

### World Flags
| Label | Mode | Other overrides |
|---|---|---|
| Easy | MC | — |
| Medium | Identify | — |
| Hard | PR | — |

### Subdivisions (`subdivisionsQuizBase`)
Applies to: US States, Indian States, Chinese Provinces, Brazilian States, Russian Subjects, Mexican States, Indonesian Provinces, Japanese Prefectures, Nigerian States.

Uses custom slot labels:

| Label | Mode | Other overrides |
|---|---|---|
| Name from memory | FRU | — |
| Point and click | Identify | — |
| Hard | PR | — |

---

## Science

### Periodic Table
| Label | Mode | Other overrides |
|---|---|---|
| Easy | FRU | symbols **off**, atomic numbers **on**; element data = **half-life**, colors = **category** |
| Medium | FRO | symbols **off**, atomic numbers **on**; order = **atomic number asc**; element data = **half-life**, colors = **category** |
| Hard | PR | symbols **off**, atomic numbers **on**; element data = **year discovered**, colors = **year discovered** |

### Human Bones (3D)
| Label | Mode | Other overrides |
|---|---|---|
| Easy | Identify | hands **off**, feet **off**, teeth **off** |
| Medium | Locate | hands **on**, feet **on**, teeth **off** |
| Hard | FRU | hands **on**, feet **on**, teeth **off** |

---

## History — Timeline quizzes (`timelineQuizBase`)
Applies to: Roman Emperors, Modern History, WWI Timeline, WWII Timeline, Geological Time, Famous Composers, Famous Political Leaders, Famous Religious Leaders, Famous Military Leaders, Famous Cultural Figures, Major Technology Inventions, Species Evolution, Species Evolution (Detailed), Space Exploration Milestones, Major Empires, Ancient Civilizations, Art Movements, Major Pandemics.

| Label | Mode | Other overrides |
|---|---|---|
| Easy | Identify | colours **on**, dates **on** |
| Medium | Identify | colours **off**, dates **on** |
| Hard | PR | colours **off**, dates **on** |

### Scientific Discoveries (timeline with a custom colour toggle key)
| Label | Mode | Other overrides |
|---|---|---|
| Easy | Identify | field colours **on**, dates **on** |
| Medium | Identify | field colours **off**, dates **on** |
| Hard | PR | field colours **off**, dates **on** |

---

## Patterns worth noting

- Almost every quiz escalates **Identify/FRU → PR** for Hard.
- Only the Periodic Table escalates to **free-recall-ordered** (atomic number order) for Medium.
- Only **Human Bones (3D)** uses **Locate** (Medium) and has **FRU** at Hard rather than PR.
- Only **Flags** uses **multiple-choice** (Easy).
- **Subdivisions** is the only quiz with fully custom slot labels and no toggle overrides.
- **Timelines** consistently strip colour hints Medium→Hard while keeping dates on; the colour toggle's key/label differs by quiz (`showColours` / `showFieldColours`, labelled "Front colours" / "Theatre colours" / "Continent colours" / …).
- **Cities** and **Rivers** scale both difficulty AND the count threshold (20 → 40 → 100).
