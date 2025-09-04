import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import html2pdf from 'html2pdf.js';
import type { Budget } from '@/types';
import { generateBudgetSlug, generateUniqueSlug } from '@/lib/utils/slug';

export function useBudgetActions() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const generatePublicUrl = async (budgetId: string, contactName?: string, leadName?: string, budgetTitle?: string) => {
    // Generar slug basado en el nombre del contacto/lead
    const baseSlug = generateBudgetSlug(contactName, leadName, budgetTitle);
    
    // Verificar que el slug sea único
    const { data: existingBudgets } = await supabase
      .from('budgets')
      .select('public_url')
      .like('public_url', `%/budgets/public/${baseSlug}%`);
    
    const existingSlugs = existingBudgets?.map(b => 
      b.public_url?.split('/').pop() || ''
    ).filter(Boolean) || [];
    
    const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
    const publicUrl = `${window.location.origin}/budgets/public/${uniqueSlug}`;
    
    const { error } = await supabase
      .from('budgets')
      .update({ public_url: publicUrl })
      .eq('id', budgetId);

    if (error) throw error;
    return publicUrl;
  };

  const generatePDF = async (budget: Budget) => {
    // Crear un iframe invisible para renderizar la página pública
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '1200px';
    iframe.style.height = '800px';
    document.body.appendChild(iframe);

    try {
      // Obtener el slug del public_url
      const slug = budget.public_url?.split('/').pop();
      if (!slug) {
        throw new Error('No se pudo obtener el slug del presupuesto');
      }

      // Cargar la página pública en el iframe
      iframe.src = `${window.location.origin}/budgets/public/${slug}`;
      
      // Esperar a que cargue la página
      await new Promise((resolve, reject) => {
        iframe.onload = resolve;
        iframe.onerror = reject;
        setTimeout(reject, 10000); // Timeout de 10 segundos
      });

      // Esperar un poco más para que se renderice completamente
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Obtener el contenido del iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('No se pudo acceder al contenido del iframe');
      }

      // Usar el contenido del iframe para generar el PDF
      const content = iframeDoc.body;

      const pdfOptions = {
        margin: 10,
        filename: `presupuesto-${budget.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdf = await html2pdf().from(content).set(pdfOptions).outputPdf();
      
      // Subir el PDF a Supabase Storage
      const { data, error } = await supabase.storage
        .from('budgets')
        .upload(`${budget.id}/presupuesto.pdf`, pdf, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) throw error;

      // Obtener la URL pública del PDF
      const { data: { publicUrl } } = supabase.storage
        .from('budgets')
        .getPublicUrl(`${budget.id}/presupuesto.pdf`);

      // Actualizar la URL del PDF en la base de datos
      const { error: updateError } = await supabase
        .from('budgets')
        .update({ pdf_url: publicUrl })
        .eq('id', budget.id);

      if (updateError) throw updateError;

      return publicUrl;
    } catch (error) {
      console.error('Error generando PDF:', error);
      throw error;
    } finally {
      // Limpiar el iframe
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }
  };

  const updateBudgetStatus = useMutation({
    mutationFn: async ({ budgetId, status, userId }: { budgetId: string; status: Budget['status']; userId: string }) => {
      const updates: Partial<Budget> = {
        status,
        ...(status === 'sent' ? { sent_at: new Date().toISOString(), sent_by: userId } : {})
      };

      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', budgetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const processBudget = async (budget: Budget) => {
    setIsLoading(true);
    try {
      // Obtener datos del contacto o lead para generar el slug
      let contactName: string | undefined;
      let leadName: string | undefined;
      
      if (budget.contact_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('full_name')
          .eq('id', budget.contact_id)
          .single();
        contactName = contact?.full_name;
      }
      
      if (budget.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('full_name')
          .eq('id', budget.lead_id)
          .single();
        leadName = lead?.full_name;
      }
      
      const publicUrl = await generatePublicUrl(budget.id, contactName, leadName, budget.title);
      const pdfUrl = await generatePDF(budget);
      
      return { publicUrl, pdfUrl };
    } catch (error) {
      console.error('Error procesando presupuesto:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    processBudget,
    updateBudgetStatus,
    isLoading
  };
} 