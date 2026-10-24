import { Check, Clock, FileCheck2, UserX } from 'lucide-react'

export const attendanceStatusOptions = [
  {
    value: 'present',
    label: 'Present',
    shortLabel: 'P',
    icon: Check,
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    iconBox: 'bg-emerald-100 text-emerald-700',
    active: 'border-emerald-600 bg-emerald-600 text-white',
    idle: 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800',
    dot: 'bg-emerald-500',
    text: 'text-emerald-800',
  },
  {
    value: 'absent',
    label: 'Absent',
    shortLabel: 'A',
    icon: UserX,
    chip: 'border-red-200 bg-red-50 text-red-900',
    iconBox: 'bg-red-100 text-red-700',
    active: 'border-red-600 bg-red-600 text-white',
    idle: 'border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-800',
    dot: 'bg-red-500',
    text: 'text-red-800',
  },
  {
    value: 'late',
    label: 'Late',
    shortLabel: 'L',
    icon: Clock,
    chip: 'border-amber-200 bg-amber-50 text-amber-900',
    iconBox: 'bg-amber-100 text-amber-800',
    active: 'border-amber-500 bg-amber-500 text-white',
    idle: 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900',
    dot: 'bg-amber-500',
    text: 'text-amber-800',
  },
  {
    value: 'excused',
    label: 'Excused',
    shortLabel: 'E',
    icon: FileCheck2,
    chip: 'border-sky-200 bg-sky-50 text-sky-900',
    iconBox: 'bg-sky-100 text-sky-700',
    active: 'border-sky-600 bg-sky-600 text-white',
    idle: 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900',
    dot: 'bg-sky-500',
    text: 'text-sky-800',
  },
]

export const unmarkedStatus = {
  value: 'unmarked',
  label: 'Unmarked',
  icon: FileCheck2,
  chip: 'border-slate-200 bg-slate-50 text-slate-700',
  iconBox: 'bg-slate-200 text-slate-600',
  dot: 'bg-slate-400',
  text: 'text-slate-700',
}

export function attendanceStatusOption(value) {
  return (
    attendanceStatusOptions.find((option) => option.value === value) ||
    unmarkedStatus
  )
}

export function attendanceStatusLabel(value) {
  return attendanceStatusOption(value).label
}
