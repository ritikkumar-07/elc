import express from 'express'

import {
  getAttendanceRoster,
  getClassAttendanceSummary,
  getMyAttendance,
  listAttendance,
  runClassAttendanceAction,
  saveAttendance,
  saveAttendanceBatch,
} from '../controllers/attendanceController.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(requireAuth)

const staffOnly = allowRoles('admin', 'teacher')

router.get('/me', allowRoles('student'), getMyAttendance)
router.get('/roster', staffOnly, getAttendanceRoster)
router.get(
  '/class/:classId/summary',
  staffOnly,
  getClassAttendanceSummary,
)
router.patch('/batch', staffOnly, saveAttendanceBatch)
router.post('/class-action', staffOnly, runClassAttendanceAction)
router
  .route('/')
  .get(listAttendance)
  .put(staffOnly, saveAttendance)

export default router
