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
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
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
    const now = getCurrentTime()

    return now >= startMinutes && now <= endMinutes
  }

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

    const headers = ["Name", "Clock In", "Clock Out"]
    const rows = logs.map((log) => [
      `"${log.user_name}"`,
      `"${log.clock_in}"`,
      `"${log.clock_out ?? "Still working"}"`,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

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
      <div className="mx-auto max-w-3xl">
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

