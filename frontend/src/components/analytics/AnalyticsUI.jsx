import { Badge } from '../common/DashboardUI.jsx'

const STATUS_META = {
  entered: { label: 'Entered', tone: 'green' },
  absent: { label: 'Absent', tone: 'amber' },
  missing: { label: 'Missing', tone: 'red' },
  exempt: { label: 'Exempt', tone: 'violet' },
  not_entered: { label: 'Not entered', tone: 'slate' },
}

export function AssessmentStatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.not_entered
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

export function PassStateBadge({ pass }) {
  if (pass === true) return <Badge tone="green">Pass</Badge>
  if (pass === false) return <Badge tone="red">Below pass</Badge>
  return <Badge tone="slate">Not scored</Badge>
}

export function PublicationBadge({ publishedAt, status }) {
  if (publishedAt) return <Badge tone="green">Published</Badge>
  if (status === 'published') return <Badge tone="blue">Test live</Badge>
  return <Badge tone="amber">{status || 'Draft'}</Badge>
}

export function MethodNote({ children }) {
  return (
    <p className="text-xs leading-5 text-slate-500">
      {children}
    </p>
  )
}

export function TableShell({ children, label }) {
  return (
    <div className="overflow-x-auto" role="region" aria-label={label}>
      {children}
    </div>
  )
}
