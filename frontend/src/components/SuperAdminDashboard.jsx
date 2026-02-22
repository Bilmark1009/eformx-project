import { useEffect, useState, useCallback } from "react";
import "../styles/SuperAdminDashboard.css";
import { FaBell, FaPlus, FaEdit, FaTrash, FaUserEdit, FaCamera, FaUsers, FaFileAlt, FaCheckCircle, FaUserShield } from "react-icons/fa";
import CreateAccountModal from "./CreateAccountModal";
import logo from "../assets/eFormX.png";
import authService from "../services/authService";
import userService from "../services/userService";
import { FaSearch } from "react-icons/fa";
import notificationsService from "../services/notificationsService";
import NotificationDropdown from "./NotificationDropdown";
import ThemeToggle from "./ThemeToggle";
import { useNotificationDropdown } from "../hooks/useNotificationDropdown";
import { usePolling } from "../hooks/usePolling";
import { useModal } from "../hooks/useModal";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const COLORS = ['#1a5f6f', '#5a8a96', '#ffbb28', '#ff8042', '#0f4c5c', '#8884d8'];



function SuperAdminDashboard({ onLogout }) {
  const createModal = useModal();
  const deleteModal = useModal();
  const profileModal = useModal();
  const editProfileModal = useModal();
  const changePasswordModal = useModal();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [systemStats, setSystemStats] = useState(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [hideChangePasswordCta, setHideChangePasswordCta] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const { showNotifications, setShowNotifications, notificationsAnchorRef } = useNotificationDropdown();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const loadNotifications = useCallback(async () => {
    try {
      const items = await notificationsService.list();
      setNotifications(items);
    } catch (e) {
      // ignore transient errors
    }
  }, []);
  usePolling(loadNotifications, 3000);


  // Initial load on mount
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        const users = await userService.getUsers();
        setAccounts(users);
        setError("");
      } catch (e) {
        console.error("Failed to load users:", e);
        setError("Failed to load accounts. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    const loadStats = async () => {
      try {
        const stats = await userService.getSystemStats();
        setSystemStats(stats);
      } catch (e) {
        console.error("Failed to load stats:", e);
      }
    };
    
    loadInitial();
    loadStats();
    loadNotifications();
  }, []);

  // Auto-refresh accounts
  const loadAccounts = useCallback(async () => {
    try {
      const users = await userService.getUsers();
      setAccounts(users);
    } catch (e) {
      // ignore transient errors
    }
  }, []);
  usePolling(loadAccounts, 3000);

  // ✅ Persistent Super Admin Profile
  const [superAdminProfile, setSuperAdminProfile] = useState(() => {
    const currentUser = authService.getCurrentUser();
    const saved = localStorage.getItem("superAdminProfile");
    const savedObj = saved ? JSON.parse(saved) : null;

    if (currentUser) {
      return {
        name: currentUser.name,
        email: currentUser.email,
        photo: currentUser.photo || savedObj?.photo || "https://i.pravatar.cc/150?img=5",
      };
    }

    return (
      savedObj || {
        name: "Admin",
        email: "admin@example.com",
        photo: "https://i.pravatar.cc/150?img=5",
      }
    );
  });

  const handleSaveProfile = async () => {
    try {
      const hasPasswordChange = !!newPassword || !!confirmNewPassword;
      if (hasPasswordChange) {
        if (!newPassword || newPassword.length < 6) {
          setProfileMessage("New password must be at least 6 characters");
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setProfileMessage("New passwords do not match");
          return;
        }
      }

      // Persist profile changes to backend account (Super Admin)
      const updated = await authService.updateProfile({
        name: superAdminProfile.name,
        email: superAdminProfile.email,
        photo: superAdminProfile.photo,
      });

      if (hasPasswordChange) {
        await authService.changePassword({
          password: newPassword,
          password_confirmation: confirmNewPassword,
        });
        setNewPassword("");
        setConfirmNewPassword("");
        changePasswordModal.close();
      }

      // Keep local UI profile in sync
      const nextProfile = {
        ...superAdminProfile,
        name: updated.name,
        email: updated.email,
        photo: updated.photo || superAdminProfile.photo,
      };
      setSuperAdminProfile(nextProfile);
      localStorage.setItem("superAdminProfile", JSON.stringify(nextProfile));

      setProfileMessage(hasPasswordChange ? "Profile and password updated!" : "Profile updated!");
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to update profile.";
      setProfileMessage(msg);
    } finally {
      setTimeout(() => setProfileMessage(""), 2000);
    }
  };

  // Account Logic
  const handleCreateAccount = async (account) => {
    try {
      // Validate full name: must not contain numbers
      if (/\d/.test(account?.name || "")) {
        const message = "Full name must not contain numbers.";
        setError(message);
        throw new Error(message);
      }

      // Optimistic update - add placeholder immediately
      const tempId = `temp-${Date.now()}`;
      const optimisticAccount = { ...account, id: tempId, status: 'active' };
      setAccounts((prev) => [...prev, optimisticAccount]);

      const created = await userService.createUser(account);

      // Replace optimistic account with real one
      setAccounts((prev) => prev.map(acc =>
        acc.id === tempId ? created : acc
      ));
      setError("");

      // Refresh notifications immediately so the bell reflects the action
      try {
        const items = await notificationsService.list();
        setNotifications(items);
      } catch (_) { }
    } catch (e) {
      console.error("Create user failed:", e);
      const message = e?.response?.data?.message || "Failed to create account.";
      setError(message);
      // Remove optimistic account on error
      setAccounts((prev) => prev.filter(acc => !acc.id.toString().startsWith('temp-')));
      throw e; // allow modal to surface error
    }
  };

  const openEditModal = (account) => {
    createModal.open(account);
  };

  const handleUpdateAccount = async (updatedAccount) => {
    if (!createModal.data) return;
    try {
      const id = createModal.data.id;
      const updated = await userService.updateUser(id, updatedAccount, createModal.data.role);
      setAccounts((prev) => prev.map((acc) => {
        const sameId = acc.id === id;
        const sameRole = String(acc.role || "").toLowerCase() === String(createModal.data.role || "").toLowerCase();
        const sameEmail = String(acc.email || "").toLowerCase() === String(createModal.data.email || "").toLowerCase();

        return sameId && (sameRole || sameEmail) ? updated : acc;
      }));
      createModal.close();
      setError("");
    } catch (e) {
      console.error("Update user failed:", e);
      const message = e?.response?.data?.message || "Failed to update account.";
      setError(message);
      throw e; // allow modal to surface error
    }
  };

  const openDeleteModal = (account) => {
    deleteModal.open(account);
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const target = deleteModal.data;
      if (target?.id) {
        // Optimistic update - remove immediately
        setAccounts((prev) => prev.filter((acc) => {
          const sameId = acc.id === target.id;
          const sameRole = String(acc.role || "").toLowerCase() === String(target.role || "").toLowerCase();
          const sameEmail = String(acc.email || "").toLowerCase() === String(target.email || "").toLowerCase();

          return !(sameId && (sameRole || sameEmail));
        }));
        deleteModal.close();

        await userService.deleteUser(target.id, target.role);

        // Refresh notifications immediately so the bell reflects the action
        try {
          const items = await notificationsService.list();
          setNotifications(items);
        } catch (_) { }
      }
      setError("");
    } catch (e) {
      console.error("Delete user failed:", e);
      const message = e?.response?.data?.message || "Failed to delete account.";
      setError(message);
      // Refresh accounts on error to restore state
      try {
        const users = await userService.getUsers();
        setAccounts(users);
      } catch (_) { }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      // Clear any locally cached profile so next login reads backend user
      localStorage.removeItem("superAdminProfile");
      onLogout();
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const term = searchTerm.toLowerCase();

    return (
      acc.name?.toLowerCase().includes(term) ||
      acc.email?.toLowerCase().includes(term) ||
      acc.role?.toLowerCase().includes(term) ||
      acc.status?.toLowerCase().includes(term)
    );
  });



  return (
    <div className="superadmin">
      {/* HEADER */}
      <header className="sa-header">
        <div className="sa-logo">
          <img src={logo} alt="eFormX Logo" className="logo-img" />
        </div>

        <div className="sa-right">
          <div ref={notificationsAnchorRef} className="sa-notif-bell-wrap">
            <button
              type="button"
              className="sa-notif-bell-btn"
              onClick={() => setShowNotifications(v => !v)}
              aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
            >
              <FaBell className="sa-notif-bell-icon" aria-hidden />
              {unreadCount > 0 && (
                <span className="sa-notif-bell-badge">{unreadCount}</span>
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
                isSuperAdmin={true}
              />
            )}
          </div>
          <div
            className="profile"
            onClick={profileModal.open}
            style={{ cursor: "pointer" }}
          >
            {/* <span className="profile-name-with-bell">
              {superAdminProfile.name} 
              <FaBell className="header-bell-icon" title="Notifications" />
            </span> */}
            <img
              src={superAdminProfile.photo}
              alt="Profile"
              className="header-profile-pic"
            />
          </div>
        </div>

      </header >

      {/* STATS OVERVIEW */}
      <div className="sa-stats-container">
        <div className="stats-section">
          <h2 className="sa-section-title">System Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon-wrapper users">
                <FaUsers />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Users</span>
                <span className="stat-value">{systemStats?.metrics?.total_users || 0}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper forms">
                <FaFileAlt />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Forms</span>
                <span className="stat-value">{systemStats?.metrics?.total_forms || 0}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper responses">
                <FaCheckCircle />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Submissions</span>
                <span className="stat-value">{systemStats?.metrics?.total_responses || 0}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper admins">
                <FaUserShield />
              </div>
              <div className="stat-info">
                <span className="stat-label">Active Admins</span>
                <span className="stat-value">{systemStats?.metrics?.active_admins || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="stats-charts-section">
          <h2 className="sa-section-title">User Distribution</h2>
          <div className="chart-wrapper" style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={systemStats?.distribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="role"
                >
                  {(systemStats?.distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TITLE */}
      < div className="page-title" >
        <h2>Account Management</h2>
        <div className="toolbar-actions">
          <div className="search-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <button
            className="create-account-btn"
            onClick={() => {
              createModal.open(null);
            }}
          >
            <FaPlus /> Create <span className="hide-on-mobile">Account</span>
          </button>
        </div>
      </div >

      {/* TABLE */}
      < div className="table-card" >
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '10px 12px',
            borderRadius: '8px',
            marginBottom: '10px'
          }}>
            {error}
          </div>
        )
        }
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="empty-row" style={{ textAlign: "center", padding: "20px" }}>Loading accounts...</td>
              </tr>
            ) : accounts && Array.isArray(accounts) && accounts.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-row" style={{ textAlign: "center", padding: "20px" }}>
                  No accounts created yet
                </td>
              </tr>
            ) : (
              filteredAccounts.map((acc, index) => (
                <tr key={`${acc.email || ''}-${acc.role || ''}-${acc.id ?? index}`}>
                  <td>{acc.name}</td>
                  <td>{acc.email}</td>
                  <td>{acc.role}</td>
                  <td
                    className={
                      String(acc.status).toLowerCase() === "active" ? "active" : "inactive"
                    }
                  >
                    {acc.status}
                  </td>
                  <td style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="edit-btn"
                      onClick={() => openEditModal(acc)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => openDeleteModal(acc)}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div >

      {/* CREATE / EDIT ACCOUNT MODAL */}
      < CreateAccountModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onCreate={handleCreateAccount}
        onUpdate={handleUpdateAccount}
        account={createModal.data}
      />

      {/* PROFILE VIEW MODAL */}
      {
        profileModal.isOpen && (
          <div className="modal-overlay">
            <div className="profile-modal-card">
              <span
                className="close-icon"
                onClick={profileModal.close}
              >
                ✖
              </span>

              <div className="profile-picture">
                <img src={superAdminProfile.photo} alt="Profile" />
              </div>

              <h3 className="profile-name">{superAdminProfile.name}</h3>

              <div className="profile-actions">
                <button
                  className="edit-profile-btn"
                  onClick={() => {
                    editProfileModal.open();
                    changePasswordModal.close();
                    setNewPassword("");
                    setConfirmNewPassword("");
                    setHideChangePasswordCta(false);
                  }}
                >
                  <FaUserEdit className="btn-icon" />
                  Edit Profile
                </button>

                <button className="logout-btn" onClick={handleLogout}>
                  Log out
                </button>
              </div>

            </div>
          </div>
        )
      }

      {/* EDIT PROFILE MODAL */}
      {
        editProfileModal.isOpen && (
          <div className="modal-overlay">
            <div className="profile-modal-card">
              <span
                className="close-icon"
                onClick={() => {
                  editProfileModal.close();
                  changePasswordModal.close();
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setHideChangePasswordCta(false);
                }}
              >
                ✖
              </span>

              {profileMessage && (
                <div className="success-banner" role="status" aria-live="polite">
                  {profileMessage}
                </div>
              )}

              <h3 className="profile-name">Edit Profile</h3>

              <div className="profile-picture">
                <img src={superAdminProfile.photo} alt="Profile" />

                {/* Hidden file input */}
                <input
                  type="file"
                  accept="image/*"
                  id="profileFileInput"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setSuperAdminProfile({
                        ...superAdminProfile,
                        photo: reader.result,
                      });
                    };
                    if (file) reader.readAsDataURL(file);
                  }}
                />

                {/* Overlay + icon */}
                <label htmlFor="profileFileInput" className="profile-upload-icon">
                  <FaCamera />
                </label>

              </div>


              <input
                type="text"
                value={superAdminProfile.name}
                onChange={(e) =>
                  setSuperAdminProfile({
                    ...superAdminProfile,
                    name: e.target.value,
                  })
                }
                placeholder="Full Name"
                className="profile-input"
              />

              <input
                type="email"
                value={superAdminProfile.email}
                onChange={(e) =>
                  setSuperAdminProfile({
                    ...superAdminProfile,
                    email: e.target.value,
                  })
                }
                placeholder="Email"
                className="profile-input"
              />

              {/* CHANGE PASSWORD */}
              <div style={{ marginTop: 10, width: "100%" }}>
                {!hideChangePasswordCta && !isChangePasswordOpen && (
                  <button
                    type="button"
                    className="edit-profile-btn"
                    onClick={() => {
                      setHideChangePasswordCta(true);
                      setTimeout(() => setHideChangePasswordCta(false), 700);
                      changePasswordModal.open();
                      setNewPassword("");
                      setConfirmNewPassword("");
                    }}
                    style={{ width: "100%" }}
                  >
                    Change Password
                  </button>
                )}

                {changePasswordModal.isOpen && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="profile-input"
                      autoComplete="new-password"
                    />
                    {newPassword.length > 0 && newPassword.length < 6 && (
                      <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
                        Password must be at least 6 characters.
                      </div>
                    )}

                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="profile-input"
                      autoComplete="new-password"
                      style={{ marginTop: 10 }}
                    />
                    {confirmNewPassword.length > 0 && newPassword !== confirmNewPassword && (
                      <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
                        Passwords do not match.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button className="save-btn" onClick={handleSaveProfile}>
                Save Changes
              </button>
            </div>
          </div>
        )
      }

      {/* DELETE CONFIRMATION MODAL */}
      {
        deleteModal.isOpen && (
          <div className="modal-overlay">
            <div className="delete-modal-card">
              <h3>Are you sure you want to delete this account?</h3>

              <div className="delete-actions">
                <button
                  className="cancel-btn"
                  onClick={deleteModal.close}
                >
                  Cancel
                </button>

                <button
                  className="confirm-delete-btn"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )
      }


    </div >
  );
}

export default SuperAdminDashboard;
