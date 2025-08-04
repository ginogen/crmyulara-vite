"use client"

import React, { useState } from 'react';
import { format, addDays, addHours, startOfToday, startOfTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function DateTimePicker({ 
  value, 
  onChange, 
  label = "Fecha y hora", 
  placeholder = "Seleccionar fecha y hora",
  required = false,
  className 
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  const [timeInput, setTimeInput] = useState(
    value ? format(new Date(value), 'HH:mm') : '09:00'
  );

  const quickSelections = [
    {
      label: 'En 1 hora',
      getValue: () => addHours(new Date(), 1),
    },
    {
      label: 'En 2 horas',
      getValue: () => addHours(new Date(), 2),
    },
    {
      label: 'Mañana 9:00',
      getValue: () => {
        const tomorrow = startOfTomorrow();
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow;
      },
    },
    {
      label: 'En 3 días',
      getValue: () => {
        const date = addDays(new Date(), 3);
        date.setHours(9, 0, 0, 0);
        return date;
      },
    },
    {
      label: 'Próxima semana',
      getValue: () => {
        const date = addDays(new Date(), 7);
        date.setHours(9, 0, 0, 0);
        return date;
      },
    },
  ];

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const [hours, minutes] = timeInput.split(':');
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    onChange(date.toISOString());
  };

  const handleTimeChange = (time: string) => {
    setTimeInput(time);
    if (selectedDate) {
      const [hours, minutes] = time.split(':');
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      setSelectedDate(newDate);
      onChange(newDate.toISOString());
    }
  };

  const handleQuickSelect = (date: Date) => {
    setSelectedDate(date);
    setTimeInput(format(date, 'HH:mm'));
    onChange(date.toISOString());
    setIsOpen(false);
  };

  const formatDisplayValue = () => {
    if (!selectedDate) return placeholder;
    return format(selectedDate, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
  };

  const generateCalendarDays = () => {
    const today = startOfToday();
    const days = [];
    
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      days.push(date);
    }
    
    return days;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor="datetime-picker">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDisplayValue()}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Quick selections */}
            <div className="border-r p-3 space-y-1">
              <h4 className="font-medium text-sm text-gray-900 mb-2">Acceso rápido</h4>
              {quickSelections.map((option, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleQuickSelect(option.getValue())}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            
            {/* Calendar */}
            <div className="p-3">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 p-1">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto">
                {generateCalendarDays().map((date, index) => {
                  const isSelected = selectedDate && 
                    format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const isPast = date < startOfToday();
                  
                  return (
                    <Button
                      key={index}
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-8 w-8 p-0 font-normal text-xs",
                        isToday && !isSelected && "bg-blue-50 text-blue-600",
                        isPast && "text-gray-400",
                        isSelected && "bg-blue-600 text-white hover:bg-blue-700"
                      )}
                      disabled={isPast}
                      onClick={() => handleDateSelect(new Date(date))}
                    >
                      {format(date, 'd')}
                    </Button>
                  );
                })}
              </div>
              
              {/* Time picker */}
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4 text-gray-500" />
                  <Label htmlFor="time-input" className="text-sm">Hora:</Label>
                  <Input
                    id="time-input"
                    type="time"
                    value={timeInput}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-20 text-sm"
                  />
                </div>
              </div>
              
              {selectedDate && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-sm text-gray-600">
                    <strong>Seleccionado:</strong><br />
                    {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}