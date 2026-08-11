import React, { useState } from 'react';
import { MessageSquare, Send, User, Clock, AlertCircle, Plus, CheckCircle, Search } from 'lucide-react';
import './TeamCollaboration.css';

const TeamCollaboration = () => {
  const [messages, setMessages] = useState([
    { id: 1, user: 'Sarah Smith', role: 'Sales Coordinator', text: 'Hi team, Arjun Mehta has requested site measurement on Thursday at 2 PM. Can our site designer confirm?', time: '10:15 AM' },
    { id: 2, user: 'Mike Johnson', role: 'Site Designer', text: 'Yes, I am available. I have scheduled it on my calendar.', time: '10:30 AM' },
    { id: 3, user: 'Alex Wong', role: 'Account Manager', text: 'Awesome. I will prepare the design presentation deck in advance.', time: '10:45 AM' }
  ]);

  const [inputVal, setInputVal] = useState('');

  const [collabTasks, setCollabTasks] = useState([
    { id: 'T-101', title: 'Prepare quotation for The Horizon Penthouse', assignee: 'Alex Wong', priority: 'High', status: 'In Progress' },
    { id: 'T-102', title: 'Upload site pictures for DLF Villa', assignee: 'Mike Johnson', priority: 'Medium', status: 'Completed' },
    { id: 'T-103', title: 'Verify initial bank transfer receipt', assignee: 'Sarah Smith', priority: 'Low', status: 'Pending' }
  ]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const newMsg = {
      id: messages.length + 1,
      user: 'You',
      role: 'Coordinator',
      text: inputVal,
      time: 'Just Now'
    };
    setMessages([...messages, newMsg]);
    setInputVal('');
  };

  return (
    <div className="team-collaboration-page">
      <div className="page-header">
        <div>
          <h2>Team Collaboration</h2>
          <p>Coordinate project updates, assignments, and quick discussions across the office</p>
        </div>
      </div>

      <div className="collab-split">
        {/* Discussion / Chat channel */}
        <div className="collab-chat-card">
          <div className="panel-header">
            <h3>#project-coordination</h3>
          </div>
          
          <div className="chat-messages-container">
            {messages.map(msg => (
              <div key={msg.id} className="chat-message-bubble">
                <div className="chat-avatar">
                  <User size={16} />
                </div>
                <div className="chat-message-content">
                  <div className="chat-message-header">
                    <span className="user-name">{msg.user}</span>
                    <span className="user-role">({msg.role})</span>
                    <span className="msg-time">{msg.time}</span>
                  </div>
                  <p className="msg-text">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-bar">
            <input 
              type="text" 
              placeholder="Type message and press Enter..." 
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
            <button type="submit" className="btn-primary-small send-btn"><Send size={14} /></button>
          </form>
        </div>

        {/* Action Board */}
        <div className="collab-tasks-card">
          <div className="panel-header">
            <h3>Active Project Tasks</h3>
          </div>
          <div className="collab-tasks-list">
            {collabTasks.map(task => (
              <div key={task.id} className="collab-task-item">
                <div className="task-left-section">
                  <div className="task-title-group">
                    <h4>{task.title}</h4>
                    <span className={`priority-tag priority-${task.priority.toLowerCase()}`}>
                      {task.priority} Priority
                    </span>
                  </div>
                  <span className="task-assignee">Assignee: {task.assignee}</span>
                </div>
                <span className={`task-status-badge status-${task.status.toLowerCase().replace(' ', '')}`}>
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCollaboration;
