import React, { useState } from 'react';
import { FaTrash } from 'react-icons/fa';

const NotificationItem = ({ notification, onMarkRead, onDelete }) => {

    return (
        <div
            className={`notifications-item ${notification.is_read ? 'is-read' : 'is-unread'}`}
        >
            <div className="notifications-item-header">
                <div className="notifications-item-title">{notification.title}</div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(notification.id);
                    }}
                    className="notifications-icon-btn notifications-action-danger"
                    aria-label="Delete notification"
                    title="Delete notification"
                >
                    <FaTrash />
                </button>
            </div>
            <div className="notifications-item-message">{notification.message}</div>
            {!notification.is_read && (
                <div className="notifications-item-footer">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead(notification.id);
                        }}
                        className="notifications-action notifications-action-primary"
                    >
                        Mark read
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationItem;
