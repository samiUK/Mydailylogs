import { createClient } from "@/lib/supabase/server"

// Batch operations to reduce database round trips
export async function batchUpdateAssignments(updates: Array<{ id: string; status: string }>) {
  const supabase = await createClient()

  const promises = updates.map((update) =>
    supabase
      .from("template_assignments")
      .update({ status: update.status, updated_at: new Date().toISOString() })
      .eq("id", update.id),
  )

  return Promise.all(promises)
}

// Optimized pagination for large datasets
export async function getPaginatedReports(organizationId: string, page = 1, pageSize = 20) {
  const supabase = await createClient()
  const offset = (page - 1) * pageSize

  const { data, error, count } = await supabase
    .from("submitted_reports")
    .select(
      `
      id,
      template_name,
      status,
      submitted_at,
      submitted_by,
      profiles!inner(full_name, email)
    `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) throw error

  return {
    data,
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
    currentPage: page,
    hasNextPage: page * pageSize < (count || 0),
  }
}

// Optimized search with full-text search capabilities
export async function searchReports(organizationId: string, searchTerm: string, limit = 20) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("submitted_reports")
    .select(`
      id,
      template_name,
      status,
      submitted_at,
      submitted_by,
      notes,
      profiles!inner(full_name, email)
    `)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .or(`template_name.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
    .order("submitted_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}
