import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'One-Command Install',
    emoji: '🚀',
    description: (
      <>
        A single <code>docker run</code> brings up the setup wizard. A 9-step
        browser flow handles the rest — domain, SSL, accounts, GenAI, license,
        optional services, deploy. No build tools or language runtimes needed
        on the host.
      </>
    ),
  },
  {
    title: 'GenAI Built-In',
    emoji: '🤖',
    description: (
      <>
        Bring your own provider — OpenAI, Anthropic, Gemini — or run local
        models with Ollama on an NVIDIA GPU. RAG over your files, vector search
        via Milvus, full-text via OpenSearch, all wired up out of the box.
      </>
    ),
  },
  {
    title: 'Self-Hosted & Compliant',
    emoji: '🔒',
    description: (
      <>
        Files, embeddings, search indexes, and prompts stay on your
        infrastructure. Hard-delete enforced via Postgres triggers, AD/LDAP
        integration available, audit logging out of the box.
      </>
    ),
  },
];

function Feature({ title, emoji, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4', styles.featureCol)}>
      <div className={styles.featureCard}>
        <div className={styles.featureIcon} aria-hidden>{emoji}</div>
        <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
        <p className={styles.featureDesc}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
