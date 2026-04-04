import styles from './CountryStatisticsMethodology.module.css';

function ExtLink({ href, children }: { readonly href: string; readonly children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>{children}</a>;
}

export default function CountryStatisticsMethodology() {
  return (
    <div className={styles.page}>

      <h1 className={styles.title}>Country Statistics: Sources and Methodology</h1>
      <p className={styles.subtitle}>
        The World Countries quiz includes 55 sortable metrics covering demographics, economy,
        geography, environment, health, education, governance, and quality of life. Here&rsquo;s
        where the data comes from.
      </p>

      <div className={styles.callout}>
        <p>
          Data coverage varies by metric. Population and land area cover 99% of sovereign
          countries; government debt covers only 32%. Missing values can be excluded, placed
          first, or placed last using the &ldquo;Missing values&rdquo; control.
        </p>
      </div>

      {/* Demographics */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Demographics</h2>
        <table className={styles.table}>
          <thead>
            <tr><th>Metric</th><th>Source</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Population</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SP.POP.TOTL">World Bank</ExtLink></td>
              <td>Total population, most recent year available</td>
            </tr>
            <tr>
              <td>Population density</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/EN.POP.DNST">World Bank</ExtLink></td>
              <td>People per km&sup2; of land area</td>
            </tr>
            <tr>
              <td>Population growth</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SP.POP.GROW">World Bank</ExtLink></td>
              <td>Annual percentage growth rate</td>
            </tr>
            <tr>
              <td>Median age</td>
              <td><ExtLink href="https://www.cia.gov/the-world-factbook/">CIA World Factbook</ExtLink></td>
              <td>2024 estimates</td>
            </tr>
            <tr>
              <td>Urban population</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS">World Bank</ExtLink></td>
              <td>Percentage of total population living in urban areas</td>
            </tr>
            <tr>
              <td>Fertility rate</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SP.DYN.TFRT.IN">World Bank</ExtLink></td>
              <td>Births per woman (total fertility rate)</td>
            </tr>
            <tr>
              <td>Net migration</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SM.POP.NETM">World Bank</ExtLink></td>
              <td>Net number of migrants (positive = immigration exceeds emigration)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Economy */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Economy</h2>
        <table className={styles.table}>
          <thead>
            <tr><th>Metric</th><th>Source</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>GDP nominal</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/NY.GDP.MKTP.CD">World Bank</ExtLink></td>
              <td>Current USD</td>
            </tr>
            <tr>
              <td>GDP per capita</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/NY.GDP.PCAP.CD">World Bank</ExtLink></td>
              <td>Current USD</td>
            </tr>
            <tr>
              <td>GDP PPP per capita</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/NY.GDP.PCAP.PP.CD">World Bank</ExtLink></td>
              <td>Purchasing power parity adjusted, current international $</td>
            </tr>
            <tr>
              <td>GDP growth</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG">World Bank</ExtLink></td>
              <td>Annual % growth of real GDP</td>
            </tr>
            <tr>
              <td>Gini coefficient</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SI.POV.GINI">World Bank</ExtLink></td>
              <td>0 = perfect equality, 100 = maximum inequality. ~75% coverage.</td>
            </tr>
            <tr>
              <td>Unemployment rate</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS">World Bank</ExtLink></td>
              <td>ILO modelled estimates</td>
            </tr>
            <tr>
              <td>Inflation rate</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG">World Bank</ExtLink></td>
              <td>Annual % change in consumer prices</td>
            </tr>
            <tr>
              <td>Government debt</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/GC.DOD.TOTL.GD.ZS">World Bank</ExtLink></td>
              <td>Central government debt as % of GDP. Low coverage (~32%).</td>
            </tr>
            <tr>
              <td>Tax revenue</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/GC.TAX.TOTL.GD.ZS">World Bank</ExtLink></td>
              <td>Tax revenue as % of GDP</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Geography & Environment */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Geography &amp; Environment</h2>
        <table className={styles.table}>
          <thead>
            <tr><th>Metric</th><th>Source</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Land area</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/AG.LND.TOTL.K2">World Bank</ExtLink></td>
              <td>km&sup2;, excludes inland water bodies</td>
            </tr>
            <tr>
              <td>Average elevation</td>
              <td><ExtLink href="https://www.cia.gov/the-world-factbook/">CIA World Factbook</ExtLink></td>
              <td>Mean elevation in metres above sea level</td>
            </tr>
            <tr>
              <td>Highest point</td>
              <td><ExtLink href="https://www.cia.gov/the-world-factbook/">CIA World Factbook</ExtLink></td>
              <td>Elevation in metres of the highest point in the country</td>
            </tr>
            <tr>
              <td>Coastline</td>
              <td><ExtLink href="https://www.cia.gov/the-world-factbook/">CIA World Factbook</ExtLink></td>
              <td>Total coastline length in km (0 for landlocked countries)</td>
            </tr>
            <tr>
              <td>Forest cover</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/AG.LND.FRST.ZS">World Bank</ExtLink></td>
              <td>Forest area as % of land area</td>
            </tr>
            <tr>
              <td>Average temperature</td>
              <td><ExtLink href="https://climateknowledgeportal.worldbank.org/">World Bank CCKP / CRU</ExtLink></td>
              <td>1991&ndash;2020 climatological normal, &deg;C</td>
            </tr>
            <tr>
              <td>Average rainfall</td>
              <td><ExtLink href="https://climateknowledgeportal.worldbank.org/">World Bank CCKP / CRU</ExtLink></td>
              <td>1991&ndash;2020 climatological normal, mm/year</td>
            </tr>
            <tr>
              <td>CO&sub2; per capita</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/EN.GHG.CO2.PC.CE.AR5">World Bank</ExtLink></td>
              <td>CO&sub2; emissions excluding LULUCF, tonnes per capita (AR5)</td>
            </tr>
            <tr>
              <td>CO&sub2; total</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/EN.GHG.CO2.MT.CE.AR5">World Bank</ExtLink></td>
              <td>CO&sub2; emissions excluding LULUCF, megatonnes (AR5)</td>
            </tr>
            <tr>
              <td>PM2.5</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/EN.ATM.PM25.MC.M3">World Bank</ExtLink></td>
              <td>Mean annual exposure to PM2.5 air pollution, &micro;g/m&sup3;</td>
            </tr>
            <tr>
              <td>Renewable energy</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/EG.FEC.RNEW.ZS">World Bank</ExtLink></td>
              <td>Renewable energy consumption as % of total final energy</td>
            </tr>
            <tr>
              <td>Protected land area</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/ER.PTD.TOTL.ZS">World Bank</ExtLink></td>
              <td>Terrestrial and marine protected areas as % of total territorial area</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Health */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Health</h2>
        <table className={styles.table}>
          <thead>
            <tr><th>Metric</th><th>Source</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Life expectancy</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SP.DYN.LE00.IN">World Bank</ExtLink></td>
              <td>Life expectancy at birth, both sexes combined</td>
            </tr>
            <tr>
              <td>Infant mortality</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SP.DYN.IMRT.IN">World Bank</ExtLink></td>
              <td>Deaths per 1,000 live births (under age 1)</td>
            </tr>
            <tr>
              <td>Child mortality</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SH.DYN.MORT">World Bank</ExtLink></td>
              <td>Deaths per 1,000 live births (under age 5)</td>
            </tr>
            <tr>
              <td>Maternal mortality</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SH.STA.MMRT">World Bank</ExtLink></td>
              <td>Deaths per 100,000 live births</td>
            </tr>
            <tr>
              <td>Health expenditure</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SH.XPD.CHEX.GD.ZS">World Bank</ExtLink></td>
              <td>Current health expenditure as % of GDP</td>
            </tr>
            <tr>
              <td>Physicians</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SH.MED.PHYS.ZS">World Bank</ExtLink></td>
              <td>Medical doctors per 1,000 people</td>
            </tr>
            <tr>
              <td>Hospital beds</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SH.MED.BEDS.ZS">World Bank</ExtLink></td>
              <td>Hospital beds per 1,000 people. ~80% coverage.</td>
            </tr>
            <tr>
              <td>Obesity rate</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SH.STA.OWAD.ZS">World Bank</ExtLink></td>
              <td>Prevalence of overweight adults (BMI &ge; 25), %</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Education & Development */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Education &amp; Development</h2>
        <table className={styles.table}>
          <thead>
            <tr><th>Metric</th><th>Source</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Human Development Index</td>
              <td><ExtLink href="https://hdr.undp.org/data-center/documentation-and-downloads">UNDP</ExtLink></td>
              <td>Composite index (0&ndash;1) of life expectancy, education, and income</td>
            </tr>
            <tr>
              <td>Literacy rate</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SE.ADT.LITR.ZS">World Bank / UNESCO</ExtLink></td>
              <td>Adult literacy rate (% of people aged 15+). ~59% coverage.</td>
            </tr>
            <tr>
              <td>Mean years of schooling</td>
              <td><ExtLink href="https://hdr.undp.org/data-center/documentation-and-downloads">UNDP</ExtLink></td>
              <td>Average years of education received by people aged 25+</td>
            </tr>
            <tr>
              <td>Education expenditure</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/SE.XPD.TOTL.GD.ZS">World Bank</ExtLink></td>
              <td>Government expenditure on education as % of GDP</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Governance & Security */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Governance &amp; Security</h2>
        <table className={styles.table}>
          <thead>
            <tr><th>Metric</th><th>Source</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Military expenditure (% GDP)</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/MS.MIL.XPND.GD.ZS">World Bank / SIPRI</ExtLink></td>
              <td>Military spending as a share of GDP</td>
            </tr>
            <tr>
              <td>Military expenditure per capita</td>
              <td>Derived</td>
              <td>Total military expenditure (USD) divided by population</td>
            </tr>
            <tr>
              <td>Corruption Perceptions Index</td>
              <td><ExtLink href="https://www.transparency.org/cpi2023">Transparency International</ExtLink></td>
              <td>Score 0&ndash;100 (100 = least corrupt). CPI 2023.</td>
            </tr>
            <tr>
              <td>Press Freedom Index</td>
              <td><ExtLink href="https://rsf.org/en/index">Reporters Without Borders</ExtLink></td>
              <td>Score 0&ndash;100 (100 = most free). 2024 Index.</td>
            </tr>
            <tr>
              <td>Democracy Index</td>
              <td><ExtLink href="https://www.eiu.com/n/campaigns/democracy-index-2023/">EIU</ExtLink></td>
              <td>Score 0&ndash;10 (10 = full democracy). 2023 Index. ~89% coverage.</td>
            </tr>
            <tr>
              <td>Homicide rate</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/VC.IHR.PSRC.P5">World Bank / UNODC</ExtLink></td>
              <td>Intentional homicides per 100,000 people</td>
            </tr>
            <tr>
              <td>Incarceration rate</td>
              <td><ExtLink href="https://www.prisonstudies.org/">World Prison Brief</ExtLink></td>
              <td>Prison population per 100,000 people</td>
            </tr>
            <tr>
              <td>Global Peace Index</td>
              <td><ExtLink href="https://www.visionofhumanity.org/maps/">IEP</ExtLink></td>
              <td>Score (lower = more peaceful). 2024 Index. ~88% coverage.</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Aid */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Aid &amp; Development Assistance</h2>
        <table className={styles.table}>
          <thead>
            <tr><th>Metric</th><th>Source</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Foreign aid given per capita</td>
              <td><ExtLink href="https://data.oecd.org/oda/net-oda.htm">OECD DAC</ExtLink></td>
              <td>ODA disbursements per capita, USD. Only ~32 DAC donor countries.</td>
            </tr>
            <tr>
              <td>Foreign aid received per capita</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/DT.ODA.ODAT.PC.ZS">World Bank</ExtLink></td>
              <td>Net ODA received per capita, USD. Only developing countries.</td>
            </tr>
          </tbody>
        </table>
        <div className={styles.callout}>
          <p>
            Aid metrics have large gaps by design: ODA given only applies to ~32 donor
            nations, and ODA received only applies to developing countries. Most countries
            will show as missing for one or both metrics.
          </p>
        </div>
      </div>

      {/* Quality of Life */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quality of Life &amp; Culture</h2>
        <table className={styles.table}>
          <thead>
            <tr><th>Metric</th><th>Source</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Happiness score</td>
              <td><ExtLink href="https://worldhappiness.report/">World Happiness Report</ExtLink></td>
              <td>Cantril ladder score 0&ndash;10. 2024 report. ~82% coverage.</td>
            </tr>
            <tr>
              <td>Internet users</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/IT.NET.USER.ZS">World Bank / ITU</ExtLink></td>
              <td>Individuals using the Internet as % of population</td>
            </tr>
            <tr>
              <td>Mobile subscriptions</td>
              <td><ExtLink href="https://data.worldbank.org/indicator/IT.CEL.SETS.P2">World Bank / ITU</ExtLink></td>
              <td>Mobile cellular subscriptions per 100 people</td>
            </tr>
            <tr>
              <td>Tourism per capita</td>
              <td>Derived from <ExtLink href="https://data.worldbank.org/indicator/ST.INT.ARVL">World Bank</ExtLink></td>
              <td>International tourism arrivals divided by population</td>
            </tr>
            <tr>
              <td>UNESCO World Heritage Sites</td>
              <td><ExtLink href="https://whc.unesco.org/en/list/">UNESCO</ExtLink></td>
              <td>Total number of inscribed World Heritage Sites as of 2024</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Data freshness */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Freshness</h2>
        <p className={styles.paragraph}>
          World Bank data is fetched using a 2015&ndash;2024 date range; the most recent
          available year is used per country and metric. Non-World-Bank sources use the
          latest published edition (typically 2023 or 2024).
        </p>
        <p className={styles.paragraph}>
          Some metrics (literacy rate, hospital beds, Gini coefficient) have significant
          reporting lags &mdash; the &ldquo;most recent&rdquo; data point for a country
          may be several years old. This is a known limitation of cross-country statistical
          comparison.
        </p>
      </div>

    </div>
  );
}
