import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getAttendanceRoster,
  runClassAttendanceAction,
  saveAttendance,
  saveAttendanceBatch,
} from '../controllers/attendanceController.js'
import Attendance from '../models/Attendance.js'
import Class from '../models/Class.js'
import User from '../models/User.js'

const classA = '507f1f77bcf86cd799439011'
const classB = '507f1f77bcf86cd799439012'
const studentA = '507f1f77bcf86cd799439013'
const studentB = '507f1f77bcf86cd799439014'
const teacherId = '507f1f77bcf86cd799439015'
const adminId = '507f1f77bcf86cd799439016'

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

function mockNext() {
  const next = (error) => {
    next.called = true
    next.error = error
  }

  next.called = false
  return next
}

function queryFor(value) {
  const query = {
    select() {
      return query
    },
    populate() {
      return query
    },
    sort() {
      return query
    },
    skip() {
      return query
    },
    limit() {
      return query
    },
    async lean() {
      return value
    },
  }

  return query
}

function adminRequest(body) {
  return {
    body,
    query: {},
    params: {},
    user: { _id: adminId, role: 'admin' },
  }
}

function batchBody(overrides = {}) {
  return {
    classId: classA,
    date: '2026-10-24',
    session: 'full-day',
    expectedRevision: 0,
    records: [
      { studentId: studentA, status: 'present', note: '' },
    ],
    ...overrides,
  }
}

test('unauthenticated-style callers without staff roles cannot save attendance', async () => {
  const res = mockResponse()
  const next = mockNext()

  await saveAttendance(
    {
      body: batchBody({ expectedRevision: undefined }),
      query: {},
      params: {},
      user: { _id: studentA, role: 'student' },
    },
    res,
    next,
  )

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.success, false)
})

test('teachers cannot batch-save attendance for an unassigned class', async () => {
  const res = mockResponse()
  const next = mockNext()

  await saveAttendanceBatch(
    {
      ...adminRequest(batchBody()),
      user: {
        _id: teacherId,
        role: 'teacher',
        assignedClasses: [classB],
      },
    },
    res,
    next,
  )

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 403)
})

test('batch validation rejects invalid statuses and oversized submissions', async () => {
  for (const body of [
    batchBody({
      records: [
        { studentId: studentA, status: 'unknown', note: '' },
      ],
    }),
    batchBody({
      records: Array.from({ length: 201 }, (_, index) => ({
        studentId: `507f1f77bcf86cd79943${String(index).padStart(4, '0')}`,
        status: 'present',
        note: '',
      })),
    }),
  ]) {
    const res = mockResponse()
    const next = mockNext()

    await saveAttendanceBatch(adminRequest(body), res, next)

    assert.equal(next.called, false)
    assert.equal(res.statusCode, 400)
  }
})

test('batch saves reject duplicate student IDs', async (t) => {
  const originalExists = Class.exists

  t.after(() => {
    Class.exists = originalExists
  })

  Class.exists = async () => ({ _id: classA })

  const res = mockResponse()
  const next = mockNext()

  await saveAttendanceBatch(
    adminRequest(
      batchBody({
        records: [
          { studentId: studentA, status: 'present', note: '' },
          { studentId: studentA, status: 'absent', note: '' },
        ],
      }),
    ),
    res,
    next,
  )

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 400)
  assert.match(res.body.message, /once/i)
})

test('batch saves reject students outside the selected class', async (t) => {
  const originalExists = Class.exists
  const originalFind = User.find

  t.after(() => {
    Class.exists = originalExists
    User.find = originalFind
  })

  Class.exists = async () => ({ _id: classA })
  User.find = () => queryFor([{ _id: studentA }])

  const res = mockResponse()
  const next = mockNext()

  await saveAttendanceBatch(
    adminRequest(
      batchBody({
        records: [
          { studentId: studentA, status: 'present', note: '' },
          { studentId: studentB, status: 'present', note: '' },
        ],
      }),
    ),
    res,
    next,
  )

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 400)
  assert.match(res.body.message, /active members/i)
})

