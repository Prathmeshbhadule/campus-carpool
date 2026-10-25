import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showSuccess, showError } = useToast();

  const [form, setForm] = useState({
    name: '',
    role: 'student',
    prn: '',
    email: '',
    password: '',
    department: 'School of Computer Engineering',
    phone: '',
    hasVehicle: false,
    vehicleType: 'car',
    vehicleModel: '',
    vehiclePlate: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validateField = (name, value) => {
    let error = '';
    if (name === 'name' && (!value.trim() || value.trim().length < 2)) {
      error = 'Full name must be at least 2 characters';
    }

    if (name === 'email') {
      if (!value.trim()) {
        error = 'College email is required';
      } else if (!/^[a-zA-Z0-9._%+-]+@mitaoe\.ac\.in$/.test(value.trim())) {
        error = 'Must end with @mitaoe.ac.in (Students: use 12-digit PRN@mitaoe.ac.in)';
      }
    }

    if (name === 'prn' && form.role === 'student') {
      if (!value.trim()) {
        error = '12-digit student PRN is required';
      } else if (!/^\d{12}$/.test(value.trim())) {
        error = 'PRN must be exactly 12 digits (e.g. 122100451001)';
      }
    }

    if (name === 'password' && (!value || value.length < 6)) {
      error = 'Password must be at least 6 characters long';
    }

    if (name === 'phone') {
      if (!value.trim()) {
        error = 'Phone number is required';
      } else if (!/^(\+91[\-\s]?)?[6-9]\d{9}$/.test(value.trim())) {
        error = 'Enter a valid 10-digit Indian phone number';
      }
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm(prev => ({ ...prev, [name]: val }));

    const err = validateField(name, val);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const err = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const validateAll = () => {
    const newErrors = {};
    Object.keys(form).forEach(key => {
      const err = validateField(key, form[key]);
      if (err) newErrors[key] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      showError('Please correct the validation errors before registering.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        prn: form.role === 'student' ? form.prn.trim() : undefined,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        department: form.department,
        phone: form.phone.trim(),
        vehicle: {
          hasVehicle: form.hasVehicle,
          type: form.hasVehicle ? form.vehicleType : 'none',
          model: form.hasVehicle ? form.vehicleModel.trim() : '',
          plate: form.hasVehicle ? form.vehiclePlate.trim() : ''
        }
      };

      const user = await register(payload);
      showSuccess(`Account created! Welcome to MITAOE Carpool, ${user.name}`);
      navigate('/dashboard');
    } catch (err) {
      showError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-7 col-md-9">
          <div className="card card-carpool border-0 shadow-sm p-4 p-md-5">
            <div className="text-center mb-4">
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle mb-2">
                Verified Campus Transit Community
              </span>
              <h3 className="fw-bold text-dark">Join MITAOE Campus Carpool</h3>
              <p className="text-muted small">
                Sign up with your official MIT Academy of Engineering email and PRN.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="row g-3">
                {/* Role selection */}
                <div className="col-12">
                  <label className="form-label">I am a</label>
                  <div className="d-flex gap-3">
                    {['student', 'faculty', 'admin'].map((r) => (
                      <div key={r} className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="role"
                          id={`role-${r}`}
                          value={r}
                          checked={form.role === r}
                          onChange={handleChange}
                        />
                        <label className="form-check-label text-capitalize fw-semibold" htmlFor={`role-${r}`}>
                          {r}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div className="col-md-6">
                  <label className="form-label">Full Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    placeholder="e.g. Aarav Deshmukh"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.name && <div className="form-feedback-error">{errors.name}</div>}
                </div>

                {/* PRN (For students) */}
                {form.role === 'student' && (
                  <div className="col-md-6">
                    <label className="form-label">12-Digit Student PRN <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className={`form-control ${errors.prn ? 'is-invalid' : ''}`}
                      placeholder="e.g. 122100451001"
                      name="prn"
                      value={form.prn}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errors.prn && <div className="form-feedback-error">{errors.prn}</div>}
                  </div>
                )}

                {/* Email */}
                <div className="col-md-6">
                  <label className="form-label">College Email Address <span className="text-danger">*</span></label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    placeholder={form.role === 'student' ? '122100451001@mitaoe.ac.in' : 'name.surname@mitaoe.ac.in'}
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.email && <div className="form-feedback-error">{errors.email}</div>}
                </div>

                {/* Password */}
                <div className="col-md-6">
                  <label className="form-label">Password <span className="text-danger">*</span></label>
                  <input
                    type="password"
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    placeholder="At least 6 characters"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.password && <div className="form-feedback-error">{errors.password}</div>}
                </div>

                {/* Department */}
                <div className="col-md-6">
                  <label className="form-label">Department / School <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                  >
                    <option value="School of Computer Engineering">School of Computer Engineering</option>
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Data Science Engineering">Data Science Engineering</option>
                    <option value="AIML Engineering">AIML Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Chemical Engineering">Chemical Engineering</option>
                    <option value="School of Design">School of Design</option>
                    <option value="First Year Engineering">First Year Engineering</option>
                    <option value="Administration / Staff">Administration / Staff</option>
                  </select>
                </div>

                {/* Phone */}
                <div className="col-md-6">
                  <label className="form-label">Mobile Contact Number <span className="text-danger">*</span></label>
                  <input
                    type="tel"
                    className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                    placeholder="e.g. 9890123456"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.phone && <div className="form-feedback-error">{errors.phone}</div>}
                </div>

                {/* Vehicle Toggle */}
                <div className="col-12 pt-3 border-top">
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="regVehicleCheck"
                      name="hasVehicle"
                      checked={form.hasVehicle}
                      onChange={handleChange}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="regVehicleCheck">
                      I have a vehicle and can offer rides as a Driver
                    </label>
                  </div>
                  <div className="text-muted small mb-2" style={{ fontSize: '0.78rem' }}>
                    <i className="bi bi-arrow-left-right text-primary me-1"></i>
                    <strong>Dual Role:</strong> All registered members can act as both a <strong>Driver</strong> (when offering seats) and a <strong>Rider / Passenger</strong> (when booking seats). You can also add or change vehicle info later in your profile.
                  </div>

                  {form.hasVehicle && (
                    <div className="row g-2 p-3 bg-light rounded mt-1">
                      <div className="col-md-4">
                        <label className="form-label small">Vehicle Type</label>
                        <select
                          className="form-select form-select-sm"
                          name="vehicleType"
                          value={form.vehicleType}
                          onChange={handleChange}
                        >
                          <option value="car">Car (4-Wheeler)</option>
                          <option value="bike">Bike (2-Wheeler)</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small">Vehicle Model</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Hyundai i20"
                          name="vehicleModel"
                          value={form.vehicleModel}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small">License Plate</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. MH 12 DE 3412"
                          name="vehiclePlate"
                          value={form.vehiclePlate}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary-carpool w-100 py-2 mt-4 d-flex align-items-center justify-content-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    Registering Account...
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-plus-fill"></i> Create Verified Account
                  </>
                )}
              </button>

              <div className="text-center small text-muted mt-3">
                Already registered?{' '}
                <Link to="/login" className="text-primary fw-semibold text-decoration-none">
                  Sign In
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
