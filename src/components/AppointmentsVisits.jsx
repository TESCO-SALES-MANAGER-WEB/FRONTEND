import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  User, 
  Filter, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  Phone, 
  Play, 
  X, 
  Upload, 
  MapPin as MapIcon, 
  FileText,
  ImageIcon
} from 'lucide-react';
import './AppointmentsVisits.css';
import DateRangePicker from './DateRangePicker';
import { appointmentsApi, leadsApi } from '../api/client';
import { notify } from '../utils/notify';

// ── Map between the shared backend appointment shape and this view's richer shape ──
const apptFromApi = (a) => ({
  id: a._id || a.id,
  title: a.title || 'Appointment',
  client: a.client || '',
  leadId: a.leadId || '',
  manager: a.manager || '',
  phone: a.phone || '',
  type: a.visitType || (a.type === 'Visits' ? 'Site Visit' : 'Meeting'),
  date: a.date || '',
  time: a.time || [a.timeStart, a.timeEnd].filter(Boolean).join(' - '),
  location: a.location || '',
  status: a.uistatus || (a.status === 'Completed' || a.status === 'Started' ? 'confirmed' : 'pending'),
  progressStatus: a.progressStatus || (a.status === 'Completed' ? 'completed' : a.status === 'Started' ? 'started' : 'not_started'),
  googleLocation: a.googleLocation || '',
  startTime: a.startTime || '',
  startedAt: a.startedAt || '',
  startedBy: a.startedBy || '',
  measurementNote: a.measurementNote || '',
  measurementImage: a.measurementImage || null,
  siteImage: a.siteImage || null,
  meetingRemarks: a.meetingRemarks || '',
  designRequest: a.designRequest || 'None',
  rescheduledAt: a.rescheduledAt || '',
  rescheduledBy: a.rescheduledBy || '',
  rescheduleStatus: a.rescheduleStatus || '',
  rescheduleHistory: Array.isArray(a.rescheduleHistory) ? a.rescheduleHistory : [],
  createdBy: a.createdBy || '',
  completedAt: a.completedAt || '',
  completedBy: a.completedBy || '',
  cancelled: a.status === 'Cancelled' || !!a.cancelledAt,
});
const apptToApi = (m) => ({
  title: m.title || '',
  client: m.client || '',
  leadId: m.leadId || '',
  manager: m.manager || '',
  phone: m.phone || '',
  visitType: m.type || 'Meeting',
  type: m.type === 'Site Visit' ? 'Visits' : 'Appointment',
  date: m.date || '',
  time: m.time || '',
  timeStart: (m.time || '').split(' - ')[0] || '',
  timeEnd: (m.time || '').split(' - ')[1] || '',
  location: m.location || '',
  uistatus: m.status || 'pending',
  status: m.progressStatus === 'completed' ? 'Completed' : m.progressStatus === 'started' ? 'Started' : 'Waiting',
  progressStatus: m.progressStatus || 'not_started',
  googleLocation: m.googleLocation || '',
  startTime: m.startTime || '',
  startedAt: m.startedAt || '',
  startedBy: m.startedBy || '',
  measurementNote: m.measurementNote || '',
  meetingRemarks: m.meetingRemarks || '',
  designRequest: m.designRequest || 'None',
  rescheduledAt: m.rescheduledAt || '',
  rescheduledBy: m.rescheduledBy || '',
  rescheduleStatus: m.rescheduleStatus || '',
  rescheduleHistory: Array.isArray(m.rescheduleHistory) ? m.rescheduleHistory : [],
  createdBy: m.createdBy || '',
  completedAt: m.completedAt || '',
  completedBy: m.completedBy || '',
});

