# Sources: geological-eras.csv

## Primary Source

**International Commission on Stratigraphy (ICS) — International Chronostratigraphic Chart v2023/09**
https://stratigraphy.org/chart

The ICS chart is the global standard for geological time boundaries. All period/era boundaries in this file follow ICS 2023 values, stored as negative integers in years (e.g. 538.8 Ma = -538800000).

## Corrections Made

The original data used rounded values that did not match ICS 2023 precisely. The following corrections were applied:

| Entry | Field | Old value | New value | ICS 2023 value |
|---|---|---|---|---|
| proterozoic | end_year | -541000000 | -538800000 | 538.8 Ma |
| phanerozoic | start_year | -541000000 | -538800000 | 538.8 Ma |
| paleozoic | start_year | -541000000 | -538800000 | 538.8 Ma |
| paleozoic | end_year | -252000000 | -251900000 | 251.9 Ma |
| mesozoic | start_year | -252000000 | -251900000 | 251.9 Ma |
| cambrian | start_year | -541000000 | -538800000 | 538.8 Ma |
| cambrian | end_year | -485000000 | -485400000 | 485.4 Ma |
| ordovician | start_year | -485000000 | -485400000 | 485.4 Ma |
| ordovician | end_year | -444000000 | -443800000 | 443.8 Ma |
| silurian | start_year | -444000000 | -443800000 | 443.8 Ma |
| silurian | end_year | -419000000 | -419200000 | 419.2 Ma |
| devonian | start_year | -419000000 | -419200000 | 419.2 Ma |
| devonian | end_year | -359000000 | -358900000 | 358.9 Ma |
| carboniferous | start_year | -359000000 | -358900000 | 358.9 Ma |
| carboniferous | end_year | -299000000 | -298900000 | 298.9 Ma |
| permian | start_year | -299000000 | -298900000 | 298.9 Ma |
| permian | end_year | -252000000 | -251900000 | 251.9 Ma |
| triassic | start_year | -252000000 | -251900000 | 251.9 Ma |
| triassic | end_year | -201000000 | -201400000 | 201.4 Ma |
| jurassic | start_year | -201000000 | -201400000 | 201.4 Ma |
| paleogene | end_year | -23000000 | -23030000 | 23.03 Ma |
| neogene | start_year | -23000000 | -23030000 | 23.03 Ma |
| neogene | end_year | -2600000 | -2580000 | 2.58 Ma |
| quaternary | start_year | -2600000 | -2580000 | 2.58 Ma |
| pleistocene | start_year | -2600000 | -2580000 | 2.58 Ma |

## Notes

- The Hadean (4600–4000 Ma) and Archean (4000–2500 Ma) boundaries are not formally defined on the ICS chart (the Hadean is informal), but the values used here match the widely accepted consensus.
- The Holocene start (~11,700 years ago) is not in Ma and is stored as -11700 (years). This matches the IUGS ratification of 11,700 ± 99 cal yr BP.
- The Cretaceous start (145.0 Ma) and K-Pg boundary (66.0 Ma) are unchanged as the originals were already correct to ICS precision.

---

# Sources: ancient-civilizations.csv and major-empires.csv

## Methodology

Dates are given in years relative to the Common Era. Negative values = BCE. All dates are approximate; historiographical consensus varies, especially for ancient periods. Where multiple scholarly datings exist, the most widely cited range was used.

Primary references:
- Encyclopedia Britannica (britannica.com)
- Oxford Reference / Oxford Classical Dictionary
- The Cambridge Ancient History (Cambridge University Press)
- Wikipedia (cross-checked against primary references above)

---

## ancient-civilizations.csv

### General notes

Start and end years represent the conventional scholarly range for each civilisation's recognisable florescence, not necessarily the first human settlement or last cultural trace. "End" typically means collapse of central political authority, conquest, or absorption.

### Corrections made

| id | Field | Old value | New value | Reason |
|----|-------|-----------|-----------|--------|
| aztec | start_year | -1300 | 1300 | Sign error: the Mexica arrived in the Valley of Mexico ~1248–1325 CE, not 1300 BCE. |
| maya | end_year | 900 | 1524 | 900 is the Classic Maya end date, already covered by the separate `maya-classic` row. The broader `maya` row should extend to the Spanish conquest of the last independent Maya kingdoms (~1524 CE). |

### Row-by-row notes

