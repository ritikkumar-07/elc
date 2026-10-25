import { Link } from 'react-router-dom'

import LegalPageLayout, {
  LegalPlaceholder,
  LegalSection,
} from '../components/legal/LegalPageLayout.jsx'
import { LEGAL_LAST_UPDATED, LEGAL_PATHS } from '../config/legal.js'
import { institute } from '../config/institute.js'

const sections = [
  { id: 'acceptance', label: 'Acceptance' },
  { id: 'website', label: 'Website information' },
  { id: 'accounts', label: 'Accounts and access' },
  { id: 'acceptable-use', label: 'Acceptable use' },
  { id: 'content', label: 'Content and ownership' },
  { id: 'achievements', label: 'Public achievements' },
  { id: 'admissions', label: 'Admissions and fees' },
  { id: 'availability', label: 'Availability and changes' },
  { id: 'disclaimers', label: 'Disclaimers and liability' },
  { id: 'termination', label: 'Suspension and termination' },
  { id: 'law', label: 'Governing law' },
  { id: 'contact', label: 'Contact' },
]

export default function TermsAndConditions() {
  return (
    <LegalPageLayout
      title="Terms & Conditions"
      description="The rules for using the Expert Learning Center website and student and staff portal."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={sections}
    >
      <LegalSection id="acceptance" title="1. Acceptance of these terms">
        <p>
          By using this website or the Expert Learning Center portal, you agree
          to these terms. If you do not agree, do not use the portal. If you use
          the portal on behalf of a student, you confirm that you are authorized
          to do so.
        </p>
        <p>
          These terms should be read with the{' '}
          <Link
            className="font-semibold text-blue-800 underline underline-offset-2"
            to={LEGAL_PATHS.privacy}
          >
            Privacy Policy
          </Link>
          . The institute may update these terms; the revised version will be
          posted on this page.
        </p>
      </LegalSection>

      <LegalSection id="website" title="2. Website information">
        <p>
          The public website provides general information about Expert Learning
          Center, its courses, announcements, contact details, and selected
          student achievements. Course descriptions are summaries, not a
          contract or a guarantee that a particular batch, subject, teacher, or
          schedule will be available.
        </p>
        <p>
          For current admission requirements, batch schedules, fees, and
          eligibility, contact the institute directly. Website content may be
          corrected or updated without notice.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="3. Accounts and access">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Student and teacher accounts are subject to administrator review
            before access is granted. Creating an account does not guarantee
            admission, employment, or access to every feature.
          </li>
          <li>
            Provide accurate information and keep it up to date. Do not create
            an account for someone else without authorization.
          </li>
          <li>
            Keep your password confidential. You are responsible for activity
            carried out through your account. Do not share your login
            credentials.
          </li>
          <li>
            Tell the institute promptly if you suspect unauthorized access or a
            security problem.
          </li>
          <li>
            Access may be limited by role, class assignment, account status, or
            the needs of the institute.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="acceptable-use" title="4. Acceptable use">
        <p>You must not:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            attempt to access accounts, records, files, or administrative areas
            without authorization;
          </li>
          <li>
            interfere with the website, portal, servers, security controls, or
            another person&apos;s use of the service;
          </li>
          <li>
            upload malware, unlawful material, or content that infringes
            another person&apos;s rights;
          </li>
          <li>
            copy, scrape, or republish student information, study materials, or
            other non-public content without permission;
          </li>
          <li>
            use the portal for harassment, impersonation, fraud, or any
            unlawful purpose.
          </li>
        </ul>
        <p>
          The institute may investigate suspected misuse and may restrict or
          suspend access while doing so.
        </p>
      </LegalSection>

      <LegalSection id="content" title="5. Content and ownership">
        <p>
          The institute&apos;s name, branding, website design, course content,
          and study materials are protected by applicable intellectual
          property rules. The institute grants you a limited, non-exclusive,
          non-transferable permission to use portal content for your own
          learning or teaching while you have authorized access.
        </p>
        <p>
          You may not sell, publish, or redistribute portal materials without
          written permission, except where the law expressly allows it. Rights
          in third-party content remain with the relevant owner.
        </p>
        <p>
          By uploading a file or submitting content, you confirm that you have
          the right to do so and give the institute permission to store,
          process, and display it as needed to operate the portal. Do not
          upload a student photograph or personal information unless the
          institute has authorized its use.
        </p>
      </LegalSection>

      <LegalSection id="achievements" title="6. Public achievements">
        <p>
          Topper entries are published only when an authorized administrator
          chooses to publish them. The institute should obtain any permission
          required for a student&apos;s name and photograph before publication.
          If a student or guardian wants an entry corrected or removed, they
          should contact the institute.
        </p>
        <p>
          Public achievement information can be copied by search engines or
          other visitors after it is published. Removal from this website does
          not guarantee removal from third-party caches or copies.
        </p>
      </LegalSection>

      <LegalSection id="admissions" title="7. Admissions, fees, and communications">
        <p>
          The website does not currently provide online admission or fee
          payment. Admission decisions, fee amounts, refunds, batch changes, and
          other enrolment matters are handled directly by the institute and may
          be subject to separate documents or receipts.
        </p>
        <p>
          A phone call, email, WhatsApp message, or website visit does not by
          itself confirm admission. Do not send payment details through public
          website fields. Confirm payment instructions directly with the
          institute before paying anyone.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="8. Availability and changes">
        <p>
          The website and portal are provided on an &quot;as available&quot;
          basis. Maintenance, network problems, provider outages, or security
          measures may interrupt access. The institute may change, suspend, or
          withdraw features, and may correct errors or update content at any
          time.
        </p>
        <p>
          The institute is not responsible for delays or failures caused by
          events outside its reasonable control, but this does not exclude any
          responsibility that cannot lawfully be excluded.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" title="9. Disclaimers and liability">
        <p>
          Website content is for general information and learning support. It is
          not a guarantee of admission, marks, rank, examination results, or
          any particular academic outcome. Official institute records prevail
          over information displayed or downloaded from the portal.
        </p>
        <p>
          To the extent permitted by applicable law, the institute is not liable
          for indirect or consequential loss arising from reliance on general
          website information, third-party links, or service interruption. The
          full liability position, including any mandatory consumer or
          education-related rights, is{' '}
          <LegalPlaceholder>to be confirmed under applicable law</LegalPlaceholder>
          .
        </p>
      </LegalSection>

      <LegalSection id="termination" title="10. Suspension and termination">
        <p>
          Access may be suspended or terminated if an account is rejected,
          no longer active, suspected of misuse, or no longer needed for the
          institute&apos;s academic operations. The institute may also restrict
          access to protect students, staff, records, or the security of the
          service.
        </p>
        <p>
          Obligations concerning confidentiality, content ownership, and
          records that must be retained may continue after access ends.
        </p>
      </LegalSection>

      <LegalSection id="law" title="11. Governing law and disputes">
        <p>
          These terms are intended to be governed by the laws applicable in the
          jurisdiction where Expert Learning Center operates. The exact legal
          entity, governing law, and forum for disputes are{' '}
          <LegalPlaceholder />.
        </p>
        <p>
          Before starting a formal dispute, please contact the institute so
          that the issue can be reviewed.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact">
        <address className="rounded-xl border border-slate-200 bg-slate-50 p-4 not-italic leading-7 text-slate-700">
          <strong>{institute.name}</strong>
          <br />
          {institute.address.display}
          <br />
          Phone:{' '}
          <a
            className="font-semibold text-blue-800 underline underline-offset-2"
            href={institute.phone.href}
          >
            {institute.phone.display}
          </a>
          <br />
          Email:{' '}
          <a
            className="font-semibold text-blue-800 underline underline-offset-2"
            href={institute.email.href}
          >
            {institute.email.display}
          </a>
        </address>
        <p>
          For portal access problems, include the account email and a short
          description of the issue. Never send your password by email.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
