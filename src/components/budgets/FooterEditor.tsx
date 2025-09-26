import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { FooterConfig } from '@/types/budget-template';

interface FooterEditorProps {
  config: FooterConfig;
  onChange: (config: FooterConfig) => void;
}

export function FooterEditor({ config, onChange }: FooterEditorProps) {
  const [image1Preview, setImage1Preview] = useState<string | null>(config.image1_url);
  const [image2Preview, setImage2Preview] = useState<string | null>(config.image2_url);

  const updateConfig = (updates: Partial<FooterConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleImage1Upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('El archivo es muy grande. Máximo 2MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setImage1Preview(base64);
        updateConfig({ image1_url: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImage2Upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('El archivo es muy grande. Máximo 2MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setImage2Preview(base64);
        updateConfig({ image2_url: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage1 = () => {
    setImage1Preview(null);
    updateConfig({ image1_url: null });
  };

  const handleRemoveImage2 = () => {
    setImage2Preview(null);
    updateConfig({ image2_url: null });
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

          {/* Images Configuration */}
          <div className="border-t pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                checked={config.show_images}
                onCheckedChange={(checked) => updateConfig({ show_images: checked })}
              />
              <Label>Mostrar imágenes en footer</Label>
            </div>

            {config.show_images && (
              <div className="space-y-6">
                {/* Image Layout */}
                <div>
                  <Label>Distribución de imágenes</Label>
                  <Select value={config.images_layout} onValueChange={(value: any) => updateConfig({ images_layout: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="side-by-side">Una al lado de la otra</SelectItem>
                      <SelectItem value="stacked">Una debajo de la otra</SelectItem>
                      <SelectItem value="image1-only">Solo imagen 1</SelectItem>
                      <SelectItem value="image2-only">Solo imagen 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Image 1 Configuration */}
                {(config.images_layout === 'side-by-side' || config.images_layout === 'stacked' || config.images_layout === 'image1-only') && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Imagen 1</h4>
                    
                    <div>
                      <Label>Imagen 1</Label>
                      <div className="mt-1 flex items-center space-x-4">
                        {image1Preview ? (
                          <div className="relative">
                            <img
                              src={image1Preview}
                              alt="Image 1 preview"
                              className="h-16 w-auto border border-gray-300 rounded"
                            />
                            <button
                              onClick={handleRemoveImage1}
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
                            onChange={handleImage1Upload}
                            className="hidden"
                            id="image1-upload"
                          />
                          <label htmlFor="image1-upload">
                            <Button asChild variant="outline" className="cursor-pointer">
                              <span>{image1Preview ? 'Cambiar imagen 1' : 'Subir imagen 1'}</span>
                            </Button>
                          </label>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG hasta 2MB</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Tamaño de imagen 1</Label>
                      <Select value={config.image1_size} onValueChange={(value: any) => updateConfig({ image1_size: value })}>
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

                {/* Image 2 Configuration */}
                {(config.images_layout === 'side-by-side' || config.images_layout === 'stacked' || config.images_layout === 'image2-only') && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Imagen 2</h4>
                    
                    <div>
                      <Label>Imagen 2</Label>
                      <div className="mt-1 flex items-center space-x-4">
                        {image2Preview ? (
                          <div className="relative">
                            <img
                              src={image2Preview}
                              alt="Image 2 preview"
                              className="h-16 w-auto border border-gray-300 rounded"
                            />
                            <button
                              onClick={handleRemoveImage2}
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
                            onChange={handleImage2Upload}
                            className="hidden"
                            id="image2-upload"
                          />
                          <label htmlFor="image2-upload">
                            <Button asChild variant="outline" className="cursor-pointer">
                              <span>{image2Preview ? 'Cambiar imagen 2' : 'Subir imagen 2'}</span>
                            </Button>
                          </label>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG hasta 2MB</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Tamaño de imagen 2</Label>
                      <Select value={config.image2_size} onValueChange={(value: any) => updateConfig({ image2_size: value })}>
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
            )}
          </div>

          {/* Preview */}
          <div>
            <Label>Vista previa</Label>
            <div 
              className={`mt-2 rounded border ${
                config.padding === 'small' ? 'p-2' : 
                config.padding === 'large' ? 'p-6' : 'p-4'
              }`}
              style={{ 
                backgroundColor: config.bg_color,
                color: config.text_color,
                textAlign: config.alignment,
              }}
            >
              <div 
                style={{
                  fontSize: config.font_size === 'small' ? '0.875rem' : 
                            config.font_size === 'large' ? '1.125rem' : '1rem'
                }}
              >
                {config.text || 'Texto del footer aparecerá aquí'}
              </div>
              
              {config.show_images && (image1Preview || image2Preview) && (
                <div className="mt-4">
                  <div 
                    className={`flex items-center justify-center ${
                      config.images_layout === 'side-by-side' ? 'flex-row gap-4' :
                      config.images_layout === 'stacked' ? 'flex-col gap-2' :
                      'flex-row'
                    }`}
                  >
                    {/* Image 1 */}
                    {(config.images_layout === 'side-by-side' || config.images_layout === 'stacked' || config.images_layout === 'image1-only') && image1Preview && (
                      <img
                        src={image1Preview}
                        alt="Footer image 1"
                        className={`${
                          config.image1_size === 'small' ? 'h-8' :
                          config.image1_size === 'large' ? 'h-16' : 'h-12'
                        } w-auto`}
                      />
                    )}
                    
                    {/* Image 2 */}
                    {(config.images_layout === 'side-by-side' || config.images_layout === 'stacked' || config.images_layout === 'image2-only') && image2Preview && (
                      <img
                        src={image2Preview}
                        alt="Footer image 2"
                        className={`${
                          config.image2_size === 'small' ? 'h-8' :
                          config.image2_size === 'large' ? 'h-16' : 'h-12'
                        } w-auto`}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}