import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    } catch {}
  };

  const deleteOne = async (id) => {
    try {
      await notificationsService.delete(id);
      load();
    } catch {}
  };

  const markAll = async () => {
    try {
      await notificationsService.markAllRead();
      load();
    } catch {}
  };

  const deleteAll = async () => {
    try {
      await notificationsService.deleteAll();
      load();
    } catch {}
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h2>Notifications</h2>
        <div className="notifications-actions">
          <button onClick={() => navigate(-1)} className="btn-link">Back</button>
          <button onClick={markAll} className="btn-link">Mark all read</button>
          <button onClick={deleteAll} className="btn-danger">Delete all</button>
        </div>
      </div>

      {loading && <div className="note-muted">Loading...</div>}
      {error && <div className="note-error">{error}</div>}

      {!loading && !error && notifications.length === 0 && (
        <div className="note-muted">No notifications</div>
      )}

      <div className="notifications-list">
        {notifications.map((n) => (
          <div key={n.id} className={`notification-card ${n.is_read ? "read" : "unread"}`}>
            <div className="notification-title">{n.title}</div>
            <div className="notification-message">{n.message}</div>
            <div className="notification-meta">
              <span className="note-type">{n.type}</span>
              <div className="notification-buttons">
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} className="btn-link">Mark read</button>
                )}
                <button onClick={() => deleteOne(n.id)} className="btn-danger">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
