import express from 'express'

import {
  getAssignedStudent,
  listAssignedStudents,
} from '../controllers/userController.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(requireAuth, allowRoles('teacher'))

router.get('/students', listAssignedStudents)
router.get('/students/:id', getAssignedStudent)

export default router
