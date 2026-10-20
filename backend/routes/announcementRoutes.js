import express from 'express'

import {
  createAnnouncement,
  getAnnouncement,
  listAnnouncements,
  listPublicAnnouncements,
  updateAnnouncement,
} from '../controllers/announcementController.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/public', listPublicAnnouncements)

router.use(requireAuth)

const staffOnly = allowRoles('admin', 'teacher')

router
  .route('/')
  .get(listAnnouncements)
  .post(staffOnly, createAnnouncement)

router
  .route('/:id')
  .get(getAnnouncement)
  .patch(staffOnly, updateAnnouncement)

export default router
