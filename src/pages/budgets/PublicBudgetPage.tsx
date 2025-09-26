import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import type { Budget } from '@/types';
import type { BudgetTemplate } from '@/types/budget-template';
import type { MarginConfig } from '@/components/budgets/MarginControls';
import { DEFAULT_MARGIN_CONFIG, marginConfigToStyles } from '@/components/budgets/MarginControls';

interface PublicBudgetData extends Budget {
  contacts?: { full_name: string; email: string; phone: string };
  leads?: { full_name: string; email: string; phone: string };
  template?: BudgetTemplate;
}

// Helper function para extraer configuración de márgenes y limpiar contenido
function extractMarginConfigAndContent(description: string | null): { 
  marginConfig: MarginConfig; 
  cleanContent: string;
} {
  if (!description) {
    return { marginConfig: DEFAULT_MARGIN_CONFIG, cleanContent: '' };
  }

  try {
    const marginMatch = description.match(/<!--MARGIN_CONFIG:(.+?)-->\n?/);
    if (marginMatch) {
      const marginConfig = JSON.parse(marginMatch[1]);
      const cleanContent = description.replace(/<!--MARGIN_CONFIG:(.+?)-->\n?/, '');
      return { marginConfig, cleanContent };
    }
  } catch (error) {
    console.warn('Error parsing margin config:', error);
  }

  return { marginConfig: DEFAULT_MARGIN_CONFIG, cleanContent: description };
}

export function PublicBudgetPage() {
  const { slug } = useParams<{ slug: string }>();
  const [budget, setBudget] = useState<PublicBudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!slug) {
      setError('Enlace inválido');
      setLoading(false);
      return;
    }

    const loadBudget = async () => {
      try {
        // Buscar presupuesto por la URL pública
        const publicUrl = `${window.location.origin}/budgets/public/${slug}`;
        
        const { data: budgetData, error: budgetError } = await supabase
          .from('budgets')
          .select(`
            *,
            contacts(full_name, email, phone),
            leads(full_name, email, phone)
          `)
          .eq('public_url', publicUrl)
          .single();

        if (budgetError) {
          console.error('Error loading budget:', budgetError);
          setError('Presupuesto no encontrado');
          return;
        }

        // Obtener la plantilla por separado si existe template_id
        let templateData = null;
        if (budgetData.template_id) {
          const { data: template } = await supabase
            .from('budget_templates')
            .select('*')
            .eq('id', budgetData.template_id)
            .single();
          templateData = template;
        }

        setBudget({
          ...budgetData,
          template: templateData
        });
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar el presupuesto');
      } finally {
        setLoading(false);
      }
    };

    loadBudget();
  }, [slug, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando presupuesto...</p>
        </div>
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Presupuesto no encontrado</h1>
          <p className="text-gray-600">{error || 'El enlace proporcionado no es válido'}</p>
        </div>
      </div>
    );
  }

  const clientName = budget.contacts?.full_name || budget.leads?.full_name || 'Cliente';
  const clientEmail = budget.contacts?.email || budget.leads?.email || '';
  const clientPhone = budget.contacts?.phone || budget.leads?.phone || '';

  const renderHeader = () => {
    if (!budget.template?.header_config) return null;
    
    const header = budget.template.header_config;
    
    const getLogoSizeClass = (size: string) => {
      switch (size) {
        case 'small': return 'h-8';
        case 'large': return 'h-16';
        default: return 'h-12';
      }
    };

    const getLayoutClass = (layout: string) => {
      switch (layout) {
        case 'left': return 'text-left';
        case 'right': return 'text-right flex-row-reverse';
        case 'center': return 'text-center flex-col items-center';
        case 'split': return 'justify-between';
        default: return 'justify-between';
      }
    };

    return (
      <div 
        className="px-6 py-4 border-b border-gray-200"
        style={{ 
          backgroundColor: header.header_bg_color,
          color: header.text_color 
        }}
      >
        <div className={`flex items-center ${getLayoutClass(header.layout)}`}>
          {/* Logo */}
          {header.show_logo && header.logo_url && (
            <div className="flex-shrink-0">
              <img
                src={header.logo_url}
                alt="Logo"
                className={`${getLogoSizeClass(header.logo_size)} w-auto`}
              />
            </div>
          )}

          {/* Agency Info */}
          <div className={header.layout === 'center' ? 'mt-2' : ''}>
            {header.agency_name && (
              <h2 className="text-xl font-bold">{header.agency_name}</h2>
            )}
            {header.agency_address && (
              <p className="text-sm">{header.agency_address}</p>
            )}
            <div className="text-sm space-y-1 mt-1">
              {header.agency_phone && <p>Tel: {header.agency_phone}</p>}
              {header.agency_email && <p>Email: {header.agency_email}</p>}
              {header.agency_website && <p>Web: {header.agency_website}</p>}
            </div>
          </div>

          {/* Client Data */}
          {header.show_client_data && (
            <div className={`${header.layout === 'split' ? 'text-right' : 'mt-4'}`}>
              <h3 className="font-semibold">Cliente:</h3>
              <div className="text-sm space-y-1">
                <p>{clientName}</p>
                {clientEmail && <p>{clientEmail}</p>}
                {clientPhone && <p>{clientPhone}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (!budget.template?.footer_config?.show_footer) return null;
    
    const footer = budget.template.footer_config;
    
    const getFontSizeClass = (size: string) => {
      switch (size) {
        case 'small': return 'text-sm';
        case 'large': return 'text-lg';
        default: return 'text-base';
      }
    };

    const getPaddingClass = (padding: string) => {
      switch (padding) {
        case 'small': return 'p-2';
        case 'large': return 'p-6';
        default: return 'p-4';
      }
    };

    return (
      <div 
        className={`border-t border-gray-200 ${getPaddingClass(footer.padding)}`}
        style={{ 
          backgroundColor: footer.bg_color,
          color: footer.text_color,
          textAlign: footer.alignment
        }}
      >
        <p className={getFontSizeClass(footer.font_size)}>
          {footer.text}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white shadow-lg">
        {/* Header personalizado */}
        {renderHeader()}

        {/* Título del presupuesto */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">{budget.title}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Fecha: {new Date(budget.created_at).toLocaleDateString('es-ES')}
          </p>
        </div>

        {/* Contenido del presupuesto */}
        <div className="px-6 py-6">
          {(() => {
            const { marginConfig, cleanContent } = extractMarginConfigAndContent(budget.description);
            return (
              <div 
                className="prose max-w-none"
                style={marginConfigToStyles(marginConfig)}
                dangerouslySetInnerHTML={{ __html: cleanContent }}
              />
            );
          })()}
        </div>

        {/* Footer personalizado */}
        {renderFooter()}

        {/* Información adicional */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Este presupuesto fue generado el {new Date(budget.created_at).toLocaleDateString('es-ES')}
          </p>
        </div>
      </div>
    </div>
  );
}