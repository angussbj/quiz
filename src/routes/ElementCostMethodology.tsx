import styles from './ElementCostMethodology.module.css';

function ExtLink({ href, children }: { readonly href: string; readonly children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>{children}</a>;
}

export default function ElementCostMethodology() {
  return (
    <div className={styles.page}>
      <a href="#" onClick={(e) => { e.preventDefault(); history.back(); }} className={styles.backLink}>
        &larr; Back
      </a>

      <h1 className={styles.title}>How We Calculated Element Costs</h1>
      <p className={styles.subtitle}>
        Every element has a price &mdash; from chlorine at 8 cents a kilogram to oganesson
        at roughly $10,000,000,000,000,000,000,000,000,000,000 per kilogram. Here's how we
        arrived at these numbers.
      </p>

      {/* Three tiers overview */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Three Tiers of Data</h2>
        <p className={styles.paragraph}>
          We categorise element prices into three tiers based on how confident we are in
          the number. Each tier is shown with a different marker in the data:
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tier</th>
              <th>Marker</th>
              <th>Meaning</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className={`${styles.tierBadge} ${styles.tierMarket}`}>Market</span></td>
              <td>Plain number</td>
              <td>Commodity or exchange price from a major market</td>
              <td>Copper: $6.00/kg</td>
            </tr>
            <tr>
              <td><span className={`${styles.tierBadge} ${styles.tierApproximate}`}>Approximate</span></td>
              <td><span className={styles.mono}>~</span> prefix</td>
              <td>Published but from a specialty supplier, older data, or institutional cost</td>
              <td>Scandium: ~$3,460/kg</td>
            </tr>
            <tr>
              <td><span className={`${styles.tierBadge} ${styles.tierEstimate}`}>Estimate</span></td>
              <td><span className={styles.mono}>~</span> prefix + <span className={styles.mono}>?</span> suffix</td>
              <td>Order-of-magnitude estimate based on production costs; no published price</td>
              <td>Oganesson: ~$10<sup>31</sup>/kg?</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tier 1 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Tier 1: Market Prices</h2>
        <p className={styles.paragraph}>
          Most elements (about 75 of 118) have real market prices. These come from commodity
          exchanges and government surveys, aggregated
          by <ExtLink href="https://en.wikipedia.org/wiki/Prices_of_chemical_elements">Wikipedia's price table</ExtLink>,
          which draws from:
        </p>
        <ul className={styles.list}>
          <li>
            <ExtLink href="https://en.wikipedia.org/wiki/United_States_Geological_Survey">USGS Mineral Commodity Summaries</ExtLink> &mdash;
            the US government's annual survey of metal and mineral prices. Covers most industrial metals.
          </li>
          <li>
            <ExtLink href="https://en.wikipedia.org/wiki/London_Metal_Exchange">London Metal Exchange (LME)</ExtLink> &mdash;
            real-time exchange prices for Cu, Zn, Ni, Sn, Pb, Al, and Co.
          </li>
          <li>
            <ExtLink href="https://en.wikipedia.org/wiki/London_bullion_market">London Bullion Market (LBMA)</ExtLink> &mdash;
            daily fix prices for Au, Ag, Pt, and Pd.
          </li>
          <li>
            Industrial gas and chemical suppliers &mdash; for H, N, O, Cl, F, noble gases.
          </li>
        </ul>
        <p className={styles.paragraph}>
          Prices are for the <strong>cheapest commercially available form</strong> of each element,
          expressed as cost per kilogram of <em>contained element</em>. For example:
        </p>
        <ul className={styles.list}>
          <li>
            <ExtLink href="https://en.wikipedia.org/wiki/Carbon">Carbon</ExtLink> is priced as anthracite coal (~90% carbon) at $0.12/kg,
            not as diamond ($62,000/kg) or graphene ($100,000+/kg).
          </li>
          <li>
            <ExtLink href="https://en.wikipedia.org/wiki/Barium">Barium</ExtLink> is priced as barite ore
            (<ExtLink href="https://en.wikipedia.org/wiki/Baryte">BaSO<sub>4</sub></ExtLink>) at $0.25/kg of contained Ba,
            not as pure metallic barium (which would cost significantly more).
          </li>
          <li>
            <ExtLink href="https://en.wikipedia.org/wiki/Hydrogen">Hydrogen</ExtLink> is priced from steam methane
            reforming at $1.39/kg &mdash; the cheapest industrial production method.
          </li>
        </ul>

        <div className={styles.callout}>
          <p>
            <strong>Why not current prices?</strong> Commodity prices change daily. Our data spans
            2001&ndash;2025, with most values from 2019&ndash;2020. Gold's 2024 price ($75,430/kg) is
            notably higher than its 2019 level due to recent price surges. For a
            periodic table visualisation, the relative ordering matters more than exact spot
            prices.
          </p>
        </div>

        <h3>Interesting Tier 1 prices</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Element</th>
              <th>Price</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><ExtLink href="https://en.wikipedia.org/wiki/Chlorine">Chlorine</ExtLink></td>
              <td>$0.082/kg</td>
              <td>Cheapest element by mass (tied with sulfur)</td>
            </tr>
            <tr>
              <td><ExtLink href="https://en.wikipedia.org/wiki/Rhodium">Rhodium</ExtLink></td>
              <td>$147,000/kg</td>
              <td>Most expensive non-radioactive element. Critical for catalytic converters.</td>
            </tr>
            <tr>
              <td><ExtLink href="https://en.wikipedia.org/wiki/Iron">Iron</ExtLink></td>
              <td>$0.42/kg</td>
              <td>Most produced metal on Earth &mdash; 1.8 billion tonnes per year</td>
            </tr>
            <tr>
              <td><ExtLink href="https://en.wikipedia.org/wiki/Gold">Gold</ExtLink></td>
              <td>$75,430/kg</td>
              <td>Only the 4th most expensive non-radioactive element (behind Rh, Ir, Pd)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tier 2 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Tier 2: Approximate Prices</h2>
        <p className={styles.paragraph}>
          About 20 elements have published prices that are less reliable &mdash; either
          from very small markets, specialty chemical suppliers, data that's over a decade old,
          or institutional production costs from national laboratories.
        </p>

        <h3>Specialty chemicals</h3>
        <p className={styles.paragraph}>
          Elements like <ExtLink href="https://en.wikipedia.org/wiki/Rubidium">rubidium</ExtLink> (~$15,500/kg)
          and <ExtLink href="https://en.wikipedia.org/wiki/Caesium">cesium</ExtLink> (~$61,800/kg) are
          priced as lab-grade metals from specialty suppliers. These prices can vary widely between
          vendors and don't have the liquidity of exchange-traded commodities.
        </p>

        <h3>Noble gases</h3>
        <p className={styles.paragraph}>
          <ExtLink href="https://en.wikipedia.org/wiki/Neon">Neon</ExtLink> (~$240/kg),{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Krypton">krypton</ExtLink> (~$290/kg), and{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Xenon">xenon</ExtLink> (~$1,800/kg) have real
          industrial markets (lighting, insulating windows, anaesthesia), but our price data is from
          1999 &mdash; now over 25 years old.
        </p>

        <h3>Transuranic elements from Oak Ridge</h3>
        <p className={styles.paragraph}>
          The <ExtLink href="https://en.wikipedia.org/wiki/Oak_Ridge_National_Laboratory">Oak Ridge National Laboratory</ExtLink> (ORNL)
          in Tennessee operates the{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/High_Flux_Isotope_Reactor">High Flux Isotope Reactor</ExtLink> (HFIR),
          which produces transuranic elements by bombarding targets with neutrons. ORNL publishes
          production cost schedules for isotopes it can supply:
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Element</th>
              <th>Isotope</th>
              <th>Price</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><ExtLink href="https://en.wikipedia.org/wiki/Neptunium">Neptunium</ExtLink></td>
              <td>Np-237</td>
              <td>~$660,000/kg</td>
              <td>By-product of plutonium production</td>
            </tr>
            <tr>
              <td><ExtLink href="https://en.wikipedia.org/wiki/Plutonium">Plutonium</ExtLink></td>
              <td>Pu-239</td>
              <td>~$6.5M/kg</td>
              <td>Certified reference material price</td>
            </tr>
            <tr>
              <td><ExtLink href="https://en.wikipedia.org/wiki/Californium">Californium</ExtLink></td>
              <td>Cf-252</td>
              <td>~$60B/kg</td>
              <td>Used in neutron sources; only ~0.5g produced per year worldwide</td>
            </tr>
            <tr>
              <td><ExtLink href="https://en.wikipedia.org/wiki/Berkelium">Berkelium</ExtLink></td>
              <td>Bk-249</td>
              <td>~$185B/kg</td>
              <td>Requires months of reactor irradiation to produce milligrams</td>
            </tr>
            <tr>
              <td><ExtLink href="https://en.wikipedia.org/wiki/Polonium">Polonium</ExtLink></td>
              <td>Po-209</td>
              <td>~$49T/kg</td>
              <td>Made by bombarding bismuth in a reactor</td>
            </tr>
          </tbody>
        </table>
        <p className={styles.paragraph}>
          These prices are from the{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/CRC_Handbook_of_Chemistry_and_Physics">CRC Handbook</ExtLink> and
          ORNL catalogues, mostly dated 2003&ndash;2004. They represent actual institutional costs,
          not market prices.
        </p>
      </div>

      {/* Tier 3 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Tier 3: Estimated Production Costs</h2>
        <p className={styles.paragraph}>
          For about 20 elements &mdash; the short-lived radioactive elements and the superheavy
          elements created in particle accelerators &mdash; no price has ever been published.
          We estimated costs based on what it takes to produce them.
        </p>

        <h3>The estimation formula</h3>
        <div className={styles.callout}>
          <p>
            <strong>Cost per kg</strong> = (experiment cost) &divide; (atoms produced &times; mass per atom)
          </p>
          <p style={{ marginTop: '8px' }}>
            where mass per atom = atomic weight &times; 1.66 &times; 10<sup>&minus;27</sup> kg
          </p>
        </div>
        <p className={styles.paragraph}>
          The inputs are:
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Accelerator beam time</strong>: ~$50,000&ndash;$150,000 per day to operate a
            heavy-ion facility like <ExtLink href="https://en.wikipedia.org/wiki/Joint_Institute_for_Nuclear_Research">JINR Dubna</ExtLink>,{' '}
            <ExtLink href="https://en.wikipedia.org/wiki/GSI_Helmholtz_Centre_for_Heavy_Ion_Research">GSI Darmstadt</ExtLink>, or{' '}
            <ExtLink href="https://en.wikipedia.org/wiki/RIKEN">RIKEN</ExtLink> (inferred from
            institutional budgets and power consumption).
          </li>
          <li>
            <strong>Target material</strong>: ranges from cheap
            (<ExtLink href="https://en.wikipedia.org/wiki/Bismuth">bismuth</ExtLink> at $6/kg) to
            extremely expensive
            (<ExtLink href="https://en.wikipedia.org/wiki/Californium">californium-249</ExtLink> at $185B/kg).
          </li>
          <li>
            <strong><ExtLink href="https://en.wikipedia.org/wiki/Nuclear_cross_section">Production cross-section</ExtLink></strong>:
            the probability that a beam ion and a target atom will fuse. This drops
            dramatically with atomic number &mdash; from{' '}
            <ExtLink href="https://en.wikipedia.org/wiki/Barn_(unit)">nanobarns</ExtLink> for elements 104&ndash;108,
            to picobarns for 109&ndash;112, to sub-picobarns for 113&ndash;118. Each order of magnitude
            drop means roughly 10&times; more beam time per atom.
          </li>
          <li>
            <strong>Total atoms produced</strong>: from thousands
            (<ExtLink href="https://en.wikipedia.org/wiki/Rutherfordium">rutherfordium</ExtLink>) down to about 5
            (<ExtLink href="https://en.wikipedia.org/wiki/Oganesson">oganesson</ExtLink>).
          </li>
        </ul>

        <h3>The superheavy elements</h3>
        <p className={styles.paragraph}>
          The{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Superheavy_element">superheavy elements</ExtLink> (104&ndash;118)
          are created in particle accelerators by smashing lighter atoms together. Here's how the
          costs scale:
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Group</th>
              <th>Cross-section</th>
              <th>Atoms made</th>
              <th>Est. cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Elements 104&ndash;108</td>
              <td>~nanobarns</td>
              <td>Hundreds to thousands</td>
              <td>~$10<sup>25</sup>&ndash;10<sup>27</sup>/kg</td>
            </tr>
            <tr>
              <td>Elements 109&ndash;112</td>
              <td>~picobarns</td>
              <td>Tens</td>
              <td>~$10<sup>28</sup>&ndash;10<sup>29</sup>/kg</td>
            </tr>
            <tr>
              <td>Elements 113&ndash;118</td>
              <td>Sub-picobarns</td>
              <td>5&ndash;30</td>
              <td>~$10<sup>30</sup>&ndash;10<sup>31</sup>/kg</td>
            </tr>
          </tbody>
        </table>

        <h3>Case study: Oganesson</h3>
        <p className={styles.paragraph}>
          <ExtLink href="https://en.wikipedia.org/wiki/Oganesson">Oganesson</ExtLink> (element 118)
          is the most expensive substance ever created. Here's the calculation:
        </p>
        <ul className={styles.list}>
          <li>The discovery experiment at JINR required <strong>4 months of continuous beam</strong> and 2.5 &times; 10<sup>19</sup> calcium-48 ions</li>
          <li>Estimated experiment cost: ~$10&ndash;20 million (accelerator + californium-249 target)</li>
          <li>Atoms produced: ~3</li>
          <li>Mass of 3 atoms at 294 amu: 3 &times; 294 &times; 1.66 &times; 10<sup>&minus;27</sup> kg = 1.5 &times; 10<sup>&minus;24</sup> kg</li>
          <li>Cost per kg: ~$15M &divide; 1.5 &times; 10<sup>&minus;24</sup> kg = <strong>~$10<sup>31</sup>/kg</strong></li>
        </ul>
        <p className={styles.paragraph}>
          That's ten nonillion dollars per kilogram. For context, the entire world's GDP is about $10<sup>14</sup> &mdash; you'd
          need the combined economic output of Earth for about 100 quadrillion years to buy a kilogram of oganesson.
        </p>

        <h3>Case study: Nihonium</h3>
        <p className={styles.paragraph}>
          <ExtLink href="https://en.wikipedia.org/wiki/Nihonium">Nihonium</ExtLink> (element 113)
          was synthesised at <ExtLink href="https://en.wikipedia.org/wiki/RIKEN">RIKEN</ExtLink> in Japan.
          The team spent about <strong>9 years</strong> of intermittent beam time to produce
          just 3 atoms (in 2004, 2005, and 2012). At an estimated $5M/year in beam time, that's
          roughly $45 million for 3 atoms of a substance with a half-life of 9.5 seconds.
        </p>

        <h3>Case study: Tennessine</h3>
        <p className={styles.paragraph}>
          <ExtLink href="https://en.wikipedia.org/wiki/Tennessine">Tennessine</ExtLink> (element 117) is notable because
          its target material &mdash;{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Berkelium">berkelium-249</ExtLink> &mdash; was itself
          extraordinarily expensive and difficult to produce. ORNL irradiated targets in the HFIR
          for <strong>250 days</strong>, followed by 90 days of cooling and 90 days of chemical
          separation, to extract 22 milligrams of Bk-249 at a cost of roughly $3.5 million. This
          material was then shipped to JINR in Russia, where it was bombarded for months to produce
          about 6 atoms of tennessine.
        </p>
      </div>

      {/* Edge cases */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Edge Cases and Curiosities</h2>

        <h3>Francium: the rarest natural element</h3>
        <p className={styles.paragraph}>
          <ExtLink href="https://en.wikipedia.org/wiki/Francium">Francium</ExtLink> is the most
          unstable naturally occurring element, with a half-life of just 22 minutes. Only about
          20&ndash;30 grams exist in the Earth's crust at any moment (produced by the radioactive
          decay of actinium). Scientists produce it in accelerators by nuclear reactions, yielding
          about 200,000 atoms per batch &mdash; which is approximately 10<sup>&minus;16</sup> grams.
          Our estimate of ~$10<sup>23</sup>/kg reflects the cost of those accelerator runs divided
          by the vanishingly small mass produced.
        </p>

        <h3>Radium: from treasure to liability</h3>
        <p className={styles.paragraph}>
          In the 1920s, <ExtLink href="https://en.wikipedia.org/wiki/Radium">radium</ExtLink> was
          worth over $100,000 per gram &mdash; one of the most valuable substances on Earth, used
          for cancer treatment and luminous paint. Today it has what economists call a "negative
          price": facilities pay to dispose of it due to its radioactivity. Our estimate
          (~$10<sup>7</sup>/kg) reflects the cost of acquiring research-grade Ra-226 for scientific
          use, not its commercial value.
        </p>

        <h3>Astatine: produced for medicine</h3>
        <p className={styles.paragraph}>
          <ExtLink href="https://en.wikipedia.org/wiki/Astatine">Astatine-211</ExtLink> is being
          actively researched for{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Targeted_alpha-particle_therapy">targeted alpha therapy</ExtLink> in
          cancer treatment. It's produced at cyclotron facilities
          like <ExtLink href="https://en.wikipedia.org/wiki/TRIUMF">TRIUMF</ExtLink> by
          bombarding bismuth with alpha particles, yielding about 0.1&ndash;0.5 micrograms per run.
          With an 8.1-hour half-life, it must be used almost immediately after production.
          Our estimate (~$10<sup>12</sup>/kg) reflects cyclotron production costs.
        </p>

        <h3>Radon: you can't buy it, but you can grow it</h3>
        <p className={styles.paragraph}>
          <ExtLink href="https://en.wikipedia.org/wiki/Radon">Radon</ExtLink> is produced
          continuously from the radioactive decay of radium. You don't "buy" radon &mdash; you buy
          a sealed radium source and collect the radon gas that emanates from it. But with a
          3.8-day half-life, you can only accumulate a minuscule equilibrium quantity at any one
          time. The "cost" is really the amortised cost of the radium source divided by the
          vanishingly small amount of radon you can collect.
        </p>

        <h3>Why isn't diamond carbon?</h3>
        <p className={styles.paragraph}>
          Our price for <ExtLink href="https://en.wikipedia.org/wiki/Carbon">carbon</ExtLink> ($0.12/kg)
          uses anthracite coal, not diamond. The convention is to price elements in their cheapest
          commercially available form. The carbon atoms in a diamond are chemically identical to
          those in coal &mdash; you're paying for the crystal structure, not the element itself.
          Similarly, <ExtLink href="https://en.wikipedia.org/wiki/Silicon">silicon</ExtLink> ($1.70/kg)
          is priced as metallurgical-grade silicon, not as the ultra-pure
          semiconductor wafers used in computer chips (which can cost thousands per kilogram).
        </p>

        <h3>Moscovium: the (relative) bargain</h3>
        <p className={styles.paragraph}>
          Among the superheavy elements, <ExtLink href="https://en.wikipedia.org/wiki/Moscovium">moscovium</ExtLink> (element 115)
          is the "most affordable" &mdash; over 100 atoms have been produced, making it the most
          prolific of the heaviest elements. This is because the calcium-48 +
          americium-243 reaction used to produce it has a relatively
          high cross-section for a superheavy element synthesis.
        </p>
      </div>

      {/* Methodology note */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Sources and Methodology</h2>
        <p className={styles.paragraph}>
          Tier 1 and 2 prices are sourced from{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Prices_of_chemical_elements">Wikipedia's element price table</ExtLink>,
          which aggregates from the{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/United_States_Geological_Survey">USGS</ExtLink>,{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/CRC_Handbook_of_Chemistry_and_Physics">CRC Handbook</ExtLink>, and{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Oak_Ridge_National_Laboratory">ORNL</ExtLink> catalogues.
        </p>
        <p className={styles.paragraph}>
          Tier 3 estimates are derived from published experimental reports
          (atom counts, beam durations) combined with inferred accelerator operating costs. These
          are order-of-magnitude estimates and should be treated as indicative, not precise.
        </p>
        <p className={styles.paragraph}>
          The colour scale uses a logarithmic mapping (<span className={styles.mono}>log<sub>10</sub></span>) to
          accommodate the ~33 orders of magnitude range from chlorine to oganesson.
        </p>
      </div>
    </div>
  );
}