test('stale attendance revisions return a conflict without writing', async (t) => {
  const originalExists = Class.exists
  const originalFind = User.find
  const originalFindOne = Attendance.findOne
  const originalFindOneAndUpdate = Attendance.findOneAndUpdate
  let writeAttempted = false

  t.after(() => {
    Class.exists = originalExists
    User.find = originalFind
    Attendance.findOne = originalFindOne
    Attendance.findOneAndUpdate = originalFindOneAndUpdate
  })

  Class.exists = async () => ({ _id: classA })
  User.find = () => queryFor([{ _id: studentA }])
  Attendance.findOne = () =>
    queryFor({
      _id: '507f1f77bcf86cd799439099',
      records: [
        { student: studentA, status: 'present', note: '' },
      ],
      revision: 3,
      updatedAt: new Date(),
    })
  Attendance.findOneAndUpdate = () => {
    writeAttempted = true
    return queryFor({})
  }

  const res = mockResponse()
  const next = mockNext()

  await saveAttendanceBatch(
    adminRequest(
      batchBody({
        expectedRevision: 2,
        records: [
          { studentId: studentA, status: 'absent', note: '' },
        ],
      }),
    ),
    res,
    next,
  )

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.code, 'ATTENDANCE_CONFLICT')
  assert.equal(writeAttempted, false)
})

test('batch updates merge records without overwriting other students', async (t) => {
  const originalExists = Class.exists
  const originalFind = User.find
  const originalFindOne = Attendance.findOne
  const originalFindOneAndUpdate = Attendance.findOneAndUpdate
  let capturedFilter
  let capturedUpdate

  t.after(() => {
    Class.exists = originalExists
    User.find = originalFind
    Attendance.findOne = originalFindOne
    Attendance.findOneAndUpdate = originalFindOneAndUpdate
  })

  const current = {
    _id: '507f1f77bcf86cd799439099',
    class: classA,
    dateKey: '2026-10-24',
    session: 'full-day',
    records: [
      { student: studentA, status: 'present', note: '' },
      { student: studentB, status: 'absent', note: 'Sick' },
    ],
    markedBy: teacherId,
    revision: 2,
    createdAt: new Date('2026-10-24T00:00:00.000Z'),
    updatedAt: new Date('2026-10-24T00:00:00.000Z'),
  }

  Class.exists = async () => ({ _id: classA })
  User.find = () => queryFor([{ _id: studentA }])
  Attendance.findOne = () => queryFor(current)
  Attendance.findOneAndUpdate = (filter, update) => {
    capturedFilter = filter
    capturedUpdate = update
    return queryFor({
      ...current,
      records: update.$set.records,
      revision: update.$set.revision,
      updatedAt: new Date('2026-10-24T01:00:00.000Z'),
    })
  }

  const res = mockResponse()
  const next = mockNext()

  await saveAttendanceBatch(
    adminRequest(
      batchBody({
        expectedRevision: 2,
        records: [
          {
            studentId: studentA,
            status: 'late',
            note: 'Arrived late',
          },
        ],
      }),
    ),
    res,
    next,
  )

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 200)
  assert.equal(capturedFilter.revision, 2)
  assert.equal(capturedUpdate.$set.revision, 3)
  assert.equal(capturedUpdate.$set.records.length, 2)
  assert.equal(
    capturedUpdate.$set.records.find(
      (record) => record.student === studentB,
    ).status,
    'absent',
  )
  assert.equal(res.body.data.changedCount, 1)
  assert.equal(res.body.data.records[0].status, 'late')
})

