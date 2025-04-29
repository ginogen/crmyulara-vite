export function formatDate(date: string | Date): string {
  if (!date) return '';
  
  // Si es un objeto Date, formatearlo normalmente
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return '';
    
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }
  
  // Intentar convertir a Date
  const d = new Date(date);
  
  // Si es una fecha válida, formatearla
  if (!isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  }
  
  // Si no es una fecha válida, devolver el texto original
  return date;
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isToday(date: string | Date): boolean {
  const today = new Date();
  const d = new Date(date);
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

export function isFuture(date: string | Date): boolean {
  const today = new Date();
  const d = new Date(date);
  return d > today;
}

export function isPast(date: string | Date): boolean {
  const today = new Date();
  const d = new Date(date);
  return d < today;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
} 