import express from 'express'

import {
  createStudent,
  getStudent,
  listStudents,
  updateStudent,
  updateStudentStatus,
} from '../controllers/userController.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(requireAuth, allowRoles('admin'))

router
  .route('/')
  .get(listStudents)
  .post(createStudent)

router
  .route('/:id')
  .get(getStudent)
  .patch(updateStudent)

router.patch('/:id/status', updateStudentStatus)

export default router
