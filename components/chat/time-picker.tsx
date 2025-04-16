"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

type TimePickerProps = {
  open: boolean
  onClose: () => void
  onSelectTime: (time: Date) => void
  initialTime?: Date
}

export default function TimePicker({ open, onClose, onSelectTime, initialTime = new Date() }: TimePickerProps) {
  const [selectedTime, setSelectedTime] = useState(
    initialTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  )

  const handleConfirm = () => {
    // Parse the time string to create a Date object
    const [time, period] = selectedTime.split(" ")
    const [hours, minutes] = time.split(":")

    const date = new Date()
    let hour = Number.parseInt(hours)

    // Convert to 24-hour format
    if (period === "PM" && hour < 12) {
      hour += 12
    } else if (period === "AM" && hour === 12) {
      hour = 0
    }

    date.setHours(hour, Number.parseInt(minutes), 0, 0)

    // If the time is in the past, set it for tomorrow
    if (date < new Date()) {
      date.setDate(date.getDate() + 1)
    }

    onSelectTime(date)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Time</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right">
              Time
            </Label>
            <Input
              id="time"
              type="time"
              className="col-span-3"
              onChange={(e) => {
                // Convert 24h format to 12h format with AM/PM
                const time = e.target.value
                const [hours, minutes] = time.split(":")
                const hour = Number.parseInt(hours)
                const period = hour >= 12 ? "PM" : "AM"
                const hour12 = hour % 12 || 12
                setSelectedTime(`${hour12}:${minutes} ${period}`)
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
