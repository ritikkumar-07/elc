import express from 'express'

import {
  exportAnalytics,
  getAnalyticsOverview,
  getAnalyticsTest,
  listAnalyticsTests,
} from '../controllers/analyticsController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(requireAuth)

router.get('/overview', getAnalyticsOverview)
router.get('/tests', listAnalyticsTests)
router.get('/tests/:id', getAnalyticsTest)
router.get('/export', exportAnalytics)

export default router
