import { Link } from 'react-router-dom'

import LegalPageLayout, {
  LegalPlaceholder,
  LegalSection,
} from '../components/legal/LegalPageLayout.jsx'
import { LEGAL_LAST_UPDATED, LEGAL_PATHS } from '../config/legal.js'
import { institute } from '../config/institute.js'
import { OPEN_COOKIE_PREFERENCES_EVENT } from '../lib/consent.js'

const sections = [
  { id: 'scope', label: 'Scope' },
  { id: 'information', label: 'Information we hold' },
  { id: 'sources', label: 'How information is collected' },
  { id: 'use', label: 'How information is used' },
  { id: 'cookies', label: 'Cookies and analytics' },
  { id: 'sharing', label: 'Sharing and service providers' },
  { id: 'retention', label: 'Retention and security' },
  { id: 'students', label: 'Students and guardians' },
  { id: 'rights', label: 'Your choices and rights' },
  { id: 'contact', label: 'Contact and grievances' },
  { id: 'changes', label: 'Changes to this policy' },
]

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="How Expert Learning Center handles information submitted through this website and the student and staff portal."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={sections}
    >
      <LegalSection id="scope" title="1. Scope">
        <p>
          This policy applies to the public Expert Learning Center website and
          the password-protected portal used by students, teachers, and
          administrators. It explains what information the institute holds,
          why it is needed, how it is protected, and the choices available to
          students and guardians.
        </p>
        <p>
          The institute is responsible for the student and academic records
          described here. The legal entity name, registered address, and
          applicable jurisdiction are{' '}
          <LegalPlaceholder />.
        </p>
      </LegalSection>

      <LegalSection id="information" title="2. Information we hold">
        <p>The portal may hold the following categories of information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account information:</strong> name, email address, account
            role (student, teacher, or administrator), approval or account
            status, and security-related session information. Passwords are
            stored as salted password hashes, not as readable text.
          </li>
          <li>
            <strong>Student profile information:</strong> roll number, class,
            phone number, guardian name, guardian phone number, admission date,
            and assigned classes, where supplied by the institute or account
            holder.
          </li>
          <li>
            <strong>Academic records:</strong> attendance, tests, marks,
            results, class and subject assignments, and study-material records.
          </li>
          <li>
            <strong>Public achievement information:</strong> name, class,
            board, session, photograph, marks or percentage, rank, and a short
            description, but only when the institute chooses to publish a
            topper entry.
          </li>
          <li>
            <strong>Uploaded files:</strong> study materials and photographs
            submitted by authorized staff. Uploads are validated for file type
            and size before storage.
          </li>
          <li>
            <strong>Communications:</strong> information you provide when you
            call or email the institute. The public website does not currently
            operate an online enquiry form.
          </li>
          <li>
            <strong>Technical and security information:</strong> IP address,
            browser user-agent, request identifier, and administrative action
            details may be recorded in security or audit logs when authorized
            users make changes.
          </li>
        </ul>
        <p>
          Please do not submit sensitive information that the institute has not
          requested, especially through email or uploaded documents.
        </p>
      </LegalSection>

      <LegalSection id="sources" title="3. How information is collected">
        <p>
          Information may be collected directly from a student, teacher, or
          guardian; created by institute staff during admission and academic
          administration; generated when the portal is used; or received
          through phone and email communication.
        </p>
        <p>
          Public pages may load images from third-party image services. Those
          services receive ordinary technical request information such as the
          requesting IP address and browser type when an image is displayed.
        </p>
      </LegalSection>

      <LegalSection id="use" title="4. How information is used">
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide accounts and role-based access to the portal.</li>
          <li>
            Maintain student profiles, attendance, assessments, results, and
            study materials.
          </li>
          <li>Respond to admission, course, and academic enquiries.</li>
          <li>
            Protect the website and portal, investigate misuse, and maintain
            security audit records.
          </li>
          <li>
            Publish achievement information only where the institute has chosen
            to make it public.
          </li>
          <li>
            Meet record-keeping or other obligations that apply to the
            institute.
          </li>
        </ul>
        <p>
          The specific legal basis for each processing activity, including any
          consent or legitimate-use basis, is{' '}
          <LegalPlaceholder>to be confirmed under applicable law</LegalPlaceholder>.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="5. Cookies, local storage, and analytics">
        <p>
          The portal uses an essential authentication cookie named{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-slate-900">
            elc_token
          </code>
          . It is HTTP-only, valid for up to 24 hours, and marked Secure and
          SameSite=None in production so that the separately hosted portal and
          API can communicate. In local development it uses SameSite=Lax. The
          cookie is required for login and is not used for advertising.
        </p>
        <p>
          A CSRF token used to protect state-changing requests is kept in the
          page&apos;s memory and is not stored in a browser data store. The
          website may store one local preference recording whether optional
          analytics was allowed or rejected. That preference is not used to
          identify you.
        </p>
        <p>
          <strong>Optional analytics:</strong> the public site can use
          Plausible Analytics, a privacy-focused service configured by the
          institute. It is disabled by default and only loads after you allow
          optional analytics. Only public marketing and legal pages are
          measured; portal pages and private dashboard routes are excluded.
          Plausible is designed to operate without cookies and may receive
          a public page URL, referrer, country, browser, operating system,
          and device type. It is not given your portal password, marks,
          attendance, or form contents. You can change your choice at any
          time through{' '}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new Event(OPEN_COOKIE_PREFERENCES_EVENT),
              )
            }
            className="rounded font-semibold text-blue-800 underline underline-offset-2 hover:text-blue-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e]"
          >
            Cookie preferences
          </button>
          .
        </p>
        <p>
          Your browser settings may block or delete cookies and site data, but
          blocking the essential authentication cookie will prevent portal
          login from working.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="6. Sharing and service providers">
        <p>
          The institute does not sell personal information. Information may be
          handled by service providers that support the website and portal,
          including hosting, database, file-storage, and optional analytics
          providers. Access is limited to what each provider needs to perform
          its service.
        </p>
        <p>
          Information may also be disclosed to institute staff and
          administrators who need it for their role, to a guardian where
          appropriate, or where disclosure is required by law or necessary to
          protect someone&apos;s safety or the security of the service.
        </p>
        <p>
          The named providers, their roles, and the locations in which they
          process information are{' '}
          <LegalPlaceholder>
            to be confirmed in the institute&apos;s vendor register
          </LegalPlaceholder>
          .
        </p>
      </LegalSection>

      <LegalSection id="retention" title="7. Retention and security">
        <p>
          Records are kept only for as long as the institute needs them for
          academic administration, security, dispute resolution, or legal
          obligations. Specific retention periods for accounts, student
          records, attendance, marks, audit logs, and uploaded files are{' '}
          <LegalPlaceholder />.
        </p>
        <p>
          Safeguards include encrypted HTTPS connections, hashed passwords,
          HTTP-only session cookies, role-based authorization, request
          validation, rate limiting, upload checks, and append-only
          administrative audit records. No online service can guarantee
          absolute security. If you believe an account or record has been
          compromised, contact the institute promptly.
        </p>
      </LegalSection>

      <LegalSection id="students" title="8. Students and guardians">
        <p>
          The portal may be used by school-age students, including minors.
          Accounts are reviewed by institute administrators, and student
          records are normally created or maintained by the institute. Parents
          and guardians may contact the institute about a student&apos;s
          information. The process for verifying a guardian&apos;s authority to
          make a request is <LegalPlaceholder />.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="9. Your choices and rights">
        <p>
          Depending on applicable law, you may be able to request access to
          your information, ask for correction of inaccurate details, withdraw
          consent for optional analytics, object to certain uses, or request
          deletion of information that the institute is not required to keep.
        </p>
        <p>
          Some records may need to be retained for academic, security, or legal
          reasons even after an account is closed. The institute will explain
          any limitation when it responds to a request. Identity verification
          may be required before a request is actioned.
        </p>
        <p>
          You can stop optional analytics immediately by opening{' '}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new Event(OPEN_COOKIE_PREFERENCES_EVENT),
              )
            }
            className="rounded font-semibold text-blue-800 underline underline-offset-2 hover:text-blue-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e]"
          >
            Cookie preferences
          </button>{' '}
          and selecting the reject option.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="10. Contact and grievances">
        <p>
          For privacy questions, correction requests, or a grievance, contact
          the institute:
        </p>
        <address className="rounded-xl border border-slate-200 bg-slate-50 p-4 not-italic leading-7 text-slate-700">
          <strong>{institute.name}</strong>
          <br />
          {institute.address.display}
          <br />
          Phone:{' '}
          <a className="font-semibold text-blue-800 underline underline-offset-2" href={institute.phone.href}>
            {institute.phone.display}
          </a>
          <br />
          Email:{' '}
          <a className="font-semibold text-blue-800 underline underline-offset-2" href={institute.email.href}>
            {institute.email.display}
          </a>
        </address>
        <p>
          The named privacy or grievance officer, postal address, and response
          timeline are <LegalPlaceholder />.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes to this policy">
        <p>
          This policy may be updated when the website, portal, service
          providers, or applicable requirements change. The latest version will
          be published on this page with a revised date. Material changes may
          also be communicated through the portal or institute notices.
        </p>
        <p>
          Read the <Link className="font-semibold text-blue-800 underline underline-offset-2" to={LEGAL_PATHS.terms}>Terms &amp; Conditions</Link>{' '}
          for the rules that apply to portal use.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
