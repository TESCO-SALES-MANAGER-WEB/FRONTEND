import React from 'react';
import './PipelineSnapshot.css';

const PipelineSnapshot = () => {
  const stages = [
    { name: 'Lead', value: 120, color: '#e2e8f0' },
    { name: 'Qualified', value: 85, color: '#94a3b8' },
    { name: 'Proposal', value: 42, color: 'var(--primary-color)' },
    { name: 'Won', value: 18, color: 'var(--success-green)' }
  ];

  return (
    <div className="pipeline-snapshot-card">
      <h3 className="pipeline-title">Pipeline Snapshot</h3>
      <div className="funnel-container">
        {stages.map((stage, index) => (
          <div key={stage.name} className="funnel-stage">
            <div className="stage-info">
              <span className="stage-name">{stage.name}</span>
              <span className="stage-value">{stage.value}</span>
            </div>
            <div className="stage-bar-wrapper">
              <div 
                className="stage-bar" 
                style={{ 
                  width: `${(stage.value / stages[0].value) * 100}%`,
                  backgroundColor: stage.color
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineSnapshot;
