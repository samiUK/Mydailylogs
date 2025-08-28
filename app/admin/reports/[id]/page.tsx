export const dynamic = "force-dynamic"

import ReportViewServer from "./report-view-server"

interface ReportViewPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    download?: string
  }>
}

export default async function ReportViewPage({ params, searchParams }: ReportViewPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const autoDownload = resolvedSearchParams.download === "true"
  return <ReportViewServer reportId={resolvedParams.id} autoDownload={autoDownload} />
}
