'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
  color: string;
  organization_id: string;
  created_at: string;
}

interface TagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagSelect?: (tag: Tag) => void;
}

const generateRandomColor = () => {
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-red-100 text-red-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800',
    'bg-gray-100 text-gray-800',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export function TagsModal({ isOpen, onClose, onTagSelect }: TagsModalProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentOrganization } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      fetchTags();
    }
  }, [isOpen, currentOrganization?.id]);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('organization_id', currentOrganization?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Error al cargar las etiquetas');
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || !currentOrganization?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([
          {
            name: newTagName.trim(),
            color: generateRandomColor(),
            organization_id: currentOrganization.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setTags([data, ...tags]);
      setNewTagName('');
      toast.success('Etiqueta creada exitosamente');
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Error al crear la etiqueta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagSelect = (tag: Tag) => {
    if (onTagSelect) {
      onTagSelect(tag);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gestionar Etiquetas</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreateTag} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newTag">Nueva Etiqueta</Label>
            <div className="flex gap-2">
              <Input
                id="newTag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nombre de la etiqueta"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !newTagName.trim()}>
                {isLoading ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-3">Etiquetas Existentes</h3>
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                onClick={() => handleTagSelect(tag)}
              >
                <Badge className={tag.color}>
                  {tag.name}
                </Badge>
              </div>
            ))}
            {tags.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">
                No hay etiquetas creadas
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 