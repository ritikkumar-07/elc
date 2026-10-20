import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { z } from 'zod'

import User from '../models/User.js'
import Class from '../models/Class.js'
import {
  escapeRegex,
  invalidId,
  notFound,
  paginationMeta,
  parsePagination,
  safeUser,
  validationError,
} from '../utils/query.js'

const objectId = z
  .string()
  .trim()
  .refine((value) => mongoose.isValidObjectId(value), 'Invalid ID.')

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.')
  .optional()
  .or(z.literal(''))

const basePerson = {
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional().default(''),
}

const createStudentSchema = z
  .object({
    ...basePerson,
    password: z.string().min(8).max(72),
    rollNumber: z.string().trim().max(30).optional().default(''),
    classId: objectId.optional().nullable(),
    guardianName: z.string().trim().max(100).optional().default(''),
    guardianPhone: z.string().trim().max(30).optional().default(''),
    admissionDate: dateString,
  })
  .strict()

const createTeacherSchema = z
  .object({
    ...basePerson,
    password: z.string().min(8).max(72),
    assignedClassIds: z.array(objectId).max(60).optional().default([]),
  })
  .strict()

const updateStudentSchema = z
  .object({
    ...basePerson,
    rollNumber: z.string().trim().max(30).optional(),
    classId: objectId.optional().nullable(),
    guardianName: z.string().trim().max(100).optional(),
    guardianPhone: z.string().trim().max(30).optional(),
    admissionDate: dateString,
  })
  .strict()

const updateTeacherSchema = z
  .object({
    ...basePerson,
    assignedClassIds: z.array(objectId).max(60).optional(),
  })
  .strict()

const statusSchema = z
  .object({
    status: z.enum(['active', 'suspended', 'rejected']),
  })
  .strict()

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeRollNumber(value) {
  const roll = String(value || '').trim().toUpperCase()
  return roll || undefined
}

function normalizeDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

async function validateClassIds(ids) {
  const uniqueIds = [...new Set((ids || []).map(String))]

  if (uniqueIds.length === 0) return uniqueIds

  const count = await Class.countDocuments({
    _id: { $in: uniqueIds },
  })

  return count === uniqueIds.length ? uniqueIds : null
}

function listFilter(role, query) {
  const filter = { role }

  if (query.status) {
    filter.status = query.status
  }

  if (query.classId && mongoose.isValidObjectId(query.classId)) {
    filter.class = query.classId
  }

  const search = String(query.search || '').trim()
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i')
    filter.$or = [
      { name: regex },
      { email: regex },
      { rollNumber: regex },
    ]
  }

  return filter
}

function populateUser(query) {
  return query
    .populate('class', 'name section academicYear isActive')
    .populate(
      'assignedClasses',
      'name section academicYear isActive',
    )
}

async function listPeople(req, res, next, role) {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const filter = listFilter(role, req.query)

    const [total, people] = await Promise.all([
      User.countDocuments(filter),
      populateUser(
        User.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
      ).lean(),
    ])

    return res.status(200).json({
      success: true,
      count: people.length,
      data: people.map(safeUser),
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    return next(error)
  }
}

async function getPerson(req, res, next, role) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'account ID')
    }

    const person = await populateUser(
      User.findOne({ _id: req.params.id, role }),
    ).lean()

    if (!person) {
      return notFound(
        res,
        role === 'student' ? 'Student not found.' : 'Teacher not found.',
      )
    }

    return res.status(200).json({
      success: true,
      data: safeUser(person),
    })
  } catch (error) {
    return next(error)
  }
}

