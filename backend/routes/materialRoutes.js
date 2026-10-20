import express from 'express'

import {
  createMaterial,
  downloadMaterial,
  listMaterials,
  updateMaterial,
} from '../controllers/materialController.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'
import { uploadPdf } from '../middleware/uploadMiddleware.js'

const router = express.Router()

router.use(requireAuth)

const staffOnly = allowRoles('admin', 'teacher')

router
  .route('/')
  .get(listMaterials)
  .post(staffOnly, uploadPdf, createMaterial)

router.get('/:id/file', downloadMaterial)
router.patch('/:id', staffOnly, updateMaterial)

export default router
