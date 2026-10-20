import express from 'express'

import {
  createTest,
  getTest,
  listResults,
  listTestMarks,
  listTests,
  publishResults,
  saveMarks,
  unpublishResults,
  updateTest,
} from '../controllers/testController.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(requireAuth)

const staffOnly = allowRoles('admin', 'teacher')

router.get('/results', listResults)

router
  .route('/')
  .get(listTests)
  .post(staffOnly, createTest)

router
  .route('/:id')
  .get(getTest)
  .patch(staffOnly, updateTest)

router
  .route('/:id/marks')
  .get(staffOnly, listTestMarks)
  .put(staffOnly, saveMarks)

router.post('/:id/publish', staffOnly, publishResults)
router.post('/:id/unpublish', staffOnly, unpublishResults)

export default router
