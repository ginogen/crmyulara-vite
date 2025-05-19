import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import html2pdf from 'html2pdf.js';
import type { Budget } from '@/types';

export function useBudgetActions() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const generatePublicUrl = async (budgetId: string) => {
    const publicId = nanoid(10);
    const publicUrl = `${window.location.origin}/budgets/public/${publicId}`;
    
    const { error } = await supabase
      .from('budgets')
      .update({ public_url: publicUrl })
      .eq('id', budgetId);

    if (error) throw error;
    return publicUrl;
  };

  const generatePDF = async (budget: Budget) => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #2563eb;">${budget.title}</h1>
        <div style="margin-top: 20px;">
          ${budget.description}
        </div>
      </div>
    `;

    const pdfOptions = {
      margin: 10,
      filename: `presupuesto-${budget.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
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
      const publicUrl = await generatePublicUrl(budget.id);
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