import React, { useState } from 'react';
import { MapPin, Clock, User, CheckCircle2 } from 'lucide-react';
import './SiteVisitCard.css';

const SiteVisitCard = ({ title, time, participant, status }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="site-visit-card">
        <div className="visit-header">
          <div className="visit-time">
            <Clock size={14} />
            <span>{time}</span>
          </div>
          <span className={`visit-status ${status === 'completed' ? 'completed' : 'upcoming'}`}>
            {status === 'completed' ? <><CheckCircle2 size={12}/> Done</> : 'Upcoming'}
          </span>
        </div>
        
        <div className="visit-body">
          <h4 className="visit-title">{title}</h4>
          <div className="visit-detail-row">
            <User size={14} />
            <span>{participant}</span>
          </div>
          <div className="visit-detail-row">
            <MapPin size={14} />
            <span className="truncate">Mumbai, Maharashtra</span>
          </div>
        </div>

        <div className="mini-map-placeholder">
          {/* Mock map background */}
          <div className="map-pin-center"><MapPin size={16} fill="var(--primary-color)" color="white"/></div>
        </div>

        <button className="log-measurement-btn" onClick={() => setShowModal(true)}>
          Log Measurements
        </button>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content measurement-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Site Measurement Form</h3>
              <button className="close-modal" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Client Name</label>
                <input type="text" defaultValue={participant} readOnly />
              </div>
              <div className="form-group">
                <label>Room Dimensions (L x W in ft)</label>
                <div className="multi-input">
                  <input type="number" placeholder="Length" />
                  <span>x</span>
                  <input type="number" placeholder="Width" />
                </div>
              </div>
              <div className="form-group">
                <label>Ceiling Height (ft)</label>
                <input type="number" placeholder="e.g. 10" />
              </div>
              <div className="form-group">
                <label>Notes & Requirements</label>
                <textarea rows="3" placeholder="Enter client preferences..."></textarea>
              </div>
              <div className="upload-section">
                <button className="upload-btn">📷 Upload Photos</button>
                <button className="upload-btn">🎤 Voice Note</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Save Draft</button>
              <button className="btn-primary" onClick={() => setShowModal(false)}>Submit Measurements</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SiteVisitCard;
