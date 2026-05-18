import styles from './MapProjectionsAbout.module.css';

function ExtLink({ href, children }: { readonly href: string; readonly children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>{children}</a>;
}

export default function MapProjectionsAbout() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>About Map Projections</h1>
      <p className={styles.subtitle}>
        The Earth is a sphere; a screen is flat. Every world map you see is a compromise &mdash;
        no projection can preserve shape, size, distance, and direction all at once. Here's
        what each option in the Map projection dropdown does, and why you might pick one.
      </p>

      {/* Why projections differ */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Why projections differ</h2>
        <p className={styles.paragraph}>
          A <ExtLink href="https://en.wikipedia.org/wiki/Map_projection">map projection</ExtLink>{' '}
          is a rule for turning latitude and longitude on the globe into x/y coordinates on a
          flat plane. There are dozens of projections, each preserving some properties at the
          cost of others. The mathematician Carl Friedrich Gauss proved (his "Theorema
          Egregium") that you cannot flatten a sphere onto a plane without distorting it
          somewhere. <ExtLink href="https://en.wikipedia.org/wiki/Tissot%27s_indicatrix">Tissot's indicatrix</ExtLink>{' '}
          is the classic visual tool for seeing the distortion at each point: a small circle on
          the globe becomes an ellipse on the map, and the shape of that ellipse tells you
          what the projection has done locally.
        </p>
        <p className={styles.paragraph}>
          The three projections below cover the most common trade-offs. All three keep north
          straight up, x linear in longitude (mostly), and the equator horizontal. They differ
          in what happens to the y axis as you move away from the equator.
        </p>
      </div>

      {/* Mercator */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Mercator</h2>
        <p className={styles.paragraph}>
          The dropdown labels this option simply <strong>Mercator</strong>, but the version
          we use is technically the{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Web_Mercator_projection">Web Mercator</ExtLink> &mdash;
          a slightly simplified variant that's become the de facto standard for online maps.
          It's what you see on{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Google_Maps">Google Maps</ExtLink>,{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/OpenStreetMap">OpenStreetMap</ExtLink>,
          and most other slippy-tile services. The original{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Mercator_projection">Mercator projection</ExtLink>{' '}
          was published by{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Gerardus_Mercator">Gerardus Mercator</ExtLink>{' '}
          in 1569 for marine navigation: any straight line on the map is a line of constant
          compass bearing, which made plotting courses easy.
        </p>
        <p className={styles.paragraph}>
          The trade-off is that areas inflate dramatically toward the poles. Greenland looks
          roughly the size of Africa on a Mercator map; in reality, Africa is about{' '}
          <strong>14 times larger</strong>. Antarctica appears as an enormous strip across
          the bottom edge. The projection is also undefined at the actual poles, so we clip
          it at &plusmn;85&deg; latitude to keep the math finite.
        </p>
        <div className={styles.callout}>
          <p>
            <strong>Best for:</strong> familiarity, navigation, and fitting the world into a
            rectangle. <strong>Worst for:</strong> any quiz where you need to feel the true
            size of countries &mdash; Russia, Canada, and Greenland will all look bigger than
            they really are.
          </p>
        </div>
      </div>

      {/* Equal Earth */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Area preserving (Equal Earth)</h2>
        <p className={styles.paragraph}>
          Internally, this option uses the{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Equal_Earth_projection">Equal Earth projection</ExtLink>,
          published in 2018 by Bojan &Scaron;avri&ccaron;, Tom Patterson, and Bernhard Jenny.
          It's an{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Map_projection#Equal-area">equal-area projection</ExtLink>{' '}
          (also called equivalent or area-preserving) &mdash; every region on the map covers
          a piece of paper proportional to its true area on the globe. Greenland looks like
          Greenland, Africa looks like Africa, and you can compare their sizes by eye.
        </p>
        <p className={styles.paragraph}>
          Equal Earth was designed as a successor to the older{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Robinson_projection">Robinson projection</ExtLink>{' '}
          (which is <em>not</em> equal-area &mdash; it's a "compromise" projection that
          minimises overall distortion at the cost of getting nothing exactly right). Equal
          Earth keeps Robinson's pleasant rounded shape while making the area-preservation
          guarantee mathematically exact. It accomplishes this by curving meridians toward
          the poles, which is why the world looks slightly egg-shaped instead of rectangular.
        </p>
        <div className={styles.callout}>
          <p>
            <strong>Best for:</strong> any quiz where country sizes matter &mdash; comparing
            populations, areas, or geographic extent. <strong>Worst for:</strong> precise
            shape comparisons (countries near the poles are noticeably squashed) or matching
            what you see in a road atlas.
          </p>
        </div>
      </div>

      {/* Equirectangular */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Equirectangular</h2>
        <p className={styles.paragraph}>
          The simplest possible projection: x is longitude, y is latitude. Sometimes called
          the <em>plate carr&eacute;e</em> ("flat square") when applied with the equator as
          the standard parallel. The{' '}
          <ExtLink href="https://en.wikipedia.org/wiki/Equirectangular_projection">equirectangular projection</ExtLink>{' '}
          is attributed to Marinus of Tyre around AD 100.
        </p>
        <p className={styles.paragraph}>
          It's not a great map for general viewing &mdash; it stretches polar areas
          horizontally and squashes equatorial areas relative to their true proportions
          &mdash; but it has one practical virtue: every degree of latitude or longitude is
          the same number of pixels everywhere on the map. That makes it the natural format
          for storing geographic data on disk, which is why this app keeps all of its
          underlying lat/lng data in equirectangular form and re-projects on the fly when
          you switch projections.
        </p>
        <div className={styles.callout}>
          <p>
            <strong>Best for:</strong> seeing the raw shape of the data, or quizzes where you
            think in degrees of latitude/longitude. <strong>Worst for:</strong> looking
            anything like a real map &mdash; expect Antarctica to span the entire bottom
            edge.
          </p>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick comparison</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Projection</th>
              <th>Preserves</th>
              <th>Distorts</th>
              <th>Common use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mercator (Web Mercator)</td>
              <td>Local angles &amp; shapes; compass bearings</td>
              <td>Areas (badly near the poles)</td>
              <td>Online maps, navigation</td>
            </tr>
            <tr>
              <td>Area preserving (Equal Earth)</td>
              <td>Areas exactly</td>
              <td>Local shapes (gently)</td>
              <td>Statistical world maps, demography</td>
            </tr>
            <tr>
              <td>Equirectangular</td>
              <td>Distances along meridians</td>
              <td>Both areas and shapes</td>
              <td>Raw data storage, panoramas</td>
            </tr>
          </tbody>
        </table>
        <p className={styles.paragraph}>
          To see distortion directly, turn on the <strong>Lat/lng grid</strong> toggle in the
          quiz setup &mdash; it draws meridians and parallels every 15&deg; using the
          selected projection, which makes it obvious how each projection bends the
          underlying coordinate system.
        </p>
      </div>
    </div>
  );
}
