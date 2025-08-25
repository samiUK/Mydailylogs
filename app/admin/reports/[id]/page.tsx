export const dynamic = "force-dynamic"

import { ReportViewServer } from "./report-view-server"

interface ReportViewPageProps {
  params: {
    id: string
  }
  searchParams: {
    download?: string
  }
}

export default function ReportViewPage({ params, searchParams }: ReportViewPageProps) {
  const autoDownload = searchParams.download === "true"
  return <ReportViewServer reportId={params.id} autoDownload={autoDownload} />
}
