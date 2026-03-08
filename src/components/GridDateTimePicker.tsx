import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

interface GridDateTimePickerProps {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

export function GridDateTimePicker({ date, time, onDateChange, onTimeChange }: GridDateTimePickerProps) {
  const parts = date.split("-");
  const viewYear = parseInt(parts[0]) || 2026;
  const viewMonth = parseInt(parts[1]) || 1;
  const selectedDay = parseInt(parts[2]) || 1;

  const selectedHour = time.split(":")[0] || "09";
  const selectedMinute = time.split(":")[1] || "00";

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeMode, setTimeMode] = useState<"hour" | "minute">("hour");

  const daysInMonth = useMemo(() => new Date(viewYear, viewMonth, 0).getDate(), [viewYear, viewMonth]);
  const firstDayOfWeek = useMemo(() => new Date(viewYear, viewMonth - 1, 1).getDay(), [viewYear, viewMonth]);

  const navigateMonth = (delta: number) => {
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    const newDay = Math.min(selectedDay, new Date(newYear, newMonth, 0).getDate());
    onDateChange(`${newYear}-${String(newMonth).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`);
  };

  const selectDay = (day: number) => {
    onDateChange(`${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedDateObj = new Date(viewYear, viewMonth - 1, selectedDay);
  const dayOfWeek = WEEKDAYS[selectedDateObj.getDay()];

  return (
    <div className="space-y-3">
      {/* Date display */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {viewYear}/{String(viewMonth).padStart(2, "0")}/{String(selectedDay).padStart(2, "0")}（{dayOfWeek}）
          <span className="ml-2 text-primary">{selectedHour}:{selectedMinute}</span>
        </p>
        <button
          onClick={() => setShowTimePicker(!showTimePicker)}
          className="text-xs text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded-md hover:bg-primary/20 transition-colors"
        >
          {showTimePicker ? "選日期" : "選時間"}
        </button>
      </div>

      {!showTimePicker ? (
        /* Calendar grid */
        <div>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => navigateMonth(-1)} className="p-1 rounded-md hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium font-mono">{viewYear} 年 {viewMonth} 月</span>
            <button onClick={() => navigateMonth(1)} className="p-1 rounded-md hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSelected = day === selectedDay;
              const isToday = dayStr === todayStr;
              const isPast = dayStr < todayStr;
              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  className={`h-8 rounded-md text-xs font-mono transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
                      : isToday
                        ? "border border-primary/50 text-primary hover:bg-primary/15"
                        : isPast
                          ? "text-muted-foreground/50 hover:bg-muted/50"
                          : "text-foreground hover:bg-muted"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Time grid */
        <div className="space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setTimeMode("hour")}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                timeMode === "hour" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >時（{selectedHour}）</button>
            <button
              onClick={() => setTimeMode("minute")}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                timeMode === "minute" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >分（{selectedMinute}）</button>
          </div>

          {timeMode === "hour" ? (
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 24 }, (_, i) => {
                const h = String(i).padStart(2, "0");
                const isSelected = h === selectedHour;
                return (
                  <button
                    key={h}
                    onClick={() => { onTimeChange(`${h}:${selectedMinute}`); setTimeMode("minute"); }}
                    className={`h-8 rounded-md text-xs font-mono transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >{h}</button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {["00", "10", "20", "30", "40", "50"].map((m) => {
                const isSelected = m === selectedMinute;
                return (
                  <button
                    key={m}
                    onClick={() => onTimeChange(`${selectedHour}:${m}`)}
                    className={`h-10 rounded-md text-sm font-mono transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >{m}</button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
