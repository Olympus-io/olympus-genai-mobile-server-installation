import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import HeroVisual from '@site/src/components/HeroVisual';
import ChoosePath from '@site/src/components/ChoosePath';

import styles from './index.module.css';

function HomepageHeader(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      {/* Decorative only — the grid and orbs carry no information. */}
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroOrbs} aria-hidden="true">
        <span className={styles.orbA} />
        <span className={styles.orbB} />
      </div>

      <div className={clsx('container', styles.heroInner)}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>Enterprise file platform · with GenAI built in</p>
          <Heading as="h1" className={styles.heroTitle}>
            Your files. Your server.
            <br />
            <span className={styles.heroAccent}>Your AI.</span>
          </Heading>
          <p className={styles.heroSubtitle}>
            {siteConfig.tagline} Ask questions across your documents, share with
            fine-grained control, and keep every byte on infrastructure you own.
          </p>

          <div className={styles.buttons}>
            {/* Same-page anchor, so a plain <a> — Docusaurus <Link> is for route
                navigation and its build-time anchor check only knows headings. */}
            <a className={styles.heroCta} href="#try">
              Take the live tour →
            </a>
            <Link className={styles.heroCtaSecondary} to="/docs/intro">
              Install on your server
            </Link>
          </div>

          <p className={styles.heroMeta}>
            No install to look around · One <code>docker run</code> to own it · ~15 minutes
          </p>
        </div>

        <div className={styles.heroArt}>
          <HeroVisual />
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Install ${siteConfig.title}`}
      description="Try the live Olympus demo, or install the self-hosted enterprise file management and GenAI platform on your own server.">
      <HomepageHeader />
      <main>
        <div id="try">
          <ChoosePath />
        </div>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
