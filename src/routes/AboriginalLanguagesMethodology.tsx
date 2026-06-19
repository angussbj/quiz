import styles from './AboriginalLanguagesMethodology.module.css';

// Short-term feedback channel: a Google Form (same pattern as wayword.fun).
// Swap for the dedicated feedback site when it's ready.
const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScPVBxKsNhAuzbr9C5r__DZ1dK14GB6m1lTTDbAEKgdL25XKQ/viewform';

function ExtLink({ href, children }: { readonly href: string; readonly children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>
      {children}
    </a>
  );
}

export default function AboriginalLanguagesMethodology() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>About this quiz</h1>
      <p className={styles.subtitle}>
        A learning aid for the Aboriginal and Torres Strait Islander languages of Australia &mdash; where
        they are spoken and what they are called. It is not authoritative, and it is not a map of
        nations or territories.
      </p>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Please read first</h2>
        <div className={styles.callout}>
          <p>
            The markers show <strong>approximate</strong> locations of language varieties, not boundaries.
            Language regions are contested, overlapping, and change with knowledge and Country. Nothing here
            should be treated as a definitive map of who speaks what, or of any group&rsquo;s territory.
          </p>
          <p>
            <strong>Always defer to local knowledge, Traditional Owners, and local land councils.</strong>
          </p>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Where the data comes from</h2>
        <p className={styles.paragraph}>
          Language names, alternate spellings, and approximate locations come from{' '}
          <ExtLink href="https://aiatsis.gov.au/research/languages/austlang">AUSTLANG</ExtLink>, the
          database maintained by the Australian Institute of Aboriginal and Torres Strait Islander Studies
          (AIATSIS), used under a{' '}
          <ExtLink href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0</ExtLink>{' '}
          licence. We deliberately do <em>not</em> use the AIATSIS &ldquo;Map of Indigenous Australia&rdquo;,
          whose boundary data is not available for reuse and which is careful to note its own boundaries are
          approximate.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Spellings</h2>
        <p className={styles.paragraph}>
          Each language is shown using its AUSTLANG name. Spellings of these languages vary, and many are
          actively changing as languages are revived and restored &mdash; so the displayed name is one form
          among several, not <em>the</em> correct one. Where a community-preferred spelling exists, it should
          take precedence over anything shown here.
        </p>
        <p className={styles.paragraph}>
          Alternate spellings &mdash; including the form used on Wikipedia where it differs &mdash; are all
          accepted as correct answers. If a name is spelled in a way that looks wrong, or you know a better
          form, please tell us (below).
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>How the list is ordered</h2>
        <p className={styles.paragraph}>
          All 835 languages with a recorded location are included. The &ldquo;languages shown&rdquo; control
          (and the Easy/Medium/Hard sizes) narrows the map to those that are most widely documented &mdash;
          measured by how many language editions of Wikipedia have an article about them, via{' '}
          <ExtLink href="https://www.wikidata.org/wiki/Property:P1252">Wikidata</ExtLink>. This is a{' '}
          <strong>sorting aid so the quiz starts at a learnable size, not a ranking of importance.</strong>
        </p>
        <p className={styles.paragraph}>
          It is also imperfect: it leans toward languages that are well known in <em>linguistics</em> (for
          example because of a famous grammatical feature) rather than purely those encountered in daily life,
          and languages with no Wikipedia article simply appear later in the list &mdash; included, never
          ranked against the rest.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Feedback</h2>
        <div className={styles.callout}>
          <p>
            This is an early, unlisted version shared for feedback. If anything is wrong, misplaced,
            misspelled, or shouldn&rsquo;t be here &mdash; or if this isn&rsquo;t a useful or respectful way to
            learn &mdash; we want to hear it.
          </p>
          <p>
            <ExtLink href={FEEDBACK_URL}>Leave feedback here</ExtLink>.
          </p>
        </div>
      </div>
    </div>
  );
}
