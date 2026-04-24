import React, { useState } from 'react';
import './CreateCircle.css';

const CreateCircle = ({ user, friends, onClose }) => {
    const [selectedFriends, setSelectedFriends] = useState(new Set());

    const onlineFriends = friends.filter(f => f.friend_status === 'online');

    const toggleFriend = (friendId) => {
        const newSelected = new Set(selectedFriends);
        if (newSelected.has(friendId)) {
            newSelected.delete(friendId);
        } else {
            if (newSelected.size < 10) {
                newSelected.add(friendId);
            }
        }
        setSelectedFriends(newSelected);
    };

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name[0].toUpperCase();
    };

    const getAvatarStyles = (u) => {
        if (!u) return {};
        let hash = 0;
        const str = u.username || u.email || '';
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
            '#F06292', '#AED581', '#FFD54F', '#4DB6AC', '#7986CB'
        ];
        const color = colors[Math.abs(hash) % colors.length];
        const isRainbow = Math.abs(hash) % 100 < 5;

        return {
            backgroundColor: !isRainbow ? color : 'transparent',
            isRainbow,
            initials: getInitials(u.display_name || u.username)
        };
    };

    const userAvatar = getAvatarStyles(user);

    return (
        <div className="create-circle-overlay" onClick={onClose}>
            <div className="create-circle-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>CREATE CIRCLE</h2>
                    <button className="close-btn" onClick={onClose} title="Close">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="modal-content">
                    <div className="content-left">
                        <div className="preview-avatar-section">
                            <div
                                className={`preview-avatar ${userAvatar.isRainbow ? 'rainbow-bg' : ''}`}
                                style={{
                                    ...(userAvatar.backgroundColor && !userAvatar.isRainbow ? { backgroundColor: userAvatar.backgroundColor } : {}),
                                    ...(user?.avatar_url ? {
                                        backgroundImage: userAvatar.isRainbow
                                            ? `url(${user.avatar_url}), linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff)`
                                            : `url(${user.avatar_url})`,
                                        backgroundSize: userAvatar.isRainbow ? 'cover, 400% 400%' : 'cover',
                                        backgroundPosition: 'center'
                                    } : {})
                                }}
                            >
                                {!user?.avatar_url && userAvatar.initials}
                            </div>
                            <div className="user-badge">
                                <span className="badge-name">{user?.display_name || user?.username}</span>
                                <span className="badge-role">Circle Creator</span>
                            </div>
                        </div>
                    </div>

                    <div className="content-right">
                        <div className="invite-header">
                            <h3>Invite friends</h3>
                            <p>Select 3-10 friends to start. Only online friends are shown.</p>
                            <div className="selection-counter">
                                <span className={selectedFriends.size >= 3 ? 'valid' : 'invalid'}>
                                    {selectedFriends.size}
                                </span>
                                /10 selected
                            </div>
                        </div>

                        <div className="friends-selection-list">
                            {onlineFriends.length > 0 ? (
                                onlineFriends.map((friend, index) => (
                                    <div
                                        key={friend.playerid || friend.username}
                                        className={`friend-invite-tile ${selectedFriends.has(friend.playerid || friend.username) ? 'selected' : ''}`}
                                        onClick={() => toggleFriend(friend.playerid || friend.username)}
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <div
                                            className="friend-mini-avatar"
                                            style={{
                                                ...(friend.avatar_url ? {
                                                    backgroundImage: `url(${friend.avatar_url})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center'
                                                } : { backgroundColor: '#4ECDC4' })
                                            }}
                                        >
                                            {!friend.avatar_url && getInitials(friend.display_name || friend.username)}
                                        </div>
                                        <div className="friend-info">
                                            <span className="friend-name">{friend.display_name || friend.username}</span>
                                            <span className="friend-username">@{friend.username}</span>
                                        </div>
                                        <div className="invite-action-icon">
                                            {selectedFriends.has(friend.playerid || friend.username) ? (
                                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-friends-msg">
                                    <p>No online friends available to invite yet.</p>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="create-action-btn"
                                disabled={selectedFriends.size < 3 || selectedFriends.size > 10}
                            >
                                Start Circle
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateCircle;
