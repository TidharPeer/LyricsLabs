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
  const selected = value ? parseISO(value) : undefined

  return (
    <Popover>
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
          onSelect={date => onChange(date ? format(date, 'yyyy-MM-dd') : '')}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  )
}
