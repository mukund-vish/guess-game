import React, { useState, useRef, useEffect } from 'react';
import './Login.css';
import { api } from '../../lib/api';

const Login = ({ onSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [rememberMe, setRememberMe] = useState(true); // Default to true as per request

    // Refs for auto-scrolling to errors
    const fieldRefs = {
        username: useRef(null),
        displayName: useRef(null),
        email: useRef(null),
        password: useRef(null),
        confirmPassword: useRef(null)
    };

    // Auto-scroll to the first field with an error
    useEffect(() => {
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField && fieldRefs[firstErrorField]?.current) {
            fieldRefs[firstErrorField].current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            // Also focus the field for better accessibility
            fieldRefs[firstErrorField].current.focus();
        }
    }, [errors]);

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setErrors({});
        setServerError('');
        setSuccessMessage('');
        setEmail('');
        setPassword('');
        setUsername('');
        setDisplayName('');
        setConfirmPassword('');
        setShowPassword(false);
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!email) newErrors.email = 'Email is required';
        else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) newErrors.email = 'Please enter a valid email address';
        }

        if (!password) newErrors.password = 'Password is required';
        else if (!isLogin) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
            if (!passwordRegex.test(password)) {
                newErrors.password = 'Password must be 8+ chars with uppercase, lowercase, number, and special character';
            }
        }

        if (!isLogin) {
            if (!username) newErrors.username = 'Username is required';
            else if (/\s/.test(username)) newErrors.username = 'Username cannot contain spaces';
            if (!displayName) newErrors.displayName = 'Display name is required';
            if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
            else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const clearFieldError = (fieldName) => {
        if (errors[fieldName]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setServerError('');
        setSuccessMessage('');

        if (!validateForm()) return;

        setIsLoading(true);
        try {
            if (isLogin) {
                const result = await api('/api/verify_user', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                setSuccessMessage('Welcome back! Login successful.');
                console.log('Login success:', result);
                
                const userData = result.user || { ...result, email, username: username || result.username || email.split('@')[0] };
                if (rememberMe) {
                    const sessionData = {
                        user: userData,
                        expiresAt: Date.now() + 15 * 24 * 60 * 60 * 1000 // 15 days
                    };
                    localStorage.setItem('auth_session', JSON.stringify(sessionData));
                }
                
                if (onSuccess) onSuccess(userData);
            } else {
                const result = await api('/api/new_user', {
                    method: 'POST',
                    body: JSON.stringify({
                        email,
                        password,
                        username: username.toLowerCase().trim(),
                        display_name: displayName
                    })
                });

                setSuccessMessage('Account created! Enjoy your time here!');
                console.log('Signup success:', result);

                const userData = result.user || { ...result, email, username };
                if (rememberMe) {
                    const sessionData = {
                        user: userData,
                        expiresAt: Date.now() + 15 * 24 * 60 * 60 * 1000 // 15 days
                    };
                    localStorage.setItem('auth_session', JSON.stringify(sessionData));
                }

                if (onSuccess) onSuccess(userData);
            }
        } catch (err) {
            console.error('Auth error:', err);
            const errorMessage = err.message || '';

            if (errorMessage.toLowerCase().includes('username already taken')) {
                setErrors(prev => ({ ...prev, username: 'Username already taken' }));
            } else if (errorMessage.toLowerCase().includes('user already exists') ||
                errorMessage.toLowerCase().includes('already registered')) {
                setErrors(prev => ({ ...prev, email: 'Email already in use' }));
            } else {
                let displayError = errorMessage;
                try {
                    // One last check if it's still a JSON string
                    const parsed = JSON.parse(displayError);
                    displayError = parsed.error || parsed.message || displayError;
                } catch (e) {
                    // Not JSON, use as is
                }
                setServerError(displayError || 'An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-artwork">
                <div className="artwork-overlay">
                    <div className="artwork-content">
                        <h1>GuessWhat?</h1>
                        <p>Unleash your wit. Solve the clues.</p>
                    </div>
                </div>
            </div>
            <div className="login-card-wrapper">
                <div className="login-card">
                    <div className="login-header">
                        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                        <p>{isLogin ? 'Join the guessing circle.' : 'Start your mystery journey today.'}</p>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit} noValidate>
                        {!isLogin && (
                            <>
                                <div className="input-group">
                                    <label>Username</label>
                                    <input
                                        ref={fieldRefs.username}
                                        type="text"
                                        placeholder="johndoe123"
                                        className={errors.username ? 'input-error' : ''}
                                        value={username}
                                        onChange={(e) => { 
                                            const val = e.target.value.toLowerCase().replace(/\s/g, '');
                                            setUsername(val); 
                                            clearFieldError('username'); 
                                        }}
                                        required
                                    />
                                    {errors.username && <span className="field-error">{errors.username}</span>}
                                </div>
                                <div className="input-group">
                                    <label>Display Name</label>
                                    <input
                                        ref={fieldRefs.displayName}
                                        type="text"
                                        placeholder="John Doe"
                                        className={errors.displayName ? 'input-error' : ''}
                                        value={displayName}
                                        onChange={(e) => { setDisplayName(e.target.value); clearFieldError('displayName'); }}
                                        required
                                    />
                                    {errors.displayName && <span className="field-error">{errors.displayName}</span>}
                                </div>
                            </>
                        )}
                        <div className="input-group">
                            <label>Email Address</label>
                            <input
                                ref={fieldRefs.email}
                                type="email"
                                placeholder="name@example.com"
                                className={errors.email ? 'input-error' : ''}
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                                required
                            />
                            {errors.email && <span className="field-error">{errors.email}</span>}
                        </div>
                        <div className="input-group">
                            <label>Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    ref={fieldRefs.password}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className={errors.password ? 'input-error' : ''}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={togglePasswordVisibility}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {errors.password && <span className="field-error">{errors.password}</span>}
                        </div>
                        {!isLogin && (
                            <div className="input-group">
                                <label>Confirm Password</label>
                                <input
                                    ref={fieldRefs.confirmPassword}
                                    type="password"
                                    placeholder="••••••••"
                                    className={errors.confirmPassword ? 'input-error' : ''}
                                    value={confirmPassword}
                                    onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
                                    onFocus={() => setShowPassword(false)}
                                    required
                                />
                                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
                            </div>
                        )}

                        {serverError && <div className="server-error-message">{serverError}</div>}
                        {successMessage && <div className="success-message">{successMessage}</div>}

                        <div className="form-options">
                            <label className="remember-me">
                                <input 
                                    type="checkbox" 
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                /> Remember me
                            </label>
                            {isLogin && <a href="#" className="forgot-password">Forgot Password?</a>}
                        </div>

                        <button type="submit" className="login-button" disabled={isLoading}>
                            {isLoading ? (
                                <span className="loader-dots">
                                    <span>.</span><span>.</span><span>.</span>
                                </span>
                            ) : (
                                isLogin ? 'Login' : 'Sign Up'
                            )}
                        </button>
                    </form>

                    <div className="social-login">
                        <div className="divider">
                            <span>or continue with</span>
                        </div>
                        <div className="social-buttons">
                            <button className="social-btn google">
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
                            </button>
                            <button className="social-btn facebook">
                                <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="Facebook" />
                            </button>
                            <button className="social-btn apple">
                                <img src="https://www.svgrepo.com/show/475630/apple-color.svg" alt="Apple" />
                            </button>
                        </div>
                    </div>

                    <p className="signup-link">
                        {isLogin ? (
                            <>
                                Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); toggleMode(); }}>Sign up for free</a>
                            </>
                        ) : (
                            <>
                                Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); toggleMode(); }}>Login</a>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
