"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Trash2, Plus, CalendarIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"

interface Holiday {
  id: string
  name: string
  date: string
  organization_id: string
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [holidayName, setHolidayName] = useState("")
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchHolidays()
  }, [])

  const fetchHolidays = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile?.organization_id) return

      const { data: holidaysData } = await supabase
        .from("holidays")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("date", { ascending: true })

      setHolidays(holidaysData || [])
    } catch (error) {
      console.error("Error fetching holidays:", error)
    } finally {
      setLoading(false)
    }
  }

  const addHoliday = async () => {
    if (!selectedDate || !holidayName.trim()) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile?.organization_id) return

      const { error } = await supabase.from("holidays").insert({
        name: holidayName,
        date: format(selectedDate, "yyyy-MM-dd"),
        organization_id: profile.organization_id,
      })

      if (!error) {
        setHolidayName("")
        setSelectedDate(undefined)
        fetchHolidays()
      }
    } catch (error) {
      console.error("Error adding holiday:", error)
    }
  }

  const deleteHoliday = async (id: string) => {
    try {
      const { error } = await supabase.from("holidays").delete().eq("id", id)

      if (!error) {
        fetchHolidays()
      }
    } catch (error) {
      console.error("Error deleting holiday:", error)
    }
  }

  const holidayDates = holidays.map((h) => new Date(h.date))

  if (loading) {
    return <div className="p-6">Loading holidays...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Holiday Management</h1>
        <p className="text-muted-foreground">
          Manage organization holidays that will be excluded from recurring task scheduling
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Holiday Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Holiday
            </CardTitle>
            <CardDescription>Select a date and name for the holiday</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="holiday-name">Holiday Name</Label>
              <Input
                id="holiday-name"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="e.g., Christmas Day, New Year's Day"
              />
            </div>

            <div>
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  holiday: holidayDates,
                }}
                modifiersStyles={{
                  holiday: { backgroundColor: "#fef3c7", color: "#92400e" },
                }}
                className="rounded-md border"
              />
            </div>

            <Button onClick={addHoliday} disabled={!selectedDate || !holidayName.trim()} className="w-full">
              Add Holiday
            </Button>
          </CardContent>
        </Card>

        {/* Holidays List Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Organization Holidays ({holidays.length})
            </CardTitle>
            <CardDescription>Current holidays that will be excluded from task scheduling</CardDescription>
          </CardHeader>
          <CardContent>
            {holidays.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No holidays added yet</p>
            ) : (
              <div className="space-y-2">
                {holidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{holiday.name}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(holiday.date), "MMMM d, yyyy")}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteHoliday(holiday.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
