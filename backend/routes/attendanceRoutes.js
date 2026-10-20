import express from 'express'

import {
  getClassAttendanceSummary,
  getMyAttendance,
  listAttendance,
  saveAttendance,
} from '../controllers/attendanceController.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(requireAuth)

const staffOnly = allowRoles('admin', 'teacher')

router.get('/me', allowRoles('student'), getMyAttendance)
router.get(
  '/class/:classId/summary',
  staffOnly,
  getClassAttendanceSummary,
)
router
  .route('/')
  .get(listAttendance)
  .put(staffOnly, saveAttendance)

export default router
