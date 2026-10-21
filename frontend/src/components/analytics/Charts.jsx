import { cardClass } from '../common/DashboardUI.jsx'

const SERIES_COLORS = [
  '#19366e',
  '#2f6fed',
  '#0f766e',
  '#b45309',
  '#7f011f',
]

function ChartEmpty({ message }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
      <p className="max-w-sm text-sm leading-6 text-slate-500">
        {message}
      </p>
    </div>
  )
}

function Legend({ items }) {
  if (items.length <= 1) return null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((item, index) => (
        <span
          key={item.name}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor:
                item.color || SERIES_COLORS[index % SERIES_COLORS.length],
            }}
            aria-hidden="true"
          />
          {item.name}
        </span>
      ))}
    </div>
  )
}

export function LineChart({
  labels = [],
  series = [],
  height = 260,
  emptyMessage = 'There are not enough scored results to draw a trend yet.',
  title = 'Assessment trend',
}) {
  const activeSeries = (series || [])
    .filter(
      (item) =>
        Array.isArray(item.values) &&
        item.values.some((value) => Number.isFinite(value)),
    )
    .map((item, index) => ({
      ...item,
      color: item.color || SERIES_COLORS[index % SERIES_COLORS.length],
    }))

  if (labels.length === 0 || activeSeries.length === 0) {
    return <ChartEmpty message={emptyMessage} />
  }

  const width = 720
  const padding = { top: 20, right: 22, bottom: 58, left: 44 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const xAt = (index) =>
    labels.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (labels.length - 1)) * plotWidth
  const yAt = (value) =>
    padding.top + plotHeight - (Math.min(Math.max(value, 0), 100) / 100) * plotHeight
  const tickCount = Math.min(labels.length, 6)
  const tickIndexes = [
    ...new Set(
      Array.from({ length: tickCount }, (_, index) =>
        tickCount === 1
          ? 0
          : Math.round((index * (labels.length - 1)) / (tickCount - 1)),
      ),
    ),
  ]

  function seriesSegments(values) {
    const segments = []
    let current = []

    values.forEach((value, index) => {
      if (Number.isFinite(value)) {
        current.push({ index, value })
      } else if (current.length > 0) {
        segments.push(current)
        current = []
      }
    })

    if (current.length > 0) segments.push(current)
    return segments
  }

  const description = activeSeries
    .map((item) => item.name)
    .join(', ')

  return (
    <div className="space-y-3">
      <Legend items={activeSeries} />

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={`${title}. ${description}.`}
        >
          <title>{title}</title>
          <desc>
            {description}. Scores are percentages from 0 to 100. A table
            of the same values is provided below the chart.
          </desc>

          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={yAt(tick)}
                x2={width - padding.right}
                y2={yAt(tick)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={yAt(tick) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#64748b"
              >
                {tick}%
              </text>
            </g>
          ))}

          {activeSeries.flatMap((item) =>
            seriesSegments(item.values).map((segment, segmentIndex) => (
              <g key={`${item.name}-${segmentIndex}`}>
                {segment.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={item.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={segment
                      .map(
                        (point) =>
                          `${xAt(point.index)},${yAt(point.value)}`,
                      )
                      .join(' ')}
                  />
                )}

                {segment.map((point) => (
                  <circle
                    key={`${item.name}-${point.index}`}
                    cx={xAt(point.index)}
                    cy={yAt(point.value)}
                    r="3.5"
                    fill="#ffffff"
                    stroke={item.color}
                    strokeWidth="2"
                  >
                    <title>{`${item.name}: ${point.value}% on ${labels[point.index]}`}</title>
                  </circle>
                ))}
              </g>
            )),
          )}

          {tickIndexes.map((index) => {
            const text = String(labels[index] || '')
            const short =
              text.length > 18 ? `${text.slice(0, 17)}…` : text
            const anchor =
              labelAnchor(index, labels.length)

            return (
              <text
                key={`${index}-${text}`}
                x={xAt(index)}
                y={height - 22}
                textAnchor={anchor}
                fontSize="11"
                fill="#64748b"
              >
                {short}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function labelAnchor(index, total) {
  if (index === 0) return 'start'
  if (index === total - 1) return 'end'
  return 'middle'
}

export function BarChart({
  data = [],
  valueSuffix = '%',
  maxValue,
  emptyMessage = 'No comparable scored data is available.',
  title = 'Comparison chart',
}) {
  const rows = (data || []).filter(Boolean)

  if (rows.length === 0) {
    return <ChartEmpty message={emptyMessage} />
  }

  const values = rows
    .map((row) =>
      row.value === null || row.value === undefined || row.value === ''
        ? null
        : Number(row.value),
    )
    .filter((value) => Number.isFinite(value))
  const maximum =
    maxValue ??
    (valueSuffix === '%'
      ? 100
      : Math.max(1, ...values))

  return (
    <div
      className="space-y-4"
      role="img"
      aria-label={`${title}. ${rows
        .map(
          (row) =>
            `${row.label}: ${row.value ?? 'no data'}${valueSuffix}`,
        )
        .join('. ')}.`}
    >
      {rows.map((row) => {
        const value =
          row.value === null ||
          row.value === undefined ||
          row.value === ''
            ? null
            : Number(row.value)
        const validValue = Number.isFinite(value) ? value : null
        const width =
          validValue != null && maximum > 0
            ? Math.min(Math.max((validValue / maximum) * 100, 0), 100)
            : 0

        return (
          <div
            key={row.label}
            className="grid gap-1.5 sm:grid-cols-[minmax(110px,190px)_1fr] sm:items-center sm:gap-4"
          >
            <p className="truncate text-sm font-medium text-slate-700">
              {row.label}
            </p>

            <div className="flex items-center gap-3">
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#19366e]"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-800">
                {validValue == null
                  ? '—'
                  : `${validValue}${valueSuffix}`}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function HistogramChart({
  data = [],
  emptyMessage = 'No score distribution is available.',
  title = 'Score distribution',
}) {
  const rows = (data || []).filter(Boolean)
  const total = rows.reduce(
    (sum, row) => sum + Number(row.count || 0),
    0,
  )

  if (rows.length === 0 || total === 0) {
    return <ChartEmpty message={emptyMessage} />
  }

  const maximum = Math.max(
    1,
    ...rows.map((row) => Number(row.count || 0)),
  )

  return (
    <div
      className="space-y-3"
      role="img"
      aria-label={`${title}. ${rows
        .map((row) => `${row.label}: ${row.count || 0} results`)
        .join('. ')}.`}
    >
      <div className="flex h-48 items-end gap-2 border-b border-slate-200 px-1 pt-4">
        {rows.map((row) => {
          const count = Number(row.count || 0)
          const height = Math.max((count / maximum) * 100, count > 0 ? 4 : 0)

          return (
            <div
              key={row.label}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-[11px] font-semibold tabular-nums text-slate-600">
                {count}
              </span>
              <div
                className="w-full rounded-t-md bg-[#2f6fed]"
                style={{ height: `${height}%` }}
                title={`${row.label}: ${count}`}
              />
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 px-1">
        {rows.map((row) => (
          <p
            key={row.label}
            className="min-w-0 flex-1 text-center text-[10px] leading-4 text-slate-500 sm:text-xs"
          >
            {row.label}
          </p>
        ))}
      </div>
    </div>
  )
}

export function DonutChart({
  segments = [],
  centerLabel = 'Scored',
  emptyMessage = 'No scored results are available for a pass/fail split.',
  title = 'Pass and fail distribution',
}) {
  const rows = (segments || []).filter(
    (segment) => Number(segment.value) > 0,
  )
  const total = rows.reduce(
    (sum, segment) => sum + Number(segment.value),
    0,
  )

  if (rows.length === 0 || total === 0) {
    return <ChartEmpty message={emptyMessage} />
  }

  const { prepared } = rows.reduce(
    (accumulator, segment, index) => {
      const value = Number(segment.value)
      const portion = (value / total) * 100

      accumulator.prepared.push({
        ...segment,
        value,
        portion,
        offset: accumulator.offset,
        color:
          segment.color ||
          SERIES_COLORS[index % SERIES_COLORS.length],
      })
      accumulator.offset += portion

      return accumulator
    },
    { prepared: [], offset: 0 },
  )

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <svg
        viewBox="0 0 120 120"
        className="h-40 w-40 shrink-0"
        role="img"
        aria-label={`${title}. ${prepared
          .map(
            (segment) =>
              `${segment.label}: ${segment.value}`,
          )
          .join('. ')}.`}
      >
        <title>{title}</title>
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="16"
        />
        {prepared.map((segment) => (
          <circle
            key={segment.label}
            cx="60"
            cy="60"
            r="42"
            fill="none"
            stroke={segment.color}
            strokeWidth="16"
            pathLength="100"
            strokeDasharray={`${segment.portion} ${100 - segment.portion}`}
            strokeDashoffset={-segment.offset}
            transform="rotate(-90 60 60)"
          >
            <title>{`${segment.label}: ${segment.value}`}</title>
          </circle>
        ))}
        <text
          x="60"
          y="56"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill="#19366e"
        >
          {total}
        </text>
        <text
          x="60"
          y="72"
          textAnchor="middle"
          fontSize="9"
          fill="#64748b"
        >
          {centerLabel}
        </text>
      </svg>

      <div className="space-y-2">
        {prepared.map((segment) => (
          <div
            key={segment.label}
            className="flex items-center gap-2 text-sm text-slate-700"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: segment.color }}
              aria-hidden="true"
            />
            <span className="min-w-24 font-medium">{segment.label}</span>
            <span className="font-semibold tabular-nums">
              {segment.value}
            </span>
            <span className="text-xs text-slate-500">
              ({segment.portion.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartCard({
  title,
  description,
  action,
  children,
  footer,
}) {
  return (
    <section className={cardClass}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
      {footer && (
        <div className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500">
          {footer}
        </div>
      )}
    </section>
  )
}
