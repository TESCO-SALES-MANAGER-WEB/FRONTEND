import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  User, 
  ChevronRight, 
  Ruler, 
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import './SiteMeasurements.css';

const SiteMeasurements = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  const upcomingMeasurements = [
    {
      id: 'SM-1042',
      clientName: 'Sarah Jenkins',
      address: '124 Maple Street, Springfield',
      date: 'Oct 25, 2026',
      time: '10:00 AM - 11:30 AM',
      designer: 'Alex River',
      status: 'Scheduled',
      type: 'Kitchen Remodel'
    },
    {
      id: 'SM-1045',
      clientName: 'David Thompson',
      address: '89 Oak Avenue, Apt 4B',
      date: 'Oct 26, 2026',
      time: '02:00 PM - 04:00 PM',
      designer: 'Jamie Lou',
      status: 'Pending Confirmation',
      type: 'Full Home Interior'
    },
    {
      id: 'SM-1047',
      clientName: 'Elena Rodriguez',
      address: '556 Pine Lane, Unit 12',
      date: 'Oct 27, 2026',
      time: '09:00 AM - 10:30 AM',
      designer: 'Alex River',
      status: 'Scheduled',
      type: 'Living & Dining'
    }
  ];

  const completedMeasurements = [
    {
      id: 'SM-1038',
      clientName: 'Michael Chen',
      address: '778 Cedar Road',
      date: 'Oct 20, 2026',
      completedBy: 'Alex River',
      status: 'Completed',
      type: 'Bathroom Renovation',
      documents: 4
    }
  ];

  const renderMeasurementCard = (job, isCompleted) => (
    <div key={job.id} className="measurement-card">
      <div className="measurement-header">
        <div className="measurement-id-type">
          <span className="job-id">{job.id}</span>
          <span className="job-type">{job.type}</span>
        </div>
        <div className={`status-badge ${job.status.toLowerCase().replace(' ', '-')}`}>
          {job.status === 'Completed' && <CheckCircle2 size={14} />}
          {job.status === 'Scheduled' && <Clock size={14} />}
          {job.status === 'Pending Confirmation' && <AlertCircle size={14} />}
          {job.status}
        </div>
      </div>
      
      <div className="measurement-body">
        <h3 className="client-name">{job.clientName}</h3>
        <div className="measurement-detail">
          <MapPin size={16} />
          <span>{job.address}</span>
        </div>
        <div className="measurement-detail">
          <Calendar size={16} />
          <span>{job.date} {job.time && `• ${job.time}`}</span>
        </div>
        <div className="measurement-detail">
          <User size={16} />
          <span>{isCompleted ? `Completed by ${job.completedBy}` : `Assigned to ${job.designer}`}</span>
        </div>
      </div>
      
      <div className="measurement-footer">
        {isCompleted ? (
          <div className="doc-count">
            <Ruler size={16} />
            <span>{job.documents} Floor Plans / Sketches</span>
          </div>
        ) : (
          <div className="action-buttons">
            <button className="btn-secondary">Reschedule</button>
            <button className="btn-primary">Start Measurement</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="site-measurements">
      <div className="page-header">
        <div>
          <h2>Site Measurements</h2>
          <p>Track and manage upcoming site visits for dimensioning</p>
        </div>
        <button className="btn-primary">
          <Plus size={18} />
          New Measurement Task
        </button>
      </div>

      <div className="measurements-controls">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming (3)
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
        </div>

        <div className="actions-group">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search clients, ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-icon">
            <Filter size={18} />
            <span>Filter</span>
          </button>
        </div>
      </div>

      <div className="measurements-grid">
        {activeTab === 'upcoming' && 
          upcomingMeasurements.map(job => renderMeasurementCard(job, false))
        }
        {activeTab === 'completed' && 
          completedMeasurements.map(job => renderMeasurementCard(job, true))
        }
      </div>
    </div>
  );
};

export default SiteMeasurements;
