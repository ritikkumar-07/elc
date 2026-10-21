export const AUTH_COOKIE_NAME = 'elc_token'

export const AUTH_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

function baseCookieOptions() {
  const production = isProduction()

  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/',
  }
}

export function authCookieOptions() {
  return {
    ...baseCookieOptions(),
    maxAge: AUTH_COOKIE_MAX_AGE,
  }
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, baseCookieOptions())
}
