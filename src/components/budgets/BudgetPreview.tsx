import type { HeaderConfig, FooterConfig } from '@/types/budget-template';

interface SampleData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  budgetTitle: string;
  budgetDate: string;
}

interface BudgetPreviewProps {
  headerConfig: HeaderConfig;
  footerConfig: FooterConfig;
  content: string;
  sampleData: SampleData;
}

export function BudgetPreview({ headerConfig, footerConfig, content, sampleData }: BudgetPreviewProps) {
  const getLogoSizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'h-8';
      case 'large': return 'h-16';
      default: return 'h-12';
    }
  };

  const getFontSizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  const getImageSizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'h-8';
      case 'large': return 'h-16';
      default: return 'h-12';
    }
  };

  const getPaddingClass = (padding: string) => {
    switch (padding) {
      case 'small': return 'p-2';
      case 'large': return 'p-6';
      default: return 'p-4';
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
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="p-4 bg-gray-50 border-b">
        <h3 className="text-sm font-medium text-gray-700">Vista Previa del Presupuesto</h3>
        <p className="text-xs text-gray-500">Esta es una vista previa de cómo se verá el presupuesto</p>
      </div>
      
      <div className="bg-white">
        {/* Header */}
        <div 
          className={`px-6 py-4 border-b border-gray-200`}
          style={{ 
            backgroundColor: headerConfig.header_bg_color,
            color: headerConfig.text_color 
          }}
        >
          <div className={`flex items-center ${getLayoutClass(headerConfig.layout)}`}>
            {/* Logo */}
            {headerConfig.show_logo && headerConfig.logo_url && (
              <div className="flex-shrink-0">
                <img
                  src={headerConfig.logo_url}
                  alt="Logo"
                  className={`${getLogoSizeClass(headerConfig.logo_size)} w-auto`}
                />
              </div>
            )}

            {/* Agency Info */}
            <div className={headerConfig.layout === 'center' ? 'mt-2' : ''}>
              {headerConfig.agency_name && (
                <h2 className="text-xl font-bold">{headerConfig.agency_name}</h2>
              )}
              {headerConfig.agency_address && (
                <p className="text-sm">{headerConfig.agency_address}</p>
              )}
              <div className="text-sm space-y-1 mt-1">
                {headerConfig.agency_phone && (
                  <p>Tel: {headerConfig.agency_phone}</p>
                )}
                {headerConfig.agency_email && (
                  <p>Email: {headerConfig.agency_email}</p>
                )}
                {headerConfig.agency_website && (
                  <p>Web: {headerConfig.agency_website}</p>
                )}
              </div>
            </div>

            {/* Client Data */}
            {headerConfig.show_client_data && (
              <div className={`${headerConfig.layout === 'split' ? 'text-right' : 'mt-4'}`}>
                <h3 className="font-semibold">Cliente:</h3>
                <div className="text-sm space-y-1">
                  <p>{sampleData.clientName}</p>
                  <p>{sampleData.clientEmail}</p>
                  <p>{sampleData.clientPhone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Budget Title and Date */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">{sampleData.budgetTitle}</h1>
          <p className="text-sm text-gray-600 mt-1">Fecha: {sampleData.budgetDate}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {content ? (
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="text-gray-500 italic">
              El contenido del presupuesto aparecerá aquí...
            </div>
          )}
          
          {/* Sample budget items */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Detalle del Presupuesto</h3>
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-3 py-2 text-left">Descripción</th>
                  <th className="border border-gray-300 px-3 py-2 text-right">Cantidad</th>
                  <th className="border border-gray-300 px-3 py-2 text-right">Precio Unit.</th>
                  <th className="border border-gray-300 px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-3 py-2">Servicio de ejemplo</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">1</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">$1,000</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">$1,000</td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan={3} className="border border-gray-300 px-3 py-2 text-right font-semibold">
                    Total:
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                    $1,000
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        {footerConfig.show_footer && (
          <div 
            className={`border-t border-gray-200 ${getPaddingClass(footerConfig.padding)}`}
            style={{ 
              backgroundColor: footerConfig.bg_color,
              color: footerConfig.text_color,
              textAlign: footerConfig.alignment
            }}
          >
            <p className={getFontSizeClass(footerConfig.font_size)}>
              {footerConfig.text}
            </p>
            
            {/* Footer Images */}
            {footerConfig.show_images && (footerConfig.image1_url || footerConfig.image2_url) && (
              <div className="mt-4">
                <div 
                  className={`flex items-center justify-center ${
                    footerConfig.images_layout === 'side-by-side' ? 'flex-row gap-4' :
                    footerConfig.images_layout === 'stacked' ? 'flex-col gap-2' :
                    'flex-row'
                  }`}
                >
                  {/* Image 1 */}
                  {(footerConfig.images_layout === 'side-by-side' || footerConfig.images_layout === 'stacked' || footerConfig.images_layout === 'image1-only') && footerConfig.image1_url && (
                    <img
                      src={footerConfig.image1_url}
                      alt="Footer image 1"
                      className={`${getImageSizeClass(footerConfig.image1_size)} w-auto`}
                    />
                  )}
                  
                  {/* Image 2 */}
                  {(footerConfig.images_layout === 'side-by-side' || footerConfig.images_layout === 'stacked' || footerConfig.images_layout === 'image2-only') && footerConfig.image2_url && (
                    <img
                      src={footerConfig.image2_url}
                      alt="Footer image 2"
                      className={`${getImageSizeClass(footerConfig.image2_size)} w-auto`}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}