import { Link } from 'react-router';
import styles from './AboutPage.module.css';

const aboutPages = [
  { path: '/about/element-costs', title: 'Element Cost Methodology', description: 'How we calculated cost-per-kilogram for every element in the periodic table.' },
] as const;

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>About</h1>
      <ul className={styles.list}>
        {aboutPages.map((page) => (
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
