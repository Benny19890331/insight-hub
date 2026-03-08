import { useState, useRef, useCallback } from "react";
import { Mic, Keyboard, Send } from "lucide-react";
import { toast } from "sonner";
import { AiConfirmModal } from "@/components/AiConfirmModal";

interface VoiceInputButtonProps {
  mode: "contact" | "interaction";
  onResult: (data: any) => void;
  className?: string;
}

const VOICE_PARSE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-parse`;

// Soundwave animation component
function SoundwaveAnimation() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-5 w-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="inline-block w-[2.5px] rounded-full bg-primary"
          style={{
            animation: `ai-soundwave 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s`,
            height: '4px',
          }}
        />
      ))}
    </div>
  );
}

export function VoiceInputButton({ mode, onResult, className = "" }: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [pendingResult, setPendingResult] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [manualText, setManualText] = useState("");
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
        setPendingResult(data.result);
        setShowConfirm(true);
      }
    } catch (e) {
      console.error("Voice parse error:", e);
      toast.error("AI 解析失敗，請稍後再試");
    } finally {
      setParsing(false);
      setTranscript("");
    }
  };

  const handleConfirm = (editedData: any) => {
    onResult(editedData);
    setShowConfirm(false);
    setPendingResult(null);
    toast.success("AI 智慧填表完成！");
  };

  const handleClick = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleManualSubmit = () => {
    const text = manualText.trim();
    if (!text) {
      toast.error("請輸入文字內容");
      return;
    }
    setManualText("");
    setShowTextInput(false);
    parseWithAI(text);
  };

  return (
    <div className={`flex flex-col items-center gap-2 w-full ${className}`}>
      <div className="flex items-center gap-3">
        {/* Mic button */}
        <button
          type="button"
          onClick={handleClick}
          disabled={parsing}
          className={`relative group inline-flex items-center justify-center rounded-full w-12 h-12 transition-all duration-300 ${
            listening
              ? "bg-destructive/20 border-2 border-destructive shadow-[0_0_20px_hsl(var(--destructive)/0.4)]"
              : parsing
              ? "bg-primary/10 border-2 border-primary/50 shadow-[0_0_25px_hsl(var(--primary)/0.4)]"
              : "bg-primary/10 border-2 border-primary/30 hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
          } disabled:cursor-not-allowed`}
          title={listening ? "點擊停止錄音" : "AI 智慧語音建檔"}
        >
          {parsing ? (
            <SoundwaveAnimation />
          ) : (
            <Mic className={`h-5 w-5 transition-colors ${listening ? "text-destructive" : "text-primary"}`} />
          )}
          {listening && (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-destructive animate-ping opacity-30" />
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive animate-pulse" />
            </>
          )}
          {parsing && (
            <span className="absolute inset-0 rounded-full border-2 border-primary/60 animate-pulse" />
          )}
        </button>

        {/* Text input toggle */}
        <button
          type="button"
          onClick={() => setShowTextInput(!showTextInput)}
          disabled={parsing || listening}
          className={`inline-flex items-center justify-center rounded-full w-10 h-10 transition-all duration-200 border ${
            showTextInput
              ? "bg-primary/15 border-primary/40 text-primary"
              : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="手動輸入文字"
        >
          <Keyboard className="h-4 w-4" />
        </button>
      </div>

      {/* Status text */}
      <span className="text-[10px] text-muted-foreground font-medium">
        {listening ? "🔴 聆聽中，說完請點擊停止" : parsing ? "🧠 AI 語意解析中..." : "🎙️ AI 語音建檔 ｜ ⌨️ 文字建檔"}
      </span>

      {/* Live transcript */}
      {(listening || transcript) && transcript && (
        <div className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground max-h-20 overflow-y-auto">
          <span className="text-muted-foreground">語音辨識：</span>{transcript}
          {listening && <span className="inline-block w-1 h-3 bg-destructive animate-pulse ml-0.5 align-middle" />}
        </div>
      )}

      {/* Manual text input */}
      {showTextInput && (
        <div className="w-full flex gap-2 animate-fade-in">
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={mode === "contact"
              ? "例如：王小明，住台北，工程師，對識霸有興趣，LINE是wang123"
              : "例如：今天跟他喝咖啡，聊到健康話題，對水素水很有興趣"
            }
            rows={2}
            className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleManualSubmit();
              }
            }}
          />
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={parsing || !manualText.trim()}
            className="self-end rounded-lg bg-primary/15 border border-primary/30 px-3 py-2 text-primary hover:bg-primary/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="送出 AI 解析"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* AI Confirm Modal */}
      <AiConfirmModal
        open={showConfirm}
        onOpenChange={setShowConfirm}
        data={pendingResult}
        mode={mode}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
