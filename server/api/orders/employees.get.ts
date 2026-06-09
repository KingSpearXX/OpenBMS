import { directusUser } from '../../utils/directus-user'

interface DirectusUserRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

// Lookup for the sales-employee select. Reads directus_users, which the signed-in role
// may not be allowed to read — fail soft to an empty list rather than breaking the form.
export default defineEventHandler(async (event) => {
  try {
    const users = await directusUser<DirectusUserRow[]>(event, '/users', {
      query: { fields: 'id,first_name,last_name,email', limit: -1, sort: 'first_name' },
    })
    const items = (users ?? []).map(u => ({
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.id,
    }))
    return { items }
  }
  catch {
    return { items: [] }
  }
})
