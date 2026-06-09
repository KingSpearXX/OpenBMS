import { directusUser } from '../../utils/directus-user'

interface ContactBody {
  contact_name?: string | null
  contact_address?: string | null
  contact_number?: string | null
  contact_email?: string | null
}

const FIELDS: (keyof ContactBody)[] = ['contact_name', 'contact_address', 'contact_number', 'contact_email']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<ContactBody>(event)

  const patch: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (key in (body ?? {})) patch[key] = body[key]
  }
  if (typeof patch.contact_name === 'string') patch.contact_name = (patch.contact_name as string).trim()

  const item = await directusUser(event, `/items/contacts/${id}`, { method: 'PATCH', body: patch })
  return { item }
})
