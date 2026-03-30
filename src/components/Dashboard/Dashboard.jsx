import React, { useMemo, useState } from 'react';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
    const [copied, setCopied] = useState(false);

    // Generate avatar background color or rainbow
    const avatarStyles = useMemo(() => {
        if (!user) return {};

        // Stable hash for username/email
        let hash = 0;
        const str = user.username || user.email || '';
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        // 5% chance of rainbow background (stable for the user)
        const isRainbow = Math.abs(hash) % 100 < 5;
        if (isRainbow) {
            return { isRainbow: true };
        }

        // Generate a stable color based on the same hash
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
            '#F06292', '#AED581', '#FFD54F', '#4DB6AC', '#7986CB'
        ];

        const color = colors[Math.abs(hash) % colors.length];

        return { backgroundColor: color };
    }, [user?.username, user?.email]);

    // Calculate initials
    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name[0].toUpperCase();
    };

    const displayName = user?.display_name || user?.username || 'Gamer';
    const initials = getInitials(displayName);

    const copyToClipboard = () => {
        if (!user?.username) return;
        navigator.clipboard.writeText(user.username);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <a href="/" className="logo">Guess What</a>
                </div>
                <div className="header-right">
                    <a href="#">Terms and Conditions</a>
                    <a href="#">Privacy Policy</a>
                    <button className="dashboard-logout-btn" onClick={onLogout}>Logout</button>
                </div>
            </header>

            <main className="main-content">
                <section className="user-profile-section">
                    <div
                        className={`user-avatar ${avatarStyles.isRainbow ? 'rainbow-bg' : ''}`}
                        style={!avatarStyles.isRainbow ? { backgroundColor: avatarStyles.backgroundColor } : {}}
                    >
                        {initials}
                    </div>
                    <div className="user-info">
                        <h2 className="display-name">{displayName}</h2>
                        <div className="username-wrapper">
                            <p className="username">@{user?.username || 'username'}</p>
                            <button
                                className={`copy-btn ${copied ? 'copied' : ''}`}
                                onClick={copyToClipboard}
                                title="Copy username"
                            >
                                {copied ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </section>

                <section className="stats-grid">
                    <div className="stat-column">
                        <span className="stat-value">0</span>
                        <span className="stat-label">Total Games</span>
                    </div>
                    <div className="stat-column">
                        <span className="stat-value">0</span>
                        <span className="stat-label">Total Wins</span>
                    </div>
                    <div className="stat-column last">
                        <div className="stat-info">
                            <span className="stat-value">0</span>
                            <span className="stat-label">Total Points</span>
                        </div>
                        <div className="stat-arrow">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </div>
                    </div>
                </section>

                <section className="bottom-section">
                    <div className="friends-section">
                        <div className="friends-header">
                            <h3>Friends List</h3>
                            <button className="add-friend-btn">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                Add Friend
                            </button>
                        </div>
                        <div className="empty-friends">
                            No friends added yet!
                        </div>
                    </div>
                    <div className="create-circle-section">
                        <button className="create-circle-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Create Circle
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Dashboard;
