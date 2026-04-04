import { Link } from 'react-router';
import styles from './AboutPage.module.css';
import { aboutPageRegistry } from './aboutPageRegistry';

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>About</h1>
      <ul className={styles.list}>
        {aboutPageRegistry.map((page) => (
          <li key={page.path}>
            <Link to={page.path} className={styles.link}>
              <span className={styles.linkTitle}>{page.title}</span>
              <span className={styles.linkDescription}>{page.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
