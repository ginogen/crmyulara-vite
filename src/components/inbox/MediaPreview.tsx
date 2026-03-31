import { X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaPreviewProps {
  file: File;
  onRemove: () => void;
}

export function MediaPreview({ file, onRemove }: MediaPreviewProps) {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");

  return (
    <div className="relative inline-block mb-2">
      <Button
        variant="ghost"
        size="icon"
        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground z-10"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>

      {isImage && (
        <img
          src={URL.createObjectURL(file)}
          alt="Preview"
          className="h-20 w-20 object-cover rounded-lg border border-border"
        />
      )}

      {isVideo && (
        <video
          src={URL.createObjectURL(file)}
          className="h-20 w-20 object-cover rounded-lg border border-border"
        />
      )}

      {isAudio && (
        <div className="h-20 w-40 rounded-lg border border-border bg-card flex items-center justify-center p-2">
          <audio
            src={URL.createObjectURL(file)}
            controls
            className="w-full h-8"
          />
        </div>
      )}

      {!isImage && !isVideo && !isAudio && (
        <div className="h-20 rounded-lg border border-border bg-card flex items-center gap-2 p-3">
          <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div className="text-xs text-muted-foreground truncate max-w-[120px]">
            {file.name}
          </div>
        </div>
      )}
    </div>
  );
}
