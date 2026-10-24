import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import test from 'node:test'

import {
  buildAttendanceRecordMap,
  isValidAttendanceDateKey,
  mergeAttendanceRecords,
  summarizeAttendanceRecords,
} from '../utils/attendance.js'

function syntheticStudents(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `507f1f77bcf86cd79943${String(index).padStart(4, '0')}`,
    rollNumber: `ELC-${String(index + 1).padStart(4, '0')}`,
  }))
}

test('merges and summarizes 1,000 students without duplicate records', (t) => {
  const students = syntheticStudents(1000)
  const updates = students.map((student, index) => ({
    studentId: student.id,
    status:
      index % 10 === 0
        ? 'absent'
        : index % 7 === 0
          ? 'late'
          : 'present',
    note: index % 25 === 0 ? 'Synthetic note' : '',
  }))

  const started = performance.now()
  const merged = mergeAttendanceRecords([], updates)
  const summary = summarizeAttendanceRecords(
    merged.records,
    students.map((student) => student.id),
  )
  const elapsed = performance.now() - started

  t.diagnostic(
    `1,000-record merge + summary: ${elapsed.toFixed(2)} ms`,
  )

  assert.equal(merged.records.length, 1000)
  assert.equal(merged.changedCount, 1000)
  assert.equal(new Set(merged.records.map((record) => record.student)).size, 1000)
  assert.equal(summary.total, 1000)
  assert.equal(summary.marked, 1000)
  assert.equal(summary.unmarked, 0)
  assert.equal(
    summary.counts.present +
      summary.counts.absent +
      summary.counts.late +
      summary.counts.excused,
    1000,
  )
  assert.ok(elapsed < 1000)
})

test('repeated saves update records in place instead of duplicating them', () => {
  const students = syntheticStudents(1000)
  const first = mergeAttendanceRecords(
    [],
    students.map((student) => ({
      studentId: student.id,
      status: 'present',
      note: '',
    })),
  )
  const second = mergeAttendanceRecords(
    first.records,
    students.slice(0, 200).map((student) => ({
      studentId: student.id,
      status: 'absent',
      note: 'Follow-up',
    })),
  )

  assert.equal(second.records.length, 1000)
  assert.equal(second.changedCount, 200)
  assert.equal(
    buildAttendanceRecordMap(second.records).get(students[0].id).status,
    'absent',
  )
  assert.equal(
    buildAttendanceRecordMap(second.records).get(students[500].id).status,
    'present',
  )
})

test('only-unmarked updates never replace saved attendance', () => {
  const records = [
    { student: 'student-1', status: 'late', note: 'Traffic' },
    { student: 'student-2', status: 'present', note: '' },
  ]
  const result = mergeAttendanceRecords(
    records,
    [
      { studentId: 'student-1', status: 'absent', note: '' },
      { studentId: 'student-2', status: 'absent', note: '' },
      { studentId: 'student-3', status: 'absent', note: '' },
    ],
    { onlyUnmarked: true },
  )
  const map = buildAttendanceRecordMap(result.records)

  assert.equal(result.changedCount, 1)
  assert.equal(map.get('student-1').status, 'late')
  assert.equal(map.get('student-2').status, 'present')
  assert.equal(map.get('student-3').status, 'absent')
})

test('attendance dates reject impossible calendar values', () => {
  assert.equal(isValidAttendanceDateKey('2026-10-24'), true)
  assert.equal(isValidAttendanceDateKey('2026-02-29'), false)
  assert.equal(isValidAttendanceDateKey('2026-13-01'), false)
  assert.equal(isValidAttendanceDateKey('24-10-2026'), false)
})
