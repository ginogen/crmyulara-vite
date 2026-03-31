import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Send, X } from "lucide-react";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onRecordingComplete, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: "audio/webm;codecs=opus" };
      const mediaRecorder = new MediaRecorder(stream, options);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("No se pudo acceder al microfono. Verifica los permisos.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setTimeout(() => {
        const audioBlob = new Blob(chunksRef.current, {
          type: "audio/webm;codecs=opus",
        });
        onRecordingComplete(audioBlob);
        cleanup();
      }, 100);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      cleanup();
      toast.info("Grabacion cancelada");
    }
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
    chunksRef.current = [];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-destructive/10 rounded-lg border border-destructive/20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-mono font-medium">
            {formatTime(recordingTime)}
          </span>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            title="Cancelar grabacion"
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={stopRecording}
            title="Enviar nota de voz"
            className="h-8 w-8 text-primary hover:text-primary"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={startRecording}
      disabled={disabled}
      title="Grabar nota de voz"
      className="flex-shrink-0 h-9 w-9"
    >
      <Mic className="w-4 h-4" />
    </Button>
  );
}
