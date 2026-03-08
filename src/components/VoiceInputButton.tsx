import { useState, useRef, useCallback } from "react";
import { Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  mode: "contact" | "interaction";
  onResult: (data: any) => void;
  className?: string;
}

const VOICE_PARSE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-parse`;

export function VoiceInputButton({ mode, onResult, className = "" }: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("您的瀏覽器不支援語音輸入，請使用 Chrome 或 Safari");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-TW";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interim += t;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("請允許麥克風權限");
      } else if (event.error !== "aborted") {
        toast.error("語音辨識發生錯誤");
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      if (finalTranscript.trim()) {
        parseWithAI(finalTranscript.trim());
      }
    };

    setTranscript("");
    setListening(true);
    recognition.start();
  }, [mode]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const parseWithAI = async (text: string) => {
    setParsing(true);
    try {
      const resp = await fetch(VOICE_PARSE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text, mode }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI 解析失敗" }));
        toast.error(err.error || "AI 解析失敗");
        return;
      }

      const data = await resp.json();
      if (data.result) {
        onResult(data.result);
        toast.success("AI 智慧填表完成！");
      }
    } catch (e) {
      console.error("Voice parse error:", e);
      toast.error("AI 解析失敗，請稍後再試");
    } finally {
      setParsing(false);
      setTranscript("");
    }
  };

  const handleClick = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={parsing}
        className={`relative group inline-flex items-center justify-center rounded-full w-12 h-12 transition-all duration-300 ${
          listening
            ? "bg-red-500/20 border-2 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            : parsing
            ? "bg-primary/10 border-2 border-primary/30"
            : "bg-primary/10 border-2 border-primary/30 hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(var(--primary),0.3)]"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={listening ? "點擊停止錄音" : "AI 智慧語音建檔"}
      >
        {parsing ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Mic className={`h-5 w-5 transition-colors ${listening ? "text-red-400" : "text-primary"}`} />
        )}
        {/* Recording pulse animation */}
        {listening && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30" />
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          </>
        )}
      </button>

      {/* Status text */}
      <span className="text-[10px] text-muted-foreground font-medium">
        {listening ? "🔴 聆聽中，說完請點擊停止" : parsing ? "🧠 AI 解析中..." : "🎙️ AI 語音建檔"}
      </span>

      {/* Live transcript */}
      {(listening || transcript) && transcript && (
        <div className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground max-h-20 overflow-y-auto">
          <span className="text-muted-foreground">語音辨識：</span>{transcript}
          {listening && <span className="inline-block w-1 h-3 bg-red-400 animate-pulse ml-0.5 align-middle" />}
        </div>
      )}
    </div>
  );
}