| id | start_year | end_year | Notes |
|----|-----------|---------|-------|
| sumer | -3500 | -2000 | Sumer as a distinct political-cultural entity is conventionally dated to the Uruk period (~3500 BCE). The end (~2000 BCE) marks the collapse of the Ur III dynasty and the Amorite invasions. |
| ancient-egypt | -3100 | -332 | -3100 = unification under Narmer (First Dynasty). -332 = Alexander the Great's conquest of Egypt. |
| akkadian-empire | -2334 | -2154 | Founding by Sargon of Akkad to final collapse; standard scholarly dates. |
| ur-iii | -2112 | -2004 | Third Dynasty of Ur; collapse after Amorite and Elamite invasions. |
| indus-valley | -3300 | -1300 | Early Harappan phase begins ~3300 BCE; Late Harappan decline ends ~1300 BCE. |
| babylonia | -1894 | -539 | -1894 = founding of the Old Babylonian Empire by Sumuabum; -539 = Cyrus the Great's conquest. Covers multiple Babylonian periods. |
| minoan-civilization | -2700 | -1450 | Pre-Palatial phase begins ~2700 BCE; -1450 marks destruction of the palace at Knossos (likely Mycenaean takeover). Minoan cultural traces continued to ~1100 BCE but centralised civilisation ended ~1450 BCE. |
| shang-dynasty | -1600 | -1046 | Standard dates; -1046 = Zhou conquest at the Battle of Muye. |
| hittite-empire | -1700 | -1200 | Old Hittite Kingdom ~1700 BCE; collapse during the Bronze Age Collapse ~1200 BCE. |
| mycenaean-greece | -1600 | -1100 | Shaft Grave period begins ~1600 BCE; Bronze Age Collapse ~1100 BCE. |
| olmec | -1500 | -400 | San Lorenzo phase ~1500 BCE; La Venta abandonment ~400 BCE. |
| assyria | -2500 | -609 | Early Assyria (city-state) ~2500 BCE; fall of Nineveh to Babylonians and Medes in 612 BCE, final defeat 609 BCE. |
| zhou-dynasty | -1046 | -256 | -1046 = defeat of the Shang; -256 = final Zhou king deposed by Qin. |
| phoenicia | -1500 | -300 | Emergence of distinct Phoenician city-states ~1500 BCE; absorption into Hellenistic world ~300 BCE. |
| ancient-greece | -800 | -146 | Greek Dark Ages end / Archaic period begins ~800 BCE; -146 = Roman conquest of Corinth. |
| kingdom-of-kush | -1070 | -350 | Kush became independent from Egypt ~1070 BCE; -350 BCE reflects the Napatan period peak before the Meroitic shift. |
| vedic-period | -1500 | -500 | Composition of Rigveda ~1500 BCE; end of Vedic period / rise of Mahajanapadas ~500 BCE. |
| chavin-culture | -900 | -200 | Chavin de Huantar flourished ~900–200 BCE. |
| celtic-civilization | -800 | 400 | Hallstatt culture ~800 BCE; Celtic cultures absorbed into Roman and Germanic spheres by ~400 CE. |
| achaemenid-persia | -550 | -330 | -550 = Cyrus the Great defeats the Medes; -330 = death of Darius III, Alexander's conquest complete. |
| moche | -100 | 700 | Moche culture ~100 BCE–700 CE; approximate dates, no written records. |
| maurya-empire | -322 | -185 | -322 = Chandragupta Maurya founds empire; -185 = assassination of Brihadratha, last Mauryan emperor. |
| carthage | -814 | -146 | Traditional founding date (814 BCE); -146 = destruction by Rome (Third Punic War). |
| etruscan-civilization | -900 | -264 | Etruscan city-states ~900 BCE; -264 = fall of Volsinii, last major Etruscan city, to Rome. |
| maya | -2000 | 1524 | Pre-Classic Maya ~2000 BCE; 1524 = fall of the K'iche' and Kaqchikel kingdoms to the Spanish. See corrections table above. |
| roman-republic | -509 | -27 | -509 = traditional founding (expulsion of Tarquinius Superbus); -27 = Augustus becomes first emperor. |
| parthian-empire | -247 | 224 | -247 = Arsaces I founds Parthia; 224 CE = Ardashir I defeats and kills last Parthian king. |
| roman-empire | -27 | 476 | -27 = Augustus; 476 CE = deposition of Romulus Augustulus (Western Roman Empire). |
| han-dynasty | -206 | 220 | -206 = Liu Bang defeats Qin; 220 CE = abdication of Emperor Xian, end of Eastern Han. |
| axum | 100 | 940 | Kingdom of Aksum ~100 CE; fall ~940 CE (traditionally linked to Queen Yodit). |
| tiwanaku | 300 | 1000 | Approximate dates for the Tiwanaku state; collapse ~1000 CE. |
| sassanid-empire | 224 | 651 | 224 CE = Ardashir I defeats Artabanus IV; 651 CE = death of Yazdegerd III, Arab conquest complete. |
| gupta-empire | 320 | 550 | 320 CE = Chandragupta I; ~550 CE = final fragmentation under Huna pressure. |
| srivijaya | 650 | 1275 | ~650 CE = earliest inscriptions; ~1275 CE = collapse under Singhasari attacks. |
| maya-classic | 250 | 900 | Classic Maya period: ~250 CE (earliest Long Count monuments) to ~900 CE (abandonment of southern lowland cities). |
| tang-dynasty | 618 | 907 | 618 CE = Li Yuan founds Tang; 907 CE = Zhu Wen deposes last Tang emperor. |
| khmer-empire | 802 | 1431 | 802 CE = Jayavarman II declares independence; 1431 CE = Thai sack of Angkor. |
| mali-empire | 1235 | 1600 | 1235 CE = Sundiata Keita's victory at Battle of Kirina; ~1600 CE = final fragmentation. |
| viking-age | 793 | 1066 | 793 CE = raid on Lindisfarne; 1066 CE = Battle of Stamford Bridge (conventional end). |
| majapahit | 1293 | 1527 | 1293 CE = founding; ~1527 CE = final collapse under Demak Sultanate pressure. |
| aztec | 1300 | 1521 | Mexica arrive in Valley of Mexico ~1300 CE; Tenochtitlan founded ~1325 CE; Triple Alliance 1428 CE; Spanish conquest 1521 CE. See corrections table above. |
| inca | 1438 | 1533 | 1438 CE = Pachacuti expands and reorganises the empire; 1533 CE = execution of Atahualpa by Pizarro. |
| great-zimbabwe | 1100 | 1450 | ~1100 CE = construction begins; ~1450 CE = abandonment (reasons debated). |
| songhai | 1464 | 1591 | 1464 CE = Sunni Ali takes power; 1591 CE = Battle of Tondibi, Moroccan invasion. |
| benin-kingdom | 1180 | 1897 | ~1180 CE = establishment of the Oba dynasty; 1897 CE = British Punitive Expedition. |
| cahokia | 600 | 1400 | ~600 CE = Emergent Mississippian phase; ~1400 CE = city abandoned. |

