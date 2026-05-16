import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <p className={styles.heroEyebrow}>Installation Guide</p>
        <Heading as="h1" className={styles.heroTitle}>
          Deploy <span className={styles.heroAccent}>{siteConfig.title}</span>
          <br />on your own server.
        </Heading>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className={clsx('button button--primary button--lg', styles.heroCta)} to="/docs/intro">
            Get Started →
          </Link>
          <Link
            className={clsx('button button--secondary button--lg', styles.heroCtaSecondary)}
            href="https://github.com/Olympus-io/olympus-genai-mobile-server-installation">
            View on GitHub
          </Link>
        </div>
        <p className={styles.heroMeta}>
          One <code>docker run</code> · 8-step browser wizard · ~15 minutes
        </p>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Install ${siteConfig.title}`}
      description="Step-by-step installation guide for the self-hosted Olympus enterprise file management and GenAI platform.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
