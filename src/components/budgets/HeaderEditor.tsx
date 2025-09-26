import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { HeaderConfig } from '@/types/budget-template';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface HeaderEditorProps {
  config: HeaderConfig;
  onChange: (config: HeaderConfig) => void;
}

export function HeaderEditor({ config, onChange }: HeaderEditorProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(config.logo_url);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('El archivo es muy grande. Máximo 2MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setLogoPreview(base64);
        onChange({
          ...config,
          logo_url: base64
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    onChange({
      ...config,
      logo_url: null
    });
  };

  const updateConfig = (updates: Partial<HeaderConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración del Header</h3>
      </div>

      {/* Logo Configuration */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={config.show_logo}
            onCheckedChange={(checked) => updateConfig({ show_logo: checked })}
          />
          <Label>Mostrar logo</Label>
        </div>

        {config.show_logo && (
          <div className="space-y-3">
            <div>
              <Label>Logo de la empresa</Label>
              <div className="mt-1 flex items-center space-x-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-16 w-auto border border-gray-300 rounded"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <PhotoIcon className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload">
                    <Button asChild variant="outline" className="cursor-pointer">
                      <span>{logoPreview ? 'Cambiar logo' : 'Subir logo'}</span>
                    </Button>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG hasta 2MB</p>
                </div>
              </div>
            </div>

            <div>
              <Label>Tamaño del logo</Label>
              <Select value={config.logo_size} onValueChange={(value: any) => updateConfig({ logo_size: value })}>
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
        )}
      </div>

      {/* Agency Information */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Datos de la Agencia</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="agency-name">Nombre de la empresa</Label>
            <Input
              id="agency-name"
              value={config.agency_name}
              onChange={(e) => updateConfig({ agency_name: e.target.value })}
              placeholder="Ej: Mi Empresa S.A."
            />
          </div>
          
          <div>
            <Label htmlFor="agency-email">Email</Label>
            <Input
              id="agency-email"
              type="email"
              value={config.agency_email}
              onChange={(e) => updateConfig({ agency_email: e.target.value })}
              placeholder="contacto@empresa.com"
            />
          </div>
          
          <div>
            <Label htmlFor="agency-phone">Teléfono</Label>
            <Input
              id="agency-phone"
              value={config.agency_phone}
              onChange={(e) => updateConfig({ agency_phone: e.target.value })}
              placeholder="+1 234 567 8900"
            />
          </div>
          
          <div>
            <Label htmlFor="agency-website">Sitio web (opcional)</Label>
            <Input
              id="agency-website"
              value={config.agency_website || ''}
              onChange={(e) => updateConfig({ agency_website: e.target.value })}
              placeholder="www.empresa.com"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="agency-address">Dirección</Label>
          <Input
            id="agency-address"
            value={config.agency_address}
            onChange={(e) => updateConfig({ agency_address: e.target.value })}
            placeholder="Calle 123, Ciudad, País"
          />
        </div>
      </div>

      {/* Layout and Style */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Diseño y Estilo</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Distribución</Label>
            <Select value={config.layout} onValueChange={(value: any) => updateConfig({ layout: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Logo y datos a la izquierda</SelectItem>
                <SelectItem value="center">Centrado</SelectItem>
                <SelectItem value="right">Logo y datos a la derecha</SelectItem>
                <SelectItem value="split">Logo izquierda, datos derecha</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="header-bg">Color de fondo</Label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="header-bg"
                value={config.header_bg_color}
                onChange={(e) => updateConfig({ header_bg_color: e.target.value })}
                className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
              />
              <Input
                value={config.header_bg_color}
                onChange={(e) => updateConfig({ header_bg_color: e.target.value })}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="text-color">Color del texto</Label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="text-color"
                value={config.text_color}
                onChange={(e) => updateConfig({ text_color: e.target.value })}
                className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
              />
              <Input
                value={config.text_color}
                onChange={(e) => updateConfig({ text_color: e.target.value })}
                placeholder="#1f2937"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={config.show_client_data}
            onCheckedChange={(checked) => updateConfig({ show_client_data: checked })}
          />
          <Label>Mostrar datos del cliente automáticamente</Label>
        </div>
      </div>
    </div>
  );
}