---

## major-empires.csv

### General notes

"Empire" is used broadly to include both formal imperial titles and de facto hegemonic polities. Start year is typically the founding or first significant expansion; end year is the conventional collapse, conquest, or dissolution.

### Corrections made

No date errors were found in major-empires.csv. All dates are consistent with standard scholarly sources.

### Row-by-row notes

| id | start_year | end_year | Notes |
|----|-----------|---------|-------|
| akkadian-empire | -2334 | -2154 | See ancient-civilizations notes above. |
| egyptian-new-kingdom | -1550 | -1070 | -1550 = Ahmose I expels the Hyksos; -1070 = end of the Twentieth Dynasty. |
| assyrian-empire | -911 | -609 | -911 = Adad-nirari II begins Neo-Assyrian expansion; -609 = final defeat at Harran. |
| kingdom-of-kush | -1070 | -350 | See ancient-civilizations notes above. |
| babylonian-empire | -605 | -539 | -605 = Nebuchadnezzar II ascends; -539 = Cyrus the Great conquers Babylon. |
| achaemenid-empire | -550 | -330 | See ancient-civilizations notes above. |
| athenian-empire | -477 | -404 | -477 = formation of the Delian League; -404 = defeat in the Peloponnesian War. |
| macedonian-empire | -336 | -323 | -336 = Alexander III becomes king of Macedon; -323 = death of Alexander at Babylon. |
| maurya-empire | -322 | -185 | See ancient-civilizations notes above. |
| seleucid-empire | -312 | -63 | -312 = Seleucus I secures Babylon; -63 = Pompey annexes remaining territory. |
| roman-republic | -509 | -27 | See ancient-civilizations notes above. |
| qin-dynasty | -221 | -206 | -221 = Qin Shi Huang unifies China; -206 = collapse after peasant revolts. |
| han-dynasty | -206 | 220 | See ancient-civilizations notes above. |
| parthian-empire | -247 | 224 | See ancient-civilizations notes above. |
| roman-empire | -27 | 476 | See ancient-civilizations notes above. |
| kingdom-of-aksum | 100 | 940 | See ancient-civilizations (axum) notes above. |
| sassanid-empire | 224 | 651 | See ancient-civilizations notes above. |
| gupta-empire | 320 | 550 | See ancient-civilizations notes above. |
| byzantine-empire | 330 | 1453 | 330 CE = Constantinople founded as imperial capital; 1453 CE = Ottoman conquest of Constantinople. |
| hunnic-empire | 370 | 469 | ~370 CE = Huns cross the Volga; 469 CE = death of Dengizich, final fragmentation. |
| maya-civilization | 250 | 900 | Classic Maya period; see maya-classic notes above. |
| tang-dynasty | 618 | 907 | See ancient-civilizations notes above. |
| umayyad-caliphate | 661 | 750 | 661 CE = Muawiya I becomes caliph; 750 CE = Abbasid Revolution. |
| carolingian-empire | 800 | 888 | 800 CE = Charlemagne crowned Emperor; 888 CE = death of Charles the Fat, final fragmentation. |
| abbasid-caliphate | 750 | 1258 | 750 CE = Abbasid Revolution; 1258 CE = Mongol sack of Baghdad. |
| khmer-empire | 802 | 1431 | See ancient-civilizations notes above. |
| holy-roman-empire | 962 | 1806 | 962 CE = Otto I crowned Emperor; 1806 CE = Francis II dissolves the empire. |
| song-dynasty | 960 | 1279 | 960 CE = Zhao Kuangyin founds Song; 1279 CE = final Song defeat by the Mongols. |
| mali-empire | 1235 | 1600 | See ancient-civilizations notes above. |
| mongol-empire | 1206 | 1368 | 1206 CE = Temujin proclaimed Genghis Khan; 1368 CE = Yuan dynasty (Mongol China) falls to Ming. |
| aztec-empire | 1428 | 1521 | 1428 CE = formation of the Triple Alliance; 1521 CE = Spanish conquest of Tenochtitlan. |
| inca-empire | 1438 | 1533 | See ancient-civilizations (inca) notes above. |
| ming-dynasty | 1368 | 1644 | 1368 CE = Zhu Yuanzhang founds Ming; 1644 CE = Li Zicheng captures Beijing, Qing conquest follows. |
| ottoman-empire | 1299 | 1922 | 1299 CE = conventional founding by Osman I; 1922 CE = abolition of the Sultanate. |
| songhai-empire | 1464 | 1591 | See ancient-civilizations (songhai) notes above. |
| spanish-empire | 1492 | 1898 | 1492 CE = Columbus's voyage; 1898 CE = Spanish-American War (loss of Cuba, Puerto Rico, Philippines). Spain retained some territories after 1898; 1975 is sometimes used for withdrawal from Western Sahara. |
| mughal-empire | 1526 | 1857 | 1526 CE = Battle of Panipat, Babur defeats Ibrahim Lodi; 1857 CE = British depose Bahadur Shah Zafar after the Indian Rebellion. |
| portuguese-empire | 1415 | 1975 | 1415 CE = conquest of Ceuta; 1975 CE = independence of Angola and Mozambique (last major colonies). |
| safavid-empire | 1501 | 1736 | 1501 CE = Ismail I conquers Tabriz; 1736 CE = Nader Shah deposes last Safavid. |
| russian-empire | 1721 | 1917 | 1721 CE = Peter the Great declares Russia an empire; 1917 CE = abdication of Nicholas II. |
| qing-dynasty | 1644 | 1912 | 1644 CE = Shunzhi Emperor enters Beijing; 1912 CE = abdication of Puyi. |
| habsburg-empire | 1526 | 1918 | 1526 CE = Battle of Mohacs, Habsburgs gain Hungary and Bohemia; 1918 CE = dissolution of Austria-Hungary. |
| british-empire | 1583 | 1997 | 1583 CE = Humphrey Gilbert claims Newfoundland; 1997 CE = handover of Hong Kong (last major territory). |
| zulu-kingdom | 1816 | 1897 | 1816 CE = Shaka becomes chief; 1897 CE = British annexation of Zululand. |
| napoleonic-empire | 1804 | 1815 | 1804 CE = Napoleon crowns himself Emperor; 1815 CE = Battle of Waterloo and second abdication. |
| japanese-empire | 1868 | 1945 | 1868 CE = Meiji Restoration; 1945 CE = surrender ending World War II. |
| german-empire | 1871 | 1918 | 1871 CE = proclamation at Versailles; 1918 CE = abdication of Wilhelm II. |
| timurid-empire | 1370 | 1507 | 1370 CE = Timur seizes Samarkand; 1507 CE = Uzbek conquest of Herat. |
| vijayanagara-empire | 1336 | 1646 | 1336 CE = founding by Harihara I and Bukka Raya I; 1646 CE = final dissolution. |
