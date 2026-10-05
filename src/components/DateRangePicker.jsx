import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Compact From / To date filter (same UX as the other SalesCRM apps).
//   • Two small fields: "From: <date> 📅" and "To: <date> 📅".
//   • Clicking either field opens a small single-month calendar.
//   • Quick ranges kept as chips at the top of the calendar popover.
// CONTRACT UNCHANGED: props { fromDate, toDate, onApply } where fromDate/toDate are
// "DD/MM/YYYY" strings and onApply(fromStr, toStr) emits "DD/MM/YYYY" — so the parent's
// existing filtering/calculations keep working exactly as before.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PRESETS = ['All Time', 'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month'];
const isAllTime = (s, e) => !!(s && e && s.getFullYear() <= 2000 && e.getFullYear() >= 2100);

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// Parse "DD/MM/YYYY" or "YYYY-MM-DD" to a Date (falls back to today).
const parseStr = (str) => {
  if (!str) return startOfDay(new Date());
  if (String(str).includes('/')) { const [d, m, y] = str.split('/'); return startOfDay(new Date(+y, +m - 1, +d)); }
  const [y, m, d] = String(str).split('-'); return startOfDay(new Date(+y, +m - 1, +d));
};
// Format a Date to "DD/MM/YYYY" (the contract the parent expects).
const fmtStr = (date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
};
// Pretty display for the field.
const fmtDisplay = (date) => date ? `${date.toLocaleString('en-US', { month: 'short' })} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}` : '—';

const DateRangePicker = ({ fromDate, toDate, onApply }) => {
  const [openField, setOpenField] = useState(null); // null | 'from' | 'to'
  const containerRef = useRef(null);

  const [startDate, setStartDate] = useState(parseStr(fromDate));
  const [endDate, setEndDate] = useState(parseStr(toDate));
  const [viewMonth, setViewMonth] = useState(startOfDay(new Date()));

  // Keep internal state in sync when the parent changes the controlled props.
  useEffect(() => { if (fromDate) setStartDate(parseStr(fromDate)); }, [fromDate]);
  useEffect(() => { if (toDate) setEndDate(parseStr(toDate)); }, [toDate]);

  useEffect(() => {
    const onDoc = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpenField(null); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Emit using the SAME string contract as before.
  const emit = (s, e) => { if (typeof onApply === 'function') onApply(fmtStr(s), fmtStr(e)); };

  const openCalendar = (field) => {
    setOpenField((cur) => (cur === field ? null : field));
    setViewMonth(startOfDay((field === 'to' ? endDate : startDate) || new Date()));
  };

  const applyPreset = (preset) => {
    const today = startOfDay(new Date());
    let s = today, e = today;
    if (preset === 'All Time') { s = new Date(2000, 0, 1); e = new Date(2100, 11, 31); }
    else if (preset === 'Today') { s = today; e = today; }
    else if (preset === 'Yesterday') { const y = new Date(today); y.setDate(y.getDate() - 1); s = y; e = y; }
    else if (preset === 'Last 7 Days') { const a = new Date(today); a.setDate(a.getDate() - 6); s = a; e = today; }
    else if (preset === 'Last 30 Days') { const a = new Date(today); a.setDate(a.getDate() - 29); s = a; e = today; }
    else if (preset === 'This Month') { s = new Date(today.getFullYear(), today.getMonth(), 1); e = new Date(today.getFullYear(), today.getMonth() + 1, 0); }
    setStartDate(s); setEndDate(e); emit(s, e); setOpenField(null);
  };

  const handleDayClick = (dayNum) => {
    const clicked = startOfDay(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), dayNum));
    let s = startDate, e = endDate;
    if (openField === 'to') { e = clicked; if (s && clicked < s) s = clicked; }
    else { s = clicked; if (e && clicked > e) e = clicked; }
    setStartDate(s); setEndDate(e); emit(s, e); setOpenField(null);
  };

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const slots = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const field = { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid #E5E9F0', borderRadius: '0.6rem', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', color: '#1F2937', minWidth: 150, justifyContent: 'space-between', fontFamily: 'inherit' };
  const fieldLabel = { fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#94A3B8' };
  const popover = { position: 'absolute', top: 'calc(100% + 6px)', zIndex: 1000, background: '#fff', border: '1px solid #E5E9F0', borderRadius: '0.8rem', boxShadow: '0 12px 32px rgba(15,23,42,0.16)', padding: '0.75rem', width: 260 };

  const dayCellStyle = (dayNum) => {
    const base = { height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', borderRadius: '0.45rem', cursor: 'pointer', color: '#334155', userSelect: 'none' };
    if (!dayNum) return { ...base, visibility: 'hidden', cursor: 'default' };
    const d = startOfDay(new Date(year, month, dayNum));
    const isStart = startDate && d.getTime() === startDate.getTime();
    const isEnd = endDate && d.getTime() === endDate.getTime();
    const inRange = startDate && endDate && d > startDate && d < endDate;
    if (isStart || isEnd) return { ...base, background: '#4f46e5', color: '#fff', fontWeight: 700 };
    if (inRange) return { ...base, background: '#EEF2FF', color: '#4338CA' };
    return base;
  };

  const renderCalendar = () => (
    <div style={popover} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.6rem' }}>
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => applyPreset(p)} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: '999px', border: '1px solid #E5E9F0', background: '#F8FAFC', color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>{p}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <button type="button" onClick={() => setViewMonth(new Date(year, month - 1, 1))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', padding: 4 }}><ChevronLeft size={16} /></button>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{MONTHS[month]} {year}</div>
        <button type="button" onClick={() => setViewMonth(new Date(year, month + 1, 1))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', padding: 4 }}><ChevronRight size={16} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => (<div key={w} style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8' }}>{w}</div>))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {slots.map((dayNum, idx) => (<div key={idx} style={dayCellStyle(dayNum)} onClick={() => dayNum && handleDayClick(dayNum)}>{dayNum || ''}</div>))}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} style={{ display: 'inline-flex', gap: '0.6rem', position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <div style={field} onClick={() => openCalendar('from')}>
          <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={fieldLabel}>From</span>
            <span style={{ fontWeight: 600 }}>{isAllTime(startDate, endDate) ? 'All time' : fmtDisplay(startDate)}</span>
          </span>
          <CalendarIcon size={15} color="#64748B" />
        </div>
        {openField === 'from' && renderCalendar()}
      </div>
      <div style={{ position: 'relative' }}>
        <div style={field} onClick={() => openCalendar('to')}>
          <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={fieldLabel}>To</span>
            <span style={{ fontWeight: 600 }}>{isAllTime(startDate, endDate) ? 'All time' : fmtDisplay(endDate || startDate)}</span>
          </span>
          <CalendarIcon size={15} color="#64748B" />
        </div>
        {openField === 'to' && renderCalendar()}
      </div>
    </div>
  );
};

export default DateRangePicker;
