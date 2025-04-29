import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options?: { value: string; label: string }[];
  onValueChange?: (value: string) => void;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, onValueChange, onChange, ...props }, ref) => {
    // Manejar el cambio de valor considerando tanto onChange como onValueChange
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e);
      }
      if (onValueChange) {
        onValueChange(e.target.value);
      }
    };
    
    return (
      <div className="w-full">
        <select
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            {
              'border-destructive focus-visible:ring-destructive': error,
            },
            className
          )}
          ref={ref}
          onChange={handleChange}
          {...props}
        >
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {props.children}
        </select>
        {error && (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Componentes adicionales para compatibilidad
// SelectTrigger - un botón que actúa como el disparador del select
const SelectTrigger = forwardRef<HTMLButtonElement, any>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
SelectTrigger.displayName = 'SelectTrigger';

// SelectValue - un span para mostrar el valor seleccionado
const SelectValue = forwardRef<HTMLSpanElement, any>(
  ({ className, children, placeholder, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('block truncate', className)}
      {...props}
    >
      {children || placeholder}
    </span>
  )
);
SelectValue.displayName = 'SelectValue';

// SelectContent - el contenedor para las opciones del select
const SelectContent = forwardRef<HTMLDivElement, any>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80',
        className
      )}
      {...props}
    >
      <div className="p-1">{children}</div>
    </div>
  )
);
SelectContent.displayName = 'SelectContent';

// SelectItem - una opción individual dentro del select
const SelectItem = forwardRef<HTMLDivElement, any>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
SelectItem.displayName = 'SelectItem';

export { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
}; 