async function createPerson(req, res, next, role, schema) {
  try {
    const parsed = schema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(
        res,
        parsed.error,
        'Please check the account details.',
      )
    }

    const email = normalizeEmail(parsed.data.email)
    const existing = await User.findOne({ email }).lean()

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    let classId = null
    let rollNumber
    let assignedClasses = []

    if (role === 'student') {
      rollNumber = normalizeRollNumber(parsed.data.rollNumber)

      if (rollNumber) {
        const duplicateRoll = await User.findOne({
          role: 'student',
          rollNumber,
        }).lean()

        if (duplicateRoll) {
          return res.status(409).json({
            success: false,
            message: 'This roll number is already in use.',
          })
        }
      }

      if (parsed.data.classId) {
        const classExists = await Class.exists({
          _id: parsed.data.classId,
        })

        if (!classExists) {
          return res.status(400).json({
            success: false,
            message: 'The selected class does not exist.',
          })
        }

        classId = parsed.data.classId
      }
    }

    if (role === 'teacher') {
      const validated = await validateClassIds(
        parsed.data.assignedClassIds,
      )

      if (!validated) {
        return res.status(400).json({
          success: false,
          message: 'One or more assigned classes do not exist.',
        })
      }

      assignedClasses = validated
    }

    const admissionDate =
      role === 'student'
        ? normalizeDate(parsed.data.admissionDate)
        : null

    if (admissionDate === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admission date.',
      })
    }

    const password = await bcrypt.hash(parsed.data.password, 12)

    const user = await User.create({
      name: parsed.data.name,
      email,
      password,
      role,
      status: 'active',
      rollNumber,
      class: classId,
      phone: parsed.data.phone || '',
      guardianName:
        role === 'student' ? parsed.data.guardianName || '' : '',
      guardianPhone:
        role === 'student' ? parsed.data.guardianPhone || '' : '',
      admissionDate,
      assignedClasses,
    })

    const created = await populateUser(User.findById(user._id)).lean()

    return res.status(201).json({
      success: true,
      message: `${role === 'student' ? 'Student' : 'Teacher'} account created successfully.`,
      data: safeUser(created),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'A record with this email or roll number already exists.',
      })
    }

    return next(error)
  }
}

async function updatePerson(req, res, next, role, schema) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'account ID')
    }

    const parsed = schema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(
        res,
        parsed.error,
        'Please check the account details.',
      )
    }

    const user = await User.findOne({
      _id: req.params.id,
      role,
    })

    if (!user) {
      return notFound(
        res,
        role === 'student' ? 'Student not found.' : 'Teacher not found.',
      )
    }

    if (parsed.data.name !== undefined) {
      user.name = parsed.data.name
    }

    if (parsed.data.email !== undefined) {
      const email = normalizeEmail(parsed.data.email)
      if (email !== user.email) {
        const duplicate = await User.findOne({
          email,
          _id: { $ne: user._id },
        }).lean()

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: 'An account with this email already exists.',
          })
        }
      }
      user.email = email
    }

    if (parsed.data.phone !== undefined) {
      user.phone = parsed.data.phone
    }

    if (role === 'student') {
      if (parsed.data.rollNumber !== undefined) {
        const rollNumber = normalizeRollNumber(
          parsed.data.rollNumber,
        )

        if (rollNumber) {
          const duplicateRoll = await User.findOne({
            role: 'student',
            rollNumber,
            _id: { $ne: user._id },
          }).lean()

          if (duplicateRoll) {
            return res.status(409).json({
              success: false,
              message: 'This roll number is already in use.',
            })
          }
        }

        user.rollNumber = rollNumber
      }

      if (parsed.data.classId !== undefined) {
        if (parsed.data.classId) {
          const classExists = await Class.exists({
            _id: parsed.data.classId,
          })

          if (!classExists) {
            return res.status(400).json({
              success: false,
              message: 'The selected class does not exist.',
            })
          }

          user.class = parsed.data.classId
        } else {
          user.class = null
        }
      }

      if (parsed.data.guardianName !== undefined) {
        user.guardianName = parsed.data.guardianName
      }

      if (parsed.data.guardianPhone !== undefined) {
        user.guardianPhone = parsed.data.guardianPhone
      }

      if (parsed.data.admissionDate !== undefined) {
        const admissionDate = normalizeDate(
          parsed.data.admissionDate,
        )

        if (admissionDate === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Invalid admission date.',
          })
        }

        user.admissionDate = admissionDate
      }
    }

    if (
      role === 'teacher' &&
      parsed.data.assignedClassIds !== undefined
    ) {
      const validated = await validateClassIds(
        parsed.data.assignedClassIds,
      )

      if (!validated) {
        return res.status(400).json({
          success: false,
          message: 'One or more assigned classes do not exist.',
        })
      }

      user.assignedClasses = validated
    }

    await user.save()

    const updated = await populateUser(
      User.findById(user._id),
    ).lean()

    return res.status(200).json({
      success: true,
      message: `${role === 'student' ? 'Student' : 'Teacher'} updated successfully.`,
      data: safeUser(updated),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'A record with this email or roll number already exists.',
      })
    }

    return next(error)
  }
}

