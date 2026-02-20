import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaPlus, FaTrash, FaSave, FaArrowLeft, FaAlignLeft, FaCheckSquare, FaCalendarAlt, FaList, FaStar } from "react-icons/fa";
import formService from "../services/formService";
import "../styles/FormBuilder.css";

// Floating action button for quickly adding fields at the end
const AddFieldFab = ({ onAddField }) => {
    const [open, setOpen] = useState(false);

    const handleChoose = (type) => {
        onAddField(type);
        setOpen(false);
    };

    return (
        <div className="fab-container">
            {open && (
                <div className="fab-menu">
                    <button type="button" onClick={() => handleChoose("text")}>
                        <FaAlignLeft />
                        <span>Text</span>
                    </button>
                    <button type="button" onClick={() => handleChoose("multiple-choice")}>
                        <FaCheckSquare />
                        <span>Multiple Choice</span>
                    </button>
                    <button type="button" onClick={() => handleChoose("date")}>
                        <FaCalendarAlt />
                        <span>Date</span>
                    </button>
                    <button type="button" onClick={() => handleChoose("select")}>
                        <FaList />
                        <span>Dropdown</span>
                    </button>
                    <button type="button" onClick={() => handleChoose("rating")}>
                        <FaStar />
                        <span>Rating</span>
                    </button>
                </div>
            )}

            <button
                type="button"
                className="fab-button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Add question"
            >
                <FaPlus />
            </button>
        </div>
    );
};

