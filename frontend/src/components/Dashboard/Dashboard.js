import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { taskAPI, calendarAPI, personnelAPI, quickLinksAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    urgentTasks: [],
    upcomingEvents: [],
    personnelStatuses: [],
    pinnedLinks: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [urgentTasksRes, eventsRes, personnelRes, linksRes] = await Promise.all([
        taskAPI.getUrgentTasks(),
        calendarAPI.getEvents(),
        personnelAPI.getAllStatuses(),
        quickLinksAPI.getPinnedQuickLinks(),
      ]);

      setStats({
        urgentTasks: urgentTasksRes.data.data || [],
        upcomingEvents: (eventsRes.data.data || []).slice(0, 5),
        personnelStatuses: personnelRes.data.data || [],
        pinnedLinks: linksRes.data.data || [],
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status) => {
    const icons = {
      available: '✅',
      on_site: '🏗️',
      busy: '⚠️',
      off_duty: '🌙',
      on_leave: '🏖️',
    };
    return icons[status] || '❓';
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.full_name}!</h1>
        <p className="dashboard-subtitle">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Urgent Tasks Section */}
        <div className="dashboard-card urgent-tasks-card">
          <div className="card-header">
            <h2>🚨 Urgent Tasks</h2>
            <Link to="/tasks" className="view-all-link">
              View All
            </Link>
          </div>
          <div className="card-content">
            {stats.urgentTasks.length === 0 ? (
              <p className="empty-state">No urgent tasks at the moment! 🎉</p>
            ) : (
              <ul className="task-list">
                {stats.urgentTasks.map((task) => (
                  <li key={task.id} className="task-item">
                    <div className="task-info">
                      <h4>{task.title}</h4>
                      <p className="task-meta">
                        {task.assigned_to_name && `Assigned to: ${task.assigned_to_name}`}
                        {task.deadline && ` • Due: ${formatDate(task.deadline)}`}
                      </p>
                    </div>
                    <span className="badge badge-urgent">Urgent</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>📅 Upcoming Events</h2>
            <Link to="/calendar" className="view-all-link">
              View Calendar
            </Link>
          </div>
          <div className="card-content">
            {stats.upcomingEvents.length === 0 ? (
              <p className="empty-state">No upcoming events</p>
            ) : (
              <ul className="event-list">
                {stats.upcomingEvents.map((event) => (
                  <li key={event.id} className="event-item">
                    <div className="event-icon">
                      {event.event_type === 'meeting' && '👥'}
                      {event.event_type === 'deadline' && '⏰'}
                      {event.event_type === 'shipping' && '📦'}
                    </div>
                    <div className="event-info">
                      <h4>{event.title}</h4>
                      <p className="event-meta">{formatDate(event.start_datetime)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Personnel Status */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>👥 Personnel Status</h2>
            <Link to="/personnel" className="view-all-link">
              View All
            </Link>
          </div>
          <div className="card-content">
            {stats.personnelStatuses.length === 0 ? (
              <p className="empty-state">No personnel status available</p>
            ) : (
              <ul className="personnel-list">
                {stats.personnelStatuses.slice(0, 6).map((person) => (
                  <li key={person.id} className="personnel-item">
                    <div className="personnel-avatar">
                      {person.full_name.charAt(0)}
                    </div>
                    <div className="personnel-info">
                      <h4>{person.full_name}</h4>
                      <p className="personnel-status">
                        {getStatusIcon(person.status)} {person.status.replace('_', ' ')}
                      </p>
                    </div>
                    <span className="personnel-department">{person.department}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="dashboard-card quick-links-card">
          <div className="card-header">
            <h2>🔗 Quick Links</h2>
            <Link to="/quick-links" className="view-all-link">
              Manage
            </Link>
          </div>
          <div className="card-content">
            {stats.pinnedLinks.length === 0 ? (
              <p className="empty-state">No pinned links</p>
            ) : (
              <div className="quick-links-grid">
                {stats.pinnedLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quick-link-item"
                  >
                    <div className="link-icon">{link.icon || '🔗'}</div>
                    <div className="link-title">{link.title}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <div className="stat-value">{stats.urgentTasks.length}</div>
            <div className="stat-label">Urgent Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.upcomingEvents.length}</div>
            <div className="stat-label">Events Today</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-value">
              {stats.personnelStatuses.filter((p) => p.status === 'available').length}
            </div>
            <div className="stat-label">Available</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏗️</div>
          <div className="stat-info">
            <div className="stat-value">
              {stats.personnelStatuses.filter((p) => p.status === 'on_site').length}
            </div>
            <div className="stat-label">On Site</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
