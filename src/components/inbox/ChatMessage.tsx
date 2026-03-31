import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  FileText,
  Download,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: any;
}

const MAX_RETRIES = 3;

const MediaErrorState = ({
  mediaUrl,
  mediaType,
  onRetry,
  isRetrying,
}: {
  mediaUrl: string;
  mediaType: string;
  onRetry: () => void;
  isRetrying: boolean;
}) => {
  const mediaTypeLabel =
    { audio: "audio", video: "video", image: "imagen" }[mediaType] ||
    "archivo";

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-muted/50 rounded-lg">
      <AlertTriangle className="w-6 h-6 text-destructive" />
      <p className="text-xs text-center text-muted-foreground">
        No se pudo cargar el {mediaTypeLabel}.
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="text-xs h-8"
        >
          <RefreshCw
            className={cn("w-3 h-3 mr-1", isRetrying && "animate-spin")}
          />
          {isRetrying ? "Cargando..." : "Reintentar"}
        </Button>
        <Button variant="ghost" size="sm" asChild className="text-xs h-8">
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            <Download className="w-3 h-3 mr-1" />
            Descargar
          </a>
        </Button>
      </div>
    </div>
  );
};

const getDeliveryIcon = (status: string, isSending?: boolean) => {
  if (isSending) {
    return <Loader2 className="w-3 h-3 animate-spin" />;
  }
  switch (status) {
    case "pending":
    case "sending":
      return <Clock className="w-3 h-3 opacity-50" />;
    case "sent":
      return <Check className="w-3 h-3" />;
    case "delivered":
      return <CheckCheck className="w-3 h-3" />;
    case "read":
      return <CheckCheck className="w-3 h-3 text-blue-400" />;
    case "failed":
      return <AlertCircle className="w-3 h-3 text-red-500" />;
    default:
      return <Clock className="w-3 h-3 opacity-50" />;
  }
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isOutbound = message.direction === "outbound";

  const [mediaError, setMediaError] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleMediaError = useCallback(
    (mediaType: string) => {
      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 500;
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          setMediaError(false);
          setMediaLoading(true);
        }, delay);
      } else {
        setMediaError(true);
        setMediaLoading(false);
      }
    },
    [retryCount]
  );

  const handleManualRetry = useCallback(() => {
    setIsRetrying(true);
    setRetryCount(0);
    setMediaError(false);
    setMediaLoading(true);
    setTimeout(() => setIsRetrying(false), 500);
  }, []);

  const renderMedia = () => {
    if (!message.media_url) return null;
    const type = message.message_type;

    if (type === "image") {
      if (mediaError) {
        return (
          <MediaErrorState
            mediaUrl={message.media_url}
            mediaType="image"
            onRetry={handleManualRetry}
            isRetrying={isRetrying}
          />
        );
      }
      return (
        <>
          {mediaLoading && (
            <div className="flex items-center gap-1 text-xs opacity-70 p-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Cargando imagen...
            </div>
          )}
          <img
            key={`${message.id}-img-${retryCount}`}
            src={message.media_url}
            alt="Imagen"
            className="max-w-full rounded-lg max-h-96 object-contain cursor-pointer"
            loading="lazy"
            onClick={() => window.open(message.media_url, "_blank")}
            onError={() => handleMediaError("image")}
            onLoad={() => {
              setMediaLoading(false);
              setMediaError(false);
            }}
          />
        </>
      );
    }

    if (type === "video") {
      if (mediaError) {
        return (
          <MediaErrorState
            mediaUrl={message.media_url}
            mediaType="video"
            onRetry={handleManualRetry}
            isRetrying={isRetrying}
          />
        );
      }
      return (
        <>
          {mediaLoading && (
            <div className="flex items-center gap-1 text-xs opacity-70 p-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Cargando video...
            </div>
          )}
          <video
            key={`${message.id}-video-${retryCount}`}
            src={message.media_url}
            controls
            className="max-w-full rounded-lg max-h-96"
            onLoadedData={() => {
              setMediaLoading(false);
              setMediaError(false);
            }}
            onError={() => handleMediaError("video")}
          />
        </>
      );
    }

    if (type === "audio") {
      if (mediaError) {
        return (
          <MediaErrorState
            mediaUrl={message.media_url}
            mediaType="audio"
            onRetry={handleManualRetry}
            isRetrying={isRetrying}
          />
        );
      }
      return (
        <>
          {mediaLoading && (
            <div className="flex items-center gap-1 text-xs opacity-70 p-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Cargando audio...
            </div>
          )}
          <audio
            key={`${message.id}-audio-${retryCount}`}
            src={message.media_url}
            controls
            className="w-full max-w-[250px]"
            onLoadedData={() => {
              setMediaLoading(false);
              setMediaError(false);
            }}
            onError={() => handleMediaError("audio")}
          />
          {message.transcription && (
            <div className="mt-2 px-3 py-2 bg-muted/30 rounded text-xs italic">
              <span className="font-semibold opacity-70">Transcripcion:</span>
              <p className="mt-1 opacity-80">{message.transcription}</p>
            </div>
          )}
        </>
      );
    }

    if (type === "document") {
      return (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {message.metadata?.filename || message.content || "Documento"}
            </div>
            <div className="text-xs text-muted-foreground">
              {message.metadata?.mimetype || "application/pdf"}
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
            <a
              href={message.media_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="w-4 h-4" />
            </a>
          </Button>
        </div>
      );
    }

    if (type === "sticker") {
      return (
        <a
          href={message.media_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm underline hover:opacity-80 px-2 py-1"
        >
          Descargar sticker
        </a>
      );
    }

    return null;
  };

  const showContent =
    message.content && !/^\[.*\]$/.test(message.content);

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl shadow-sm text-sm",
          isOutbound
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-background border rounded-bl-sm",
          !message.media_url && "px-3 py-2"
        )}
      >
        {message.media_url && <div className="p-1">{renderMedia()}</div>}

        {showContent && (
          <p
            className={cn(
              "whitespace-pre-wrap break-words",
              message.media_url && "px-3 py-1"
            )}
          >
            {message.content}
          </p>
        )}

        <div
          className={cn(
            "flex items-center gap-1 mt-0.5 text-xs",
            message.media_url && "px-3 pb-1",
            !message.media_url && "",
            isOutbound
              ? "text-primary-foreground/70 justify-end"
              : "text-muted-foreground"
          )}
        >
          <span>
            {format(new Date(message.created_at), "HH:mm", { locale: es })}
          </span>
          {isOutbound && getDeliveryIcon(message.delivery_status, message._optimistic)}
        </div>
      </div>
    </div>
  );
}
