# Sources: space-milestones.csv

## Primary Reference Sources

- **NASA Space Science Data Coordinated Archive (NSSDC)** — https://nssdc.gsfc.nasa.gov/
  Authoritative mission dates, launch times, and orbital insertion dates for NASA and international missions.

- **NASA History Division** — https://history.nasa.gov/
  Chronology of human spaceflight, Apollo mission records, Shuttle program history.

- **JPL Mission and Spacecraft Library** — https://space.jpl.nasa.gov/
  Planetary mission timelines including Mariner, Viking, Voyager, Cassini, and Mars rover missions.

- **Wikipedia — List of spaceflight records** and individual mission articles
  Used for cross-checking dates and alternate names. Dates verified against primary NASA/ESA/Roscosmos sources.

- **ESA mission archives** — https://www.esa.int/
  Rosetta/Philae comet mission, Huygens Titan landing.

- **Roscosmos / Soviet space program records**
  Vostok, Voskhod, Luna, Venera, Sputnik, Salyut, Mir mission dates.

## Corrections Made

### 1. Mariner 9 orbital insertion date (row: mariner-9)
- **Was:** `1971,11,13` (13 November 1971)
- **Corrected to:** `1971,11,14` (14 November 1971)
- **Reason:** Mariner 9 entered Mars orbit on 14 November 1971, not the 13th. The 13th was the day of closest approach during the capture maneuver; orbital insertion was confirmed on the 14th. Source: NASA NSSDC Mariner 9 record.

### 2. Venera 3 alternate label (row: venera-3)
- **Was:** `First Spacecraft to Impact Another Planet|First Mars Impact`
- **Corrected to:** `First Spacecraft to Impact Another Planet|First Venus Impact`
- **Reason:** Venera 3 impacted Venus on 1 March 1966, not Mars. The label "First Mars Impact" was a factual error — Venera was the Soviet Venus probe program. Source: NASA NSSDC Venera 3 record.

## Notes on Event Scope

- **Apollo 11** (id: apollo-11-moon-landing): The CSV uses start_date = 20 July 1969 (lunar landing) and end_date = 24 July 1969 (Pacific splashdown). The launch date of 16 July 1969 is not used as the start because the event is specifically the Moon landing, not the mission duration. This is consistent with the event name "Apollo 11 Moon Landing".

- **Voyager 1 Interstellar Space** (id: voyager-1-interstellar): Date 25 August 2012 is correct. NASA officially confirmed Voyager 1 crossed the heliopause on this date (announcement came in September 2013, but the crossing date is 25 August 2012).

- **Pioneer 11**: Not included in the CSV. Pioneer 11 launched 5 April 1973 and was the second spacecraft to visit Jupiter and the first to visit Saturn. Could be added in a future revision.
