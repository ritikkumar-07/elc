export default function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
}) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      {eyebrow && (
        <p
          className={`mb-3 text-xs font-bold uppercase tracking-[0.2em] ${
            light ? 'text-blue-200' : 'text-blue-800'
          }`}
        >
          {eyebrow}
        </p>
      )}

      <h2
        className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${
          light ? 'text-white' : 'text-slate-900'
        }`}
      >
        {title}
      </h2>

      {description && (
        <p
          className={`mt-4 text-base leading-7 ${
            light ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          {description}
        </p>
      )}
    </div>
  )
}