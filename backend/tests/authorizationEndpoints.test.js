import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getTest,
  publishResults,
  unpublishResults,
} from '../controllers/testController.js'
import { downloadMaterial } from '../controllers/materialController.js'
import StudyMaterial from '../models/StudyMaterial.js'
import Test from '../models/Test.js'

const classA = '507f1f77bcf86cd799439011'
const classB = '507f1f77bcf86cd799439012'
const testId = '507f1f77bcf86cd799439013'
const materialId = '507f1f77bcf86cd799439014'
const teacherId = '507f1f77bcf86cd799439015'

const teacher = {
  _id: teacherId,
  role: 'teacher',
  assignedClasses: [classB],
}

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
    populate() {
      return query
    },
    async lean() {
      return value
    },
  }

  return query
}

function makeTest(overrides = {}) {
  return {
    _id: testId,
    class: classA,
    status: 'published',
    maxMarks: 100,
    passingMarks: 33,
    resultsPublishedAt: null,
    resultsPublishedBy: null,
    ...overrides,
  }
}

test('teachers cannot read a test from an unassigned class', async (t) => {
  const originalFindById = Test.findById

  t.after(() => {
    Test.findById = originalFindById
  })

  Test.findById = () => queryFor(makeTest())

  const res = mockResponse()
  const next = mockNext()

  await getTest(
    {
      params: { id: testId },
      user: teacher,
    },
    res,
    next,
  )

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.success, false)
})

test('teachers cannot publish or unpublish results for an unassigned class', async (t) => {
  const originalFindById = Test.findById

  t.after(() => {
    Test.findById = originalFindById
  })

  Test.findById = async () => makeTest()

  for (const handler of [publishResults, unpublishResults]) {
    const res = mockResponse()
    const next = mockNext()

    await handler(
      {
        params: { id: testId },
        user: teacher,
      },
      res,
      next,
    )

    assert.equal(next.called, false)
    assert.equal(res.statusCode, 403)
  }

  Test.findById = async () =>
    makeTest({
      resultsPublishedAt: new Date('2026-10-01T00:00:00.000Z'),
      resultsPublishedBy: teacherId,
    })

  for (const handler of [publishResults, unpublishResults]) {
    const res = mockResponse()
    const next = mockNext()

    await handler(
      {
        params: { id: testId },
        user: teacher,
      },
      res,
      next,
    )

    assert.equal(next.called, false)
    assert.equal(res.statusCode, 403)
  }
})

test('teachers cannot download material from an unassigned class', async (t) => {
  const originalFindById = StudyMaterial.findById

  t.after(() => {
    StudyMaterial.findById = originalFindById
  })

  StudyMaterial.findById = () =>
    queryFor({
      _id: materialId,
      class: classA,
      isPublished: true,
      isArchived: false,
      cloudinaryPublicId: 'elc-materials/material',
    })

  const res = mockResponse()
  const next = mockNext()

  await downloadMaterial(
    {
      params: { id: materialId },
      user: teacher,
    },
    res,
    next,
  )

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.success, false)
})
