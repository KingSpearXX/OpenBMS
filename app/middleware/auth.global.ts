const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password']

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser } = useAuth()
  if (!user.value) await fetchUser()

  const isPublic = PUBLIC_ROUTES.includes(to.path)

  // Already signed in → keep auth pages out of reach; land on the dashboard.
  if (isPublic) {
    if (user.value) return navigateTo('/')
    return
  }

  // Protected route without a session → send to login, remembering where they were headed.
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
