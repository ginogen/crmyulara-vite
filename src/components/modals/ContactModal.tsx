import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Contact } from '@/types/supabase';
import { ContactForm } from '@/components/forms/ContactForm';
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: Contact;
  onSubmit: (contact: Omit<Contact, 'id' | 'created_at'>) => Promise<void>;
  tags: Array<{ id: string; name: string; color: string }>;
}

export const ContactModal = ({
  isOpen,
  onClose,
  contact,
  onSubmit,
  tags,
}: ContactModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0">
        <Card className="border-none">
          <DialogHeader className="px-6 py-4 bg-primary/5 rounded-t-lg">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shadow-sm">
                <span className="text-3xl font-semibold text-primary">
                  {contact ? contact.full_name.charAt(0).toUpperCase() : '+'}
                </span>
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {contact ? 'Editar Contacto' : 'Nuevo Contacto'}
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-base">
                  {contact 
                    ? 'Modifica los datos del contacto existente.' 
                    : 'Ingresa los datos para crear un nuevo contacto.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Separator />
          <div className="p-6">
            <ContactForm
              contact={contact}
              onSubmit={onSubmit}
              onCancel={onClose}
              tags={tags}
            />
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}; 