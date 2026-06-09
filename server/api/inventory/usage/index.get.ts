import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const itemId = q.item ? Number(q.item) : null

  const query: Record<string, unknown> = {
    fields: 'id,item_usage_value,date_created,media_item_name.id,media_item_name.item_name',
    sort: '-date_created',
    limit: 200,
  }
  if (itemId) {
    query.filter = JSON.stringify({ media_item_name: { _eq: itemId } })
  }

  const items = await directusUser(event, '/items/media_usage_log', { query })
  return { items }
})
