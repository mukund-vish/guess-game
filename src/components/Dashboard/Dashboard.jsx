import React, { useMemo, useState, useRef } from 'react';
import './Dashboard.css';
import { api } from '../../lib/api';
import { compressImage } from '../../lib/imageUtils';
import CreateCircle from '../CreateCircle/CreateCircle';

const Dashboard = ({ user, onLogout, onUserUpdate }) => {
    const [copied, setCopied] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showCreateCircleModal, setShowCreateCircleModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [requestStatus, setRequestStatus] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [friendRequests, setFriendRequests] = useState([]);
    const [processingRequests, setProcessingRequests] = useState(new Set());
    const [friends, setFriends] = useState([]);
    const [isRefreshingFriends, setIsRefreshingFriends] = useState(false);
    const [processingFriends, setProcessingFriends] = useState(new Set());
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMiscOpen, setIsMiscOpen] = useState(false);
    const [activeMiscTab, setActiveMiscTab] = useState('notifications');
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [isRefreshingBlocks, setIsRefreshingBlocks] = useState(false);
    const [processingBlocks, setProcessingBlocks] = useState(new Set());
    const fileInputRef = useRef(null);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
        if (isMiscOpen) setIsMiscOpen(false);
    };

    const toggleMisc = () => {
        setIsMiscOpen(!isMiscOpen);
        if (isSidebarOpen) setIsSidebarOpen(false);
        if (!isMiscOpen) {
            // Fetch relevant data if opening
            if (activeMiscTab === 'blocks') {
                fetchBlockedUsers();
            }
        }
    };

    // Helper to format error messages
    const formatError = (err) => {
        let message = err.message || String(err);

        // Remove common prefixes added by backend or api utility
        message = message.replace(/^Upload failed:\s*/i, '');
        message = message.replace(/^Failed to process upload:\s*/i, '');

        try {
            // Try to parse if it's a JSON string
            const parsed = JSON.parse(message);
            const nestedError = parsed.error || parsed.message || message;

            // Recursive call if the nested error is also a JSON string
            if (typeof nestedError === 'string' && (nestedError.includes('{') || nestedError.includes('['))) {
                return formatError({ message: nestedError });
            }
            return typeof nestedError === 'object' ? JSON.stringify(nestedError) : nestedError;
        } catch (e) {
            // If parsing failed, check if there's a JSON-like part in the string
            const jsonMatch = message.match(/\{.*\}/);
            if (jsonMatch) {
                try {
                    const parsedMatch = JSON.parse(jsonMatch[0]);
                    return parsedMatch.error || parsedMatch.message || message;
                } catch (innerE) {
                    return message;
                }
            }
            return message;
        }
    };

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

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        const extension = file.name.split('.').pop().toLowerCase();

        if (!validExtensions.includes(extension)) {
            setUploadError('Invalid file type. Please use .jpg, .png, or .webp');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setUploadError('File size exceeds 2MB limit');
            return;
        }

        setUploadError(null);
        setIsUploading(true);

        try {
            // Compress image
            const compressedBlob = await compressImage(file, 512, 512, 0.9);
            const compressedFile = new File([compressedBlob], `avatar.${extension}`, { type: file.type });

            const formData = new FormData();
            formData.append('userId', user.playerid);
            formData.append('username', user.username || '');
            formData.append('display_name', user.display_name || user.username || '');
            formData.append('avatar', compressedFile);

            const data = await api('/api/avatar/upload', {
                body: formData,
            });

            if (data.success && data.avatar_url) {
                onUserUpdate({ avatar_url: data.avatar_url });
            }
        } catch (err) {
            console.error('Avatar upload error:', err);
            setUploadError(formatError(err));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAvatar = (e) => {
        e.stopPropagation();
        setUploadError(null);
        setShowConfirmDelete(true);
    };

    const confirmDeleteAvatar = async () => {
        setShowConfirmDelete(false);
        setIsUploading(true);
        setUploadError(null);

        try {
            const data = await api('/api/avatar/delete', {
                body: JSON.stringify({
                    userId: user.playerid,
                    username: user.username
                })
            });

            if (data.success) {
                onUserUpdate({ avatar_url: null });
            }
        } catch (err) {
            console.error('Avatar removal error:', err);
            setUploadError(formatError(err));
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearch = async (e) => {
        if (e.key !== 'Enter' || !searchQuery.trim()) return;

        setIsSearching(true);
        setSearchError(null);
        setSearchResult(null);
        setRequestStatus(null);

        try {
            const data = await api(`/api/search/${searchQuery.trim()}`, {
                body: JSON.stringify({ viewer_id: user?.playerid })
            });
            if (data && data.username) {
                setSearchResult(data);
            } else {
                setSearchError('User not found');
            }
        } catch (err) {
            setSearchError(formatError(err));
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddFriend = async (targetUsername) => {
        if (!user || !user.username) return;

        setIsSendingRequest(true);
        setRequestStatus(null);

        try {
            const data = await api('/api/add_friend', {
                body: JSON.stringify({
                    username: user.username,
                    target_username: targetUsername
                })
            });

            if (data.success) {
                setRequestStatus({ type: 'success', message: 'Friend request sent!' });
            } else {
                throw new Error(data.error || 'Failed to send friend request');
            }
        } catch (err) {
            setRequestStatus({ type: 'error', message: formatError(err) });
        } finally {
            setIsSendingRequest(false);
        }
    };

    const fetchFriendRequests = async () => {
        if (!user?.playerid) return;

        try {
            const data = await api('/api/fetch_requests', {
                body: JSON.stringify({ player_id: user.playerid })
            });
            if (Array.isArray(data)) {
                setFriendRequests(data.map(r => ({
                    ...r.sender,
                    friendship_id: r.id
                })));
            }
        } catch (err) {
            console.error('Failed to fetch friend requests:', err);
        }
    };

    const handleAcceptRequest = async (senderUsername) => {
        if (!user?.playerid || !senderUsername) return;

        const actionKey = `${senderUsername}-accept`;
        setProcessingRequests(prev => new Set(prev).add(actionKey));
        try {
            const data = await api('/api/update_request/accept', {
                body: JSON.stringify({
                    receiver_id: user.playerid,
                    sender_username: senderUsername
                })
            });
            if (data.success) {
                await fetchFriendRequests();
            } else {
                throw new Error(data.error || 'Failed to accept request');
            }
        } catch (err) {
            console.error('Failed to accept friend request:', err);
            alert(formatError(err));
        } finally {
            setProcessingRequests(prev => {
                const next = new Set(prev);
                next.delete(actionKey);
                return next;
            });
        }
    };

    const handleRejectRequest = async (senderUsername) => {
        if (!user?.playerid || !senderUsername) return;

        const actionKey = `${senderUsername}-reject`;
        setProcessingRequests(prev => new Set(prev).add(actionKey));
        try {
            const data = await api('/api/update_request/reject', {
                body: JSON.stringify({
                    receiver_id: user.playerid,
                    sender_username: senderUsername
                })
            });
            if (data.success) {
                await fetchFriendRequests();
            } else {
                throw new Error(data.error || 'Failed to reject request');
            }
        } catch (err) {
            console.error('Failed to reject friend request:', err);
            alert(formatError(err));
        } finally {
            setProcessingRequests(prev => {
                const next = new Set(prev);
                next.delete(actionKey);
                return next;
            });
        }
    };

    const handleBlockUser = async (senderUsername) => {
        if (!user?.playerid || !senderUsername) return;

        const actionKey = `${senderUsername}-block`;
        setProcessingRequests(prev => new Set(prev).add(actionKey));
        try {
            const data = await api('/api/update_request/block_player', {
                body: JSON.stringify({
                    receiver_id: user.playerid,
                    sender_username: senderUsername
                })
            });
            if (data.success) {
                await fetchFriendRequests();
            } else {
                throw new Error(data.error || 'Failed to block user');
            }
        } catch (err) {
            console.error('Failed to block user:', err);
            alert(formatError(err));
        } finally {
            setProcessingRequests(prev => {
                const next = new Set(prev);
                next.delete(actionKey);
                return next;
            });
        }
    };

    const fetchFriends = async () => {
        if (!user?.playerid) return;
        try {
            const data = await api('/api/fetch_friends', {
                body: JSON.stringify({ player_id: user.playerid })
            });
            if (Array.isArray(data)) {
                const mappedFriends = data.map(f => ({
                    ...f.friend,
                    friendship_id: f.id,
                    friend_status: f.friend_status || f.friend?.friend_status || f.friend?.status || f.status || 'offline'
                }));
                setFriends(mappedFriends);
            }
        } catch (err) {
            console.error('Failed to fetch friends:', err);
        }
    };

    const handleRemoveFriend = async (friendUsername) => {
        if (!user?.playerid || !friendUsername) return;
        const actionKey = `${friendUsername}-remove`;
        setProcessingFriends(prev => new Set(prev).add(actionKey));
        try {
            const data = await api('/api/remove_friend', {
                body: JSON.stringify({ player_id: user.playerid, username: friendUsername })
            });
            if (data.success) {
                await fetchFriends();
            } else {
                throw new Error(data.error || 'Failed to remove friend');
            }
        } catch (err) {
            console.error('Failed to remove friend:', err);
            alert(formatError(err));
        } finally {
            setProcessingFriends(prev => { const next = new Set(prev); next.delete(actionKey); return next; });
        }
    };

    const handleBlockFriend = async (friendUsername) => {
        if (!user?.playerid || !friendUsername) return;
        const actionKey = `${friendUsername}-block`;
        setProcessingFriends(prev => new Set(prev).add(actionKey));
        try {
            const data = await api('/api/update_request/block', {
                body: JSON.stringify({ receiver_id: user.playerid, sender_username: friendUsername })
            });
            if (data.success) {
                await fetchFriends();
                await fetchBlockedUsers();
            } else {
                throw new Error(data.error || 'Failed to block user');
            }
        } catch (err) {
            console.error('Failed to block friend:', err);
            alert(formatError(err));
        } finally {
            setProcessingFriends(prev => { const next = new Set(prev); next.delete(actionKey); return next; });
        }
    };

    const fetchBlockedUsers = async () => {
        if (!user?.playerid) return;
        setIsRefreshingBlocks(true);
        try {
            const data = await api('/api/fetch_blocked', {
                body: JSON.stringify({ player_id: user.playerid })
            });
            if (Array.isArray(data)) {
                setBlockedUsers(data.map(b => ({
                    ...(b.blocked_user || b.blocked_player || b.blocked || b),
                    friendship_id: b.id
                })));
            }
        } catch (err) {
            console.error('Failed to fetch blocked users:', err);
        } finally {
            setIsRefreshingBlocks(false);
        }
    };

    const handleUnblockUser = async (blockedId, blockedUsername) => {
        if (!user?.playerid || !blockedId) return;
        const actionKey = `${blockedUsername}-unblock`;
        setProcessingBlocks(prev => new Set(prev).add(actionKey));
        try {
            const data = await api('/api/unblock_player', {
                body: JSON.stringify({
                    player_id: user.playerid,
                    target_id: blockedId
                })
            });
            if (data.success) {
                await fetchBlockedUsers();
            } else {
                throw new Error(data.error || 'Failed to unblock user');
            }
        } catch (err) {
            console.error('Failed to unblock user:', err);
            alert(formatError(err));
        } finally {
            setProcessingBlocks(prev => { const next = new Set(prev); next.delete(actionKey); return next; });
        }
    };

    React.useEffect(() => {
        if (user?.playerid) {
            fetchFriendRequests();
            fetchFriends();
            fetchBlockedUsers();
        }
    }, [user?.playerid]);

    React.useEffect(() => {
        if (showCreateCircleModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showCreateCircleModal]);

    return (
        <div className={`dashboard-container ${isSidebarOpen || isMiscOpen ? 'sidebar-open' : ''}`}>
            {/* Sidebar Overlay */}
            <div className={`sidebar-overlay ${(isSidebarOpen || isMiscOpen) ? 'active' : ''}`} onClick={() => { setIsSidebarOpen(false); setIsMiscOpen(false); }}></div>

            {/* Sidebar */}
            <aside className={`dashboard-sidebar ${isSidebarOpen ? 'active' : ''}`}>
                <div className="sidebar-header">
                    <button className="sidebar-close-btn" onClick={toggleSidebar} title="Close Sidebar">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <h3>Game Menu</h3>
                </div>

                <div className="sidebar-content">
                    <nav className="sidebar-nav">
                        <a href="#personal" className="sidebar-nav-item">
                            <div className="item-icon">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                            <span>Personal Information</span>
                            <svg className="chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </a>

                        <a href="#account" className="sidebar-nav-item">
                            <div className="item-icon">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                            </div>
                            <span>Account Information</span>
                            <svg className="chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </a>

                        <a href="#stats" className="sidebar-nav-item">
                            <div className="item-icon">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="20" x2="18" y2="10"></line>
                                    <line x1="12" y1="20" x2="12" y2="4"></line>
                                    <line x1="6" y1="20" x2="6" y2="14"></line>
                                </svg>
                            </div>
                            <span>Full Stats Analysis</span>
                            <svg className="chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </a>
                    </nav>
                </div>

                <div className="sidebar-footer">
                    <p>© 2026 Guess What. All rights reserved.</p>
                </div>
            </aside>

            {/* Miscellaneous Sidebar */}
            <aside className={`dashboard-sidebar misc-sidebar ${isMiscOpen ? 'active' : ''}`}>
                <div className="sidebar-header">
                    <button className="sidebar-close-btn" onClick={toggleMisc} title="Close">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <h3>Miscellaneous</h3>
                </div>

                <div className="sidebar-content">
                    <div className="misc-tabs">
                        <button
                            className={`misc-tab ${activeMiscTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveMiscTab('notifications')}
                        >
                            Notifications
                        </button>
                        <button
                            className={`misc-tab ${activeMiscTab === 'blocks' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveMiscTab('blocks');
                                fetchBlockedUsers();
                            }}
                        >
                            Block users
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeMiscTab === 'notifications' ? (
                            <div className="notifications-list">
                                <div className="empty-state">
                                    <div className="empty-icon">
                                        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                        </svg>
                                    </div>
                                    <p>No new notifications</p>
                                    <span>We'll let you know when something happens!</span>
                                </div>
                            </div>
                        ) : (
                            <div className="blocked-list">
                                <div className="blocks-header">
                                    <h3>Blocked Players</h3>
                                    <button
                                        className="refresh-btn mini"
                                        onClick={fetchBlockedUsers}
                                        disabled={isRefreshingBlocks}
                                    >
                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isRefreshingBlocks ? 'spinning' : ''}>
                                            <polyline points="23 4 23 10 17 10"></polyline>
                                            <polyline points="1 20 1 14 7 14"></polyline>
                                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                        </svg>
                                    </button>
                                </div>

                                {blockedUsers.length > 0 ? (
                                    <div className="requests-list">
                                        {blockedUsers.map((blocked) => (
                                            <div key={blocked.friendship_id} className="request-tile">
                                                <div
                                                    className="request-avatar"
                                                    style={{
                                                        ...(blocked.avatar_url ? { backgroundImage: `url(${blocked.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#4ECDC4' })
                                                    }}
                                                >
                                                    {!blocked.avatar_url && getInitials(blocked.display_name || blocked.username)}
                                                </div>
                                                <div className="request-info">
                                                    <span className="request-display-name">{blocked.display_name || blocked.username}</span>
                                                    <span className="request-username">@{blocked.username}</span>
                                                </div>
                                                <div className="request-actions">
                                                    <button
                                                        className={`request-action-btn unblock ${processingBlocks.has(`${blocked.username}-unblock`) ? 'processing' : ''}`}
                                                        title="Unblock User"
                                                        onClick={() => handleUnblockUser(blocked.id, blocked.username)}
                                                    >
                                                        {processingBlocks.has(`${blocked.username}-unblock`) ? (
                                                            <div className="spinner-tiny"></div>
                                                        ) : (
                                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M18 13V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                                <polyline points="15 3 21 3 21 9"></polyline>
                                                                <line x1="10" y1="14" x2="21" y2="3"></line>
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-icon">
                                            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                            </svg>
                                        </div>
                                        <p>No blocked users</p>
                                        <span>Everyone is your friend! (Hopefully)</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="sidebar-footer">
                    <p>© 2026 Guess What. All rights reserved.</p>
                </div>
            </aside>

            <header className="dashboard-header">
                <div className="header-left">
                    <a href="/" className="logo">Guess What</a>
                </div>
                <div className="header-right">
                    <a href="#">Game Guide</a>
                    <a href="#">About Developer</a>
                    <button className="dashboard-logout-btn" onClick={onLogout}>Logout</button>
                </div>
            </header>
            <div className="settings-icon-wrapper">
                <button
                    className={`settings-btn ${isSidebarOpen || isMiscOpen ? 'hidden' : ''}`}
                    onClick={toggleSidebar}
                    title="Settings"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </button>
            </div>

            <div className="misc-icon-wrapper">
                <button
                    className={`settings-btn misc-btn ${isSidebarOpen || isMiscOpen ? 'hidden' : ''}`}
                    onClick={toggleMisc}
                    title="Miscellaneous"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                </button>
            </div>
            <main className="main-content">
                <section className="user-profile-section">
                    <div className="profile-left">
                        <div className="avatar-wrapper">
                            <div
                                className={`user-avatar ${avatarStyles.isRainbow ? 'rainbow-bg' : ''} ${isUploading ? 'uploading' : ''}`}
                                style={{
                                    ...(!avatarStyles.isRainbow ? { backgroundColor: avatarStyles.backgroundColor } : {}),
                                    ...(user?.avatar_url ? {
                                        backgroundImage: avatarStyles.isRainbow
                                            ? `url(${user.avatar_url}), var(--rainbow)`
                                            : `url(${user.avatar_url})`,
                                        backgroundSize: avatarStyles.isRainbow ? 'cover, 400% 400%' : 'cover',
                                        backgroundPosition: 'center, center'
                                    } : {})
                                }}
                                onClick={handleAvatarClick}
                            >
                                {!user?.avatar_url && !isUploading && initials}
                                <div className="avatar-overlay">
                                    <div className="overlay-content">
                                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                            <circle cx="12" cy="13" r="4"></circle>
                                        </svg>
                                        <span>Change</span>
                                    </div>
                                    {user?.avatar_url && (
                                        <button className="remove-avatar-btn" onClick={handleRemoveAvatar} title="Remove Avatar">
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                {isUploading && (
                                    <div className="upload-spinner">
                                        <div className="spinner"></div>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".jpg,.jpeg,.png,.webp"
                                onChange={handleFileChange}
                            />
                            {uploadError && <div className="upload-error">{uploadError}</div>}
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
                    </div>
                    <button
                        className="create-circle-btn profile-circle-btn"
                        onClick={() => setShowCreateCircleModal(true)}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Create Circle
                    </button>
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
                    <div className="social-columns">
                        <div className="requests-section">
                            <div className="requests-header">
                                <h3>Requests</h3>
                                <button
                                    className="refresh-btn"
                                    onClick={async () => {
                                        setIsRefreshing(true);
                                        await fetchFriendRequests();
                                        setIsRefreshing(false);
                                    }}
                                    title="Refresh requests"
                                    disabled={isRefreshing}
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isRefreshing ? 'spinning' : ''}>
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                </button>
                            </div>
                            {friendRequests.length > 0 ? (
                                <div className="requests-list">
                                    {friendRequests.map((req) => (
                                        <div key={req.friendship_id} className="request-tile">
                                            <div
                                                className="request-avatar"
                                                style={{
                                                    ...(req.avatar_url ? { backgroundImage: `url(${req.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#4ECDC4' })
                                                }}
                                            >
                                                {!req.avatar_url && getInitials(req.display_name || req.username)}
                                            </div>
                                            <div className="request-info">
                                                <span className="request-display-name">{req.display_name || req.username}</span>
                                                <span className="request-username">@{req.username}</span>
                                            </div>
                                            <div className="request-actions">
                                                {(() => {
                                                    const isProcessingAccept = processingRequests.has(`${req.username}-accept`);
                                                    const isProcessingReject = processingRequests.has(`${req.username}-reject`);
                                                    const isProcessingBlock = processingRequests.has(`${req.username}-block`);
                                                    const isAnyProcessing = isProcessingAccept || isProcessingReject || isProcessingBlock;

                                                    return (
                                                        <>
                                                            <button
                                                                className={`request-action-btn accept ${isProcessingAccept ? 'processing' : ''}`}
                                                                title="Accept Request"
                                                                onClick={() => handleAcceptRequest(req.username)}
                                                                disabled={isAnyProcessing}
                                                            >
                                                                {isProcessingAccept ? (
                                                                    <div className="spinner-tiny" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }}></div>
                                                                ) : (
                                                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                                    </svg>
                                                                )}
                                                            </button>
                                                            <button
                                                                className={`request-action-btn reject ${isProcessingReject ? 'processing' : ''}`}
                                                                title="Reject Request"
                                                                onClick={() => handleRejectRequest(req.username)}
                                                                disabled={isAnyProcessing}
                                                            >
                                                                {isProcessingReject ? (
                                                                    <div className="spinner-tiny" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }}></div>
                                                                ) : (
                                                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                                    </svg>
                                                                )}
                                                            </button>
                                                            <button
                                                                className={`request-action-btn block ${isProcessingBlock ? 'processing' : ''}`}
                                                                title="Block User"
                                                                onClick={() => handleBlockUser(req.username)}
                                                                disabled={isAnyProcessing}
                                                            >
                                                                {isProcessingBlock ? (
                                                                    <div className="spinner-tiny" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }}></div>
                                                                ) : (
                                                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                        <circle cx="12" cy="12" r="10"></circle>
                                                                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-requests">
                                    No pending requests
                                </div>
                            )}
                        </div>
                        <div className="friends-section">
                            <div className="friends-header">
                                <h3>Friends List</h3>
                                <div className="friends-header-actions">
                                    <button
                                        className="refresh-btn"
                                        onClick={async () => {
                                            setIsRefreshingFriends(true);
                                            await fetchFriends();
                                            setIsRefreshingFriends(false);
                                        }}
                                        title="Refresh friends"
                                        disabled={isRefreshingFriends}
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isRefreshingFriends ? 'spinning' : ''}>
                                            <polyline points="23 4 23 10 17 10"></polyline>
                                            <polyline points="1 20 1 14 7 14"></polyline>
                                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                        </svg>
                                    </button>
                                    <button className="add-friend-btn" onClick={() => {
                                        setShowSearchModal(true);
                                        setSearchQuery('');
                                        setSearchResult(null);
                                        setSearchError(null);
                                    }}>
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                        Add Friend
                                    </button>
                                </div>
                            </div>
                            {friends.length > 0 ? (
                                <div className="requests-list">
                                    {friends.map((friend) => {
                                        const isProcessingRemove = processingFriends.has(`${friend.username}-remove`);
                                        const isProcessingBlock = processingFriends.has(`${friend.username}-block`);
                                        const isAnyProcessing = isProcessingRemove || isProcessingBlock;
                                        return (
                                            <div key={friend.friendship_id} className="request-tile">
                                                <div
                                                    className="request-avatar"
                                                    style={{
                                                        ...(friend.avatar_url ? { backgroundImage: `url(${friend.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#4ECDC4' })
                                                    }}
                                                >
                                                    {!friend.avatar_url && getInitials(friend.display_name || friend.username)}
                                                    <div
                                                        className={`status-dot ${friend.friend_status === 'online' ? 'online' : 'offline'}`}
                                                        title={friend.friend_status === 'online' ? 'Online' : 'Offline'}
                                                    ></div>
                                                </div>
                                                <div className="request-info">
                                                    <span className="request-display-name">{friend.display_name || friend.username}</span>
                                                    <span className="request-username">@{friend.username}</span>
                                                </div>
                                                <div className="request-actions">
                                                    <button
                                                        className={`request-action-btn reject ${isProcessingRemove ? 'processing' : ''}`}
                                                        title="Remove Friend"
                                                        onClick={() => handleRemoveFriend(friend.username)}
                                                        disabled={isAnyProcessing}
                                                    >
                                                        {isProcessingRemove ? (
                                                            <div className="spinner-tiny" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }}></div>
                                                        ) : (
                                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                                <circle cx="8.5" cy="7" r="4"></circle>
                                                                <line x1="23" y1="11" x2="17" y2="11"></line>
                                                            </svg>
                                                        )}
                                                    </button>
                                                    <button
                                                        className={`request-action-btn block ${isProcessingBlock ? 'processing' : ''}`}
                                                        title="Block User"
                                                        onClick={() => handleBlockFriend(friend.username)}
                                                        disabled={isAnyProcessing}
                                                    >
                                                        {isProcessingBlock ? (
                                                            <div className="spinner-tiny" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }}></div>
                                                        ) : (
                                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <circle cx="12" cy="12" r="10"></circle>
                                                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-friends">
                                    No friends added yet!
                                </div>
                            )}
                        </div>
                    </div>

                </section>
            </main>

            {showConfirmDelete && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal">
                        <h3>Remove Avatar?</h3>
                        <p>Are you sure you want to remove your profile picture? This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={() => setShowConfirmDelete(false)}>Cancel</button>
                            <button className="modal-btn confirm" onClick={confirmDeleteAvatar}>Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {showSearchModal && (
                <div className="custom-modal-overlay" onClick={() => setShowSearchModal(false)}>
                    <div className="custom-modal search-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add Friend</h3>
                            <button className="close-modal" onClick={() => setShowSearchModal(false)}>
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="search-input-wrapper">
                            <span className="search-at-prefix">@</span>
                            <input
                                type="text"
                                placeholder="Enter username..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearch}
                                autoFocus
                            />
                            {isSearching && (
                                <div className="search-spinner-tiny">
                                    <div className="spinner"></div>
                                </div>
                            )}
                        </div>

                        {searchError && <div className="search-error">{searchError}</div>}
                        {requestStatus?.type === 'error' && <div className="search-error">{requestStatus.message}</div>}

                        {searchResult && (
                            <div className="search-result-tile">
                                <div
                                    className="result-avatar"
                                    style={{
                                        ...(searchResult.avatar_url ? { backgroundImage: `url(${searchResult.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#4ECDC4' })
                                    }}
                                >
                                    {!searchResult.avatar_url && getInitials(searchResult.display_name || searchResult.username)}
                                </div>
                                <div className="result-info">
                                    <span className="result-display-name">{searchResult.display_name || searchResult.username}</span>
                                    <span className="result-username">@{searchResult.username}</span>
                                </div>
                                <button
                                    className={`add-action-btn ${isSendingRequest ? 'loading' : ''} ${requestStatus?.type === 'success' || searchResult.friendship_status?.status === 'accepted' ? 'success' : ''} ${searchResult.friendship_status?.status === 'pending' ? 'pending' : ''}`}
                                    title={
                                        user.username === searchResult.username
                                            ? "It's you!"
                                            : searchResult.friendship_status?.status === 'pending'
                                                ? searchResult.friendship_status.is_sender ? "Request Sent" : "Incoming Request"
                                                : searchResult.friendship_status?.status === 'accepted'
                                                    ? "Already Friends"
                                                    : "Send Friend Request"
                                    }
                                    onClick={() => handleAddFriend(searchResult.username)}
                                    disabled={
                                        isSendingRequest ||
                                        requestStatus?.type === 'success' ||
                                        user.username === searchResult.username ||
                                        searchResult.friendship_status?.status === 'accepted' ||
                                        (searchResult.friendship_status?.status === 'pending' && searchResult.friendship_status?.is_sender)
                                    }
                                >
                                    {isSendingRequest ? (
                                        <div className="spinner-tiny"></div>
                                    ) : (requestStatus?.type === 'success' || searchResult.friendship_status?.status === 'accepted') ? (
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    ) : (searchResult.friendship_status?.status === 'pending') ? (
                                        searchResult.friendship_status.is_sender ? (
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="8.5" cy="7" r="4"></circle>
                                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                                <line x1="23" y1="11" x2="17" y2="11"></line>
                                                <path d="M12 11l2 2-2 2"></path>
                                            </svg>
                                        )
                                    ) : (
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="8.5" cy="7" r="4"></circle>
                                            <line x1="20" y1="8" x2="20" y2="14"></line>
                                            <line x1="23" y1="11" x2="17" y2="11"></line>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showCreateCircleModal && (
                <CreateCircle
                    user={user}
                    friends={friends}
                    onClose={() => setShowCreateCircleModal(false)}
                />
            )}
        </div>
    );
};

export default Dashboard;
