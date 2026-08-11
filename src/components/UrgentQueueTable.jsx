import React from 'react';
import { MoreVertical } from 'lucide-react';
import './UrgentQueueTable.css';

const UrgentQueueTable = () => {
  const data = [
    { client: 'Mehta Residence', status: 'Awaiting Design Inputs', statusType: 'blue', time: '48 hrs', timeType: 'red', action: 'Follow ups' },
    { client: 'Skyline Penthouse', status: 'Awaiting Revised Quote', statusType: 'yellow', time: '24 hrs', timeType: 'normal', action: 'Send quote' },
    { client: 'Oasis Villa', status: 'Review Draft Ready', statusType: 'green', time: '4 hrs', timeType: 'normal', action: 'Schedule Review' },
  ];

  return (
    <div className="urgent-queue-card">
      <div className="urgent-queue-header">
        <h3>Urgent Attention Queue</h3>
        <button className="icon-btn"><MoreVertical size={20} /></button>
      </div>
      <div className="table-container">
        <table className="urgent-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Blocker Status</th>
              <th>Time in Stage</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <td className="font-medium">{row.client}</td>
                <td><span className={`status-badge badge-${row.statusType}`}>{row.status}</span></td>
                <td><span className={`time-text text-${row.timeType}`}>{row.time}</span></td>
                <td>
                  <button className="table-action-btn">{row.action}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UrgentQueueTable;
