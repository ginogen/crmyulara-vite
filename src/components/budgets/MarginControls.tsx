import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

export interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface MarginControlsProps {
  config: MarginConfig;
  onChange: (config: MarginConfig) => void;
  className?: string;
}

const MARGIN_PRESETS = {
  none: { top: 0, right: 0, bottom: 0, left: 0 },
  small: { top: 8, right: 16, bottom: 8, left: 16 },
  normal: { top: 16, right: 24, bottom: 16, left: 24 },
  large: { top: 24, right: 32, bottom: 24, left: 32 },
  xlarge: { top: 32, right: 48, bottom: 32, left: 48 },
};

export function MarginControls({ config, onChange, className = '' }: MarginControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateMargin = (side: keyof MarginConfig, value: number) => {
    onChange({ ...config, [side]: Math.max(0, value) });
  };

  const applyPreset = (preset: keyof typeof MARGIN_PRESETS) => {
    onChange(MARGIN_PRESETS[preset]);
  };

  const getCurrentPreset = (): keyof typeof MARGIN_PRESETS | null => {
    for (const [key, preset] of Object.entries(MARGIN_PRESETS)) {
      if (
        preset.top === config.top &&
        preset.right === config.right &&
        preset.bottom === config.bottom &&
        preset.left === config.left
      ) {
        return key as keyof typeof MARGIN_PRESETS;
      }
    }
    return null;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-700">Márgenes del Contenido</h3>
          <span className="text-xs text-gray-500">
            {config.top}px {config.right}px {config.bottom}px {config.left}px
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        )}
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          {/* Presets */}
          <div className="mb-4">
            <Label className="text-xs font-medium text-gray-600 mb-2 block">
              Presets Rápidos
            </Label>
            <Select 
              value={getCurrentPreset() || 'custom'} 
              onValueChange={(value) => {
                if (value !== 'custom') {
                  applyPreset(value as keyof typeof MARGIN_PRESETS);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin márgenes</SelectItem>
                <SelectItem value="small">Pequeño (8px 16px)</SelectItem>
                <SelectItem value="normal">Normal (16px 24px)</SelectItem>
                <SelectItem value="large">Grande (24px 32px)</SelectItem>
                <SelectItem value="xlarge">Extra Grande (32px 48px)</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Controles individuales */}
          <div className="grid grid-cols-2 gap-3">
            {/* Margen Superior */}
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">
                Superior
              </Label>
              <Input
                type="number"
                value={config.top}
                onChange={(e) => updateMargin('top', parseInt(e.target.value) || 0)}
                min="0"
                max="200"
                className="h-8 text-xs"
                placeholder="0"
              />
            </div>

            {/* Margen Derecho */}
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">
                Derecho
              </Label>
              <Input
                type="number"
                value={config.right}
                onChange={(e) => updateMargin('right', parseInt(e.target.value) || 0)}
                min="0"
                max="200"
                className="h-8 text-xs"
                placeholder="0"
              />
            </div>

            {/* Margen Inferior */}
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">
                Inferior
              </Label>
              <Input
                type="number"
                value={config.bottom}
                onChange={(e) => updateMargin('bottom', parseInt(e.target.value) || 0)}
                min="0"
                max="200"
                className="h-8 text-xs"
                placeholder="0"
              />
            </div>

            {/* Margen Izquierdo */}
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">
                Izquierdo
              </Label>
              <Input
                type="number"
                value={config.left}
                onChange={(e) => updateMargin('left', parseInt(e.target.value) || 0)}
                min="0"
                max="200"
                className="h-8 text-xs"
                placeholder="0"
              />
            </div>
          </div>

          {/* Botones de acción rápida */}
          <div className="flex gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs flex-1"
              onClick={() => applyPreset('none')}
            >
              Resetear
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs flex-1"
              onClick={() => applyPreset('normal')}
            >
              Normal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function para convertir MarginConfig a clases de CSS
export function marginConfigToStyles(config: MarginConfig): React.CSSProperties {
  return {
    marginTop: `${config.top}px`,
    marginRight: `${config.right}px`,
    marginBottom: `${config.bottom}px`,
    marginLeft: `${config.left}px`,
  };
}

// Helper function para convertir MarginConfig a string CSS
export function marginConfigToCSSString(config: MarginConfig): string {
  return `margin: ${config.top}px ${config.right}px ${config.bottom}px ${config.left}px;`;
}

// Default margin config
export const DEFAULT_MARGIN_CONFIG: MarginConfig = {
  top: 24,
  right: 24,
  bottom: 24,
  left: 24,
};