"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

interface RealtimeCalendarPopoverProps {
  buttonClassName?: string;
}

export const RealtimeCalendarPopover: React.FC<RealtimeCalendarPopoverProps> = ({
  buttonClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Real-time ticking clock (updates every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Click outside and escape key listener to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Days in current, prev and next months
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const jumpToToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Indian Financial Year Quarter Calculation (April - March)
  const getFiscalQuarter = (date: Date) => {
    const m = date.getMonth(); // 0 = Jan, 3 = Apr
    const y = date.getFullYear();
    let q = "Q1";
    let fy = "";
    if (m >= 3 && m <= 5) {
      q = "Q1";
      fy = `FY ${y.toString().slice(-2)}-${(y + 1).toString().slice(-2)}`;
    } else if (m >= 6 && m <= 8) {
      q = "Q2";
      fy = `FY ${y.toString().slice(-2)}-${(y + 1).toString().slice(-2)}`;
    } else if (m >= 9 && m <= 11) {
      q = "Q3";
      fy = `FY ${y.toString().slice(-2)}-${(y + 1).toString().slice(-2)}`;
    } else {
      q = "Q4";
      fy = `FY ${(y - 1).toString().slice(-2)}-${y.toString().slice(-2)}`;
    }
    return `${q} • ${fy}`;
  };

  // Format live time string (e.g. 09:30:15 AM)
  const formattedLiveTime = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedLiveDate = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Relative description for selected date
  const getRelativeDateDesc = (d: Date) => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round(
      (startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 0) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  };

  // Build grid of days
  const calendarCells = [];

  // Trailing days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
    calendarCells.push({
      date: prevDate,
      dayNum: daysInPrevMonth - i,
      isCurrentMonth: false,
    });
  }

  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    const currDate = new Date(year, month, i);
    calendarCells.push({
      date: currDate,
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  // Leading days of next month to fill grid
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const nextDate = new Date(year, month + 1, i);
    calendarCells.push({
      date: nextDate,
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={
          buttonClassName ||
          `relative text-[#3E4947] hover:text-teal-brand transition-all p-2 rounded-full hover:bg-[#E5EEFF] cursor-pointer ${isOpen ? "bg-[#E5EEFF] text-teal-brand ring-2 ring-teal-brand/20" : ""
          }`
        }
        aria-label="Real-time Calendar"
        title="Open Live Calendar"
      >
        <CalendarIcon className="w-5 h-5" />
        {/* Pulsing indicator dot on button */}
        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </button>

      {/* Calendar Dropdown Modal/Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{ backgroundColor: "#ffffff", zIndex: 100 }}
          className="absolute right-0 mt-3 w-85 sm:w-95 bg-white rounded-2xl shadow-2xl border border-[#CBD5E1] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right select-none"
        >
          {/* Header Banner with Real-time Clock */}
          <div
            style={{ background: "linear-gradient(135deg, #0B1C30 0%, #1B2CC1 100%)" }}
            className="text-white p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-300">
                  Live IST
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/90 font-medium">
                  {getFiscalQuarter(now)}
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close calendar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{formattedLiveTime}</span>
                </div>
                <div className="text-xs text-slate-200 mt-0.5 font-medium">
                  {formattedLiveDate}
                </div>
              </div>

              <button
                onClick={jumpToToday}
                className="flex items-center gap-1 text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-lg font-semibold text-white transition-all cursor-pointer shadow-xs active:scale-95"
                title="Jump to Today"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Today</span>
              </button>
            </div>
          </div>

          {/* Calendar Body */}
          <div style={{ backgroundColor: "#ffffff" }} className="p-4 bg-white">
            {/* Month & Year Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="font-semibold text-sm text-[#0B1C30] flex items-center gap-1.5">
                <span>{monthNames[month]}</span>
                <span className="text-slate-400 font-normal">{year}</span>
              </div>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {dayNames.map((d, idx) => (
                <div
                  key={d}
                  className={`text-xs font-semibold py-1 ${idx === 0 || idx === 6 ? "text-rose-500" : "text-slate-400"
                    }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                const isCurrent = cell.isCurrentMonth;
                const isTodayDate = isSameDay(cell.date, now);
                const isSelected = isSameDay(cell.date, selectedDate);
                const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;

                let cellClasses =
                  "h-8 w-8 sm:h-9 sm:w-9 mx-auto rounded-lg text-xs flex items-center justify-center font-medium transition-all cursor-pointer relative ";

                if (isSelected) {
                  cellClasses +=
                    "bg-teal-brand text-white font-bold shadow-md shadow-teal-brand/30 scale-105 z-10";
                } else if (isTodayDate) {
                  cellClasses +=
                    "bg-teal-brand/10 text-teal-brand font-bold ring-2 ring-teal-brand/60 hover:bg-teal-brand/20";
                } else if (isCurrent) {
                  cellClasses += isWeekend
                    ? "text-rose-600 hover:bg-rose-50 font-medium"
                    : "text-slate-700 hover:bg-slate-100";
                } else {
                  cellClasses += "text-slate-300 hover:bg-slate-50";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDate(cell.date);
                      if (!isCurrent) {
                        setViewDate(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                      }
                    }}
                    className={cellClasses}
                    title={cell.date.toLocaleDateString("en-IN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  >
                    {cell.dayNum}
                    {isTodayDate && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-teal-brand"></span>
                    )}
                  </button>
                );
              }

              )}


            </div>

            {/* Quick Filter / Shortcut Pills */}
            {/* <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-1 overflow-x-auto text-[11px]">
              <button
                onClick={() => {
                  const today = new Date();
                  setSelectedDate(today);
                  setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
                }}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-teal-brand hover:text-white text-slate-600 transition-colors font-medium cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setSelectedDate(yesterday);
                  setViewDate(new Date(yesterday.getFullYear(), yesterday.getMonth(), 1));
                }}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-teal-brand hover:text-white text-slate-600 transition-colors font-medium cursor-pointer"
              >
                Yesterday
              </button>
              <button
                onClick={() => {
                  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                  setSelectedDate(now);
                  setViewDate(firstOfThisMonth);
                }}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-teal-brand hover:text-white text-slate-600 transition-colors font-medium cursor-pointer"
              >
                This Month
              </button>
              <button
                onClick={() => {
                  const nextM = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                  setSelectedDate(nextM);
                  setViewDate(nextM);
                }}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-teal-brand hover:text-white text-slate-600 transition-colors font-medium cursor-pointer"
              >
                Next Month
              </button>
            </div> */}
          </div>

          {/* Selected Date Information Bar */}
          <div
            style={{ backgroundColor: "#F8F9FF" }}
            className="bg-[#F8F9FF] px-4 py-2.5 border-t border-[#E2E8F0] flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-1.5 text-slate-700 truncate">
              <Sparkles className="w-3.5 h-3.5 text-teal-brand shrink-0" />
              <span className="font-semibold text-[#0B1C30]">
                {selectedDate.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <span className="font-medium text-teal-brand px-2 py-0.5 bg-[#E5EEFF] rounded-full text-[11px] shrink-0">
              {getRelativeDateDesc(selectedDate)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
