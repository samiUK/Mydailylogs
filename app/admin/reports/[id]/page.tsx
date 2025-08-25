export const dynamic = "force-dynamic"

import { ReportViewServer } from "./report-view-server"

interface ReportViewPageProps {
  params: {
    id: string
  }
}

export default function ReportViewPage({ params }: ReportViewPageProps) {
  return <ReportViewServer reportId={params.id} />
}
