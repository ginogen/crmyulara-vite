import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { FooterConfig } from '@/types/budget-template';

interface FooterEditorProps {
  config: FooterConfig;
  onChange: (config: FooterConfig) => void;
}

export function FooterEditor({ config, onChange }: FooterEditorProps) {
  const updateConfig = (updates: Partial<FooterConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración del Footer</h3>
      </div>

      {/* Show Footer Toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          checked={config.show_footer}
          onCheckedChange={(checked) => updateConfig({ show_footer: checked })}
        />
        <Label>Mostrar footer</Label>
      </div>

      {config.show_footer && (
        <>
          {/* Footer Text */}
          <div>
            <Label htmlFor="footer-text">Texto del footer</Label>
            <Textarea
              id="footer-text"
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder="Gracias por confiar en nosotros. Para más información, no dude en contactarnos."
              rows={3}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Este texto aparecerá en la parte inferior de todos los presupuestos
            </p>
          </div>

          {/* Style Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Alineación del texto</Label>
              <Select value={config.alignment} onValueChange={(value: any) => updateConfig({ alignment: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Izquierda</SelectItem>
                  <SelectItem value="center">Centrado</SelectItem>
                  <SelectItem value="right">Derecha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tamaño de fuente</Label>
              <Select value={config.font_size} onValueChange={(value: any) => updateConfig({ font_size: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequeño</SelectItem>
                  <SelectItem value="medium">Mediano</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="footer-bg">Color de fondo</Label>
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="color"
                  id="footer-bg"
                  value={config.bg_color}
                  onChange={(e) => updateConfig({ bg_color: e.target.value })}
                  className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <Input
                  value={config.bg_color}
                  onChange={(e) => updateConfig({ bg_color: e.target.value })}
                  placeholder="#f8f9fa"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="footer-text-color">Color del texto</Label>
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="color"
                  id="footer-text-color"
                  value={config.text_color}
                  onChange={(e) => updateConfig({ text_color: e.target.value })}
                  className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <Input
                  value={config.text_color}
                  onChange={(e) => updateConfig({ text_color: e.target.value })}
                  placeholder="#6b7280"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Padding */}
          <div>
            <Label>Espaciado interno</Label>
            <Select value={config.padding} onValueChange={(value: any) => updateConfig({ padding: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Pequeño</SelectItem>
                <SelectItem value="medium">Mediano</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div>
            <Label>Vista previa</Label>
            <div 
              className={`mt-2 p-4 rounded border ${
                config.padding === 'small' ? 'p-2' : 
                config.padding === 'large' ? 'p-6' : 'p-4'
              }`}
              style={{ 
                backgroundColor: config.bg_color,
                color: config.text_color,
                textAlign: config.alignment,
                fontSize: config.font_size === 'small' ? '0.875rem' : 
                          config.font_size === 'large' ? '1.125rem' : '1rem'
              }}
            >
              {config.text || 'Texto del footer aparecerá aquí'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}