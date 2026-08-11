import React, { useState } from 'react';
import { Check, Circle } from 'lucide-react';
import './DailyTasks.css';

const DailyTasks = () => {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Call Mehta Residence regarding design inputs', completed: false, time: '10:00 AM' },
    { id: 2, text: 'Send revised quote to Skyline Penthouse', completed: false, time: '11:30 AM' },
    { id: 3, text: 'Review draft for Oasis Villa', completed: true, time: '02:00 PM' },
    { id: 4, text: 'Site measurement follow-up with Contractor', completed: false, time: '04:00 PM' },
  ]);

  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  return (
    <div className="daily-tasks-card">
      <div className="tasks-header">
        <h3 className="tasks-title">Daily Tasks</h3>
        <span className="tasks-count">{tasks.filter(t => !t.completed).length} Remaining</span>
      </div>
      <div className="tasks-list">
        {tasks.map(task => (
          <div 
            key={task.id} 
            className={`task-item ${task.completed ? 'completed' : ''}`}
            onClick={() => toggleTask(task.id)}
          >
            <button className="task-check-btn">
              {task.completed ? <Check size={16} color="#fff" /> : <Circle size={16} color="var(--border-color)" />}
            </button>
            <div className="task-content">
              <span className="task-text">{task.text}</span>
              <span className="task-time">{task.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyTasks;
