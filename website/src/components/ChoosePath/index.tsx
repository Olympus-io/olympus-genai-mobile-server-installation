import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import DemoSignup from '@site/src/components/DemoSignup';
import styles from './styles.module.css';

/**
 * The two things a visitor can do, side by side and equally weighted:
 * try the running product, or install their own.
 *
 * Deliberately not a separate tour page — the choice and the first step of
 * each path are on the same screen, so nobody has to guess which link is
 * "the demo one".
 */
export default function ChoosePath(): ReactNode {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.head}>
          <h2 className={styles.title}>Two ways in</h2>
          <p className={styles.subtitle}>
            See it running on our servers, or stand it up on yours. Both take about fifteen minutes.
          </p>
        </div>

        <div className={styles.grid}>
          <DemoSignup />

          <div className={styles.installCard}>
            <h3 className={styles.installTitle}>Install on your own server</h3>
            <p className={styles.installSubtitle}>
              One command brings up the setup wizard. It handles domain, SSL, accounts, GenAI
              providers, licence and optional services, then deploys the stack.
            </p>

            <div className={styles.codeBlock}>
              <div className={styles.codeHead}>
                <span className={styles.codeDot} />
                <span className={styles.codeDot} />
                <span className={styles.codeDot} />
                <span className={styles.codeLabel}>your server</span>
              </div>
              <pre className={styles.code}>
                <code>{`docker run -d --name olympus-setup \\
  -p 8888:8888 \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -v "$HOME/olympus/app":"$HOME/olympus/app" \\
  -v "$HOME/olympus/data":"$HOME/olympus/data" \\
  -e HOST_PROJECT_ROOT="$HOME/olympus/app" \\
  olympusmobile/olympus-master-setup:latest`}</code>
              </pre>
            </div>

            <p className={styles.thenLine}>
              Then open <code>http://&lt;server-ip&gt;:8888</code> and follow the 9-step wizard.
            </p>

            <ol className={styles.steps}>
              <li>Check the system requirements</li>
              <li>Run the command above</li>
              <li>Walk the wizard — domain, SSL, accounts, GenAI, licence</li>
              <li>Deploy, then mount your first share</li>
            </ol>

            <div className={styles.installActions}>
              <Link className={styles.installCta} to="/docs/intro">
                Read the install guide →
              </Link>
              <Link className={styles.installSecondary} to="/docs/system-requirements">
                System requirements
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
