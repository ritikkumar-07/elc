import assert from 'node:assert/strict'
import test from 'node:test'

import {
  safeTeacherStudent,
  safeUser,
} from '../utils/query.js'
import {
  teacherOwnsClass,
  userCanAccessClass,
} from '../utils/authorization.js'

const classA = '507f1f77bcf86cd799439011'
const classB = '507f1f77bcf86cd799439012'

test('teacher class scope denies unassigned classes and allows admins', () => {
  const teacher = {
    role: 'teacher',
    assignedClasses: [classA],
  }

  assert.equal(teacherOwnsClass(teacher, classA), true)
  assert.equal(teacherOwnsClass(teacher, classB), false)
  assert.equal(
    userCanAccessClass(teacher, classB),
    false,
  )
  assert.equal(
    userCanAccessClass({ role: 'admin' }, classB),
    true,
  )
  assert.equal(
    userCanAccessClass(
      { role: 'student', class: classB },
      classB,
    ),
    true,
  )
})

test('teacher-facing student projection omits guardian and admission PII', () => {
  const student = {
    _id: '507f1f77bcf86cd799439013',
    name: 'Student One',
    email: 'student@example.com',
    role: 'student',
    status: 'active',
    rollNumber: '10A',
    class: { _id: classA, name: '10', section: 'A' },
    phone: '555-0100',
    guardianName: 'Guardian',
    guardianPhone: '555-0101',
    admissionDate: new Date('2025-01-01'),
    assignedClasses: [classA],
  }

  const teacherView = safeTeacherStudent(student)
  const adminView = safeUser(student)

  assert.deepEqual(Object.keys(teacherView).sort(), [
    'class',
    'email',
    'id',
    'name',
    'role',
    'rollNumber',
    'status',
  ])
  assert.equal('guardianPhone' in teacherView, false)
  assert.equal('guardianName' in teacherView, false)
  assert.equal('phone' in teacherView, false)
  assert.equal('admissionDate' in teacherView, false)
  assert.equal(adminView.guardianPhone, '555-0101')
})
