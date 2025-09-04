import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { HeaderEditor } from './HeaderEditor';
import { FooterEditor } from './FooterEditor';
import { BudgetPreview } from './BudgetPreview';
import type { BudgetTemplate, CreateBudgetTemplateData, HeaderConfig, FooterConfig } from '@/types/budget-template';
import { DEFAULT_HEADER_CONFIG, DEFAULT_FOOTER_CONFIG } from '@/types/budget-template';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface TemplateEditorProps {
  onSubmit: (data: CreateBudgetTemplateData) => Promise<void>;
  onCancel: () => void;
  initialData?: BudgetTemplate;
}

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['link'],
    ['clean']
  ],
};

export function TemplateEditor({ onSubmit, onCancel, initialData }: TemplateEditorProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(
    initialData?.header_config || DEFAULT_HEADER_CONFIG
  );
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(
    initialData?.footer_config || DEFAULT_FOOTER_CONFIG
  );
  const [defaultContent, setDefaultContent] = useState(initialData?.default_content || '');
  const [isDefault, setIsDefault] = useState(initialData?.is_default || false);
  const [activeTab, setActiveTab] = useState<'basic' | 'header' | 'footer' | 'content' | 'preview'>('basic');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('El nombre de la plantilla es requerido');
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        header_config: headerConfig,
        footer_config: footerConfig,
        default_content: defaultContent || undefined,
        is_default: isDefault,
        organization_id: '', // Se asigna en el hook
        branch_id: '' // Se asigna en el hook
      });
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Información Básica' },
    { id: 'header', label: 'Header' },
    { id: 'footer', label: 'Footer' },
    { id: 'content', label: 'Contenido Base' },
    { id: 'preview', label: 'Vista Previa' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Nombre de la plantilla *</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Plantilla Corporativa"
                required
              />
            </div>

            <div>
              <Label htmlFor="template-description">Descripción</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción de la plantilla y cuándo usarla"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
              <Label>Establecer como plantilla predeterminada</Label>
            </div>
            
            {isDefault && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                Esta plantilla se usará automáticamente para nuevos presupuestos
              </p>
            )}
          </div>
        )}

        {activeTab === 'header' && (
          <HeaderEditor
            config={headerConfig}
            onChange={setHeaderConfig}
          />
        )}

        {activeTab === 'footer' && (
          <FooterEditor
            config={footerConfig}
            onChange={setFooterConfig}
          />
        )}

        {activeTab === 'content' && (
          <div>
            <Label>Contenido base del presupuesto</Label>
            <p className="text-sm text-gray-600 mb-3">
              Este contenido aparecerá como base al crear nuevos presupuestos con esta plantilla
            </p>
            <ReactQuill
              value={defaultContent}
              onChange={setDefaultContent}
              modules={quillModules}
              placeholder="Contenido base para los presupuestos..."
              style={{ height: '300px', marginBottom: '50px' }}
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <BudgetPreview
            headerConfig={headerConfig}
            footerConfig={footerConfig}
            content={defaultContent}
            sampleData={{
              clientName: 'Juan Pérez',
              clientEmail: 'juan@ejemplo.com',
              clientPhone: '+1 234 567 8900',
              budgetTitle: 'Presupuesto de Ejemplo',
              budgetDate: new Date().toLocaleDateString('es-ES')
            }}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Guardando...' : (initialData ? 'Actualizar' : 'Crear')} Plantilla
        </Button>
      </div>
    </form>
  );
}