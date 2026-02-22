import React, { memo } from 'react';
import { FaChartBar, FaTrash, FaShareAlt, FaEdit } from 'react-icons/fa';

const FormCard = memo(({ 
  form, 
  onViewResponses, 
  onAnalytics, 
  onDelete, 
  onShare, 
  onEdit, 
  onToggleStatus 
}) => {
  return (
    <div
      className="form-card"
      onClick={() => onViewResponses(form.id)}
      style={{ cursor: "pointer" }}
    >
      <div className="form-card-header">
        <h2 className={(form.title || "").length > 30 ? "long-title" : ""}>
          {form.title || "Untitled Form"}
        </h2>
        <div className="form-card-status-group">
          <span className={`status-badge ${String(form.status || 'active').toLowerCase()}`}>
            {String(form.status || 'active').toUpperCase()}
          </span>
          <div className="card-actions">
            <FaChartBar
              className="action-icon"
              title="Analytics"
              onClick={(e) => {
                e.stopPropagation();
                onAnalytics(form.id);
              }}
            />
            <FaTrash
              className="action-icon"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(form.id);
              }}
            />
          </div>
        </div>
      </div>
      <p className="form-description">{form.description || "No description provided."}</p>
      <div className="card-footer">
        <button
          className="btn-link"
          onClick={(e) => {
            e.stopPropagation();
            onShare(form.id);
          }}
        >
          <FaShareAlt /> Share
        </button>
        <button
          className="btn-link"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(form.id);
          }}
        >
          <FaEdit /> Edit
        </button>
        <button
          className={`toggle-switch ${String(form.status || 'active').toLowerCase() === 'active' ? 'active' : 'inactive'}`}
          title={String(form.status || 'active').toLowerCase() === 'active' ? 'Click to deactivate' : 'Click to activate'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(form.id);
          }}
          aria-label={String(form.status || 'active').toLowerCase() === 'active' ? 'Deactivate form' : 'Activate form'}
        >
          <span className="knob" />
        </button>
      </div>
    </div>
  );
});

FormCard.displayName = 'FormCard';

export default FormCard;
