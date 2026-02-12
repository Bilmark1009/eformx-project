import React from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationItem from './NotificationItem';
import '../styles/Notifications.css';

const NotificationDropdown = ({
    notifications,
    onMarkRead,
    onDelete,
    onMarkAllRead,
    onDeleteAll,
    onClose,
    isSuperAdmin = false
}) => {
    const navigate = useNavigate();

    return (
        <div
            className="notifications-dropdown is-mobile-fixed"
            role="menu"
            aria-label="Notifications menu"
        >
            <div className="notifications-dropdown-header">
                <span className="notifications-title">Notifications</span>
                <div className="notifications-actions">
                    <button
                        onClick={() => {
                            onClose();
                            navigate('/notifications');
                        }}
                        className="notifications-action notifications-action-primary"
                    >
                        View all
                    </button>
                    <button
                        onClick={onMarkAllRead}
                        className="notifications-action notifications-action-primary"
                    >
                        Mark all read
                    </button>
                    <button
                        onClick={onDeleteAll}
                        className="notifications-action notifications-action-danger"
                    >
                        Delete all
                    </button>
                </div>
            </div>
            <div className="notifications-list">
                {notifications.length === 0 ? (
                    <div className="notifications-empty">No notifications</div>
                ) : (
                    notifications.map((n) => (
                        <NotificationItem
                            key={n.id}
                            notification={n}
                            onMarkRead={onMarkRead}
                            onDelete={onDelete}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationDropdown;
