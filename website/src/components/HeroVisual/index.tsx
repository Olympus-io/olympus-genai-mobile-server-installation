import type { ReactNode } from 'react';
import styles from './styles.module.css';

/**
 * Hero illustration: files on the left, flowing through an AI core, out to
 * the people who share them.
 *
 * Inline SVG on purpose — no image asset, no dependency, and it inherits the
 * theme's accent so it works in both colour modes. Every animation is wrapped
 * by a prefers-reduced-motion query in the stylesheet.
 */
export default function HeroVisual(): ReactNode {
  return (
    <div className={styles.wrap} aria-hidden="true">
      <svg className={styles.svg} viewBox="0 0 420 340" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="olyCore" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--oly-accent)" />
            <stop offset="100%" stopColor="var(--oly-accent-2)" />
          </linearGradient>
          <radialGradient id="olyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--oly-accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--oly-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft halo behind the core */}
        <circle cx="210" cy="170" r="118" fill="url(#olyGlow)" className={styles.halo} />

        {/* Connection lines: documents → core → recipients */}
        <g className={styles.links} stroke="var(--oly-line)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M96 84 C150 84, 160 150, 186 166" />
          <path d="M96 168 C150 168, 160 170, 186 170" />
          <path d="M96 252 C150 252, 160 190, 186 176" />
          <path d="M234 166 C262 150, 272 90, 326 90" />
          <path d="M234 170 C262 170, 272 170, 326 170" />
          <path d="M234 176 C262 190, 272 250, 326 250" />
        </g>

        {/* Packets travelling along the wires */}
        <g className={styles.packets} fill="var(--oly-accent)">
          <circle r="3.2">
            <animateMotion dur="3.2s" repeatCount="indefinite"
              path="M96 84 C150 84, 160 150, 186 166" />
          </circle>
          <circle r="3.2">
            <animateMotion dur="3.2s" begin="1.1s" repeatCount="indefinite"
              path="M96 168 C150 168, 160 170, 186 170" />
          </circle>
          <circle r="3.2">
            <animateMotion dur="3.2s" begin="2.2s" repeatCount="indefinite"
              path="M96 252 C150 252, 160 190, 186 176" />
          </circle>
          <circle r="3.2" fillOpacity="0.9">
            <animateMotion dur="3.2s" begin="0.6s" repeatCount="indefinite"
              path="M234 170 C262 170, 272 170, 326 170" />
          </circle>
          <circle r="3.2" fillOpacity="0.9">
            <animateMotion dur="3.2s" begin="1.8s" repeatCount="indefinite"
              path="M234 166 C262 150, 272 90, 326 90" />
          </circle>
        </g>

        {/* Documents */}
        <g className={styles.docs}>
          {[
            { y: 60, label: 'PDF' },
            { y: 144, label: 'DOCX' },
            { y: 228, label: 'XLSX' },
          ].map(doc => (
            <g key={doc.label} transform={`translate(28 ${doc.y})`}>
              <rect width="68" height="48" rx="9" fill="var(--oly-card)" stroke="var(--oly-line)" strokeWidth="1.5" />
              <rect x="12" y="14" width="30" height="3.5" rx="1.75" fill="var(--oly-muted)" />
              <rect x="12" y="23" width="44" height="3.5" rx="1.75" fill="var(--oly-muted)" />
              <rect x="12" y="32" width="22" height="3.5" rx="1.75" fill="var(--oly-muted)" />
              <text x="56" y="12" textAnchor="end" className={styles.docLabel}>{doc.label}</text>
            </g>
          ))}
        </g>

        {/* AI core */}
        <g className={styles.core}>
          <circle cx="210" cy="170" r="46" fill="var(--oly-card)" stroke="url(#olyCore)" strokeWidth="2.5" />
          <circle cx="210" cy="170" r="60" fill="none" stroke="var(--oly-line)" strokeWidth="1"
            strokeDasharray="3 7" className={styles.ring} />
          <g stroke="url(#olyCore)" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M198 178v-12a12 12 0 0 1 24 0v12" />
            <path d="M194 178h32" />
            <circle cx="204" cy="166" r="1.8" fill="url(#olyCore)" stroke="none" />
            <circle cx="216" cy="166" r="1.8" fill="url(#olyCore)" stroke="none" />
          </g>
          <text x="210" y="206" textAnchor="middle" className={styles.coreLabel}>GenAI</text>
        </g>

        {/* Recipients */}
        <g className={styles.people}>
          {[90, 170, 250].map(y => (
            <g key={y} transform={`translate(326 ${y - 20})`}>
              <rect width="66" height="40" rx="9" fill="var(--oly-card)" stroke="var(--oly-line)" strokeWidth="1.5" />
              <circle cx="20" cy="20" r="7" fill="var(--oly-accent)" fillOpacity="0.75" />
              <rect x="33" y="14" width="22" height="3.5" rx="1.75" fill="var(--oly-muted)" />
              <rect x="33" y="23" width="15" height="3.5" rx="1.75" fill="var(--oly-muted)" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
