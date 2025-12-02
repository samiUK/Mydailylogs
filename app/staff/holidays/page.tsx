"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { CalendarIcon, Trash2Icon, PlusIcon } from "lucide-react"
import { format } from "date-fns"

type Holiday = {
  id: string
  name: string
  date: string
  is_recurring: boolean
  created_by: string
  organization_id: string
}

type StaffUnavailability = {
  id: string
  staff_id: string
  start_date: string
  end_date: string
  reason: string | null
  created_by: string
  organization_id: string
}

export default function StaffHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [myUnavailability, setMyUnavailability] = useState<StaffUnavailability[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>("")
  const [organizationId, setOrganizationId] = useState<string>("")

  // Form states
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get profile with organization
      const { data: profile } = await supabase.from("profiles").select("id, organization_id").eq("id", user.id).single()

      if (!profile) return

      setUserId(profile.id)
      setOrganizationId(profile.organization_id)

      // Load organization-wide holidays
      const { data: holidaysData, error: holidaysError } = await supabase
        .from("holidays")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("date", { ascending: true })

      if (holidaysError) throw holidaysError
      setHolidays(holidaysData || [])

      // Load my unavailability
      const { data: unavailabilityData, error: unavailabilityError } = await supabase
        .from("staff_unavailability")
        .select("*")
        .eq("staff_id", profile.id)
        .order("start_date", { ascending: true })

      if (unavailabilityError) throw unavailabilityError
      setMyUnavailability(unavailabilityData || [])
    } catch (error: any) {
      console.error("[v0] Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load holidays and unavailability data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddUnavailability = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates.",
        variant: "destructive",
      })
      return
    }

    if (endDate < startDate) {
      toast({
        title: "Invalid dates",
        description: "End date must be after start date.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const { error } = await supabase.from("staff_unavailability").insert({
        organization_id: organizationId,
        staff_id: userId,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        reason: reason || null,
        created_by: userId,
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Unavailability period added successfully.",
      })

      // Reset form
      setStartDate(undefined)
      setEndDate(undefined)
      setReason("")

      // Reload data
      loadData()
    } catch (error: any) {
      console.error("[v0] Error adding unavailability:", error)
      toast({
        title: "Error",
        description: "Failed to add unavailability period.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUnavailability = async (id: string) => {
    if (!confirm("Are you sure you want to delete this unavailability period?")) return

    try {
      const { error } = await supabase.from("staff_unavailability").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Unavailability period deleted.",
      })

      loadData()
    } catch (error: any) {
      console.error("[v0] Error deleting unavailability:", error)
      toast({
        title: "Error",
        description: "Failed to delete unavailability period.",
        variant: "destructive",
      })
    }
  }

  // Get all unavailable dates for calendar highlighting
  const getUnavailableDates = () => {
    const dates: Date[] = []

    // Add organization holidays
    holidays.forEach((holiday) => {
      dates.push(new Date(holiday.date))
    })

    // Add my unavailability periods
    myUnavailability.forEach((period) => {
      const start = new Date(period.start_date)
      const end = new Date(period.end_date)
      const current = new Date(start)

      while (current <= end) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
    })

    return dates
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Holidays & Time Off</h1>
        <p className="mt-2 text-gray-600">View organization holidays and manage your personal unavailability</p>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="my-time-off">My Time Off</TabsTrigger>
          <TabsTrigger value="org-holidays">Organization Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Overview</CardTitle>
              <CardDescription>
                Green dates are organization holidays. Red dates are your unavailable periods.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Calendar
                  mode="multiple"
                  selected={getUnavailableDates()}
                  className="rounded-md border"
                  modifiers={{
                    holiday: holidays.map((h) => new Date(h.date)),
                    unavailable: myUnavailability.flatMap((period) => {
                      const dates: Date[] = []
                      const start = new Date(period.start_date)
                      const end = new Date(period.end_date)
                      const current = new Date(start)

                      while (current <= end) {
                        dates.push(new Date(current))
                        current.setDate(current.getDate() + 1)
                      }
                      return dates
                    }),
                  }}
                  modifiersStyles={{
                    holiday: { backgroundColor: "#dcfce7", color: "#166534", fontWeight: "bold" },
                    unavailable: { backgroundColor: "#fee2e2", color: "#991b1b", fontWeight: "bold" },
                  }}
                />
              </div>
              <div className="mt-4 flex gap-6 justify-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 border border-green-600"></div>
                  <span>Organization Holidays</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-100 border border-red-600"></div>
                  <span>My Unavailability</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-time-off" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Time Off</CardTitle>
              <CardDescription>
                Request personal time off or mark unavailability periods. Tasks will not be assigned during these dates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                      onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                    />
                    <CalendarIcon className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
                      onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                    />
                    <CalendarIcon className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Annual leave, Personal day, Medical appointment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleAddUnavailability} disabled={isSubmitting} className="w-full">
                <PlusIcon className="w-4 h-4 mr-2" />
                {isSubmitting ? "Adding..." : "Add Time Off"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Upcoming Time Off</CardTitle>
              <CardDescription>Your scheduled unavailability periods</CardDescription>
            </CardHeader>
            <CardContent>
              {myUnavailability.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No time off scheduled</p>
              ) : (
                <div className="space-y-3">
                  {myUnavailability.map((period) => (
                    <div
                      key={period.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-red-600" />
                          <span className="font-medium">
                            {format(new Date(period.start_date), "MMM dd, yyyy")} -{" "}
                            {format(new Date(period.end_date), "MMM dd, yyyy")}
                          </span>
                        </div>
                        {period.reason && <p className="text-sm text-gray-600 mt-1">{period.reason}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUnavailability(period.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="org-holidays" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Holidays</CardTitle>
              <CardDescription>Company-wide holidays (managed by administrators)</CardDescription>
            </CardHeader>
            <CardContent>
              {holidays.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No holidays configured</p>
              ) : (
                <div className="space-y-3">
                  {holidays.map((holiday) => (
                    <div key={holiday.id} className="flex items-center gap-3 p-4 border rounded-lg bg-green-50">
                      <CalendarIcon className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium">{holiday.name}</p>
                        <p className="text-sm text-gray-600">{format(new Date(holiday.date), "MMMM dd, yyyy")}</p>
                      </div>
                      {holiday.is_recurring && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Recurring</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