test('class-wide unmarked action preserves existing saved statuses', async (t) => {
  const originalExists = Class.exists
  const originalFind = User.find
  const originalFindOne = Attendance.findOne
  const originalFindOneAndUpdate = Attendance.findOneAndUpdate
  let capturedUpdate

  t.after(() => {
    Class.exists = originalExists
    User.find = originalFind
    Attendance.findOne = originalFindOne
    Attendance.findOneAndUpdate = originalFindOneAndUpdate
  })

  const current = {
    _id: '507f1f77bcf86cd799439099',
    class: classA,
    dateKey: '2026-10-24',
    session: 'full-day',
    records: [
      { student: studentA, status: 'present', note: 'On time' },
    ],
    markedBy: teacherId,
    revision: 1,
    createdAt: new Date('2026-10-24T00:00:00.000Z'),
    updatedAt: new Date('2026-10-24T00:00:00.000Z'),
  }

  Class.exists = async () => ({ _id: classA })
  User.find = () => queryFor([
    { _id: studentA },
    { _id: studentB },
  ])
  Attendance.findOne = () => queryFor(current)
  Attendance.findOneAndUpdate = (filter, update) => {
    capturedUpdate = update
    return queryFor({
      ...current,
      records: update.$set.records,
      revision: update.$set.revision,
      updatedAt: new Date('2026-10-24T01:00:00.000Z'),
    })
  }

  const res = mockResponse()
  const next = mockNext()

  await runClassAttendanceAction(
    adminRequest({
      classId: classA,
      date: '2026-10-24',
      session: 'full-day',
      status: 'absent',
      expectedRevision: 1,
      onlyUnmarked: true,
    }),
    res,
    next,
  )

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.data.changedCount, 1)
  assert.equal(
    capturedUpdate.$set.records.find(
      (record) => record.student === studentA,
    ).status,
    'present',
  )
  assert.equal(
    capturedUpdate.$set.records.find(
      (record) => record.student === studentB,
    ).status,
    'absent',
  )
  assert.equal(res.body.data.summary.counts.present, 1)
  assert.equal(res.body.data.summary.counts.absent, 1)
})

test('roster access is denied for an unassigned teacher class', async () => {
  const res = mockResponse()
  const next = mockNext()

  await getAttendanceRoster(
    {
      body: {},
      params: {},
      query: { classId: classA, date: '2026-10-24' },
      user: {
        _id: teacherId,
        role: 'teacher',
        assignedClasses: [classB],
      },
    },
    res,
    next,
  )

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 403)
})

test('roster filters unmarked students and returns accurate pagination', async (t) => {
  const originalExists = Class.exists
  const originalFind = User.find
  const originalFindOne = Attendance.findOne
  let userFindCalls = 0

  t.after(() => {
    Class.exists = originalExists
    User.find = originalFind
    Attendance.findOne = originalFindOne
  })

  Class.exists = async () => ({ _id: classA })
  Attendance.findOne = () =>
    queryFor({
      _id: '507f1f77bcf86cd799439099',
      records: [
        { student: studentA, status: 'present', note: '' },
      ],
      markedBy: { _id: adminId, name: 'Administrator' },
      revision: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  User.find = () => {
    userFindCalls += 1

    if (userFindCalls === 1) {
      return queryFor([
        { _id: studentA },
        { _id: studentB },
        { _id: '507f1f77bcf86cd799439017' },
      ])
    }

    return queryFor([
      {
        _id: studentA,
        name: 'Student A',
        email: 'a@example.com',
        rollNumber: 'A-1',
      },
      {
        _id: studentB,
        name: 'Student B',
        email: 'b@example.com',
        rollNumber: 'B-1',
      },
      {
        _id: '507f1f77bcf86cd799439017',
        name: 'Student C',
        email: 'c@example.com',
        rollNumber: 'C-1',
      },
    ])
  }

  const res = mockResponse()
  const next = mockNext()

  await getAttendanceRoster(
    {
      body: {},
      params: {},
      query: {
        classId: classA,
        date: '2026-10-24',
        status: 'unmarked',
        limit: '2',
        page: '1',
      },
      user: { _id: adminId, role: 'admin' },
    },
    res,
    next,
  )

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.summary.unmarked, 2)
  assert.equal(res.body.summary.counts.present, 1)
  assert.equal(res.body.pagination.total, 2)
  assert.equal(res.body.data.length, 2)
  assert.ok(res.body.data.every((student) => student.saved === false))
  assert.equal(res.body.session.revision, 4)
})
