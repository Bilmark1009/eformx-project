import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

import headerLogo from "../assets/logoforheader.png";
import formService from "../services/formService";
import notificationsService from "../services/notificationsService";
import NotificationDropdown from "./NotificationDropdown";
import AnalyticsCharts from "./AnalyticsCharts";
import authService from "../services/authService";
import {
  FaBell,
  FaPlus,
  FaShareAlt,
  FaEdit,
  FaTrash,
  FaChartBar,
  FaDownload,
  FaUserEdit,
  FaSave,
  FaTimes,
  FaCamera,
  FaSearch,
  FaFilter,
} from "react-icons/fa";

function Dashboard({ onLogout, userEmail, userName }) {
  const defaultAdminAvatar =
    "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200";

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");



  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);

  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [selectedFormAnalytics, setSelectedFormAnalytics] = useState(null);

  const [isResponsesOpen, setIsResponsesOpen] = useState(false);
  const [selectedFormResponses, setSelectedFormResponses] = useState(null);
  const [responsesSearchTerm, setResponsesSearchTerm] = useState("");
  const [activeResponseDetail, setActiveResponseDetail] = useState(null);

  // Response filtering
  const [responseFilters, setResponseFilters] = useState({
    startDate: "",
    endDate: "",
    fieldFilters: [],
    search: ""
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsAnchorRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const navigate = useNavigate();

  // Close notifications when clicking outside or scrolling outside (same as SuperAdminDashboard)
  useEffect(() => {
    if (!showNotifications) return;

    const handlePointerDown = (event) => {
      const anchor = notificationsAnchorRef.current;
      if (!anchor) return;
      if (anchor.contains(event.target)) return;
      setShowNotifications(false);
    };

    const handleScrollOrWheel = (event) => {
      const anchor = notificationsAnchorRef.current;
      if (!anchor) return;
      if (anchor.contains(event.target)) return;
      setShowNotifications(false);
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("touchstart", handlePointerDown, true);
    window.addEventListener("scroll", handleScrollOrWheel, true);
    window.addEventListener("wheel", handleScrollOrWheel, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
      window.removeEventListener("scroll", handleScrollOrWheel, true);
      window.removeEventListener("wheel", handleScrollOrWheel, true);
    };
  }, [showNotifications]);
  const [responseCopyStatus, setResponseCopyStatus] = useState("");

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileEditMode, setIsProfileEditMode] = useState(false);
  const [adminName, setAdminName] = useState(userName || "Admin");
  const [adminEmail, setAdminEmail] = useState(userEmail || "admin@eformx.com");
  const [adminAvatar, setAdminAvatar] = useState(() => {
    const u = authService.getCurrentUser();
    return (u && u.photo) ? u.photo : defaultAdminAvatar;
  });
  const [tempAdminName, setTempAdminName] = useState(userName || "Admin");
  const [tempAdminEmail, setTempAdminEmail] = useState(userEmail || "admin@eformx.com");
  const [tempAdminAvatar, setTempAdminAvatar] = useState(defaultAdminAvatar);
  const [profileNotification, setProfileNotification] = useState({ type: "", message: "" });

  // Change password
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [, setIsChangingPassword] = useState(false);
  const [, setShowNewPassword] = useState(false); // no longer used visually
  const [, setShowConfirmNewPassword] = useState(false); // no longer used visually
  const [hideChangePasswordCta, setHideChangePasswordCta] = useState(false);

  const resetChangePasswordFields = () => {
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  };

  const openChangePassword = () => {
    setHideChangePasswordCta(true);
    setTimeout(() => setHideChangePasswordCta(false), 700);
    setIsChangePasswordOpen(true);
    resetChangePasswordFields();
  };

  useEffect(() => {
    fetchForms();
  }, []);

  // Load notifications on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const items = await notificationsService.list();
        setNotifications(items);
      } catch (e) {
        // ignore transient errors
      }
    };
    loadNotifications();

    const interval = setInterval(loadNotifications, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const data = await formService.getForms();
      console.log('=== FETCH FORMS DEBUG ===');
      console.log('Raw API response:', data);
      console.log('Is array?', Array.isArray(data));
      console.log('Length:', data?.length);

      if (Array.isArray(data) && data.length > 0) {
        console.log('First form structure:', data[0]);
        console.log('First form title:', data[0]?.title);
        console.log('First form description:', data[0]?.description);
      }

      setForms(Array.isArray(data) ? data : []);
      console.log('Forms set to state');
    } catch (err) {
      console.error("Failed to fetch forms:", err);
      setError("Failed to load forms. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  // ===== MODAL HANDLERS =====
  const openModal = () => navigate("/builder");


  // ===== CREATE / UPDATE =====


  // ===== EDIT =====
  const handleEditForm = (formId) => {
    navigate(`/builder/${formId}`);
  };

  // ===== TOGGLE STATUS (Activate/Deactivate) =====
  const handleToggleFormStatus = async (formId) => {
    try {
      const target = forms.find((f) => f.id === formId);
      if (!target) return;
      const current = (target.status || 'active').toLowerCase();
      const nextStatus = current === 'active' ? 'closed' : 'active';
      const updated = await formService.updateForm(formId, { status: nextStatus });
      setForms(forms.map((f) => (f.id === updated.id ? updated : f)));
    } catch (err) {
      console.error('Failed to toggle form status:', err);
      alert('Could not update form status. Please try again.');
    }
  };

  // ===== SHARE =====
  const handleShareForm = (formId) => {
    const link = `${window.location.origin}/form/${formId}`;
    setShareLink(link);
    setIsShareModalOpen(true);
  };
  const closeShareModal = () => {
    setIsShareModalOpen(false);
    setShareLink("");
  };

  // ===== DELETE =====
  const handleDeleteForm = (formId) => {
    setFormToDelete(formId);
    setIsDeleteModalOpen(true);
  };
  const confirmDelete = async () => {
    try {
      await formService.deleteForm(formToDelete);
      setForms(forms.filter((form) => form.id !== formToDelete));
      setIsDeleteModalOpen(false);
      setFormToDelete(null);
    } catch (err) {
      console.error("Failed to delete form:", err);
      alert("Failed to delete form.");
    }
  };
  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setFormToDelete(null);
  };

  // ===== ANALYTICS (Stats Overview) =====
  const handleAnalytics = async (formId) => {
    try {
      const analyticsData = await formService.getFormAnalytics(formId) || {};
      const responses = await formService.getFormResponses(formId);
      const selected = forms.find((f) => String(f.id) === String(formId));
      const formFields = selected?.fields || selected?.form_fields || selected?.formFields || selected?.schema || [];

      const apiAnalytics = analyticsData.analytics || {};
      const completed = apiAnalytics.totalRespondents ?? 0;
      const abandoned = apiAnalytics.abandonedAttempts ?? 0;
      const started = apiAnalytics.activeStartedAttempts ?? 0;
      const tracked = apiAnalytics.trackedAttempts ?? (completed + abandoned);
      const computedRate = tracked > 0 ? Math.round((completed / tracked) * 1000) / 10 : 0;

      const mergedAnalytics = {
        totalRespondents: completed,
        completionRate: apiAnalytics.completionRate ?? computedRate,
        recentActivity: apiAnalytics.recentActivity ?? 0,
        totalAttempts: apiAnalytics.totalAttempts ?? (completed + abandoned + started),
        abandonedAttempts: abandoned,
        activeStartedAttempts: started,
        trackedAttempts: tracked,
        statusBreakdown: apiAnalytics.statusBreakdown || {
          started: { count: started },
          completed: { count: completed },
          abandoned: { count: abandoned },
        },
      };

      // Ensure completionRate is derived from form_attempts even if backend payload is stale
      mergedAnalytics.completionRate = tracked > 0 ? Math.round((completed / tracked) * 1000) / 10 : 0;

      setSelectedFormAnalytics({
        id: analyticsData.form_id || formId,
        title: analyticsData.title || (selected?.title) || "Form Analytics",
        analytics: mergedAnalytics,
        fields: Array.isArray(formFields) ? formFields : [],
        responses: Array.isArray(responses) ? responses : []
      });
      setIsAnalyticsOpen(true);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      alert("Failed to load analytics data.");
    }
  };

  // ===== VIEW RESPONSES (Detailed Table) =====
  const handleViewResponses = async (formId) => {
    try {
      const responses = await formService.getFormResponses(formId);
      console.log('Fetched responses:', responses);
      const selected = forms.find((f) => String(f.id) === String(formId));
      const formFields = selected?.fields || selected?.form_fields || selected?.formFields || selected?.schema || [];
      setSelectedFormResponses({
        ...(selected || {}),
        fields: Array.isArray(formFields) ? formFields : [],
        responses: Array.isArray(responses) ? responses : []
      });
      setIsResponsesOpen(true);
    } catch (err) {
      console.error("Failed to fetch responses:", err);
      alert("Could not load responses.");
    }
  };

  const exportResponses = async (format) => {
    if (!selectedFormResponses) return;

    try {
      // Build filters object for API
      const filters = {};

      if (responseFilters.startDate) filters.start_date = responseFilters.startDate;
      if (responseFilters.endDate) filters.end_date = responseFilters.endDate;
      if (responseFilters.search) filters.search = responseFilters.search;

      // Add field filters as JSON string
      if (responseFilters.fieldFilters.length > 0) {
        responseFilters.fieldFilters.forEach((filter, index) => {
          if (filter.fieldId && filter.value) {
            filters[`filters[${index}][field_id]`] = filter.fieldId;
            filters[`filters[${index}][operator]`] = filter.operator;
            filters[`filters[${index}][value]`] = filter.value;
          }
        });
      }

      const response = format === 'csv'
        ? await formService.exportResponsesCsv(selectedFormResponses.id, filters)
        : await formService.exportResponsesXlsx(selectedFormResponses.id, filters);

      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${selectedFormResponses.title}_responses_${timestamp}.${format}`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Failed to export responses:", err);
      alert("Failed to export responses. Please try again.");
    }
  };
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // ===== EXPORT CSV (RESPONDENT LEVEL) =====
  const handleExportResponsesCSV = async () => {
    if (!selectedFormResponses) return;
    try {
      const fieldOrder = (selectedFormResponses.fields || []).map((field, idx) => ({
        id: field?.id ?? field?.name ?? `q${idx + 1}`,
        label: field?.label || field?.title || field?.question || field?.name || `Question ${idx + 1}`,
      }));

      const headers = [
        "Submission Date",
        "Respondent Name",
        "Respondent Email",
        ...fieldOrder.map((f) => f.label),
      ];

      const rows = (selectedFormResponses.responses || []).map((r) => {
        const entries = normalizeAnswerEntries(r.responses);
        return [
          r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
          r.respondent_name || "Anonymous",
          r.respondent_email || "N/A",
          ...fieldOrder.map((f) => {
            const match = entries.find((e) => String(e.id) === String(f.id));
            return formatAnswerValue(match ? match.value : "");
          }),
        ];
      });

      let csvContent = headers.join(",") + "\n";
      rows.forEach((row) => {
        csvContent += row
          .map((cell) => {
            const safe = cell === undefined || cell === null ? "" : String(cell).replace(/"/g, '""');
            return `"${safe}"`;
          })
          .join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv" });
      downloadBlob(blob, `${selectedFormResponses.title || "form"}_responses.csv`);
    } catch (err) {
      console.error("Failed to export responses CSV", err);
      alert("Could not export CSV. Please try again.");
    }
  };

  // ===== EXPORTS (ANALYTICS ONLY) =====


  const handleExportAnalyticsXLSX = async () => {
    if (!selectedFormAnalytics?.id) return;
    try {
      const res = await formService.exportAnalyticsXlsx(selectedFormAnalytics.id);
      downloadBlob(res.data, `${selectedFormAnalytics.title || "form"}_analytics.xlsx`);
    } catch (err) {
      console.error("Failed to export analytics XLSX", err);
      alert("Could not export analytics XLSX. Please try again.");
    }
  };

  // ===== PROFILE MANAGEMENT =====
  const handleOpenProfile = () => {
    setIsProfileOpen(true);
    setIsProfileEditMode(false);
    setIsChangePasswordOpen(false);
    resetChangePasswordFields();
    // Reset temp values to current values when opening
    setTempAdminName(adminName);
    setTempAdminEmail(adminEmail);
    setTempAdminAvatar(adminAvatar);
    // Clear any notifications
    setProfileNotification({ type: "", message: "" });
  };

  const handleEditProfile = () => {
    setIsProfileEditMode(true);
  };

  const handleSaveProfile = () => {
    const trimmedName = tempAdminName.trim();
    const trimmedEmail = tempAdminEmail.trim();

    // Clear previous notifications
    setProfileNotification({ type: "", message: "" });

    if (!trimmedName) {
      setProfileNotification({ type: "error", message: "Please enter a name" });
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setProfileNotification({ type: "error", message: "Please enter a valid email address" });
      return;
    }

    (async () => {
      try {

        // If user entered a new password, validate it here (no separate save button)
        const hasPasswordChange = !!newPassword || !!confirmNewPassword;
        if (hasPasswordChange) {
          if (!newPassword || newPassword.length < 6) {
            setProfileNotification({ type: "error", message: "New password must be at least 6 characters" });
            return;
          }
          if (newPassword !== confirmNewPassword) {
            setProfileNotification({ type: "error", message: "New passwords do not match" });
            return;
          }
        }

        // Persist profile changes to backend
        const updated = await authService.updateProfile({
          name: trimmedName,
          email: trimmedEmail,
          photo: tempAdminAvatar,
        });

        // If requested, persist password change
        if (hasPasswordChange) {
          setIsChangingPassword(true);
          await authService.changePassword({
            password: newPassword,
            password_confirmation: confirmNewPassword,
          });
          resetChangePasswordFields();
          setIsChangePasswordOpen(false);
        }

        // Update local UI state
        setAdminName(updated.name || trimmedName);
        setAdminEmail(updated.email || trimmedEmail);
        setAdminAvatar(updated.photo || tempAdminAvatar || defaultAdminAvatar);
        setIsProfileEditMode(false);

        // Show success notification
        setProfileNotification({
          type: "success",
          message: hasPasswordChange ? "Profile and password updated successfully!" : "Profile updated successfully!",
        });

        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setProfileNotification({ type: "", message: "" });
        }, 3000);

        // Optional: Refresh stored user in memory for current session
        try {
          const storedStr = localStorage.getItem('user');
          const stored = storedStr ? JSON.parse(storedStr) : {};
          const next = { ...stored, name: updated.name, email: updated.email, photo: updated.photo };
          localStorage.setItem('user', JSON.stringify(next));
        } catch { }
      } catch (err) {
        console.error('Failed to save profile:', err);
        const errorMsg =
          err?.response?.data?.message ||
          (err?.response?.data?.errors
            ? Object.values(err.response.data.errors).flat().join(" ")
            : null) ||
          "Failed to save profile. Please try again.";
        setProfileNotification({ type: "error", message: errorMsg });
      } finally {
        setIsChangingPassword(false);
      }
    })();
  };

  const handleCancelEditProfile = () => {
    // Reset temp values to current values
    setTempAdminName(adminName);
    setTempAdminEmail(adminEmail);
    setTempAdminAvatar(adminAvatar);
    setIsProfileEditMode(false);
    setIsChangePasswordOpen(false);
    resetChangePasswordFields();
    // Clear notifications
    setProfileNotification({ type: "", message: "" });
  };

  // Password is saved via "Save Changes" only.

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempAdminAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const mapFieldLabels = (fields = []) => {
    const map = {};
    fields.forEach((field, idx) => {
      const key = field?.id ?? field?.name ?? `q${idx + 1}`;
      const label = field?.label || field?.title || field?.question || field?.name || `Question ${idx + 1}`;
      if (key) {
        map[String(key)] = label;
      }
    });
    return map;
  };

  const responseFieldLabelMap = useMemo(
    () => mapFieldLabels(selectedFormResponses?.fields || []),
    [selectedFormResponses]
  );

  const normalizeAnswerEntries = (responses) => {
    if (!responses) return [];
    if (typeof responses === "string") {
      try {
        const parsed = JSON.parse(responses);
        return normalizeAnswerEntries(parsed);
      } catch (err) {
        return [{ id: "answer", value: responses }];
      }
    }
    if (Array.isArray(responses)) {
      return responses.map((entry, idx) => {
        if (entry && typeof entry === "object") {
          return {
            id: entry.id ?? entry.name ?? entry.fieldId ?? `q${idx + 1}`,
            value: entry.value ?? entry.answer ?? entry.response ?? entry,
            label: entry.label || entry.question || entry.title || entry.name,
          };
        }
        return { id: `q${idx + 1}`, value: entry };
      });
    }
    if (typeof responses === "object") {
      return Object.entries(responses).map(([id, value]) => ({ id, value }));
    }
    return [];
  };

  const formatAnswerValue = (value, maxLength) => {
    let text;
    if (Array.isArray(value)) {
      text = value.join(", ");
    } else if (value && typeof value === "object") {
      const flatValues = Object.values(value).filter((v) => typeof v !== "object");
      text = flatValues.length ? flatValues.join(", ") : JSON.stringify(value);
    } else {
      text = value === undefined || value === null ? "" : String(value);
    }

    if (maxLength && text.length > maxLength) {
      return text.slice(0, maxLength) + "...";
    }
    return text;
  };

  const summarizeResponses = (response) => {
    const entries = normalizeAnswerEntries(response?.responses);
    if (!entries.length) return "No answers";
    const preview = entries.slice(0, 3).map((entry, idx) => {
      const label = responseFieldLabelMap[entry.id] || entry.label || `Q${idx + 1}`;
      const val = formatAnswerValue(entry.value, 30);
      return `${label}: ${val}`;
    });
    if (entries.length > 3) {
      preview.push(`...`);
    }
    return preview.join(" | ");
  };

  const buildFullSummary = (response) => {
    const entries = normalizeAnswerEntries(response?.responses);
    if (!entries.length) return "";
    return entries
      .map((entry, idx) => {
        const label = responseFieldLabelMap[entry.id] || entry.label || `Q${idx + 1}`;
        return `${label}: ${formatAnswerValue(entry.value)}`;
      })
      .join(" | ");
  };

  const buildResponseDetailText = (response) => {
    if (!response) return "";
    const entries = normalizeAnswerEntries(response.responses);
    const meta = [
      `Date: ${response.created_at ? new Date(response.created_at).toLocaleString() : "-"}`,
      `Name: ${response.respondent_name || "Anonymous"}`,
      `Email: ${response.respondent_email || "N/A"}`,
    ];

    const qa = entries.map((entry, idx) => {
      const label = responseFieldLabelMap[entry.id] || entry.label || `Question ${idx + 1}`;
      const answer = formatAnswerValue(entry.value);
      return `Question: ${label}\nAnswer: ${answer}`;
    });

    return [...meta, "", ...qa].join("\n");
  };

  const handleCopyResponseDetail = async () => {
    if (!activeResponseDetail) return;
    const text = buildResponseDetailText(activeResponseDetail);
    try {
      await navigator.clipboard.writeText(text);
      setResponseCopyStatus("Copied");
      setTimeout(() => setResponseCopyStatus(""), 2000);
    } catch (err) {
      console.error("Failed to copy response detail", err);
      setResponseCopyStatus("Copy failed");
      setTimeout(() => setResponseCopyStatus(""), 2000);
    }
  };

  const filteredResponses =
    selectedFormResponses && Array.isArray(selectedFormResponses.responses)
      ? selectedFormResponses.responses.filter((response) => {
        // Date range filter
        if (responseFilters.startDate) {
          const responseDate = new Date(response.created_at).toISOString().split('T')[0];
          if (responseDate < responseFilters.startDate) return false;
        }
        if (responseFilters.endDate) {
          const responseDate = new Date(response.created_at).toISOString().split('T')[0];
          if (responseDate > responseFilters.endDate) return false;
        }

        // Field-specific filters
        if (responseFilters.fieldFilters.length > 0) {
          for (const filter of responseFilters.fieldFilters) {
            if (!filter.fieldId || !filter.value) continue;
            const fieldValue = response.responses?.[filter.fieldId] || "";
            const searchValue = filter.value.toLowerCase();
            const fieldStr = String(fieldValue).toLowerCase();

            switch (filter.operator) {
              case 'equals':
                if (fieldStr !== searchValue) return false;
                break;
              case 'contains':
                if (!fieldStr.includes(searchValue)) return false;
                break;
              case 'starts_with':
                if (!fieldStr.startsWith(searchValue)) return false;
                break;
              default:
                break;
            }
          }
        }

        // Search filter (respondent name/email and responses)
        const searchTerm = (responseFilters.search || responsesSearchTerm).trim().toLowerCase();
        if (searchTerm) {
          const name = (response.respondent_name || "").toLowerCase();
          const email = (response.respondent_email || "").toLowerCase();
          const summary = summarizeResponses(response).toLowerCase();
          return name.includes(searchTerm) || email.includes(searchTerm) || summary.includes(searchTerm);
        }

        return true;
      })
      : [];

  return (
    <div className="dashboard">
      {/* HEADER */}
      <header className="header">
        <div className="logo">
          <img src={headerLogo} alt="eFormX" className="header-logo" />
        </div>
        <div className="header-right">
          <div ref={notificationsAnchorRef} className="notifications">
            <button
              type="button"
              className="dashboard-notif-bell-btn"
              onClick={() => setShowNotifications((v) => !v)}
              aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
              title="Notifications"
            >
              <FaBell className="dashboard-notif-bell-icon" aria-hidden />
              {unreadCount > 0 && (
                <span className="dashboard-notif-bell-badge">{unreadCount}</span>
              )}
            </button>
            {showNotifications && (
              <NotificationDropdown
                notifications={notifications}
                onMarkRead={async (id) => { try { await notificationsService.markRead(id); const items = await notificationsService.list(); setNotifications(items); } catch { } }}
                onDelete={async (id) => { try { await notificationsService.delete(id); const items = await notificationsService.list(); setNotifications(items); } catch { } }}
                onMarkAllRead={async () => { try { await notificationsService.markAllRead(); const items = await notificationsService.list(); setNotifications(items); } catch { } }}
                onDeleteAll={async () => { try { await notificationsService.deleteAll(); const items = await notificationsService.list(); setNotifications(items); } catch { } }}
                onClose={() => setShowNotifications(false)}
              />
            )}
          </div>
          <div
            className="admin-profile clickable-profile"
            onClick={handleOpenProfile}
          >
            <span className="admin-label">{adminName}</span>
            <div className="profile-avatar">
              <img src={adminAvatar} alt={adminName} />
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="main-container">
        <div className="content-wrapper">
          <div className="section-header">
            <div className="section-title">
              <h1>FORMS</h1>
              <p className="section-subtitle">
                Manage and Track your active forms
              </p>
            </div>
            <button className="create-form-btn" onClick={openModal}>
              <FaPlus /> Create Form
            </button>
          </div>

          <div className="forms-grid">
            {loading ? (
              <div className="loading-state">Loading your forms...</div>
            ) : error ? (
              <div className="error-state">{error}</div>
            ) : forms.length === 0 ? (
              <div className="empty-state">
                <FaPlus size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No forms created yet.</p>
                <button className="create-form-btn" onClick={openModal} style={{ marginTop: '1rem' }}>
                  Create Your First Form
                </button>
              </div>
            ) : forms.length > 0 ? (
              forms.map((form) => {
                console.log('Rendering form card:', form.id, 'Title:', form.title);
                return (
                  <div
                    key={form.id}
                    className="form-card"
                    onClick={() => handleViewResponses(form.id)}
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
                              handleAnalytics(form.id);
                            }}
                          />
                          <FaTrash
                            className="action-icon"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteForm(form.id);
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
                          handleShareForm(form.id);
                        }}
                      >
                        <FaShareAlt /> Share
                      </button>
                      <button
                        className="btn-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditForm(form.id);
                        }}
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        className={`toggle-switch ${String(form.status || 'active').toLowerCase() === 'active' ? 'active' : 'inactive'}`}
                        title={String(form.status || 'active').toLowerCase() === 'active' ? 'Click to deactivate' : 'Click to activate'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFormStatus(form.id);
                        }}
                        aria-label={String(form.status || 'active').toLowerCase() === 'active' ? 'Deactivate form' : 'Activate form'}
                      >
                        <span className="knob" />
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="empty-state">
                <FaPlus size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No valid forms found.</p>
                <button className="create-form-btn" onClick={openModal} style={{ marginTop: '1rem' }}>
                  Create Your First Form
                </button>
              </div>
            )}

            {!loading && !error && forms.length > 0 && (
              <div className="add-form-card" onClick={openModal}>
                <FaPlus className="add-icon" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL (REMOVED) */}

      {/* SHARE MODAL */}
      {isShareModalOpen && (
        <div className="modal-overlay" onClick={closeShareModal}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-icon" onClick={closeShareModal} aria-label="Close">
              ✕
            </button>
            <h2>Share Form</h2>
            <p>Copy the link below to share this form:</p>
            <div className="share-link-container">
              <input
                type="text"
                value={shareLink}
                readOnly
                onFocus={(e) => e.target.select()}
                className="share-link-input"
              />
              <button
                className="copy-link-btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareLink);
                    // Show success feedback
                    const btn = document.querySelector('.copy-link-btn');
                    const originalText = btn.textContent;
                    btn.textContent = '✓ Copied!';
                    btn.style.background = '#10b981';
                    setTimeout(() => {
                      btn.textContent = originalText;
                      btn.style.background = '';
                    }, 2000);
                  } catch (err) {
                    console.error('Failed to copy:', err);
                    alert('Failed to copy link. Please copy manually.');
                  }
                }}
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <h2>Delete Form</h2>
            <p>This action cannot be undone.</p>
            <div className="delete-actions">
              <button className="cancel-btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="delete-btn" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS MODAL - Stats Overview */}
      {isAnalyticsOpen && selectedFormAnalytics && (
        <div className="modal-overlay">
          <div className="analytics-stats-modal">
            <div className="analytics-stats-header">
              <h2>{selectedFormAnalytics.title}</h2>
              <button
                className="close-analytics-btn"
                onClick={() => {
                  setIsAnalyticsOpen(false);
                  setSelectedFormAnalytics(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="analytics-stats-content">
              <div className="stat-card">
                <div className="stat-label">Total Respondents</div>
                <div className="stat-value">
                  {selectedFormAnalytics.analytics.totalRespondents}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Completion Rate</div>
                <div className="stat-value">
                  {selectedFormAnalytics.analytics.completionRate}
                  <span className="stat-percentage">%</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Questions</div>
                <div className="stat-value">
                  {selectedFormAnalytics.fields?.length || 0}
                </div>
              </div>
            </div>

            <div className="analytics-visuals">
              <AnalyticsCharts
                form={selectedFormAnalytics}
                responses={selectedFormAnalytics.responses}
              />
            </div>
            <div className="analytics-stats-footer">
              <button
                className="export-csv-btn"
                onClick={handleExportAnalyticsXLSX}
              >
                <FaDownload style={{ marginRight: "8px" }} />
                Export XLSX
              </button>
            </div>

          </div>
        </div>
      )}

      {/* RESPONSES MODAL - Detailed Table */}
      {isResponsesOpen && selectedFormResponses && (
        <div className="modal-overlay">
          <div className="responses-modal">
            <div className="responses-header">
              <h2>{selectedFormResponses.title} - Responses ({filteredResponses.length})</h2>
              <div className="responses-controls">
                <div className="responses-search-wrapper">
                  <FaSearch className="responses-search-icon" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={responseFilters.search || responsesSearchTerm}
                    onChange={(e) => {
                      setResponseFilters(prev => ({ ...prev, search: e.target.value }));
                      setResponsesSearchTerm(e.target.value);
                    }}
                    className="responses-search-input"
                  />
                </div>
                <button
                  className="filter-toggle-btn"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <FaFilter /> Filters
                </button>
                <div className="export-buttons">
                  <button
                    className="export-btn csv"
                    onClick={() => exportResponses('csv')}
                    title="Export as CSV"
                  >
                    <FaDownload /> CSV
                  </button>
                  <button
                    className="export-btn xlsx"
                    onClick={() => exportResponses('xlsx')}
                    title="Export as Excel"
                  >
                    <FaDownload /> XLSX
                  </button>
                </div>
              </div>
              <button
                className="close-responses-btn"
                onClick={() => {
                  setIsResponsesOpen(false);
                  setSelectedFormResponses(null);
                  setResponsesSearchTerm("");
                  setActiveResponseDetail(null);
                  setResponseFilters({ startDate: "", endDate: "", fieldFilters: [], search: "" });
                  setShowAdvancedFilters(false);
                }}
              >
                ✕
              </button>
            </div>

            {showAdvancedFilters && (
              <div className="advanced-filters-panel">
                <div className="filter-row">
                  <div className="filter-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={responseFilters.startDate}
                      onChange={(e) => setResponseFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={responseFilters.endDate}
                      onChange={(e) => setResponseFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="field-filters">
                  <h4>Field Filters</h4>
                  {responseFilters.fieldFilters.map((filter, index) => (
                    <div key={index} className="filter-row">
                      <select
                        value={filter.fieldId}
                        onChange={(e) => {
                          const newFilters = [...responseFilters.fieldFilters];
                          newFilters[index].fieldId = e.target.value;
                          setResponseFilters(prev => ({ ...prev, fieldFilters: newFilters }));
                        }}
                      >
                        <option value="">Select field...</option>
                        {selectedFormResponses.fields?.map(field => (
                          <option key={field.id} value={field.id}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filter.operator}
                        onChange={(e) => {
                          const newFilters = [...responseFilters.fieldFilters];
                          newFilters[index].operator = e.target.value;
                          setResponseFilters(prev => ({ ...prev, fieldFilters: newFilters }));
                        }}
                      >
                        <option value="contains">contains</option>
                        <option value="equals">equals</option>
                        <option value="starts_with">starts with</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Filter value..."
                        value={filter.value}
                        onChange={(e) => {
                          const newFilters = [...responseFilters.fieldFilters];
                          newFilters[index].value = e.target.value;
                          setResponseFilters(prev => ({ ...prev, fieldFilters: newFilters }));
                        }}
                      />
                      <button
                        className="remove-filter-btn"
                        onClick={() => {
                          const newFilters = responseFilters.fieldFilters.filter((_, i) => i !== index);
                          setResponseFilters(prev => ({ ...prev, fieldFilters: newFilters }));
                        }}
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="add-filter-btn"
                    onClick={() => {
                      setResponseFilters(prev => ({
                        ...prev,
                        fieldFilters: [...prev.fieldFilters, { fieldId: '', operator: 'contains', value: '' }]
                      }));
                    }}
                  >
                    <FaPlus size={12} /> Add Field Filter
                  </button>
                </div>

                <div className="filter-actions">
                  <button
                    className="clear-filters-btn"
                    onClick={() => setResponseFilters({ startDate: "", endDate: "", fieldFilters: [], search: "" })}
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
            <div className="responses-table-wrapper">
              <table className="responses-table">
                <thead>
                  <tr>
                    <th>Submission Date</th>
                    <th>Respondent Name</th>
                    <th>Respondent Email</th>
                    <th>Responses Summary</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResponses && filteredResponses.length > 0 ? (
                    filteredResponses.map((response, index) => {
                      const summaryText = summarizeResponses(response);
                      const fullSummary = buildFullSummary(response);
                      return (
                        <tr key={index}>
                          <td>{new Date(response.created_at).toLocaleDateString()}</td>
                          <td>{response.respondent_name || "Anonymous"}</td>
                          <td>{response.respondent_email || "N/A"}</td>
                          <td title={fullSummary || undefined}>
                            {summaryText}
                          </td>
                          <td>
                            <button className="view-btn" onClick={() => setActiveResponseDetail(response)}>View Detail</button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                        No responses submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="responses-footer">
              <button className="export-csv-btn" onClick={() => handleExportResponsesCSV()}>
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESPONSE DETAIL MODAL */}
      {activeResponseDetail && (
        <div className="modal-overlay" onClick={() => setActiveResponseDetail(null)}>
          <div className="response-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="responses-header response-detail-header">
              <h3>Response Detail</h3>
              <div className="response-detail-actions">
                {responseCopyStatus && <span className="copy-status">{responseCopyStatus}</span>}
                <button className="copy-all-btn" onClick={handleCopyResponseDetail}>Copy all</button>
                <button className="close-responses-btn" onClick={() => setActiveResponseDetail(null)}>✕</button>
              </div>
            </div>
            <div className="response-detail-meta">
              <div className="response-meta-item">
                <div className="response-meta-label">Date</div>
                <div className="response-meta-value">{activeResponseDetail.created_at ? new Date(activeResponseDetail.created_at).toLocaleString() : "-"}</div>
              </div>
              <div className="response-meta-item">
                <div className="response-meta-label">Name</div>
                <div className="response-meta-value">{activeResponseDetail.respondent_name || "Anonymous"}</div>
              </div>
              <div className="response-meta-item">
                <div className="response-meta-label">Email</div>
                <div className="response-meta-value">{activeResponseDetail.respondent_email || "N/A"}</div>
              </div>
            </div>
            <div className="response-detail-list">
              {normalizeAnswerEntries(activeResponseDetail.responses).length === 0 ? (
                <div className="response-detail-empty">No responses submitted.</div>
              ) : (
                normalizeAnswerEntries(activeResponseDetail.responses).map((entry, idx) => {
                  const label = responseFieldLabelMap[entry.id] || entry.label || `Question ${idx + 1}`;
                  return (
                    <div className="detail-item-card" key={`${entry.id || idx}-${idx}`}>
                      <h4 className="detail-question">{label}</h4>
                      <p className="detail-answer">{formatAnswerValue(entry.value)}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {isProfileOpen && (
        <div className="modal-overlay">
          <div className="profile-modal">
            <div className="profile-card">
              <div className="profile-header-top">
                <span
                  className="profile-back-icon"
                  onClick={() => {
                    setIsProfileOpen(false);
                    handleCancelEditProfile();
                  }}
                >
                  ←
                </span>
              </div>

              <div className="profile-main">
                {/* NOTIFICATION */}
                {profileNotification.message && (
                  <div className={`profile-notification ${profileNotification.type}`}>
                    {profileNotification.message}
                  </div>
                )}

                {!isProfileEditMode ? (
                  // VIEW MODE
                  <>
                    <div className="profile-avatar-wrapper">
                      <img
                        src={adminAvatar}
                        alt={adminName}
                        className="profile-avatar-large"
                      />
                    </div>

                    <div className="profile-name">{adminName}</div>
                    <div className="profile-email">{adminEmail}</div>

                    <button
                      className="edit-profile-btn"
                      onClick={handleEditProfile}
                    >
                      <FaUserEdit /> Edit Profile
                    </button>

                    <button className="logout-btn" onClick={handleLogout}>Log out</button>
                  </>
                ) : (
                  // EDIT MODE
                  <>
                    <div className="profile-avatar-wrapper profile-avatar-editable">
                      <img
                        src={tempAdminAvatar}
                        alt={tempAdminName}
                        className="profile-avatar-large"
                      />
                      <label className="avatar-change-btn">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfileImageChange}
                          style={{ display: "none" }}
                        />
                        <FaCamera className="avatar-change-icon" />
                      </label>
                    </div>

                    <div className="profile-edit-form">
                      <div className="profile-form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          className="profile-input"
                          value={tempAdminName}
                          onChange={(e) => {
                            setTempAdminName(e.target.value);
                            if (profileNotification.message) setProfileNotification({ type: "", message: "" });
                          }}
                          placeholder="Enter your name"
                        />
                      </div>

                      <div className="profile-form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          className="profile-input"
                          value={tempAdminEmail}
                          onChange={(e) => {
                            setTempAdminEmail(e.target.value);
                            if (profileNotification.message) setProfileNotification({ type: "", message: "" });
                          }}
                          placeholder="Enter your email"
                        />
                      </div>

                      {/* CHANGE PASSWORD */}
                      <div className="profile-form-group">
                        <div className="profile-section-header">
                          {!hideChangePasswordCta && !isChangePasswordOpen && (
                            <button
                              type="button"
                              className="profile-link-btn"
                              onClick={() => {
                                openChangePassword();
                                if (profileNotification.message) setProfileNotification({ type: "", message: "" });
                              }}
                            >
                              Change Password
                            </button>
                          )}
                        </div>

                        {isChangePasswordOpen && (
                          <div className="profile-password-panel">
                            <div className="profile-form-group">
                              <label>New password</label>
                              <input
                                type="password"
                                className="profile-input profile-password-input"
                                value={newPassword}
                                onChange={(e) => {
                                  setNewPassword(e.target.value);
                                  if (profileNotification.message) setProfileNotification({ type: "", message: "" });
                                }}
                                placeholder="Enter new password"
                                autoComplete="new-password"
                              />
                              {newPassword.length > 0 && newPassword.length < 6 && (
                                <div className="profile-field-error">Password must be at least 6 characters.</div>
                              )}
                            </div>

                            <div className="profile-form-group">
                              <label>Confirm new password</label>
                              <input
                                type="password"
                                className="profile-input profile-password-input"
                                value={confirmNewPassword}
                                onChange={(e) => {
                                  setConfirmNewPassword(e.target.value);
                                  if (profileNotification.message) setProfileNotification({ type: "", message: "" });
                                }}
                                placeholder="Confirm new password"
                                autoComplete="new-password"
                              />
                              {confirmNewPassword.length > 0 && newPassword !== confirmNewPassword && (
                                <div className="profile-field-error">Passwords do not match.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="profile-edit-actions">
                        <button
                          className="profile-cancel-btn"
                          onClick={handleCancelEditProfile}
                        >
                          <FaTimes /> Cancel
                        </button>
                        <button
                          className="profile-save-btn"
                          onClick={handleSaveProfile}
                        >
                          <FaSave /> Save Changes
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}

export default Dashboard;