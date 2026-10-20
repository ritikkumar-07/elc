import express from 'express'

import {
  createTeacher,
  getTeacher,
  listTeachers,
  updateTeacher,
  updateTeacherStatus,
} from '../controllers/userController.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(requireAuth, allowRoles('admin'))

router
  .route('/')
  .get(listTeachers)
  .post(createTeacher)

router
  .route('/:id')
  .get(getTeacher)
  .patch(updateTeacher)

router.patch('/:id/status', updateTeacherStatus)

export default router
