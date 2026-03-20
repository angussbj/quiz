# Sources: leaders CSVs

Covers political-leaders.csv, religious-leaders.csv, military-leaders.csv, and cultural-leaders.csv.

## Primary references

Dates were verified against Wikipedia biographies (English) and Encyclopaedia Britannica. For ancient figures, cross-referenced Oxford Classical Dictionary and Cambridge Ancient History where available.

## Corrections made

### cultural-leaders.csv

1. **Virgil** — `end_year` corrected from `19` to `-19`.
   - Virgil (Publius Vergilius Maro) died 19 BCE, not 19 CE. The missing negative sign was a clear data error.
   - Source: all major references agree on 19 BCE (e.g., Encyclopaedia Britannica, Oxford Classical Dictionary).

2. **Ibn Khaldun** — `continent` corrected from `Middle East` to `Africa`.
   - Ibn Khaldun was born in Tunis (present-day Tunisia), North Africa, and is properly classified as an African scholar. The religious-leaders.csv entry for the same figure correctly has `Africa`.
   - Source: Encyclopaedia Britannica; Wikipedia.

## Duplicates across files (expected, not errors)

The following figures appear in more than one leaders file. Dates are consistent across all occurrences.

| Figure | Files |
|---|---|
| Confucius (-551 to -479) | religious-leaders, cultural-leaders |
| Laozi (-601 to -531) | religious-leaders, cultural-leaders |
| Nagarjuna (150–250) | religious-leaders, cultural-leaders |
| Al-Ghazali (1058–1111) | religious-leaders, cultural-leaders |
| Ibn Khaldun (1332–1406) | religious-leaders, cultural-leaders |
| Rumi (1207–1273) | religious-leaders, cultural-leaders |
| Umar ibn al-Khattab (584–644) | political-leaders, religious-leaders |
| Constantine I (272–337) | political-leaders, religious-leaders |
| Julius Caesar (-100 to -44) | political-leaders, military-leaders |
| Alexander the Great (-356 to -323) | political-leaders, military-leaders |
| Chandragupta Maurya (-340 to -297) | political-leaders, military-leaders |
| Genghis Khan (1162–1227) | political-leaders, military-leaders |
| Kublai Khan (1215–1294) | political-leaders, military-leaders |
| Tamerlane (1336–1405) | political-leaders, military-leaders |
| Charlemagne (742–814) | political-leaders, military-leaders |
| Saladin (1137–1193) | political-leaders, military-leaders |
| Mehmed II (1432–1481) | political-leaders, military-leaders |
| Suleiman the Magnificent (1494–1566) | political-leaders, military-leaders |
| Shaka Zulu (1787–1828) | political-leaders, military-leaders |
| George Washington (1732–1799) | political-leaders, military-leaders |
| Simon Bolivar (1783–1830) | political-leaders, military-leaders |

## Notable approximate/disputed dates

- **Homer** (cultural, -800 to -701): dates are entirely uncertain; the range is a conventional placeholder for the late 8th century BCE.
- **Laozi** (-601 to -531): existence and dates disputed by scholars; traditional figures used.
- **Zoroaster** (-628 to -551): dates highly contested; the traditional Zoroastrian chronology is used here.
- **Moses** (-1350 to -1230): approximate dates derived from standard Exodus chronology; historically uncertain.
- **Sun Tzu** (-544 to -496): traditional attribution; historical existence debated.
- **Siddhartha Gautama** (-563 to -483): traditional Theravada dates used; revised scholarly dating (-480 to -400) is also credible.
- **Imhotep** (-2650 to -2600): approximate Old Kingdom dates; exact years unknown.
- **Ramesses II** (-1303 to -1213): birth c. 1303 BCE is standard Egyptological dating.
- **Genghis Khan** (1162–1227): birth year 1162 is traditional; some sources prefer c. 1155–1167.
- **Sitting Bull** (1831–1890): birth year uncertain; 1831 is commonly cited but some sources say 1837.
- **Mansa Musa** (1280–1337): approximate dates; exact years unknown.
- **Cyrus the Great** (-600 to -530): birth c. 600 BCE is approximate; death 530 BCE is well-attested.

## Verification summary

All other dates were checked and confirmed correct against standard references.
