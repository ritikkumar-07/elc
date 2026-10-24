export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parsePagination(query, defaultLimit = 20) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1)
  const limit = Math.min(
    Math.max(Number.parseInt(query.limit, 10) || defaultLimit, 1),
    100,
  )

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}

export function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    pages: Math.max(Math.ceil(total / limit), 1),
  }
}

export function safeUser(user) {
  if (!user) return null

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    rollNumber: user.rollNumber || '',
    class: user.class || null,
    phone: user.phone || '',
    guardianName: user.guardianName || '',
    guardianPhone: user.guardianPhone || '',
    admissionDate: user.admissionDate || null,
    assignedClasses: user.assignedClasses || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export function safeTeacherStudent(user) {
  if (!user) return null

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    rollNumber: user.rollNumber || '',
    class: user.class || null,
  }
}

export function validationError(res, error, message = 'Invalid data.') {
  return res.status(400).json({
    success: false,
    message,
    errors: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  })
}

export function invalidId(res, label = 'ID') {
  return res.status(400).json({
    success: false,
    message: `Invalid ${label}.`,
  })
}

export function notFound(res, message = 'Record not found.') {
  return res.status(404).json({
    success: false,
    message,
  })
}
