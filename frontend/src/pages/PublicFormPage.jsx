import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import formService from '../services/formService';
import api from '../services/api';
import '../styles/PublicFormPage.css';
import logo from '../assets/eFormX.png';

const attemptCreationPromises = new Map();

const PublicFormPage = () => {
    const { id } = useParams();
    const [form, setForm] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [studentId] = useState(getOrCreateStudentId);

    const [hasNameField, setHasNameField] = useState(false);
    const [hasEmailField, setHasEmailField] = useState(false);
    const attemptIdRef = useRef(null);
    const hasSubmittedRef = useRef(false);
    const sessionKeyRef = useRef(null);
    const reloadGuardKeyRef = useRef(null);

    const loadAttemptFromSession = (formId) => {
        const key = `form_attempt_${formId}`;
        sessionKeyRef.current = key;
        try {
            const raw = sessionStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && parsed.attemptId) {
                return parsed.attemptId;
            }
        } catch (e) {
            console.warn('Failed to parse stored attempt id', e);
        }
        return null;
    };

    const storeAttemptInSession = (attemptId) => {
        if (!sessionKeyRef.current) return;
        try {
            sessionStorage.setItem(sessionKeyRef.current, JSON.stringify({ attemptId }));
        } catch (e) {
            console.warn('Failed to persist attempt id', e);
        }
    };

    const clearAttemptFromSession = () => {
        if (!sessionKeyRef.current) return;
        sessionStorage.removeItem(sessionKeyRef.current);
    };

    const setReloadGuard = () => {
        if (!reloadGuardKeyRef.current) return;
        try {
            sessionStorage.setItem(reloadGuardKeyRef.current, '1');
        } catch (e) {
            // swallow
        }
    };

    const clearReloadGuard = () => {
        if (!reloadGuardKeyRef.current) return;
        try {
            sessionStorage.removeItem(reloadGuardKeyRef.current);
        } catch (e) {
            // swallow
        }
    };

    const ensureAttemptForForm = async (formId) => {
        const storedAttemptId = loadAttemptFromSession(formId);
        if (storedAttemptId) {
            attemptIdRef.current = storedAttemptId;
            return storedAttemptId;
        }

        if (attemptCreationPromises.has(formId)) {
            const existingPromise = attemptCreationPromises.get(formId);
            const attemptId = await existingPromise;
            attemptIdRef.current = attemptId;
            return attemptId;
        }

        const creationPromise = (async () => {
            const attempt = await formService.startFormAttempt(formId);
            storeAttemptInSession(attempt.attempt_id);
            return attempt.attempt_id;
        })();

        attemptCreationPromises.set(formId, creationPromise);

        try {
            const attemptId = await creationPromise;
            attemptIdRef.current = attemptId;
            return attemptId;
        } finally {
            attemptCreationPromises.delete(formId);
        }
    };

    const isReloadNavigation = () => {
        const navEntries = performance.getEntriesByType('navigation');
        if (!navEntries || navEntries.length === 0) return false;
        return navEntries[0].type === 'reload';
    };

    const sendAbandonmentBeacon = () => {
        if (!attemptIdRef.current || hasSubmittedRef.current) {
            return;
        }

        // Avoid marking as abandoned on reloads; we keep the attempt alive for the session.
        if (isReloadNavigation()) {
            setTimeout(clearReloadGuard, 0);
            return;
        }

        // Also skip if a reload guard was set during beforeunload (persists across reloads in sessionStorage).
        if (reloadGuardKeyRef.current && sessionStorage.getItem(reloadGuardKeyRef.current)) {
            setTimeout(clearReloadGuard, 0);
            return;
        }

        const baseUrl = (api.defaults?.baseURL || process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
        if (!baseUrl) {
            return;
        }

        const url = `${baseUrl}/forms/attempts/${attemptIdRef.current}/status`;

        // Prefer sendBeacon with FormData; if unavailable or fails, fall back to fetch with keepalive.
        try {
            const payload = new FormData();
            payload.append('status', 'abandoned');
            if (navigator.sendBeacon) {
                const payload = new FormData();
                const ok = navigator.sendBeacon(url, payload);
                if (ok) return;
            }
        } catch (e) {
            // fall through to fetch
        }

        try {
            fetch(url, {
                method: 'POST',
                body: payload,
                keepalive: true,
                credentials: 'include',
            }).catch(() => {});
        } catch (e) {
            // swallow
        }

        setTimeout(clearReloadGuard, 0);
    };

    useEffect(() => {
        if (!studentId) {
            return;
        }

        const fetchForm = async () => {
            try {
                const data = await formService.getPublicForm(id, studentId);
                setForm(data);

                reloadGuardKeyRef.current = `form_attempt_reload_${data.id}`;
                clearReloadGuard();

                try {
                    await ensureAttemptForForm(data.id);
                } catch (attemptError) {
                    console.error('Failed to start form attempt:', attemptError);
                }

                // Detect if Name or Email fields exist in questions
                let nameFieldExists = false;
                let emailFieldExists = false;

                if (data.fields && Array.isArray(data.fields)) {
                    data.fields.forEach(field => {
                        const label = field.label?.toLowerCase().trim();
                        if (label === 'full name' || label === 'name') nameFieldExists = true;
                        if (label === 'email address' || label === 'email') emailFieldExists = true;
                    });
                }
                setHasNameField(nameFieldExists);
                setHasEmailField(emailFieldExists);

                // Initialize form data with empty strings for all fields
                const initialData = {
                    respondent_name: '',
                    respondent_email: ''
                };
                if (data.fields && Array.isArray(data.fields)) {
                    data.fields.forEach(field => {
                        const key = field.id || field.label;
                        if (field.type === 'multiple-choice' && field.choiceType === 'checkbox') {
                            initialData[key] = [];
                        } else {
                            initialData[key] = '';
                        }
                    });
                }
                setFormData(initialData);
            } catch (err) {
                console.error('Error fetching form:', err);
                setError(err.response?.data?.message || 'Failed to load form. It may not exist or is no longer active.');
            } finally {
                setLoading(false);
            }
        };

        fetchForm();
    }, [id, studentId]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            setReloadGuard();
            sendAbandonmentBeacon();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                sendAbandonmentBeacon();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            sendAbandonmentBeacon();
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const handleInputChange = (fieldId, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldId]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            // Prepare submission data
            let finalRespondentName = formData.respondent_name;
            let finalRespondentEmail = formData.respondent_email;

            // If we have redundant fields, use their values for the required respondent info
            if (form.fields && Array.isArray(form.fields)) {
                form.fields.forEach(field => {
                    const label = field.label?.toLowerCase().trim();
                    const key = field.id || field.label;
                    if ((label === 'full name' || label === 'name') && !finalRespondentName) {
                        finalRespondentName = formData[key];
                    }
                    if ((label === 'email address' || label === 'email') && !finalRespondentEmail) {
                        finalRespondentEmail = formData[key];
                    }
                });
            }

            const submission = {
                respondent_name: finalRespondentName,
                respondent_email: finalRespondentEmail,
                responses: { ...formData }
            };

            // Remove meta fields from responses object
            delete submission.responses.respondent_name;
            delete submission.responses.respondent_email;

            if (attemptIdRef.current) {
                submission.attempt_id = attemptIdRef.current;
            }

            await formService.submitResponse(id, submission);
            hasSubmittedRef.current = true;
            if (attemptIdRef.current) {
                try {
                    await formService.updateFormAttemptStatus(attemptIdRef.current, 'completed');
                } catch (statusError) {
                    console.error('Failed to mark attempt as completed:', statusError);
                }
            }
            clearAttemptFromSession();
            setSubmitted(true);
        } catch (err) {
            console.error('Error submitting form:', err);
            setError('Failed to submit response. Please check your data and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="public-form-loading">Loading form...</div>;
    }

    if (error) {
        return (
            <div className="public-form-error-container">
                <div className="error-card">
                    <h2>Oops!</h2>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>Try Again</button>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="public-form-success-container">
                <div className="success-card">
                    <div className="success-icon">✓</div>
                    <h2>Thank You!</h2>
                    <p>Your response has been successfully submitted to <strong>{form.title}</strong>.</p>
                    <button onClick={() => window.location.reload()}>Submit Another Response</button>
                </div>
            </div>
        );
    }

    const showInfoSection = !hasNameField || !hasEmailField;

    return (
        <div className="public-form-container">
            <div className="public-form-header">
                <img src={logo} alt="eFormX Logo" className="public-logo" />
            </div>

            <div className="public-form-card">
                <div className="public-form-info">
                    <h1>{form.title}</h1>
                    {form.description && <p className="public-form-description">{form.description}</p>}
                </div>

                <form onSubmit={handleSubmit} className="public-form">
                    {showInfoSection && (
                        <div className="public-form-section">
                            <h3>Your Information</h3>
                            {!hasNameField && (
                                <div className="public-form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.respondent_name}
                                        onChange={(e) => handleInputChange('respondent_name', e.target.value)}
                                        placeholder="Enter your full name"
                                    />
                                </div>
                            )}
                            {!hasEmailField && (
                                <div className="public-form-group">
                                    <label>Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.respondent_email}
                                        onChange={(e) => handleInputChange('respondent_email', e.target.value)}
                                        placeholder="Enter your email"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="public-form-section">
                        <h3>Questions</h3>
                        {form.fields && form.fields.map((field, index) => {
                            const key = field.id || field.label;
                            const labelReq = field.required ? '*' : '';
                            if (field.type === 'multiple-choice') {
                                const options = Array.isArray(field.options) ? field.options : [];
                                if (field.choiceType === 'radio') {
                                    const current = formData[key] ?? '';
                                    return (
                                        <div key={index} className="public-form-group">
                                            <label>{field.label} {labelReq}</label>
                                            <div className="options-group">
                                                {options.map((opt, i) => (
                                                    <label key={i} className="option-item">
                                                        <input
                                                            type="radio"
                                                            name={String(key)}
                                                            value={opt}
                                                            checked={current === opt}
                                                            onChange={() => handleInputChange(key, opt)}
                                                            required={field.required}
                                                        />
                                                        <span>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                // Default or 'checkbox' multi-select
                                const currentArr = Array.isArray(formData[key]) ? formData[key] : [];
                                const toggleCheckbox = (opt) => {
                                    const exists = currentArr.includes(opt);
                                    const next = exists ? currentArr.filter(v => v !== opt) : [...currentArr, opt];
                                    handleInputChange(key, next);
                                };
                                return (
                                    <div key={index} className="public-form-group">
                                        <label>{field.label} {labelReq}</label>
                                        <div className="options-group">
                                            {options.map((opt, i) => (
                                                <label key={i} className="option-item">
                                                    <input
                                                        type="checkbox"
                                                        name={String(key)}
                                                        value={opt}
                                                        checked={currentArr.includes(opt)}
                                                        onChange={() => toggleCheckbox(opt)}
                                                    />
                                                    <span>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }

                            // Non-multiple-choice inputs
                            return (
                                <div key={index} className="public-form-group">
                                    <label>{field.label} {labelReq}</label>
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            required={field.required}
                                            value={formData[key]}
                                            onChange={(e) => handleInputChange(key, e.target.value)}
                                            placeholder={`Enter ${field.label.toLowerCase()}`}
                                        />
                                    ) : field.type === 'select' ? (
                                        <select
                                            required={field.required}
                                            value={formData[key]}
                                            onChange={(e) => handleInputChange(key, e.target.value)}
                                        >
                                            <option value="">Select an option</option>
                                            {field.options && field.options.map((opt, i) => (
                                                <option key={i} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    const payload = new FormData();
                                    payload.append('status', 'abandoned');

                                    try {
                                        if (navigator.sendBeacon) {
                                            const ok = navigator.sendBeacon(url, payload);
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <button type="submit" className="submit-btn" disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Response'}
                    </button>
                </form>
            </div>

            <footer className="public-form-footer">
                <p>Powered by eFormX</p>
            </footer>
        </div>
    );
};

export default PublicFormPage;