const AppointmentsVisits = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [allAppts, setAllAppts] = useState([]); // every appointment/visit — used to gate the Create Visit dropdown

  // Only show appointments/visits assigned to the logged-in manager
  const mgrName = (localStorage.getItem('mgr_name') || '').trim();
  const mgrKey = mgrName.toLowerCase();

  // Load this manager's appointments from the shared backend (and keep the full set for gating).
  // Poll so a coordinator-assigned appointment (or a cancellation) shows up here in real time
  // without needing a page reload. Cancelled records are dropped from the active lists.
  React.useEffect(() => {
    const load = () => appointmentsApi.list()
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map(apptFromApi).filter((a) => !a.cancelled);
          setAllAppts(mapped);
          setAppointmentsList(mapped.filter((a) => (a.manager || '').trim().toLowerCase() === mgrKey));
        }
      })
      .catch((e) => console.error('Failed to load appointments:', e));
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, []);

  // ── Lifecycle gating for the Create Visit dropdown ──
  //   A visit may be planned only when the lead's APPOINTMENT is completed, and a lead
  //   can have only ONE visit → hide leads that already have a visit.
  const isApptDone = (a) => a.progressStatus === 'completed' || /complet/i.test(String(a.status || '')) || !!a.completedAt;
  const digitsOnly = (v) => String(v || '').replace(/\D/g, '');
  const normName = (v) => String(v || '').trim().toLowerCase();
  // Link an appointment to a lead by id, phone, OR customer name. Coordinator-created
  // appointments often don't carry a leadId, but they do carry the customer's phone/name —
  // so matching only on leadId wrongly hid completed leads from the visit dropdown.
  const apptMatchesLead = (a, lead) => {
    if (!lead) return false;
    // A LINKED record (has leadId) matches ONLY its exact lead — so a different lead that merely
    // shares a name/phone is never wrongly hidden from the appointment dropdown.
    if (a.leadId) return a.leadId === lead.id;
    // An UNLINKED record falls back to phone (last 10 digits) then name.
    const ap = digitsOnly(a.phone), lp = digitsOnly(lead.phone);
    if (ap && lp && ap.slice(-10) === lp.slice(-10)) return true;
    if (a.client && lead.name && normName(a.client) === normName(lead.name)) return true;
    return false;
  };
  // Read from the LIVE appointmentsList (updated the moment an appointment is completed or a
  // visit is created) so eligibility reflects the current state without needing a page reload.
  const leadHasCompletedAppointment = (lead) => appointmentsList.some((a) => a.type !== 'Site Visit' && isApptDone(a) && apptMatchesLead(a, lead));
  const leadHasVisit = (lead) => appointmentsList.some((a) => a.type === 'Site Visit' && apptMatchesLead(a, lead));
  // A lead may have only ONE appointment — hide leads that already have one when creating an appointment.
  const leadHasAppointment = (lead) => appointmentsList.some((a) => a.type !== 'Site Visit' && apptMatchesLead(a, lead));

  // Modal active IDs
  const [activeStartAptId, setActiveStartAptId] = useState(null);
  const [activeEndAptId, setActiveEndAptId] = useState(null);
  const [activeRescheduleAptId, setActiveRescheduleAptId] = useState(null);
  const [isCreateVisitOpen, setIsCreateVisitOpen] = useState(false);

  // Form Inputs
  const [googleLocation, setGoogleLocation] = useState('');
  const [isAddressEditable, setIsAddressEditable] = useState(false);
  const [isAddressChangeModalOpen, setIsAddressChangeModalOpen] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  const [startTime, setStartTime] = useState(''); // Stores 24h string e.g. "14:00"
  const [measurementNote, setMeasurementNote] = useState('');
  const [meetingRemarks, setMeetingRemarks] = useState('');
  const [measurementImage, setMeasurementImage] = useState(null);
  const [siteImage, setSiteImage] = useState(null);
  const [designRequest, setDesignRequest] = useState('None');

  // Reschedule Form Inputs
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState(''); // REQUIRED reason for each reschedule

  // Create Visit Plan Inputs
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newTimeStart, setNewTimeStart] = useState('');
  const [newTimeEnd, setNewTimeEnd] = useState('');
  const [newLeadId, setNewLeadId] = useState('');
  const [newType, setNewType] = useState('Appointment'); // 'Appointment' | 'Site Visit'
  const [myLeads, setMyLeads] = useState([]);

  // Customers (leads) assigned to this manager — for the Create Visit dropdown
  React.useEffect(() => {
    leadsApi.list()
      .then((data) => { if (Array.isArray(data)) setMyLeads(data.filter((l) => (l.manager || '').trim().toLowerCase() === mgrKey)); })
      .catch((e) => console.error('Failed to load leads:', e));
  }, []);

  // The lead id an appointment/visit belongs to. Prefer the stored leadId; otherwise recover it
  // by phone (last 10 digits) or customer name so the manager can see which lead each card is for
  // (and "—" flags an unlinked record that can't progress to Quotation).
  const leadIdFor = (apt) => {
    if (apt.leadId) return apt.leadId;
    const ph = digitsOnly(apt.phone);
    const byPhone = ph ? myLeads.find((l) => digitsOnly(l.phone) && digitsOnly(l.phone).slice(-10) === ph.slice(-10)) : null;
    if (byPhone) return byPhone.id;
    const nm = String(apt.client || apt.title || '').trim().toLowerCase();
    const byName = nm ? myLeads.find((l) => String(l.name || '').trim().toLowerCase() === nm) : null;
    return byName ? byName.id : '—';
  };

  // Append an entry to a lead's shared history (visible to both manager and coordinator)
  const appendLeadHistory = (leadId, message) => {
    if (!leadId) return;
    const lead = myLeads.find((l) => l.id === leadId);
    const entry = { timestamp: new Date().toLocaleString(), message, remark: '' };
    const history = Array.isArray(lead?.history) ? [...lead.history, entry] : [entry];
    leadsApi.update(leadId, { history }).catch((e) => console.error('Failed to update lead history:', e));
  };

  // Calendar Filter State (defaults to the current month, no date filter applied)
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [filterStartDate, setFilterStartDate] = useState(null); // format: YYYY-MM-DD
  const [filterEndDate, setFilterEndDate] = useState(null); // format: YYYY-MM-DD

  // Metrics computed live from real appointments
  const totalApptsCount = appointmentsList.filter(apt => apt.type !== 'Site Visit').length;
  const totalVisitsPlannedCount = appointmentsList.filter(apt => apt.type === 'Site Visit').length;
  const completedApptsCount = appointmentsList.filter(apt => apt.type !== 'Site Visit' && apt.progressStatus === 'completed').length;
  const completedVisitsCount = appointmentsList.filter(apt => apt.type === 'Site Visit' && apt.progressStatus === 'completed').length;

  const metricsCards = [
    {
      title: "Total Appointments",
      value: String(totalApptsCount),
      sub: "Scheduled this month",
      color: "#eff6ff",
      textColor: "#1d4ed8",
      icon: <CalendarIcon size={18} />
    },
    {
      title: "Total Visit Planned",
      value: String(totalVisitsPlannedCount),
      sub: "Planned site visits",
      color: "#f5f3ff",
      textColor: "#6d28d9",
      icon: <MapPin size={18} />
    },
    {
      title: "Completed Appointments",
      value: String(completedApptsCount),
      sub: "+5 Completed Today",
      color: "#f0fdf4",
      textColor: "#15803d",
      icon: <CheckCircle size={18} />
    },
    {
      title: "Total Visit Completed",
      value: String(completedVisitsCount),
      sub: "Done this week",
      color: "#fff7ed",
      textColor: "#ea580c",
      icon: <CheckCircle size={18} />
    }
  ];

  // Data-driven Quick Summary shown under the calendar (no backend change)
  const pendingCount = appointmentsList.filter(a => a.progressStatus === 'not_started').length;
  const completedAllCount = appointmentsList.filter(a => a.progressStatus === 'completed').length;
  const summaryItems = [
    { label: 'Site Visits', detail: `${totalVisitsPlannedCount} scheduled` },
    { label: 'Appointments', detail: `${totalApptsCount} scheduled` },
    { label: 'Pending', detail: `${pendingCount} awaiting confirmation` },
    { label: 'Completed', detail: `${completedAllCount} done` },
  ];

  // Helper: Format HTML 24h Time (e.g. "14:30") to beautiful 12h AM/PM format
  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hoursStr, minutesStr] = time24.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Helper: Get Current Time in 24h HTML format
  const getCurrentTime24 = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Auto-fill Current Time in Start modal
  const handleAutoFillStartTime = () => {
    setStartTime(getCurrentTime24());
  };

  // Image upload handling
  const handleMeasurementUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setMeasurementImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSiteImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSiteImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Helper: Synchronize event updates into the respective Lead's history
  const addLeadHistoryEvent = (clientName, clientPhone, eventMsg, extraData = {}) => {
    const savedLeads = localStorage.getItem('leadsData');
    if (!savedLeads) return;
    try {
      let leads = JSON.parse(savedLeads);
      const leadIndex = leads.findIndex(l => 
        l.name.toLowerCase() === clientName.toLowerCase() ||
        (clientPhone && l.phone.replace(/\s+/g, '') === clientPhone.replace(/\s+/g, ''))
      );

      const now = new Date();
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      const formattedDate = now.toLocaleDateString('en-US', options);
      const timestamp = `${formattedDate} - ${now.toLocaleTimeString()}`;

      const newHistoryItem = {
        date: timestamp,
        event: eventMsg,
        ...extraData
      };

      if (leadIndex !== -1) {
        const updatedLead = { ...leads[leadIndex] };
        const newHistory = updatedLead.history ? [...updatedLead.history] : [];
        newHistory.push(newHistoryItem);
        updatedLead.history = newHistory;
        leads[leadIndex] = updatedLead;
      } else {
        const nextId = leads.length > 0 ? Math.max(...leads.map(l => l.id)) + 1 : 1;
        const nextLeadId = `LD-${1028 + nextId}`;
        leads.push({
          id: nextId,
          leadId: nextLeadId,
          date: formattedDate,
          name: clientName,
          phone: clientPhone || '',
          services: 'Client Visit',
          source: 'REFERRAL',
          status: 'APPT FIXED',
          assignTo: 'Sarah Smith',
          history: [newHistoryItem]
        });
      }
      localStorage.setItem('leadsData', JSON.stringify(leads));
      // Trigger a storage event so other components state-update if open
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Error synchronizing lead history:', err);
    }
  };

  // A valid Mongo _id is a 24-char hex string. Anything else (e.g. a Date.now() temp id)
  // means the appointment was never persisted, so an update would fail silently.
  const isMongoId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

  // Persist an appointment's latest state to the shared DB.
  // If it already has a real _id we PUT; otherwise we POST (create) and adopt the returned _id
  // so its started/completed state survives a page reload.
  const persistAppt = (apt) => {
    if (!apt) return Promise.resolve();
    if (isMongoId(apt.id)) {
      return appointmentsApi.update(apt.id, apptToApi(apt))
        .catch((err) => console.error('Failed to save appointment:', err));
    }
    return appointmentsApi.create(apptToApi(apt))
      .then((saved) => {
        const newId = saved && (saved._id || saved.id);
        if (newId) setAppointmentsList(prev => prev.map(a => (a.id === apt.id ? { ...a, id: newId } : a)));
      })
      .catch((err) => console.error('Failed to save appointment:', err));
  };

  // Submit functions
  const handleStartSubmit = (e) => {
    e.preventDefault();
    const currentApt = appointmentsList.find(apt => apt.id === activeStartAptId);
    const timeToSave = startTime || getCurrentTime24();
    // Build the updated record synchronously (NOT inside the setState updater, which React
    // runs later) so persistAppt receives it and the change is saved to the shared DB.
    const updatedApt = currentApt
      ? { ...currentApt, progressStatus: 'started', googleLocation, startTime: `${formatTime12h(timeToSave)}`, startedAt: new Date().toISOString(), startedBy: mgrName }
      : null;
    if (updatedApt) {
      setAppointmentsList(prev => prev.map(apt => (apt.id === activeStartAptId ? updatedApt : apt)));
      // Persist the started state to the backend
      persistAppt(updatedApt);
    }

    if (currentApt) {
      const newLoc = googleLocation || currentApt.location || 'Not specified';
      const eventMsg = `Started ${currentApt.type || 'Appointment'}: "${currentApt.title}". Location set to: "${newLoc}". Start Time: ${formatTime12h(timeToSave)}`;
      addLeadHistoryEvent(currentApt.client, currentApt.phone, eventMsg);
      appendLeadHistory(currentApt.leadId, eventMsg);
    }

    setActiveStartAptId(null);
  };

  const handleEndSubmit = (e) => {
    e.preventDefault();
    const currentApt = appointmentsList.find(apt => apt.id === activeEndAptId);
    // A Site Image is only required for actual site visits, not plain appointments,
    // so that ending an appointment counts under "Completed Appointments".
    if (currentApt?.type === 'Site Visit' && !siteImage) {
      notify('Please upload a Site Image before ending the visit.', 'warning');
      return;
    }

    // Build the completed record synchronously so persistAppt saves it to the shared DB
    // (assigning inside the setState updater left it null, so nothing persisted → the
    // appointment reverted to "not started" on refresh).
    const updatedApt = currentApt
      ? { ...currentApt, progressStatus: 'completed', measurementNote, meetingRemarks, measurementImage, siteImage, designRequest, completedAt: new Date().toISOString(), completedBy: mgrName }
      : null;
    if (updatedApt) {
      setAppointmentsList(prev => prev.map(apt => (apt.id === activeEndAptId ? updatedApt : apt)));
      persistAppt(updatedApt);
    }

    if (currentApt) {
      let eventMsg = `Completed ${currentApt.type || 'Visit'}: Note of ${measurementNote} Sq.ft added.`;
      if (designRequest && designRequest !== 'None') {
        eventMsg += ` Design request: ${designRequest}.`;
      }
      addLeadHistoryEvent(currentApt.client, currentApt.phone, eventMsg, {
        measurementNote,
        meetingRemarks,
        measurementImage,
        siteImage,
        designRequest
      });
      appendLeadHistory(currentApt.leadId, eventMsg);
    }

    setActiveEndAptId(null);
  };

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    const currentApt = appointmentsList.find(apt => apt.id === activeRescheduleAptId);
    // A reason is REQUIRED for every reschedule.
    if (!rescheduleReason.trim()) {
      notify('Please enter a reason for the reschedule.', 'warning');
      return;
    }

    // Rescheduling only changes the date/time — keep the original type (Appointment vs Site
    // Visit) and title so completed-count attribution stays correct. It stays the SAME record
    // (never a new appointment). Append a full entry to rescheduleHistory so every reschedule
    // is auditable, and preserve the existing rescheduledAt/By/Status fields.
    const newTime = `${formatTime12h(rescheduleStartTime)} - ${formatTime12h(rescheduleEndTime)}`;
    const historyEntry = {
      oldDate: currentApt ? currentApt.date : '',
      oldTime: currentApt ? currentApt.time : '',
      newDate: rescheduleDate,
      newTime,
      reason: rescheduleReason.trim(),
      by: mgrName,
      at: new Date().toISOString(),
    };
    const updatedApt = currentApt
      ? {
          ...currentApt,
          date: rescheduleDate,
          time: newTime,
          rescheduledAt: new Date().toISOString(),
          rescheduledBy: mgrName,
          rescheduleStatus: 'Pending',
          rescheduleHistory: [...(Array.isArray(currentApt.rescheduleHistory) ? currentApt.rescheduleHistory : []), historyEntry],
        }
      : null;
    if (updatedApt) {
      setAppointmentsList(prev => prev.map(apt => (apt.id === activeRescheduleAptId ? updatedApt : apt)));
      persistAppt(updatedApt);
    }

    if (currentApt) {
      const eventMsg = `Rescheduled ${currentApt.type || 'Appointment'}: New Date: ${rescheduleDate}, New Time: ${newTime}. Reason: ${rescheduleReason.trim()}`;
      addLeadHistoryEvent(currentApt.client, currentApt.phone, eventMsg);
      appendLeadHistory(currentApt.leadId, eventMsg);
    }

    notify('Reschedule sent to the Coordinator for approval.', 'success');
    setRescheduleReason('');
    setActiveRescheduleAptId(null);
  };

  const handleCreateVisitSubmit = (e) => {
    e.preventDefault();
    const isVisit = newType === 'Site Visit';
    const selectedLead = myLeads.find((l) => l.id === newLeadId);
    // ── Enforce the strict lifecycle before creating ──
    if (isVisit) {
      if (!leadHasCompletedAppointment(selectedLead)) {
        notify('This lead has no completed appointment yet — complete the appointment first.', 'warning');
        return;
      }
      if (leadHasVisit(selectedLead)) {
        notify('This lead already has a visit. Only one visit is allowed per lead.', 'warning');
        return;
      }
    } else if (leadHasAppointment(selectedLead)) {
      notify('This lead already has an appointment. Only one appointment is allowed per lead.', 'warning');
      return;
    }
    const dateToSave = newDate || new Date().toISOString().split('T')[0];
    const timeToSave = (newTimeStart && newTimeEnd)
      ? `${formatTime12h(newTimeStart)} - ${formatTime12h(newTimeEnd)}`
      : (newTime || '10:00 AM - 11:30 AM');

    const newRecord = {
      title: isVisit ? `Site Visit - ${newLocation}` : `Appointment - ${newCustomerName || newLocation}`,
      client: newCustomerName,
      leadId: newLeadId, // link to the selected lead
      manager: mgrName, // a record the manager creates belongs to them
      createdBy: mgrName, // so the coordinator sees who created it
      phone: selectedLead?.phone || '',
      type: isVisit ? 'Site Visit' : 'Meeting', // 'Meeting' -> appointment; 'Site Visit' -> visit
      date: dateToSave,
      time: timeToSave,
      location: newLocation,
      status: 'confirmed',
      progressStatus: 'not_started',
      googleLocation: '',
      startTime: '',
      measurementNote: '',
      measurementImage: null,
      siteImage: null,
      meetingRemarks: ''
    };
    // Persist to the backend, then add it to the list
    appointmentsApi.create(apptToApi(newRecord))
      .then((saved) => setAppointmentsList(prev => [...prev, apptFromApi(saved)]))
      .catch((err) => {
        console.error('Failed to create record:', err);
        setAppointmentsList(prev => [...prev, { ...newRecord, id: Date.now() }]);
      });

    // Log to the lead's shared history
    appendLeadHistory(newLeadId, isVisit
      ? `Visit planned by ${mgrName}: "${newLocation}" on ${dateToSave} at ${timeToSave}`
      : `Appointment created by ${mgrName} for ${newCustomerName || 'lead'} on ${dateToSave} at ${timeToSave}`);

    setIsCreateVisitOpen(false);
    setNewLeadId('');
    setNewCustomerName('');
    setNewLocation('');
    setNewTimeStart('');
    setNewTimeEnd('');
  };

  // Format YYYY-MM-DD string to relative labels "Today", "Tomorrow" or readable date format
  const getDisplayDate = (dateStr) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('default', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // ── Tab routing ──
  //   Visit section  = appointments ASSIGNED BY THE COORDINATOR (createdBy is not this manager)
  //                    plus all Site Visits — i.e. everything the manager goes out to execute.
  //   Appointment section = appointments the manager created for THEMSELVES.
  const isSelfCreated = (apt) => (apt.createdBy || '').trim().toLowerCase() === mgrKey;
  const inVisitSection = (apt) => apt.type === 'Site Visit' || !isSelfCreated(apt);
  const inAppointmentSection = (apt) => apt.type !== 'Site Visit' && isSelfCreated(apt);

  // Filter listings by active tab & date range selection
  const filteredList = appointmentsList.filter(apt => {
    // 'upcoming' = Appointment tab (manager's own), 'past'/other = Visits tab (coordinator-assigned + visits)
    const matchesTab = activeTab === 'upcoming' ? inAppointmentSection(apt) : inVisitSection(apt);
    if (!matchesTab) return false;

    // 2. Filter by Date range
    if (filterStartDate) {
      if (filterEndDate) {
        return apt.date >= filterStartDate && apt.date <= filterEndDate;
      } else {
        return apt.date === filterStartDate;
      }
    }

    return true;
  });

  const activeStartItem = appointmentsList.find(apt => apt.id === activeStartAptId);
  const activeEndItem = appointmentsList.find(apt => apt.id === activeEndAptId);
  const activeRescheduleItem = appointmentsList.find(apt => apt.id === activeRescheduleAptId);

  // Leads this manager may plan a visit for (appointment completed, no visit yet).
  const eligibleVisitLeads = myLeads.filter((l) => leadHasCompletedAppointment(l) && !leadHasVisit(l));
  // Leads this manager may create an APPOINTMENT for (no appointment yet).
  const eligibleApptLeads = myLeads.filter((l) => !leadHasAppointment(l));
  // The list shown in the Create modal depends on the selected type.
  const eligibleCreateLeads = newType === 'Site Visit' ? eligibleVisitLeads : eligibleApptLeads;

  // Calendar Day Click Handler
  const handleCalendarDayClick = (dayNum) => {
    const clickedDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), dayNum);
    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const clickedStr = formatLocalDate(clickedDate);

    if (!filterStartDate || (filterStartDate && filterEndDate)) {
      setFilterStartDate(clickedStr);
      setFilterEndDate(null);
    } else {
      const start = new Date(filterStartDate);
      if (clickedDate < start) {
        setFilterStartDate(clickedStr);
      } else {
        setFilterEndDate(clickedStr);
      }
    }
  };

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
  };

  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const daysInMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay();

    // Empty spaces before first day
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<span key={`empty-${i}`} className="empty-day"></span>);
    }

    // Days in Month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), i);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dayStr = `${year}-${month}-${day}`;

      const isCurrentToday = dayStr === todayStr;
      
      const inRange = filterStartDate && filterEndDate && dayStr >= filterStartDate && dayStr <= filterEndDate;
      const isStart = filterStartDate === dayStr;
      const isEnd = filterEndDate === dayStr;

      // Check if there is any scheduled event on this day
      const hasEvent = appointmentsList.some(apt => apt.date === dayStr);

      let dayClasses = "";
      if (isCurrentToday) dayClasses += " active-day";
      if (inRange) dayClasses += " in-range";
      if (isStart) dayClasses += " range-start";
      if (isEnd) dayClasses += " range-end";
      if (hasEvent && !isCurrentToday && !isStart && !isEnd) dayClasses += " has-event";

      days.push(
        <span 
          key={i} 
          className={dayClasses} 
          onClick={() => handleCalendarDayClick(i)}
        >
          {i}
        </span>
      );
    }

    return days;
  };

  return (
    <div className="appointments-visits-page">
      {/* HEADER SECTION */}
      <div className="page-header">
        <div className="header-title">
          <h1>Appointments & Visits</h1>
          <p>Manage your schedule and upcoming client meetings</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => {
            setIsCreateVisitOpen(true);
            setNewCustomerName('');
            setNewLocation('');
            setNewDate(new Date().toISOString().split('T')[0]);
            setNewTime('10:00 AM - 11:30 AM');
          }}>
            <Plus size={16} />
            Create Visit Plan
          </button>
        </div>
      </div>

      {/* METRICS SECTION */}
      <div className="metrics-row-mockup" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {metricsCards.map((c, i) => (
          <div key={i} style={{
            backgroundColor: c.color,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${c.textColor}22`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '130px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{c.title}</span>
              <div style={{ color: c.textColor }}>{c.icon}</div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>{c.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="main-split">
        {/* AGENDA LIST */}
        <div className="agenda-section">
          <div className="agenda-header">
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                Appointment
              </button>
              <button 
                className={`tab ${activeTab === 'past' ? 'active' : ''}`}
                onClick={() => setActiveTab('past')}
              >
                Visits
              </button>
            </div>
            <div className="agenda-tools">
              {filterStartDate && (
                <button 
                  onClick={() => { setFilterStartDate(null); setFilterEndDate(null); }}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#ef4444',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginRight: '8px'
                  }}
                >
                  Clear Date Range
                </button>
              )}
              <DateRangePicker 
                fromDate={filterStartDate ? (() => {
                  const [y, m, d] = filterStartDate.split('-');
                  return `${d}/${m}/${y}`;
                })() : ''} 
                toDate={filterEndDate ? (() => {
                  const [y, m, d] = filterEndDate.split('-');
                  return `${d}/${m}/${y}`;
                })() : ''}
                onApply={(from, to) => {
                  const toISO = (dateStr) => {
                    const [d, m, y] = dateStr.split('/');
                    return `${y}-${m}-${d}`;
                  };
                  setFilterStartDate(toISO(from));
                  setFilterEndDate(toISO(to));
                }}
              />
            </div>
          </div>

          <div className="appointments-list">
            {filteredList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                No active records found for the selected date range.
              </div>
            ) : (
              filteredList.map(apt => (
                <div className="appointment-card-large" key={apt.id}>
                  <div className="apt-time-column">
                    <span className="apt-date">{getDisplayDate(apt.date)}</span>
                    <span className="apt-time" style={{ fontSize: '13px', color: '#1e1b4b', display: 'block', marginTop: '4px' }}>{apt.time}</span>
                  </div>
                  <div className="apt-details-column">
                    <div className="apt-title-row">
                      <h4>{apt.title}</h4>
                      <span className="status-badge" style={{ backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                        {leadIdFor(apt)}
                      </span>
                      {apt.progressStatus === 'completed' ? (
                        <span className="status-badge" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                          COMPLETED
                        </span>
                      ) : apt.progressStatus === 'started' ? (
                        <span className="status-badge" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                          IN PROGRESS
                        </span>
                      ) : (
                        <span className={`status-badge ${apt.status}`}>
                          {apt.status === 'confirmed' || apt.status === 'Assigned' ? 'ASSIGNED' : 'WAITING'}
                        </span>
                      )}
                      {apt.rescheduledAt && (
                        <span className="status-badge" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                          RESCHEDULED → {apt.date}{apt.time ? ` (${apt.time})` : ''}
                        </span>
                      )}
                    </div>
                    <div className="apt-meta-row">
                      <span className="meta-item"><User size={14} /> {apt.client}</span>
                      {apt.phone && <span className="meta-item"><Phone size={14} /> {apt.phone}</span>}
                      <span className="meta-item"><MapPin size={14} /> {apt.location}</span>
                    </div>

                    {/* Reschedule history (compact) */}
                    {Array.isArray(apt.rescheduleHistory) && apt.rescheduleHistory.length > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '6px 8px' }}>
                        <strong>Rescheduled {apt.rescheduleHistory.length}×:</strong>{' '}
                        {apt.rescheduleHistory.slice(-2).map((h, hi) => (
                          <span key={hi}>{hi > 0 ? ' · ' : ''}{h.newDate} ({h.newTime}) — {h.reason}</span>
                        ))}
                      </div>
                    )}

                    {/* Render started/completed info inline if active */}
                    {apt.progressStatus === 'started' && (
                      <div className="apt-status-info">
                        <div>📍 <strong>Changed Location:</strong> {apt.googleLocation || 'Not specified'}</div>
                        <div>⏱️ <strong>Start Time:</strong> {apt.startTime}</div>
                      </div>
                    )}

                    {apt.progressStatus === 'completed' && (
                      <div className="apt-status-info" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                        <div>📐 <strong>Measurement Note:</strong> {apt.measurementNote} Sq.ft</div>
                        {apt.meetingRemarks && <div>💬 <strong>Remarks:</strong> {apt.meetingRemarks}</div>}
                        {apt.designRequest && apt.designRequest !== 'None' && (
                          <div>🎨 <strong>Design Request:</strong> {apt.designRequest}</div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          {apt.measurementImage && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <img src={apt.measurementImage} alt="Measurement" style={{ width: '50px', height: '50px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                              <span style={{ fontSize: '9px', color: '#64748b' }}>Measurement</span>
                            </div>
                          )}
                          {apt.siteImage && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <img src={apt.siteImage} alt="Site" style={{ width: '50px', height: '50px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                              <span style={{ fontSize: '9px', color: '#64748b' }}>Site Image</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="apt-actions-column">
                    {apt.progressStatus === 'not_started' && (
                      <>
                        <button 
                          className="btn-outline-small"
                          onClick={() => {
                            setActiveRescheduleAptId(apt.id);
                            setRescheduleDate(apt.date);
                            setRescheduleStartTime('14:00');
                            setRescheduleEndTime('15:30');
                            setRescheduleReason('');
                          }}
                        >
                          Reschedule
                        </button>
                        <button 
                          className="btn-primary-small"
                          onClick={() => {
                            setActiveStartAptId(apt.id);
                            setGoogleLocation(apt.location || '');
                            setStartTime(getCurrentTime24());
                            setIsAddressEditable(false);
                          }}
                        >
                          {inVisitSection(apt) ? 'Start Visit' : 'Start Appointment'}
                        </button>
                      </>
                    )}

                    {apt.progressStatus === 'started' && (
                      <>
                        <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#4f46e5', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
                          IN PROGRESS
                        </span>
                        <button 
                          className="btn-primary-small"
                          style={{ backgroundColor: '#dc2626' }}
                          onClick={() => {
                            setActiveEndAptId(apt.id);
                            setMeasurementNote('');
                            setMeetingRemarks('');
                            setMeasurementImage(null);
                            setSiteImage(null);
                            setDesignRequest('None');
                          }}
                        >
                          {inVisitSection(apt) ? 'End Visit' : 'End Appointment'}
                        </button>
                      </>
                    )}

                    {apt.progressStatus === 'completed' && (
                      <span style={{ color: '#166534', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        ✓ COMPLETED
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CALENDAR + QUICK SUMMARY SIDEBAR */}
        <div className="calendar-widget-section">
          <div className="calendar-header">
            <h3>Calendar View</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="month-display" style={{ whiteSpace: 'nowrap' }}>
                {currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="actual-calendar">
            <div className="calendar-weekdays">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="calendar-days">
              {renderCalendarDays()}
            </div>
          </div>

          <div className="upcoming-summary">
            <h4>Quick Summary</h4>
            <ul>
              {summaryItems.map((item) => (
                <li key={item.label}><strong>{item.label}:</strong> {item.detail}</li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      {/* CREATE VISIT PLAN MODAL */}
      {isCreateVisitOpen && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleCreateVisitSubmit}>
            <div className="modal-header">
              <h3>{newType === 'Site Visit' ? 'Create Visit Plan' : 'Create Appointment Plan'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsCreateVisitOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label>Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['Appointment', 'Site Visit'].map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => { setNewType(t); setNewLeadId(''); setNewCustomerName(''); }}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                      border: `1px solid ${newType === t ? '#4f46e5' : '#cbd5e1'}`,
                      background: newType === t ? '#4f46e5' : '#fff',
                      color: newType === t ? '#fff' : '#334155',
                    }}
                  >
                    {t === 'Site Visit' ? 'Site Visit' : 'Appointment'}
                  </button>
                ))}
              </div>
              <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
                {newType === 'Site Visit'
                  ? 'A visit can be planned only after the lead’s appointment is completed.'
                  : 'Create a self-assigned appointment for one of your leads.'}
              </span>
            </div>

            <div className="form-group">
              <label>Customer Name</label>
              <select
                className="form-input"
                value={newLeadId}
                onChange={(e) => {
                  const lead = myLeads.find((l) => l.id === e.target.value);
                  setNewLeadId(e.target.value);
                  setNewCustomerName(lead ? (lead.name || '') : '');
                }}
                required
              >
                <option value="">Select customer</option>
                {eligibleCreateLeads.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}{l.id ? ` (${l.id})` : ''}</option>
                ))}
                {eligibleCreateLeads.length === 0 && <option value="" disabled>{newType === 'Site Visit' ? 'No leads with a completed appointment yet' : 'All your leads already have an appointment'}</option>}
              </select>
            </div>

            <div className="form-group">
              <label>Location</label>
              <input 
                type="text" 
                placeholder="Enter site location or project address" 
                className="form-input"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="form-input"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Time / Duration</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="time" className="form-input" style={{ flex: 1 }} value={newTimeStart} onChange={(e) => setNewTimeStart(e.target.value)} required />
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>to</span>
                <input type="time" className="form-input" style={{ flex: 1 }} value={newTimeEnd} onChange={(e) => setNewTimeEnd(e.target.value)} required />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-modal-cancel" onClick={() => setIsCreateVisitOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-modal-submit"
                disabled={!newLeadId || !newLocation || !newDate || !newTimeStart || !newTimeEnd}
                style={{ opacity: (!newLeadId || !newLocation || !newDate || !newTimeStart || !newTimeEnd) ? 0.5 : 1, cursor: (!newLeadId || !newLocation || !newDate || !newTimeStart || !newTimeEnd) ? 'not-allowed' : 'pointer' }}
              >
                {newType === 'Site Visit' ? 'Create Visit Plan' : 'Create Appointment Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* START APPOINTMENT / VISIT FORM MODAL */}
      {activeStartAptId !== null && activeStartItem && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleStartSubmit}>
            <div className="modal-header">
              <h3>{inVisitSection(activeStartItem) ? 'Start Visit' : 'Start Appointment'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveStartAptId(null)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0 }}>Google Location URL / Address</label>
                <button 
                  type="button" 
                  onClick={() => {
                    setTempAddress(googleLocation);
                    setIsAddressChangeModalOpen(true);
                  }}
                  style={{ fontSize: '12px', color: '#4f46e5', fontWeight: '600', cursor: 'pointer', padding: 0, border: 'none', background: 'none' }}
                >
                  Change address
                </button>
              </div>
              <input 
                type="text" 
                placeholder="Paste Google Maps link or enter location" 
                className="form-input"
                value={googleLocation}
                onChange={(e) => setGoogleLocation(e.target.value)}
                disabled
              />
              {activeStartItem && googleLocation !== activeStartItem.location && (
                <div style={{ marginTop: '6px', fontSize: '13px', color: '#4f46e5', fontWeight: '600' }}>
                  Changed Location: {googleLocation}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Start Time</label>
              <div className="time-input-container">
                <input 
                  type="time" 
                  className="form-input"
                  style={{ flex: 1 }}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="btn-time-autofill"
                  onClick={handleAutoFillStartTime}
                >
                  Current Time
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-modal-cancel" onClick={() => setActiveStartAptId(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-modal-submit" disabled={!startTime} style={{ opacity: !startTime ? 0.5 : 1, cursor: !startTime ? 'not-allowed' : 'pointer' }}>
                {inVisitSection(activeStartItem) ? 'Start Visit' : 'Start Appointment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADDRESS CHANGE MODAL */}
      {isAddressChangeModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Change Google Location URL / Address</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsAddressChangeModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Google Location URL / Address</label>
                <input 
                  type="text" 
                  placeholder="Enter location or paste Google Maps URL" 
                  className="form-input"
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
              <button 
                type="button" 
                className="btn-modal-cancel" 
                onClick={() => setIsAddressChangeModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'none' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-modal-submit" 
                onClick={() => {
                  setGoogleLocation(tempAddress);
                  setIsAddressChangeModalOpen(false);
                }}
                style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#312e81', color: 'white', border: 'none' }}
              >
                Update Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* END APPOINTMENT / VISIT FORM MODAL */}
      {activeEndAptId !== null && activeEndItem && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleEndSubmit}>
            <div className="modal-header">
              <h3>{activeEndItem.type === 'Site Visit' ? 'End Visit Details' : 'End Appointment Details'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveEndAptId(null)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="form-group">
              <label>Measurement Note</label>
              <textarea 
                placeholder="Enter measurement value in square feet" 
                className="form-input"
                rows={3}
                value={measurementNote}
                onChange={(e) => setMeasurementNote(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                required={activeEndItem.type === 'Site Visit'}
              />
            </div>

            <div className="uploader-cards-container">
              {/* Measurement Image */}
              <div className="form-group">
                <label>Measurement Image (Optional)</label>
                <label className="uploader-card">
                  <Upload size={24} style={{ color: '#4f46e5' }} />
                  <span>{measurementImage ? 'Image Loaded' : 'Upload Measurement (Optional)'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleMeasurementUpload}
                  />
                  {measurementImage && (
                    <img src={measurementImage} alt="Measurement Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', marginTop: '4px' }} />
                  )}
                </label>
              </div>

              {/* Site Image */}
              <div className="form-group">
                <label>Site Image {activeEndItem.type === 'Site Visit' && <span style={{ color: '#dc2626' }}>*</span>}</label>
                <label className="uploader-card" style={{ borderColor: (activeEndItem.type === 'Site Visit' && !siteImage) ? '#fca5a5' : '#cbd5e1' }}>
                  <Upload size={24} style={{ color: '#4f46e5' }} />
                  <span>{siteImage ? 'Image Loaded' : (activeEndItem.type === 'Site Visit' ? 'Upload Site Image (Required)' : 'Upload Site Image (Optional)')}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleSiteImageUpload}
                  />
                  {siteImage && (
                    <img src={siteImage} alt="Site Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', marginTop: '4px' }} />
                  )}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Design Request</label>
              <select 
                className="form-input"
                value={designRequest}
                onChange={(e) => setDesignRequest(e.target.value)}
                style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 12px' }}
              >
                <option value="None">None</option>
                <option value="2D">2D</option>
                <option value="3D">3D</option>
                <option value="Both">Both</option>
              </select>
            </div>

            <div className="form-group">
              <label>Remarks</label>
              <textarea 
                placeholder="Enter feedback and remarks..." 
                className="form-input"
                style={{ minHeight: '80px', resize: 'vertical' }}
                value={meetingRemarks}
                onChange={(e) => setMeetingRemarks(e.target.value)}
                required={activeEndItem.type === 'Site Visit'}
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-modal-cancel" onClick={() => setActiveEndAptId(null)}>
                Cancel
              </button>
              {(() => {
                // Site visits still require the measurement note, remarks and site image.
                // Plain appointments can be ended directly so they count as "Completed".
                const endBlocked = activeEndItem.type === 'Site Visit' && (!measurementNote || !meetingRemarks || !siteImage);
                return (
                  <button type="submit" className="btn-modal-submit" disabled={endBlocked} style={{ backgroundColor: '#dc2626', opacity: endBlocked ? 0.5 : 1, cursor: endBlocked ? 'not-allowed' : 'pointer' }}>
                    {activeEndItem.type === 'Site Visit' ? 'End Visit' : 'End Appointment'}
                  </button>
                );
              })()}
            </div>
          </form>
        </div>
      )}

      {/* RESCHEDULE FORM MODAL */}
      {activeRescheduleAptId !== null && activeRescheduleItem && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleRescheduleSubmit}>
            <div className="modal-header">
              <h3>Reschedule {activeRescheduleItem.type === 'Site Visit' ? 'Visit' : 'Appointment'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveRescheduleAptId(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label>New Date</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="form-input"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Time Duration</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="time" 
                  className="form-input"
                  style={{ flex: 1 }}
                  value={rescheduleStartTime}
                  onChange={(e) => setRescheduleStartTime(e.target.value)}
                  required
                />
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>to</span>
                <input
                  type="time"
                  className="form-input"
                  style={{ flex: 1 }}
                  value={rescheduleEndTime}
                  onChange={(e) => setRescheduleEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Reason <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea
                placeholder="Why is this being rescheduled?"
                className="form-input"
                style={{ minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }}
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                required
              />
            </div>

            {/* Reschedule history (compact) */}
            {Array.isArray(activeRescheduleItem.rescheduleHistory) && activeRescheduleItem.rescheduleHistory.length > 0 && (
              <div className="form-group" style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>Reschedule History</div>
                {activeRescheduleItem.rescheduleHistory.slice(-4).map((h, hi) => (
                  <div key={hi} style={{ fontSize: '11px', color: '#78350f', marginBottom: '4px' }}>
                    {h.oldDate} ({h.oldTime}) → {h.newDate} ({h.newTime}) — {h.reason}
                    <span style={{ color: '#a16207' }}> · {h.by}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-modal-cancel" onClick={() => setActiveRescheduleAptId(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-modal-submit" disabled={!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime || !rescheduleReason.trim()} style={{ opacity: (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime || !rescheduleReason.trim()) ? 0.5 : 1, cursor: (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime || !rescheduleReason.trim()) ? 'not-allowed' : 'pointer' }}>
                Confirm Reschedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AppointmentsVisits;
