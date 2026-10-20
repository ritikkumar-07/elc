import express from 'express'

import {
  academicOverview,
  createClass,
  createSubject,
  getClass,
  listClasses,
  listSubjects,
  updateClass,
  updateSubject,
} from '../controllers/academicController.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(requireAuth)

const adminOnly = allowRoles('admin')

router.get('/overview', academicOverview)

router
  .route('/classes')
  .get(listClasses)
  .post(adminOnly, createClass)

router
  .route('/classes/:id')
  .get(getClass)
  .patch(adminOnly, updateClass)

router
  .route('/subjects')
  .get(listSubjects)
  .post(adminOnly, createSubject)

router.patch('/subjects/:id', adminOnly, updateSubject)

export default router
