"use client"

import { useEffect, useMemo, useState } from "react"

type TimeLog = {
  id: number
  user_name: string
  clock_in: string
  clock_out: string | null
}

type ScheduleItem = {
  id: number
  name: string
  day: string
  start: string
  end: string
}

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

export default function Home() {
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    day: "Monday",
    start: "",
    end: "",
  })
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const savedLogs = localStorage.getItem("logs")
    const savedSchedule = localStorage.getItem("schedule")

    if (savedLogs) {
      setLogs(JSON.parse(savedLogs))
    }

    if (savedSchedule) {
      setSchedule(JSON.parse(savedSchedule))
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const today = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "long" }),
    []
  )

  const todaysSchedule = useMemo(
    () => schedule.filter((item) => item.day === today),
    [schedule, today]
  )

  const currentlyClockedIn = useMemo(
    () => logs.filter((log) => log.clock_out === null),
    [logs]
  )

  const getCurrentTime = () => {
    const current = new Date()
    return current.getHours() * 60 + current.getMinutes()
  }

  const isWorkingNow = (start: string, end: string) => {
    if (!start.includes(":") || !end.includes(":")) return false

    const [startH, startM] = start.split(":").map(Number)
    const [endH, endM] = end.split(":").map(Number)

    if (
      Number.isNaN(startH) ||
      Number.isNaN(startM) ||
      Number.isNaN(endH) ||
      Number.isNaN(endM)
    ) {
      return false
    }

    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    const currentMinutes = getCurrentTime()

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  }

  const getWeekStart = (date: Date) => {
    const result = new Date(date)
    const day = result.getDay()
    const diff = day === 0 ? -6 : 1 - day
    result.setDate(result.getDate() + diff)
    result.setHours(0, 0, 0, 0)
    return result
  }

  const getWeekEnd = (date: Date) => {
    const start = getWeekStart(date)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }

  const formatHours = (hours: number) => {
    return hours.toFixed(2)
  }

  const getHoursWorked = (clockIn: string, clockOut: string | null) => {
    const start = new Date(clockIn)
    const end = clockOut ? new Date(clockOut) : new Date(now)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0
    }

    const diffMs = end.getTime() - start.getTime()
    if (diffMs <= 0) return 0

    return diffMs / (1000 * 60 * 60)
  }

  const getCompletedHoursWorked = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return 0
    return getHoursWorked(clockIn, clockOut)
  }

  const getShortDayName = (dateString: string) => {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }

  const weekStart = useMemo(() => getWeekStart(new Date(now)), [now])
  const weekEnd = useMemo(() => getWeekEnd(new Date(now)), [now])

  const weeklyLogs = useMemo(() => {
    return logs.filter((log) => {
      const logDate = new Date(log.clock_in)
      if (Number.isNaN(logDate.getTime())) return false
      return logDate >= weekStart && logDate <= weekEnd
    })
  }, [logs, weekStart, weekEnd])

  const weeklyTotalHours = useMemo(() => {
    return weeklyLogs.reduce((total, log) => {
      return total + getHoursWorked(log.clock_in, log.clock_out)
    }, 0)
  }, [weeklyLogs, now])

  const weeklyCaregiverData = useMemo(() => {
    const totals: Record<
      string,
      {
        total: number
        daily: Record<string, number>
      }
    > = {}

    weeklyLogs.forEach((log) => {
      const caregiverName = log.user_name
      const hours = getHoursWorked(log.clock_in, log.clock_out)
      const shortDay = getShortDayName(log.clock_in)

      if (!totals[caregiverName]) {
        totals[caregiverName] = {
          total: 0,
          daily: {
            Mon: 0,
            Tue: 0,
            Wed: 0,
            Thu: 0,
            Fri: 0,
            Sat: 0,
            Sun: 0,
          },
        }
      }

      totals[caregiverName].total += hours

      if (shortDay && totals[caregiverName].daily[shortDay] !== undefined) {
        totals[caregiverName].daily[shortDay] += hours
      }
    })

    return Object.entries(totals)
      .map(([caregiverName, data]) => ({
        caregiverName,
        total: data.total,
        daily: data.daily,
        overtime: data.total > 40,
      }))
      .sort((a, b) => b.total - a.total)
  }, [weeklyLogs, now])

  const addSchedule = () => {
    if (
      !newSchedule.name.trim() ||
      !newSchedule.start.trim() ||
      !newSchedule.end.trim()
    ) {
      setMessage("Enter name, start time, and end time")
      return
    }

    const updatedSchedule = [
      ...schedule,
      {
        id: Date.now(),
        name: newSchedule.name.trim(),
        day: newSchedule.day,
        start: newSchedule.start.trim(),
        end: newSchedule.end.trim(),
      },
    ]

    setSchedule(updatedSchedule)
    localStorage.setItem("schedule", JSON.stringify(updatedSchedule))
    setNewSchedule({
      name: "",
      day: "Monday",
      start: "",
      end: "",
    })
    setMessage("Schedule added")
  }

  const deleteSchedule = (id: number) => {
    const updatedSchedule = schedule.filter((item) => item.id !== id)
    setSchedule(updatedSchedule)
    localStorage.setItem("schedule", JSON.stringify(updatedSchedule))
    setMessage("Schedule deleted")
  }

  const clearLogs = () => {
    setLogs([])
    localStorage.setItem("logs", JSON.stringify([]))
    setMessage("All logs cleared")
  }

  const exportLogsToCSV = () => {
    if (logs.length === 0) {
      setMessage("No logs to export")
      return
    }

    const headers = ["Name", "Clock In", "Clock Out", "Hours Worked"]
    const rows = logs.map((log) => [
      `"${log.user_name}"`,
      `"${log.clock_in}"`,
      `"${log.clock_out ?? "Still working"}"`,
      `"${formatHours(getHoursWorked(log.clock_in, log.clock_out))}"`,
    ])

    const summaryHeader = [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]

    const weeklySummaryTitle = [
      `"Weekly Summary (Mon-Sun)"`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]

    const weeklySummaryHeaders = [
      "Caregiver",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
      "Weekly Total",
      "Overtime",
    ]

    const weeklySummaryRows = weeklyCaregiverData.map((item) => [
      `"${item.caregiverName}"`,
      `"${formatHours(item.daily.Mon)}"`,
      `"${formatHours(item.daily.Tue)}"`,
      `"${formatHours(item.daily.Wed)}"`,
      `"${formatHours(item.daily.Thu)}"`,
      `"${formatHours(item.daily.Fri)}"`,
      `"${formatHours(item.daily.Sat)}"`,
      `"${formatHours(item.daily.Sun)}"`,
      `"${formatHours(item.total)}"`,
      `"${item.overtime ? "YES" : "NO"}"`,
    ])

    const totalRow = [
      `"All Caregivers Total"`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      `"${formatHours(weeklyTotalHours)}"`,
      "",
    ]

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      summaryHeader.join(","),
      weeklySummaryTitle.join(","),
      weeklySummaryHeaders.join(","),
      ...weeklySummaryRows.map((row) => row.join(",")),
      totalRow.join(","),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.setAttribute("download", "caregiver-logs.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setMessage("Logs exported to CSV")
  }

  const clockIn = () => {
    if (!name.trim()) {
      setMessage("Enter a name")
      return
    }

    const trimmedName = name.trim().toLowerCase()

    const alreadyClockedIn = logs.some(
      (log) =>
        log.user_name.toLowerCase() === trimmedName &&
        log.clock_out === null
    )

    if (alreadyClockedIn) {
      setMessage(`${name.trim()} is already clocked in`)
      return
    }

    const newLog: TimeLog = {
      id: Date.now(),
      user_name: name.trim(),
      clock_in: new Date().toLocaleString(),
      clock_out: null,
    }

    const updatedLogs = [newLog, ...logs]
    setLogs(updatedLogs)
    localStorage.setItem("logs", JSON.stringify(updatedLogs))
    setMessage(`${name.trim()} clocked in`)
    setName("")
  }

  const clockOut = () => {
    if (!name.trim()) {
      setMessage("Enter a name to clock out")
      return
    }

    const trimmedName = name.trim().toLowerCase()

    const logIndex = logs.findIndex(
      (log) =>
        log.user_name.toLowerCase() === trimmedName &&
        log.clock_out === null
    )

    if (logIndex === -1) {
      setMessage("No active shift found for that name")
      return
    }

    const updatedLogs = [...logs]
    updatedLogs[logIndex] = {
      ...updatedLogs[logIndex],
      clock_out: new Date().toLocaleString(),
    }

    setLogs(updatedLogs)
    localStorage.setItem("logs", JSON.stringify(updatedLogs))
    setMessage(`${updatedLogs[logIndex].user_name} clocked out`)
    setName("")
  }

  return (
    <div className="min-h-screen bg-black px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-950 to-gray-900 p-6 shadow-lg">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-green-400">
            Caregiver Management
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Caregiver Clock</h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-300 sm:text-base">
            Clock caregivers in and out, track active shifts, and manage weekly schedules in one simple view.
          </p>
          <div className="mt-4 inline-flex rounded-full border border-green-800 bg-green-950/40 px-4 py-2 text-sm text-green-300">
            Today: {today}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-800 bg-gray-950 p-5 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>

          <input
            className="mb-4 w-full rounded-xl border border-gray-700 bg-black p-3 text-white outline-none transition focus:border-green-500"
            placeholder="Enter caregiver name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex flex-wrap gap-3">
            <button
              onClick={clockIn}
              className="rounded-xl bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-500"
            >
              Clock In
            </button>

            <button
              onClick={clockOut}
              className="rounded-xl bg-red-600 px-6 py-3 font-medium text-white transition hover:bg-red-500"
            >
              Clock Out
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-gray-800 bg-black px-4 py-3 text-sm text-gray-200">
              {message}
            </div>
          )}
        </div>

        <div className="mb-6 rounded-2xl border border-blue-800 bg-blue-950/20 p-5 shadow-lg">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold">Weekly Hours</h2>
            <span className="rounded-full border border-blue-700 bg-blue-900/40 px-3 py-1 text-sm text-blue-300">
              Monday - Sunday
            </span>
          </div>

          <div className="mb-4 rounded-xl border border-blue-800 bg-black/40 p-4">
            <p className="text-sm text-gray-300">Total Hours This Week</p>
            <p className="mt-1 text-3xl font-bold text-blue-300">
              {formatHours(weeklyTotalHours)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
            </p>
          </div>

          {weeklyCaregiverData.length === 0 ? (
            <p className="text-gray-300">No weekly hours logged yet.</p>
          ) : (
            <div className="grid gap-4">
              {weeklyCaregiverData.map((item) => (
                <div
                  key={item.caregiverName}
                  className={`rounded-xl border p-4 ${
                    item.overtime
                      ? "border-red-700 bg-red-950/20"
                      : "border-blue-800 bg-black/40"
                  }`}
                >
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold">{item.caregiverName}</p>
                      <p
                        className={`text-sm ${
                          item.overtime ? "text-red-300" : "text-blue-300"
                        }`}
                      >
                        {item.overtime
                          ? `Overtime: ${formatHours(item.total)} hrs`
                          : `Weekly Total: ${formatHours(item.total)} hrs`}
                      </p>
                    </div>
                    {item.overtime && (
                      <span className="inline-flex rounded-full border border-red-700 bg-red-900/40 px-3 py-1 text-sm font-medium text-red-300">
                        Over 40 Hours
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                    <div className="rounded-lg border border-gray-800 bg-black/50 p-3">
                      <p className="text-xs text-gray-400">Mon</p>
                      <p className="mt-1 font-semibold">{formatHours(item.daily.Mon)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black/50 p-3">
                      <p className="text-xs text-gray-400">Tue</p>
                      <p className="mt-1 font-semibold">{formatHours(item.daily.Tue)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black/50 p-3">
                      <p className="text-xs text-gray-400">Wed</p>
                      <p className="mt-1 font-semibold">{formatHours(item.daily.Wed)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black/50 p-3">
                      <p className="text-xs text-gray-400">Thu</p>
                      <p className="mt-1 font-semibold">{formatHours(item.daily.Thu)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black/50 p-3">
                      <p className="text-xs text-gray-400">Fri</p>
                      <p className="mt-1 font-semibold">{formatHours(item.daily.Fri)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black/50 p-3">
                      <p className="text-xs text-gray-400">Sat</p>
                      <p className="mt-1 font-semibold">{formatHours(item.daily.Sat)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black/50 p-3">
                      <p className="text-xs text-gray-400">Sun</p>
                      <p className="mt-1 font-semibold">{formatHours(item.daily.Sun)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6 rounded-2xl border border-green-800 bg-green-950/20 p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">Currently Clocked In</h2>
            <span className="rounded-full border border-green-700 bg-green-900/40 px-3 py-1 text-sm text-green-300">
              {currentlyClockedIn.length} Active
            </span>
          </div>

          {currentlyClockedIn.length === 0 ? (
            <p className="text-gray-300">No one is clocked in right now.</p>
          ) : (
            <div className="grid gap-3">
              {currentlyClockedIn.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-green-800 bg-black/40 p-4"
                >
                  <p className="text-lg font-semibold">{log.user_name}</p>
                  <p className="mt-1 text-sm text-gray-300">
                    Clocked in: {log.clock_in}
                  </p>
                  <p className="mt-1 text-sm text-green-300">
                    Live Hours: {formatHours(getHoursWorked(log.clock_in, log.clock_out))}
                  </p>
                  <p className="mt-2 text-sm font-medium text-green-400">
                    Active Shift
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6 rounded-2xl border border-gray-800 bg-gray-950 p-5 shadow-lg">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold">Today’s Logs</h2>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportLogsToCSV}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                Export CSV
              </button>
              <button
                onClick={clearLogs}
                className="rounded-xl bg-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-600"
              >
                Clear Logs
              </button>
            </div>
          </div>

          {logs.length === 0 ? (
            <p className="text-gray-300">No entries yet.</p>
          ) : (
            <div className="grid gap-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-gray-800 bg-black/40 p-4"
                >
                  <p className="text-lg font-semibold">{log.user_name}</p>
                  <p className="mt-1 text-sm text-gray-300">
                    Clock In: {log.clock_in}
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    Clock Out: {log.clock_out ?? "Still working"}
                  </p>
                  <p className="mt-1 text-sm text-blue-300">
                    Hours Worked:{" "}
                    {log.clock_out
                      ? formatHours(getCompletedHoursWorked(log.clock_in, log.clock_out))
                      : formatHours(getHoursWorked(log.clock_in, log.clock_out))}{" "}
                    hrs
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5 shadow-lg">
          <h2 className="mb-4 text-2xl font-semibold">Schedule</h2>

          <div className="mb-5 grid gap-3">
            <input
              placeholder="Name"
              className="w-full rounded-xl border border-gray-700 bg-black p-3 text-white outline-none transition focus:border-blue-500"
              value={newSchedule.name}
              onChange={(e) =>
                setNewSchedule({ ...newSchedule, name: e.target.value })
              }
            />

            <select
              className="w-full rounded-xl border border-gray-700 bg-black p-3 text-white outline-none transition focus:border-blue-500"
              value={newSchedule.day}
              onChange={(e) =>
                setNewSchedule({ ...newSchedule, day: e.target.value })
              }
            >
              {daysOfWeek.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>

            <input
              type="time"
              className="w-full rounded-xl border border-gray-700 bg-black p-3 text-white outline-none transition focus:border-blue-500 [color-scheme:dark]"
              value={newSchedule.start}
              onChange={(e) =>
                setNewSchedule({ ...newSchedule, start: e.target.value })
              }
            />

            <input
              type="time"
              className="w-full rounded-xl border border-gray-700 bg-black p-3 text-white outline-none transition focus:border-blue-500 [color-scheme:dark]"
              value={newSchedule.end}
              onChange={(e) =>
                setNewSchedule({ ...newSchedule, end: e.target.value })
              }
            />

            <button
              onClick={addSchedule}
              className="rounded-xl bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-500"
            >
              Add Schedule
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-100">
              Today’s Schedule
            </h3>
            <span className="text-sm text-gray-400">{today}</span>
          </div>

          {todaysSchedule.length === 0 ? (
            <p className="text-gray-300">No schedule for today.</p>
          ) : (
            <div className="grid gap-3">
              {todaysSchedule.map((item) => {
                const active = isWorkingNow(item.start, item.end)

                return (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${
                      active
                        ? "border-green-700 bg-green-950/20"
                        : "border-gray-800 bg-black/40"
                    }`}
                  >
                    <div>
                      <p className="text-lg font-semibold">{item.name}</p>
                      <p className="mt-1 text-sm text-gray-300">
                        {item.start} - {item.end}
                      </p>
                      {active && (
                        <p className="mt-2 text-sm font-medium text-green-400">
                          On Shift Now
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => deleteSchedule(item.id)}
                      className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white transition hover:bg-gray-600"
                    >
                      Delete
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

