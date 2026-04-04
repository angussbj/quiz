# Country Statistics Source Data

These CSV files provide data for country statistics metrics that are not available
via the World Bank API. They are read by `scripts/enrichBordersWithCountryStats.mjs`.

## Files and Sources

### cia-factbook.csv
- **Columns:** country, median_age, average_elevation_m, highest_point_m, coastline_km
- **Source:** CIA World Factbook (https://www.cia.gov/the-world-factbook/)
- **Data year:** 2024 estimates
- **Download:** Manual compilation from Factbook country pages

### undp-hdi.csv
- **Columns:** country, hdi, mean_years_schooling
- **Source:** UNDP Human Development Report 2023/2024
- **Download:** https://hdr.undp.org/data-center/documentation-and-downloads

### transparency-cpi.csv
- **Columns:** country, cpi_score
- **Source:** Transparency International Corruption Perceptions Index 2023
- **Download:** https://www.transparency.org/cpi2023

### rsf-press-freedom.csv
- **Columns:** country, score
- **Source:** Reporters Without Borders World Press Freedom Index 2024
- **Download:** https://rsf.org/en/index

### eiu-democracy-index.csv
- **Columns:** country, score
- **Source:** The Economist Intelligence Unit Democracy Index 2023
- **Note:** EIU data is partially paywalled; scores from published summary tables

### world-prison-brief.csv
- **Columns:** country, rate_per_100000
- **Source:** World Prison Brief / Institute for Crime & Justice Policy Research
- **Download:** https://www.prisonstudies.org/

### world-happiness-report.csv
- **Columns:** country, score
- **Source:** World Happiness Report 2024
- **Download:** https://worldhappiness.report/

### unesco-whs.csv
- **Columns:** country, count
- **Source:** UNESCO World Heritage List (as of 2024)
- **Download:** https://whc.unesco.org/en/list/

### oecd-oda-given.csv
- **Columns:** country, oda_per_capita_usd
- **Source:** OECD Development Assistance Committee 2023
- **Note:** Only DAC member countries (~30 donor nations)
- **Download:** https://data.oecd.org/oda/net-oda.htm

### climate-data.csv
- **Columns:** country, avg_temperature_c, avg_rainfall_mm
- **Source:** World Bank Climate Change Knowledge Portal (CCKP) / CRU
- **Data period:** 1991-2020 climatological normals
- **Download:** https://climateknowledgeportal.worldbank.org/

### global-peace-index.csv
- **Columns:** country, score
- **Source:** Institute for Economics & Peace, Global Peace Index 2024
- **Download:** https://www.visionofhumanity.org/maps/
