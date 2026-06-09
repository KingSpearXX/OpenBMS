import { directusUser } from '../../utils/directus-user'

interface CustomerBody {
  partner_name?: string | null
  credit?: number | string | null
}

const FIELDS: (keyof CustomerBody)[] = ['partner_name', 'credit']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<CustomerBody>(event)

  const patch: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (key in (body ?? {})) patch[key] = body[key]
  }
  if (typeof patch.partner_name === 'string') patch.partner_name = (patch.partner_name as string).trim()

  const item = await directusUser(event, `/items/customers/${id}`, { method: 'PATCH', body: patch })
  return { item }
})
