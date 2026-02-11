import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheckDouble, FaTrash, FaBell, FaExclamationTriangle } from "react-icons/fa";
import notificationsService from "../services/notificationsService";
import "../styles/NotificationsPage.css";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const items = await notificationsService.list();
      setNotifications(items || []);
      setError("");
    } catch (e) {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    try {
      await notificationsService.markRead(id);
      load();
    } catch { }
  };

  const deleteOne = async (id) => {
    try {
      await notificationsService.delete(id);
      load();
    } catch { }
  };

  const markAll = async () => {
    try {
      await notificationsService.markAllRead();
      load();
    } catch { }
  };

  const deleteAll = async () => {
    if (window.confirm("Are you sure you want to delete all notifications?")) {
      try {
        await notificationsService.deleteAll();
        load();
      } catch { }
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-page-header">
        <div className="header-title-group">
          <h2>Notifications</h2>
          <p className="note-subtitle">Stay updated with your form activities</p>
        </div>
        <div className="notifications-page-actions">
          <button onClick={() => navigate(-1)} className="btn-link">
            <FaArrowLeft /> Back
          </button>
          <button onClick={markAll} className="btn-link">
            <FaCheckDouble /> Mark all read
          </button>
          <button onClick={deleteAll} className="btn-danger">
            <FaTrash /> Delete all
          </button>
        </div>
      </div>

      {loading && (
        <div className="note-muted">
          <div className="spinner-teal"></div>
          <p>Loading notifications...</p>
        </div>
      )}

      {error && (
        <div className="note-error">
          <FaExclamationTriangle size={32} style={{ marginBottom: "1rem" }} />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className="note-muted">
          <FaBell size={48} style={{ opacity: 0.3, marginBottom: '1.5rem' }} />
          <p>No notifications yet.</p>
        </div>
      )}

      <div className="notifications-page-list">
        {notifications.map((n) => (
          <div key={n.id} className={`notifications-page-card ${n.is_read ? "read" : "unread"}`}>
            <div className="notifications-page-item-content">
              <div className="notifications-page-item-header">
                <div className="notifications-page-item-title">{n.title}</div>
                <div className="notifications-page-item-buttons">
                  {!n.is_read && (
                    <button onClick={() => markRead(n.id)} className="btn-icon-link" title="Mark as read">
                      <FaCheckDouble />
                    </button>
                  )}
                  <button onClick={() => deleteOne(n.id)} className="btn-icon-danger" title="Delete notification">
                    <FaTrash />
                  </button>
                </div>
              </div>
              <div className="notifications-page-item-message">{n.message}</div>
              <div className="notifications-page-item-meta">
                <span className="note-type">{n.type || "System"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
