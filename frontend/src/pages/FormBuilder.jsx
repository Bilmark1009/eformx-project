import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaPlus, FaTrash, FaSave, FaArrowLeft, FaAlignLeft, FaCheckSquare, FaCalendarAlt } from "react-icons/fa";
import formService from "../services/formService";
import "../styles/FormBuilder.css";

const FormBuilder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formTitle, setFormTitle] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);
    const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
    const [errors, setErrors] = useState({});

    const loadForm = useCallback(async () => {
        try {
            const data = await formService.getForm(id);
            setFormTitle(data.title || "");
            setFormDescription(data.description || "");

            let fieldsData = data.fields || [];
            if (typeof fieldsData === 'string') {
                try {
                    fieldsData = JSON.parse(fieldsData);
                } catch (e) {
                    fieldsData = [];
                }
            }
            setFields(Array.isArray(fieldsData) ? fieldsData : []);
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

    const addField = (type) => {
        const newField = {
            id: Date.now(),
            type,
            label: "",
            required: false,
            placeholder: type === "text" ? "Enter placeholder text..." : "",
            options: type === "multiple-choice" ? ["Option 1", "Option 2"] : [],
            choiceType: type === "multiple-choice" ? "radio" : null
        };
        setFields([...fields, newField]);
        setErrors({ ...errors, fields: null });
    };

    const updateField = (fieldId, updates) => {
        setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
    };

    const removeField = (fieldId) => {
        setFields(fields.filter(f => f.id !== fieldId));
    };

    const addOption = (fieldId) => {
        setFields(fields.map(f => {
            if (f.id === fieldId) {
                return { ...f, options: [...f.options, `Option ${f.options.length + 1}`] };
            }
            return f;
        }));
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
    };

    const removeOption = (fieldId, index) => {
        setFields(fields.map(f => {
            if (f.id === fieldId) {
                return { ...f, options: f.options.filter((_, i) => i !== index) };
            }
            return f;
        }));
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
                status: 'active'
            };

            if (isEditMode) {
                await formService.updateForm(id, formData);
            } else {
                await formService.createForm(formData);
            }
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
                    <button className="exit-btn" onClick={() => navigate("/dashboard")} title="Back to Dashboard">
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
                        </div>
                        {errors.fields && <p className="error-msg" style={{ marginTop: '1rem' }}>{errors.fields}</p>}

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
                                onChange={(e) => setFormTitle(e.target.value)}
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
                                onChange={(e) => setFormDescription(e.target.value)}
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
                                        <div className="builder-input-group">
                                            <label className="builder-label">Input Placeholder</label>
                                            <input
                                                type="text"
                                                className="option-input"
                                                placeholder="e.g. Type your answer here..."
                                                value={field.placeholder}
                                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                            />
                                        </div>
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

                                    <div className="field-footer">
                                        <label className="required-toggle">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                            />
                                            Mark as Required
                                        </label>
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
        </div>
    );
};

export default FormBuilder;
