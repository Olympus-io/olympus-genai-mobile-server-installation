import { useState, type FormEvent, type ReactNode } from 'react';
import styles from './styles.module.css';

/**
 * Live-demo signup.
 *
 * Posts to the DEMO instance (mobile.olympus.io), never the dev machine.
 * `apiKey` is the demo app's own key — already served publicly at
 * https://mobile.olympus.io/assets/data/config/appConfig.json, so putting it
 * here exposes nothing new. Note the backend declares `apiKey` as required but
 * never reads it, so it is not a credential in any meaningful sense.
 */
const DEMO_APP = 'https://mobile.olympus.io';
const DEMO_API = 'https://mobile-api.olympus.io';
const DEMO_API_KEY = 'fBuyRpSpIBipuKduBO60JTpKdhveoKDe';

interface CreatedUser {
  email?: string;
  name?: string;
  /** 'confirmed' when the demo box auto-confirms guests, else 'unconfirmed'. */
  emailStatus?: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; user: CreatedUser };

export default function DemoSignup(): ReactNode {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    // Honeypot: a real person never fills a field they cannot see. Costs
    // nothing and stops naive bots. It is NOT a substitute for the
    // server-side rate limiting this endpoint still needs.
    if ((data.get('company_website') as string)?.trim()) return;

    const password = String(data.get('password') ?? '');
    if (password.length < 8) {
      setStatus({ kind: 'error', message: 'Please use a password of at least 8 characters.' });
      return;
    }

    setStatus({ kind: 'submitting' });

    try {
      const response = await fetch(`${DEMO_API}/api/v1/guest-user-onboarding/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: DEMO_API_KEY,
          firstName: String(data.get('firstName') ?? '').trim(),
          lastName: String(data.get('lastName') ?? '').trim(),
          email: String(data.get('email') ?? '').trim(),
          businessName: String(data.get('businessName') ?? '').trim(),
          password,
          accountType: 'Individual',
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        // Surface the server's own message — it explains blocked domains and
        // duplicate emails far better than anything generic we could write.
        const message =
          body?.errors?.[0]?.message ??
          'We could not create your demo account just now. Please try again in a moment.';
        setStatus({ kind: 'error', message });
        return;
      }

      setStatus({ kind: 'done', user: body.data?.user ?? {} });
    } catch {
      setStatus({
        kind: 'error',
        message:
          'Could not reach the demo server. It may be briefly unavailable — please try again shortly.',
      });
    }
  }

  if (status.kind === 'done') {
    const needsVerification = status.user.emailStatus === 'unconfirmed';
    return (
      <div className={styles.card}>
        <div className={styles.successMark} aria-hidden="true">✓</div>
        <h3 className={styles.successTitle}>Your demo workspace is ready</h3>

        {needsVerification ? (
          <p className={styles.successBody}>
            We've emailed a verification link to <strong>{status.user.email}</strong>. Confirm it,
            then sign in with the password you just chose.
          </p>
        ) : (
          <p className={styles.successBody}>
            Sign in as <strong>{status.user.email}</strong> with the password you just chose. Your
            own private home folder is already set up and waiting.
          </p>
        )}

        <a className={styles.successCta} href={`${DEMO_APP}/login`} target="_blank" rel="noopener noreferrer">
          Open the demo →
        </a>

        <ul className={styles.tryList}>
          <li>Upload a PDF or a Word document, then ask the AI about its contents</li>
          <li>Open a folder's assistant and ask a question across everything inside it</li>
          <li>Share a file by private link, with a password and an expiry</li>
        </ul>

        <p className={styles.footnote}>
          A shared demo environment — please don't upload anything confidential.
        </p>
      </div>
    );
  }

  const submitting = status.kind === 'submitting';

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Take the live tour</h3>
      <p className={styles.cardSubtitle}>
        A real Olympus deployment with your own private workspace. No install, no credit card.
      </p>

      <form className={styles.form} onSubmit={onSubmit} noValidate={false}>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>First name</span>
            <input className={styles.input} name="firstName" type="text" required autoComplete="given-name" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Last name</span>
            <input className={styles.input} name="lastName" type="text" required autoComplete="family-name" />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Work email</span>
          <input className={styles.input} name="email" type="email" required autoComplete="email" />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>
            Company <span className={styles.optional}>optional</span>
          </span>
          <input className={styles.input} name="businessName" type="text" autoComplete="organization" />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Choose a password</span>
          <div className={styles.passwordWrap}>
            <input
              className={styles.input}
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              className={styles.reveal}
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <span className={styles.hint}>At least 8 characters.</span>
        </label>

        {/* Honeypot — hidden from people, tempting to bots. */}
        <input
          className={styles.honeypot}
          name="company_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        {status.kind === 'error' && (
          <p className={styles.error} role="alert">{status.message}</p>
        )}

        <button className={styles.submit} type="submit" disabled={submitting}>
          {submitting ? 'Creating your workspace…' : 'Start the tour →'}
        </button>

        <p className={styles.footnote}>
          Shared demo environment — please don't upload anything confidential.
        </p>
      </form>
    </div>
  );
}
