import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerButtonProps {
  /** ISO date string YYYY-MM-DD, or '' for unset */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DatePickerButton({ value, onChange, placeholder = 'Pick a date', className }: DatePickerButtonProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseISO(value) : undefined

  const now = new Date()
  const startMonth = new Date(now.getFullYear() - 2, 0)
  const endMonth = new Date(now.getFullYear() + 5, 11)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!value}
          className={cn('justify-start gap-2 font-normal data-[empty=true]:text-muted-foreground', className)}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          {value ? format(parseISO(value), 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={date => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '')
            setOpen(false)
          }}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
        />
      </PopoverContent>
    </Popover>
  )
}