const FormBuilder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formTitle, setFormTitle] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [fields, setFields] = useState([]);
    const [branding, setBranding] = useState({
        logo_url: "",
        primary_color: "#3b82f6",
        theme: "light"
    });
    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);
    const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
    const [errors, setErrors] = useState({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

    const getValidationMessage = (pattern) => {
        const messages = {
            email: "Please enter a valid email address",
            phone: "Please enter a valid phone number",
            url: "Please enter a valid website URL",
            number: "Please enter numbers only"
        };
        return messages[pattern] || "Invalid input format";
    };

    const loadForm = useCallback(async () => {
        try {
            const data = await formService.getForm(id);
            setFormTitle(data.title || "");
            setFormDescription(data.description || "");
            setBranding(data.branding || {
                logo_url: "",
                primary_color: "#3b82f6",
                theme: "light"
            });

            let fieldsData = data.fields || [];
            if (typeof fieldsData === 'string') {
                try {
                    fieldsData = JSON.parse(fieldsData);
                } catch (e) {
                    fieldsData = [];
                }
            }
            setFields(Array.isArray(fieldsData) ? fieldsData : []);
            setHasUnsavedChanges(false);
        } catch (err) {
            console.error("Failed to load form:", err);
            alert("Error loading form data.");
            navigate("/dashboard");
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        if (isEditMode) {
            loadForm();
        }
    }, [isEditMode, loadForm]);

    // Warn when closing tab / browser with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!hasUnsavedChanges) return;
            e.preventDefault();
            // Chrome requires returnValue to be set
            e.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleTitleChange = (e) => {
        setFormTitle(e.target.value);
        setHasUnsavedChanges(true);
    };

    const handleDescriptionChange = (e) => {
        setFormDescription(e.target.value);
        setHasUnsavedChanges(true);
    };

    const addField = (type) => {
        const newField = {
            id: Date.now(),
            type,
            label: "",
            required: false,
            placeholder: type === "text" ? "Enter your answer..." : "",
            options: (type === "multiple-choice" || type === "select") ? ["Option 1", "Option 2"] : [],
            choiceType: type === "multiple-choice" ? "radio" : null,
            validation: type === "text" ? {} : undefined,
            conditions: []
        };
        setFields([...fields, newField]);
        setErrors({ ...errors, fields: null });
        setHasUnsavedChanges(true);
    };

    const updateField = (fieldId, updates) => {
        setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
        setHasUnsavedChanges(true);
    };

    const removeField = (fieldId) => {
        setFields(fields.filter(f => f.id !== fieldId));
        setHasUnsavedChanges(true);
    };

    const addOption = (fieldId) => {
        setFields(fields.map(f => {
            if (f.id === fieldId) {
                return { ...f, options: [...f.options, `Option ${f.options.length + 1}`] };
            }
            return f;
        }));
        setHasUnsavedChanges(true);
    };

    const updateOption = (fieldId, index, value) => {
        setFields(fields.map(f => {
            if (f.id === fieldId) {
                const newOptions = [...f.options];
                newOptions[index] = value;
                return { ...f, options: newOptions };
            }
            return f;
        }));
        setHasUnsavedChanges(true);
    };

    const removeOption = (fieldId, index) => {
        setFields(fields.map(f => {
            if (f.id === fieldId) {
                return { ...f, options: f.options.filter((_, i) => i !== index) };
            }
            return f;
        }));
        setHasUnsavedChanges(true);
    };

    const validate = () => {
        const newErrors = {};
        const newFieldErrors = {};

        if (!formTitle.trim()) newErrors.title = "Form title is required";
        if (!formDescription.trim()) newErrors.description = "Form description is required";
        if (fields.length === 0) newErrors.fields = "Add at least one field to your form";

        fields.forEach(field => {
            const errors = [];
            if (!field.label.trim()) {
                errors.push("Label is required");
            }
            if (field.type === "multiple-choice") {
                if (field.options.length < 2) {
                    errors.push("At least 2 options required");
                }
                const hasEmptyOption = field.options.some(opt => !opt.trim());
                if (hasEmptyOption) {
                    errors.push("Options cannot be empty");
                }
                const uniqueOptions = new Set(field.options.map(o => o.trim()));
                if (uniqueOptions.size !== field.options.length) {
                    errors.push("Options must be unique");
                }
            }
            if (errors.length > 0) {
                newFieldErrors[field.id] = errors;
            }
        });

        if (Object.keys(newFieldErrors).length > 0) {
            newErrors.fieldValidation = "Please fix the errors in your form fields";
        }

        setErrors({ ...newErrors, fieldErrors: newFieldErrors });
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            setSaving(false);
            return;
        }

        setShowSaveConfirmation(true);
    };



    const confirmSave = async () => {
        setShowSaveConfirmation(false);

        setSaving(true);
        try {
            const formData = {
                title: formTitle,
                description: formDescription,
                fields: fields,
                branding: branding,
                status: 'active'
            };

            if (isEditMode) {
                await formService.updateForm(id, formData);
            } else {
                await formService.createForm(formData);
            }
            setHasUnsavedChanges(false);
            navigate("/dashboard");
        } catch (err) {
            console.error("Failed to save form:", err);
            alert("Error saving form. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="builder-container">Loading...</div>;

    return (
        <div className="builder-container">
            <header className="builder-header">
                <div className="header-left">
                    <button
                        className="exit-btn"
                        onClick={() => {
                            if (hasUnsavedChanges) {
                                setShowLeaveConfirmation(true);
                            } else {
                                navigate("/dashboard");
                            }
                        }}
                        title="Back to Dashboard"
                    >
                        <FaArrowLeft />
                    </button>
                    <div className="builder-title-section">
                        <h1>{isEditMode ? "Edit Form" : "Create New Form"}</h1>
                        <p>Design your form with a professional touch</p>
                    </div>
                </div>
                <div className="builder-actions">
                    <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <FaSave /> {saving ? "Saving..." : "Save Form"}
                    </button>
                </div>
            </header>

            <main className="builder-layout">
                {/* SIDEBAR TOOLS */}
                <aside className="builder-sidebar">
                    <div className="sidebar-sticky">
                        <h2 className="builder-section-title">ADD FIELDS</h2>
                        <div className="field-tools-vertical">
                            <button className="tool-btn-vertical" onClick={() => addField("text")}>
                                <FaAlignLeft />
                                <span>Text Input</span>
                            </button>
                            <button className="tool-btn-vertical" onClick={() => addField("multiple-choice")}>
                                <FaCheckSquare />
                                <span>Multiple Choice</span>
                            </button>
                            <button className="tool-btn-vertical" onClick={() => addField("date")}>
                                <FaCalendarAlt />
                                <span>Date Field</span>
                            </button>
                            <button className="tool-btn-vertical" onClick={() => addField("select")}>
                                <FaList />
                                <span>Dropdown</span>
                            </button>
                            <button className="tool-btn-vertical" onClick={() => addField("rating")}>
                                <FaStar />
                                <span>Rating</span>
                            </button>
                        </div>
                        {errors.fields && <p className="error-msg" style={{ marginTop: '1rem' }}>{errors.fields}</p>}

                        <div className="builder-section" style={{ marginTop: '2rem' }}>
                            <h2 className="builder-section-title">BRANDING</h2>
                            <div className="branding-config">
                                <div className="builder-input-group">
                                    <label className="builder-label">Logo URL (Optional)</label>
                                    <input
                                        type="url"
                                        className="option-input"
                                        placeholder="https://example.com/logo.png"
                                        value={branding.logo_url}
                                        onChange={(e) => setBranding(prev => ({ ...prev, logo_url: e.target.value }))}
                                    />
                                    {branding.logo_url && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <img
                                                src={branding.logo_url}
                                                alt="Logo preview"
                                                style={{ maxWidth: '100px', maxHeight: '50px', objectFit: 'contain' }}
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="builder-input-group">
                                    <label className="builder-label">Primary Color</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input
                                            type="color"
                                            value={branding.primary_color}
                                            onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                                            style={{ width: '50px', height: '40px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
                                        />
                                        <input
                                            type="text"
                                            value={branding.primary_color}
                                            onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                                            placeholder="#3b82f6"
                                            style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                        />
                                    </div>
                                </div>

                                <div className="builder-input-group">
                                    <label className="builder-label">Theme</label>
                                    <select
                                        className="option-input"
                                        value={branding.theme}
                                        onChange={(e) => setBranding(prev => ({ ...prev, theme: e.target.value }))}
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                        <option value="auto">Auto (System)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="builder-tips">
                            <h3>Quick Tip</h3>
                            <p>Fields are auto-saved as you build. Don't forget to Save your form before exiting!</p>
                        </div>
                    </div>
                </aside>

                {/* MAIN BUILDER AREA */}
                <div className="builder-main-canvas">
                    {/* FORM HEADER */}
                    <section className="builder-card form-header-card">
                        <div className="builder-input-group">
                            <label className="builder-label">Form Title</label>
                            <input
                                type="text"
                                className="title-input"
                                placeholder="e.g. Customer Satisfaction Survey"
                                value={formTitle}
                                onChange={handleTitleChange}
                                autoFocus
                            />
                            {errors.title && <span className="error-msg">{errors.title}</span>}
                        </div>
                        <div className="builder-input-group">
                            <label className="builder-label">Background / Description</label>
                            <textarea
                                className="description-input"
                                placeholder="Provide context for your respondents..."
                                rows="2"
                                value={formDescription}
                                onChange={handleDescriptionChange}
                            />
                            {errors.description && <span className="error-msg">{errors.description}</span>}
                        </div>
                    </section>

                    {/* FIELD LIST */}
                    <section className="field-list">
                        {fields.length === 0 ? (
                            <div className="empty-fields-state">
                                <div className="empty-state-icon">
                                    <FaPlus />
                                </div>
                                <p>Your form is empty. Select a field type from the sidebar to start building your professional form.</p>
                            </div>
                        ) : (
                            fields.map((field, index) => (
                                <div className={`field-item ${errors.fieldErrors?.[field.id] ? 'has-error' : ''}`}>
                                    <div className="field-item-header">
                                        <span className="field-type-tag">Field #{index + 1} • {field.type.replace("-", " ")}</span>
                                        <button className="remove-field-btn" onClick={() => removeField(field.id)} title="Remove Field">
                                            <FaTrash />
                                        </button>
                                    </div>

                                    <div className="builder-input-group">
                                        <label className="builder-label">Field Label</label>
                                        <input
                                            type="text"
                                            className="field-label-input"
                                            placeholder="Question or Label (e.g. What is your name?)"
                                            value={field.label}
                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                        />
                                        {errors.fieldErrors?.[field.id]?.includes("Label is required") && (
                                            <span className="error-msg small">Label is required</span>
                                        )}
                                    </div>

                                    {field.type === "text" && (
                                        <>
                                            <div className="builder-input-group">
                                                <label className="builder-label">Input Placeholder</label>
                                                <input
                                                    type="text"
                                                    className="option-input"
                                                    placeholder="e.g. Type your answer here..."
                                                    value={field.placeholder || ""}
                                                    onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                                />
                                            </div>
                                            <div className="builder-input-group">
                                                <label className="builder-label">Validation Pattern (Optional)</label>
                                                <select
                                                    className="validation-select"
                                                    value={field.validation?.pattern || ""}
                                                    onChange={(e) => updateField(field.id, {
                                                        validation: {
                                                            ...field.validation,
                                                            pattern: e.target.value,
                                                            message: e.target.value ? getValidationMessage(e.target.value) : ""
                                                        }
                                                    })}
                                                    style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db', width: '100%' }}
                                                >
                                                    <option value="">No validation</option>
                                                    <option value="email">Email address</option>
                                                    <option value="phone">Phone number</option>
                                                    <option value="url">Website URL</option>
                                                    <option value="number">Numbers only</option>
                                                    <option value="custom">Custom regex</option>
                                                </select>
                                                {field.validation?.pattern === "custom" && (
                                                    <input
                                                        type="text"
                                                        className="option-input"
                                                        placeholder="Enter regex pattern (e.g. ^[A-Z]{2}\d{6}$)"
                                                        value={field.validation?.customPattern || ""}
                                                        onChange={(e) => updateField(field.id, {
                                                            validation: {
                                                                ...field.validation,
                                                                customPattern: e.target.value
                                                            }
                                                        })}
                                                        style={{ marginTop: '0.5rem' }}
                                                    />
                                                )}
                                                {field.validation?.message && (
                                                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                                                        Error message: "{field.validation.message}"
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {field.type === "multiple-choice" && (
                                        <div className="field-options-list">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <label className="builder-label" style={{ marginBottom: 0 }}>Options</label>
                                                <select
                                                    className="choice-type-select"
                                                    value={field.choiceType || "radio"}
                                                    onChange={(e) => updateField(field.id, { choiceType: e.target.value })}
                                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                                >
                                                    <option value="radio">Single Choice (Radio)</option>
                                                    <option value="checkbox">Multiple Choice (Checkbox)</option>
                                                </select>
                                            </div>
                                            {field.options.map((opt, optIndex) => (
                                                <div key={optIndex} className="option-row">
                                                    <div className="dot" style={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: field.choiceType === 'checkbox' ? '2px' : '50%',
                                                        background: '#cbd5e1'
                                                    }} />
                                                    <input
                                                        type="text"
                                                        className="option-input"
                                                        value={opt}
                                                        onChange={(e) => updateOption(field.id, optIndex, e.target.value)}
                                                    />
                                                    {field.options.length > 2 && (
                                                        <button className="remove-field-btn" onClick={() => removeOption(field.id, optIndex)}>
                                                            <FaTrash size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button className="add-option-btn" onClick={() => addOption(field.id)}>
                                                <FaPlus size={10} /> Add Option
                                            </button>
                                            {errors.fieldErrors?.[field.id]?.some(e => e.includes("option") || e.includes("Option")) && (
                                                <span className="error-msg small" style={{ marginTop: '0.5rem', display: 'block' }}>
                                                    {errors.fieldErrors?.[field.id].find(e => e.includes("option") || e.includes("Option"))}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {field.type === "date" && (
                                        <div className="builder-input-group" style={{ opacity: 0.5 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                                <FaCalendarAlt color="#64748b" />
                                                <span style={{ color: '#64748b' }}>Date picker will appear for respondents</span>
                                            </div>
                                        </div>
                                    )}

                                    {field.type === "select" && (
                                        <div className="field-options-list">
                                            <label className="builder-label">Dropdown Options</label>
                                            {field.options.map((opt, optIndex) => (
                                                <div key={optIndex} className="option-row">
                                                    <div className="dot" style={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '2px',
                                                        background: '#cbd5e1'
                                                    }} />
                                                    <input
                                                        type="text"
                                                        className="option-input"
                                                        value={opt}
                                                        onChange={(e) => updateOption(field.id, optIndex, e.target.value)}
                                                    />
                                                    {field.options.length > 1 && (
                                                        <button className="remove-field-btn" onClick={() => removeOption(field.id, optIndex)}>
                                                            <FaTrash size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button className="add-option-btn" onClick={() => addOption(field.id)}>
                                                <FaPlus size={10} /> Add Option
                                            </button>
                                            {errors.fieldErrors?.[field.id]?.some(e => e.includes("option") || e.includes("Option")) && (
                                                <span className="error-msg small" style={{ marginTop: '0.5rem', display: 'block' }}>
                                                    {errors.fieldErrors?.[field.id].find(e => e.includes("option") || e.includes("Option"))}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {field.type === "rating" && (
                                        <div className="builder-input-group">
                                            <label className="builder-label">Rating Scale (1-10)</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                                <FaStar color="#64748b" />
                                                <span style={{ color: '#64748b' }}>Star rating (1-10) will appear for respondents</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="field-footer">
                                        <label className="required-toggle">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                            />
                                            Mark as Required
                                        </label>

                                        {/* Conditional Logic Section */}
                                        <div className="conditional-logic-section" style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                <input
                                                    type="checkbox"
                                                    id={`conditional-${field.id}`}
                                                    checked={field.conditions && field.conditions.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            updateField(field.id, {
                                                                conditions: [{ field_id: '', operator: 'equals', value: '' }]
                                                            });
                                                        } else {
                                                            updateField(field.id, { conditions: [] });
                                                        }
                                                    }}
                                                />
                                                <label htmlFor={`conditional-${field.id}`} style={{ fontWeight: '500', color: '#374151' }}>
                                                    Show this field only if conditions are met
                                                </label>
                                            </div>

                                            {field.conditions && field.conditions.length > 0 && (
                                                <div className="conditions-list">
                                                    {field.conditions.map((condition, condIndex) => (
                                                        <div key={condIndex} className="condition-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>If</span>
                                                            <select
                                                                className="condition-field-select"
                                                                value={condition.field_id}
                                                                onChange={(e) => {
                                                                    const newConditions = [...field.conditions];
                                                                    newConditions[condIndex].field_id = e.target.value;
                                                                    updateField(field.id, { conditions: newConditions });
                                                                }}
                                                                style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                                                            >
                                                                <option value="">Select field...</option>
                                                                {fields.filter(f => f.id !== field.id).map(otherField => (
                                                                    <option key={otherField.id} value={otherField.id}>
                                                                        {otherField.label || `Field ${fields.indexOf(otherField) + 1}`}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <select
                                                                className="condition-operator-select"
                                                                value={condition.operator}
                                                                onChange={(e) => {
                                                                    const newConditions = [...field.conditions];
                                                                    newConditions[condIndex].operator = e.target.value;
                                                                    updateField(field.id, { conditions: newConditions });
                                                                }}
                                                                style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                                                            >
                                                                <option value="equals">equals</option>
                                                                <option value="not_equals">does not equal</option>
                                                                <option value="contains">contains</option>
                                                                <option value="not_contains">does not contain</option>
                                                                <option value="greater_than">is greater than</option>
                                                                <option value="less_than">is less than</option>
                                                            </select>
                                                            <input
                                                                type="text"
                                                                className="condition-value-input"
                                                                placeholder="value"
                                                                value={condition.value}
                                                                onChange={(e) => {
                                                                    const newConditions = [...field.conditions];
                                                                    newConditions[condIndex].value = e.target.value;
                                                                    updateField(field.id, { conditions: newConditions });
                                                                }}
                                                                style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db', fontSize: '0.875rem', minWidth: '100px' }}
                                                            />
                                                            <button
                                                                className="remove-condition-btn"
                                                                onClick={() => {
                                                                    const newConditions = field.conditions.filter((_, i) => i !== condIndex);
                                                                    updateField(field.id, { conditions: newConditions });
                                                                }}
                                                                style={{ padding: '0.25rem', border: 'none', background: '#ef4444', color: 'white', borderRadius: '0.25rem', cursor: 'pointer' }}
                                                                title="Remove condition"
                                                            >
                                                                <FaTrash size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        className="add-condition-btn"
                                                        onClick={() => {
                                                            const newConditions = [...field.conditions, { field_id: '', operator: 'equals', value: '' }];
                                                            updateField(field.id, { conditions: newConditions });
                                                        }}
                                                        style={{ padding: '0.25rem 0.75rem', border: '1px solid #d1d5db', background: 'white', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}
                                                    >
                                                        <FaPlus size={10} style={{ marginRight: '0.25rem' }} /> Add Condition
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {errors.fieldErrors?.[field.id] && (
                                        <div className="field-error-banner">
                                            Please correct errors above
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        {errors.fieldValidation && <p className="error-msg" style={{ textAlign: 'center', marginTop: '1rem' }}>{errors.fieldValidation}</p>}
                    </section>
                </div>
            </main>

            {showSaveConfirmation && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Confirm Save</h3>
                        <p>Are you sure you want to save this form?</p>
                        <div className="modal-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowSaveConfirmation(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={confirmSave}
                            >
                                Confirm Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showLeaveConfirmation && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Discard changes?</h3>
                        <p>You have unsaved changes. If you go back now, your edits will be lost.</p>
                        <div className="modal-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowLeaveConfirmation(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    setShowLeaveConfirmation(false);
                                    setHasUnsavedChanges(false);
                                    navigate("/dashboard");
                                }}
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating action button to add fields at the end */}
            <AddFieldFab onAddField={addField} />
        </div>
    );
};

export default FormBuilder;