async function updateStatus(req, res, next, role) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'account ID')
    }

    const parsed = statusSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(
        res,
        parsed.error,
        'Invalid account status.',
      )
    }

    const user = await User.findOne({
      _id: req.params.id,
      role,
    })

    if (!user) {
      return notFound(
        res,
        role === 'student' ? 'Student not found.' : 'Teacher not found.',
      )
    }

    if (user.status === parsed.data.status) {
      return res.status(200).json({
        success: true,
        message: 'Account status is already up to date.',
        data: safeUser(user),
      })
    }

    user.status = parsed.data.status
    await user.save()

    return res.status(200).json({
      success: true,
      message:
        parsed.data.status === 'active'
          ? 'Account activated successfully.'
          : parsed.data.status === 'suspended'
            ? 'Account suspended. Historical records were preserved.'
            : 'Account registration rejected.',
      data: safeUser(user),
    })
  } catch (error) {
    return next(error)
  }
}

export function listStudents(req, res, next) {
  return listPeople(req, res, next, 'student')
}

export function getStudent(req, res, next) {
  return getPerson(req, res, next, 'student')
}

export function createStudent(req, res, next) {
  return createPerson(req, res, next, 'student', createStudentSchema)
}

export function updateStudent(req, res, next) {
  return updatePerson(req, res, next, 'student', updateStudentSchema)
}

export function updateStudentStatus(req, res, next) {
  return updateStatus(req, res, next, 'student')
}

export function listTeachers(req, res, next) {
  return listPeople(req, res, next, 'teacher')
}

export function getTeacher(req, res, next) {
  return getPerson(req, res, next, 'teacher')
}

export function createTeacher(req, res, next) {
  return createPerson(req, res, next, 'teacher', createTeacherSchema)
}

export function updateTeacher(req, res, next) {
  return updatePerson(req, res, next, 'teacher', updateTeacherSchema)
}

export function updateTeacherStatus(req, res, next) {
  return updateStatus(req, res, next, 'teacher')
}

export async function listAssignedStudents(req, res, next) {
  try {
    const classIds = (req.user.assignedClasses || []).map(String)

    if (classIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        pagination: paginationMeta(0, 1, 20),
      })
    }

    const { page, limit, skip } = parsePagination(req.query)
    const filter = listFilter('student', req.query)

    if (req.query.classId) {
      if (!classIds.includes(String(req.query.classId))) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this class.',
        })
      }

      filter.class = req.query.classId
    } else {
      filter.class = { $in: classIds }
    }

    const [total, students] = await Promise.all([
      User.countDocuments(filter),
      populateUser(
        User.find(filter)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit),
      ).lean(),
    ])

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students.map(safeUser),
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    return next(error)
  }
}

export async function getAssignedStudent(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'student ID')
    }

    const classIds = (req.user.assignedClasses || []).map(String)
    const student = await populateUser(
      User.findOne({
        _id: req.params.id,
        role: 'student',
        class: { $in: classIds },
      }),
    ).lean()

    if (!student) {
      return notFound(res, 'Student not found in your assigned classes.')
    }

    return res.status(200).json({
      success: true,
      data: safeUser(student),
    })
  } catch (error) {
    return next(error)
  }
}
