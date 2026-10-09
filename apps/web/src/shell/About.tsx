import { useId, useRef } from 'react';
import changelog from '../../../../CHANGELOG.md?raw';
import { aircraftRegistry } from '../aircraft-registry';
import { messages as noticeMessages } from '../errors/messages';
import { useLocalize, useMessages } from '../i18n';
import { ModalDialog } from '../ui';
import { messages } from './about.messages';
import { buildLabel } from './AppFooter';
import { latestReleases } from './changelog';
import { messages as shellMessages } from './messages';

export const REPOSITORY_URL = 'https://github.com/DocGerd/cockpit-procedure-trainer';
export const RELEASES_URL = `${REPOSITORY_URL}/releases`;
const SHOWN_RELEASES = 3;

const releases = latestReleases(changelog, SHOWN_RELEASES);

export function About({ onClose }: { onClose(): void }) {
  const text = useMessages(messages);
  const notice = useMessages(noticeMessages);
  const shell = useMessages(shellMessages);
  const localize = useLocalize();
  const titleId = useId();
  const aircraftId = useId();
  const releasesId = useId();
  const close = useRef<HTMLButtonElement>(null);

  return (
    <ModalDialog
      className="about-dialog"
      labelledBy={titleId}
      initialFocus={close}
      onClose={onClose}
    >
      <div className="about-head">
        <h2 id={titleId} className="about-title">
          {text.aboutTitle}
        </h2>
        <p className="about-version readout">{buildLabel()}</p>
      </div>
      <div className="about-scroll scroll-thin scroll-fade">
        <p className="about-purpose">{text.purpose}</p>
        <p className="about-notice">
          <strong>{notice.noticeTitle}.</strong> {notice.noticeBody}
        </p>
        <section className="about-section" aria-labelledby={aircraftId}>
          <h3 id={aircraftId} className="about-heading">
            {text.aircraftHeading}
          </h3>
          <dl className="about-aircraft">
            {aircraftRegistry.map((aircraft) => (
              <div key={aircraft.id}>
                <dt>{localize(aircraft.name)}</dt>
                <dd>
                  {shell.handbookRevision}: {localize(aircraft.handbookRevision)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="about-section" aria-labelledby={releasesId}>
          <h3 id={releasesId} className="about-heading">
            {text.releasesHeading}
          </h3>
          {releases.map((entry) => (
            <article key={entry.version} className="about-release" lang="en">
              <h4 className="about-release-title readout">
                v{entry.version}
                {entry.date && <span className="about-release-date"> · {entry.date}</span>}
              </h4>
              {entry.sections.map((section) => (
                <div key={section.heading} className="about-release-section">
                  <p className="about-release-kind">{section.heading}</p>
                  <ul className="about-release-items">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          ))}
          <a className="about-link" href={RELEASES_URL} target="_blank" rel="noreferrer">
            {text.allReleaseNotes}
          </a>
        </section>
      </div>
      <div className="about-foot">
        <p className="about-legal">
          {text.license} · {import.meta.env.VITE_COPYRIGHT}
        </p>
        <a className="about-link" href={REPOSITORY_URL} target="_blank" rel="noreferrer">
          {text.sourceCode}
        </a>
        <button
          ref={close}
          type="button"
          className="button-secondary about-close"
          onClick={onClose}
        >
          {text.close}
        </button>
      </div>
    </ModalDialog>
  );
}
