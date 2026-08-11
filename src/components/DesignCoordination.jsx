import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Clock,
  MessageSquare,
  Paperclip
} from 'lucide-react';
import './DesignCoordination.css';

const DesignCoordination = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const boardData = {
    backlog: [
      { id: 'DSN-201', client: 'Sarah Jenkins', type: 'Kitchen Remodel', dueDate: 'Oct 28', comments: 2, files: 1, priority: 'medium' },
      { id: 'DSN-202', client: 'Tom Hardy', type: 'Master Bath', dueDate: 'Nov 02', comments: 0, files: 0, priority: 'low' }
    ],
    inProgress: [
      { id: 'DSN-198', client: 'Elena Rodriguez', type: 'Living & Dining 3D', dueDate: 'Oct 26', comments: 5, files: 3, priority: 'high' }
    ],
    review: [
      { id: 'DSN-195', client: 'David Thompson', type: 'Full Home Concept', dueDate: 'Oct 25', comments: 8, files: 12, priority: 'high' }
    ],
    approved: [
      { id: 'DSN-190', client: 'Michael Chen', type: 'Bathroom Renovation', dueDate: 'Oct 22', comments: 1, files: 4, priority: 'medium' }
    ]
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'var(--alert-red)';
      case 'medium': return 'var(--warning-yellow)';
      case 'low': return 'var(--success-green)';
      default: return 'var(--text-secondary)';
    }
  };

  const renderCard = (task) => (
    <div key={task.id} className="kanban-card" draggable>
      <div className="card-header">
        <div className="priority-indicator" style={{ backgroundColor: getPriorityColor(task.priority) }}></div>
        <span className="task-id">{task.id}</span>
        <button className="btn-icon-small"><MoreHorizontal size={14} /></button>
      </div>
      <h4 className="client-name">{task.client}</h4>
      <p className="task-type">{task.type}</p>
      
      <div className="card-footer">
        <div className="due-date">
          <Clock size={12} />
          <span>{task.dueDate}</span>
        </div>
        <div className="card-metrics">
          {task.comments > 0 && (
            <div className="metric">
              <MessageSquare size={12} />
              <span>{task.comments}</span>
            </div>
          )}
          {task.files > 0 && (
            <div className="metric">
              <Paperclip size={12} />
              <span>{task.files}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="design-coordination">
      <div className="page-header">
        <div>
          <h2>Design Coordination</h2>
          <p>Manage design tasks, 3D renderings, and client approvals</p>
        </div>
        <div className="actions-group">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-icon">
            <Filter size={18} />
            <span>Filter</span>
          </button>
          <button className="btn-primary">
            <Plus size={18} />
            New Task
          </button>
        </div>
      </div>

      <div className="kanban-board">
        <div className="kanban-column">
          <div className="column-header">
            <h3>Backlog</h3>
            <span className="task-count">{boardData.backlog.length}</span>
          </div>
          <div className="column-content">
            {boardData.backlog.map(renderCard)}
            <button className="add-card-btn">+ Add Task</button>
          </div>
        </div>

        <div className="kanban-column">
          <div className="column-header">
            <h3>In Progress</h3>
            <span className="task-count">{boardData.inProgress.length}</span>
          </div>
          <div className="column-content">
            {boardData.inProgress.map(renderCard)}
          </div>
        </div>

        <div className="kanban-column">
          <div className="column-header">
            <h3>Pending Review</h3>
            <span className="task-count">{boardData.review.length}</span>
          </div>
          <div className="column-content">
            {boardData.review.map(renderCard)}
          </div>
        </div>

        <div className="kanban-column">
          <div className="column-header">
            <h3>Client Approved</h3>
            <span className="task-count">{boardData.approved.length}</span>
          </div>
          <div className="column-content">
            {boardData.approved.map(renderCard)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignCoordination;
