import React from 'react';
import { Flame, ThermometerSun, Snowflake, ArrowRight } from 'lucide-react';
import './LeadTemperature.css';

const LeadTemperature = () => {
  return (
    <div className="lead-temp-funnel">
      <h3 className="section-title">Lead Temperature Funnel</h3>
      
      <div className="funnel-block block-hot">
        <div className="block-bg-glow"></div>
        <div className="block-content">
          <div className="block-header">
            <div className="block-title">
              <Flame size={20} className="icon-hot" />
              <span>Hot Leads</span>
            </div>
            <span className="lead-count count-hot">14</span>
          </div>
          <div className="block-details">
            <div className="detail-item">
              <span className="detail-label">Close Probability</span>
              <span className="detail-value">85% +</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Immediate Actions</span>
              <span className="detail-value">5 pending</span>
            </div>
          </div>
          <button className="filter-btn">Filter Table <ArrowRight size={14}/></button>
        </div>
      </div>
      
      <div className="funnel-block block-warm">
        <div className="block-content">
          <div className="block-header">
            <div className="block-title">
              <ThermometerSun size={20} className="icon-warm" />
              <span>Warm Leads</span>
            </div>
            <span className="lead-count count-warm">32</span>
          </div>
          <div className="block-details list-style">
            <div className="detail-row">• 12 Proposal stage</div>
            <div className="detail-row">• 20 Measurement stage</div>
          </div>
          <button className="filter-btn">Filter Table <ArrowRight size={14}/></button>
        </div>
      </div>
      
      <div className="funnel-block block-cold">
        <div className="block-content">
          <div className="block-header">
            <div className="block-title">
              <Snowflake size={20} className="icon-cold" />
              <span>Cold Leads</span>
            </div>
            <span className="lead-count count-cold">86</span>
          </div>
          <div className="block-details list-style">
            <div className="detail-row">• 45 New calling leads</div>
            <div className="detail-row">• 41 Initial contacts</div>
          </div>
          <button className="filter-btn">Filter Table <ArrowRight size={14}/></button>
        </div>
      </div>
    </div>
  );
};

export default LeadTemperature;
