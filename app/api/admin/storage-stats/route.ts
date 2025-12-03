import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    let totalSize = 0
    let totalFiles = 0

    // List organization folder
    const { data: orgFolders, error: storageError } = await supabase.storage.from("report-photos").list("", {
      limit: 1000,
    })

    if (!storageError && orgFolders) {
      // Find the organization's folder
      const orgFolder = orgFolders.find((f) => f.name === profile.organization_id)

      if (orgFolder) {
        // List user folders within organization
        const { data: userFolders } = await supabase.storage.from("report-photos").list(profile.organization_id, {
          limit: 1000,
        })

        if (userFolders) {
          // For each user folder, count files and size
          for (const userFolder of userFolders) {
            const { data: photoFiles } = await supabase.storage
              .from("report-photos")
              .list(`${profile.organization_id}/${userFolder.name}`, {
                limit: 1000,
              })

            if (photoFiles) {
              photoFiles.forEach((file) => {
                if (file.metadata?.size) {
                  totalSize += file.metadata.size
                  totalFiles++
                }
              })
            }
          }
        }
      }
    }

    const totalSizeMB = totalSize / (1024 * 1024)
    const limitGB = 1
    const percentUsed = (totalSizeMB / (limitGB * 1024)) * 100

    return NextResponse.json({
      totalSizeMB,
      totalFiles,
      limitGB,
      percentUsed,
    })
  } catch (error) {
    console.error("Storage stats error:", error)
    return NextResponse.json({ error: "Failed to calculate storage stats" }, { status: 500 })
  }
}
