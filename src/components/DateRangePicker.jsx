import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import './DateRangePicker.css';

const DateRangePicker = ({ fromDate, toDate, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Helper to parse "DD/MM/YYYY" or "YYYY-MM-DD" to Date
  const parseDateString = (str) => {
    if (!str) return new Date();
    if (str.includes('/')) {
      const [d, m, y] = str.split('/');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    const [y, m, d] = str.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  };

  // Helper to format Date to "DD/MM/YYYY"
  const formatDateToString = (date) => {
    if (!date) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const [startDate, setStartDate] = useState(parseDateString(fromDate));
  const [endDate, setEndDate] = useState(parseDateString(toDate));
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); // Default to the current month
  const [activePreset, setActivePreset] = useState('Last 30 Days');
  const [hoverDate, setHoverDate] = useState(null);

  // Sync prop changes
  useEffect(() => {
    if (fromDate) setStartDate(parseDateString(fromDate));
    if (toDate) setEndDate(parseDateString(toDate));
  }, [fromDate, toDate]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (preset) => {
    setActivePreset(preset);
    const today = new Date(); today.setHours(0, 0, 0, 0); // Real current date
    let start = new Date(today);
    let end = new Date(today);

    switch (preset) {
      case 'Today':
        break;
      case 'Yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'Last 7 Days':
        start.setDate(today.getDate() - 6);
        break;
      case 'Last 30 Days':
        start.setDate(today.getDate() - 29);
        break;
      case 'This Month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'Custom':
        return; // Don't auto-apply custom, let user select
      default:
        break;
    }

    setStartDate(start);
    setEndDate(end);
    setCurrentMonth(new Date(start.getFullYear(), start.getMonth(), 1));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setActivePreset('Custom');

    if (!startDate || (startDate && endDate)) {
      setStartDate(clickedDate);
      setEndDate(null);
    } else {
      if (clickedDate < startDate) {
        setStartDate(clickedDate);
        setEndDate(null);
      } else {
        setEndDate(clickedDate);
      }
    }
  };

  const handleApply = () => {
    if (onApply) {
      onApply(formatDateToString(startDate), formatDateToString(endDate || startDate));
    }
    setIsOpen(false);
  };

  // Generate calendar grid days
  const getDays = () => {
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayIndex = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const days = [];

    // Empty cells before month start
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
      
      let classNames = 'calendar-day';
      const isStart = startDate && curDate.getTime() === startDate.getTime();
      const isEnd = endDate && curDate.getTime() === endDate.getTime();
      
      let isInRange = false;
      if (startDate && endDate) {
        isInRange = curDate > startDate && curDate < endDate;
      } else if (startDate && hoverDate) {
        isInRange = curDate > startDate && curDate <= hoverDate;
      }

      if (isStart) classNames += ' range-start';
      if (isEnd) classNames += ' range-end';
      if (isInRange) classNames += ' in-range';

      // Highlight the real "today" when no date in that cell is selected
      const _now = new Date();
      const isToday = curDate.getDate() === _now.getDate() && curDate.getMonth() === _now.getMonth() && curDate.getFullYear() === _now.getFullYear();
      if (isToday && !isStart && !isEnd && !isInRange) {
        classNames += ' today-marker';
      }

      days.push(
        <div
          key={d}
          className={classNames}
          onClick={() => handleDayClick(d)}
          onMouseEnter={() => startDate && !endDate && setHoverDate(curDate)}
        >
          <span>{d}</span>
        </div>
      );
    }

    return days;
  };

  const presets = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Custom'];

  return (
    <div className="date-range-picker-container" ref={containerRef}>
      {/* Trigger Button bar matching page overview layout */}
      <div className="picker-trigger-bar" onClick={() => setIsOpen(!isOpen)}>
        <span className="trigger-label">From</span>
        <span className="trigger-value">{formatDateToString(startDate)}</span>
        <span className="trigger-label">To</span>
        <span className="trigger-value">{formatDateToString(endDate || startDate)}</span>
        <Calendar size={15} className="trigger-calendar-icon" />
      </div>

      {isOpen && (
        <div className="picker-dropdown-overlay">
          <div className="picker-presets-sidebar">
            {presets.map((preset) => (
              <button
                key={preset}
                className={`preset-item ${activePreset === preset ? 'active' : ''}`}
                onClick={() => handlePresetClick(preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="picker-calendar-view">
            <div className="picker-calendar-header">
              <button onClick={handlePrevMonth} className="month-nav-btn">
                <ChevronLeft size={16} />
              </button>
              <span className="month-year-label">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={handleNextMonth} className="month-nav-btn">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="picker-days-grid">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="day-header">{day}</div>
              ))}
              {getDays()}
            </div>

            <div className="picker-footer-actions">
              <button className="picker-cancel-btn" onClick={() => setIsOpen(false)}>
                Cancel
              </button>
              <button className="picker-apply-btn" onClick={handleApply}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
