import mongoose from 'mongoose'

export function teacherClassIds(user) {
  return (user?.assignedClasses || []).map((id) => String(id))
}

export function isAdmin(user) {
  return user?.role === 'admin'
}

export function isTeacher(user) {
  return user?.role === 'teacher'
}

export function isStudent(user) {
  return user?.role === 'student'
}

export function teacherOwnsClass(user, classId) {
  if (isAdmin(user)) return true
  if (!isTeacher(user) || !classId) return false

  return teacherClassIds(user).includes(String(classId))
}

export function userCanAccessClass(user, classId) {
  if (isAdmin(user)) return true
  if (isTeacher(user)) return teacherOwnsClass(user, classId)

  return Boolean(
    isStudent(user) &&
      user.class &&
      String(user.class) === String(classId),
  )
}

export function validObjectId(value) {
  return mongoose.isValidObjectId(value)
}
