/**
 * ReelsSection - Instagram-style Short Video Feed
 * USS v3.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import {
    Heart, MessageCircle, Share2, Bookmark, MoreVertical,
    Volume2, VolumeX, Play, Pause, Music2, MapPin, ShoppingBag,
    ChevronUp, ChevronDown, Loader2, Plus, X, Send, Info
} from 'lucide-react';

interface ReelsSectionProps {
    user: User;
    isCreator?: boolean;
}

interface Reel {
    id: string;
    creatorId: string;
    creatorName: string;
    creatorAvatar?: string;
    creatorType: string;
    shopId?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    caption: string;
    hashtags: string[];
    musicTitle?: string;
    musicArtist?: string;
    locationTag?: { name: string };
    productTags: { productId: string; productName: string; price: number; xPercent: number; yPercent: number }[];
    viewCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    isLiked?: boolean;
    isSaved?: boolean;
}

interface Comment {
    id: string;
    text: string;
    userId: string;
    userName: string;
    timestamp: Date;
}

// Helper component for Reel Item to handle dynamic styling via Ref
const ReelItem: React.FC<{
    reel: any,
    index: number,
    currentIndex: number,
    handleDoubleTap: () => void,
    videoRef: (el: HTMLVideoElement | null) => void,
    muted: boolean,
    likeAnimation: boolean,
    showProductTags: boolean,
    children?: React.ReactNode
}> = ({ reel, index, currentIndex, handleDoubleTap, videoRef, muted, likeAnimation, showProductTags, children }) => {
    const itemRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (itemRef.current) {
            itemRef.current.style.setProperty('--reel-offset', `${(index - currentIndex) * 100}%`);
        }
    }, [index, currentIndex]);

    return (
        <div
            ref={itemRef}
            className={`reel-item ${index === currentIndex ? 'active' : ''} reel-item-dynamic`}
            onClick={handleDoubleTap}
        >
            <video
                ref={videoRef}
                src={reel.videoUrl}
                poster={reel.thumbnailUrl}
                loop
                muted={muted}
                playsInline
                className="reel-video"
            />

            {/* Like Animation */}
            {likeAnimation && index === currentIndex && (
                <div className="like-animation">
                    <Heart className="w-24 h-24 text-white fill-red-500" />
                </div>
            )}

            {/* Product Tags */}
            {showProductTags && reel.productTags.map((tag: any, i: number) => (
                <ProductTag key={i} tag={tag} />
            ))}

            {children}
        </div>
    );
};

const ProductTag: React.FC<{ tag: any }> = ({ tag }) => {
    const tagRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
        if (tagRef.current) {
            tagRef.current.style.setProperty('--tag-x', `${tag.xPercent}%`);
            tagRef.current.style.setProperty('--tag-y', `${tag.yPercent}%`);
        }
    }, [tag]);

    return (
        <button
            ref={tagRef}
            className="product-tag product-tag-dynamic"
        >
            <ShoppingBag className="w-4 h-4" />
            <span>{tag.productName}</span>
            <span className="price">₹{tag.price}</span>
        </button>
    );
};

const ReelsSection: React.FC<ReelsSectionProps> = ({ user, isCreator }) => {
    const [reels, setReels] = useState<Reel[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [muted, setMuted] = useState(false);
    const [paused, setPaused] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [showProductTags, setShowProductTags] = useState(true);
    const [likeAnimation, setLikeAnimation] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const lastTapRef = useRef<number>(0);

    useEffect(() => {
        fetchReels();
    }, []);

    useEffect(() => {
        // Auto-play current video
        videoRefs.current.forEach((video, index) => {
            if (video) {
                if (index === currentIndex && !paused) {
                    video.play().catch(console.error);
                } else {
                    video.pause();
                    video.currentTime = 0;
                }
            }
        });
    }, [currentIndex, paused]);

    const fetchReels = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/reels/feed?userId=${user.id}&limit=20`);
            const data = await res.json();

            if (data.success) {
                setReels(data.reels);
            }
        } catch (error) {
            console.error('Fetch reels error:', error);
            // Demo data
            setReels([
                {
                    id: 'REEL-1',
                    creatorId: 'user-1',
                    creatorName: 'Sharma Dhaba',
                    creatorType: 'MESS',
                    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                    caption: 'Fresh hot parathas ready! 🥟 #DesiFood #FreshFood',
                    hashtags: ['DesiFood', 'FreshFood'],
                    musicTitle: 'Original Audio',
                    locationTag: { name: 'Jhansi' },
                    productTags: [{ productId: 'p1', productName: 'Paratha Thali', price: 60, xPercent: 50, yPercent: 60 }],
                    viewCount: 1234,
                    likeCount: 245,
                    commentCount: 32,
                    shareCount: 12,
                    isLiked: false,
                    isSaved: false
                },
                {
                    id: 'REEL-2',
                    creatorId: 'user-2',
                    creatorName: 'Kisan Ramesh',
                    creatorType: 'FARMER',
                    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                    caption: 'Fresh tomatoes from my farm! 🍅 Organic and natural',
                    hashtags: ['OrganicFarm', 'FreshProduce'],
                    musicTitle: 'Folk Music',
                    musicArtist: 'Desi Beats',
                    locationTag: { name: 'Babina' },
                    productTags: [{ productId: 'p2', productName: 'Tomatoes 1kg', price: 40, xPercent: 30, yPercent: 70 }],
                    viewCount: 856,
                    likeCount: 156,
                    commentCount: 18,
                    shareCount: 8,
                    isLiked: false,
                    isSaved: false
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleScroll = (direction: 'up' | 'down') => {
        if (direction === 'up' && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        } else if (direction === 'down' && currentIndex < reels.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleTouchStart = useRef<number>(0);
    const handleTouchEnd = (e: React.TouchEvent) => {
        const diff = handleTouchStart.current - e.changedTouches[0].clientY;
        if (diff > 50) handleScroll('down');
        else if (diff < -50) handleScroll('up');
    };

    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            handleLike();
            setLikeAnimation(true);
            setTimeout(() => setLikeAnimation(false), 1000);
        }
        lastTapRef.current = now;
    };

    const handleLike = async () => {
        const reel = reels[currentIndex];
        if (!reel) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/reels/${reel.id}/like`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setReels(reels.map((r, i) =>
                    i === currentIndex
                        ? { ...r, isLiked: data.liked, likeCount: r.likeCount + (data.liked ? 1 : -1) }
                        : r
                ));
            }
        } catch (error) {
            console.error('Like error:', error);
        }
    };

    const handleSave = async () => {
        const reel = reels[currentIndex];
        if (!reel) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/reels/${reel.id}/save`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setReels(reels.map((r, i) =>
                    i === currentIndex ? { ...r, isSaved: data.saved } : r
                ));
            }
        } catch (error) {
            console.error('Save error:', error);
        }
    };

    const handleShare = async () => {
        const reel = reels[currentIndex];
        if (!reel) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: reel.caption,
                    url: `https://villagelink.app/reel/${reel.id}`
                });
            } catch (err) {
                console.error('Share error:', err);
            }
        }
    };

    const loadComments = async () => {
        const reel = reels[currentIndex];
        if (!reel) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/reels/${reel.id}/comments`);
            const data = await res.json();
            if (data.success) {
                setComments(data.comments);
            }
        } catch (error) {
            console.error('Load comments error:', error);
        }
    };

    const postComment = async () => {
        if (!newComment.trim()) return;

        const reel = reels[currentIndex];
        if (!reel) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/reels/${reel.id}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ comment: newComment })
            });
            const data = await res.json();

            if (data.success) {
                setComments([data.comment, ...comments]);
                setNewComment('');
                setReels(reels.map((r, i) =>
                    i === currentIndex ? { ...r, commentCount: r.commentCount + 1 } : r
                ));
            }
        } catch (error) {
            console.error('Post comment error:', error);
        }
    };

    const currentReel = reels[currentIndex];

    if (loading) {
        return (
            <div className="reels-loading">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <p>Loading reels...</p>
            </div>
        );
    }

    return (
        <div
            className="reels-section"
            ref={containerRef}
            onTouchStart={(e) => { handleTouchStart.current = e.touches[0].clientY; }}
            onTouchEnd={handleTouchEnd}
        >
            {/* Reels Container */}
            <div className="reels-container">
                {reels.map((reel, index) => (
                    <ReelItem
                        key={reel.id}
                        reel={reel}
                        index={index}
                        currentIndex={currentIndex}
                        handleDoubleTap={handleDoubleTap}
                        videoRef={el => videoRefs.current[index] = el}
                        muted={muted}
                        likeAnimation={likeAnimation}
                        showProductTags={showProductTags}
                    >
                        {/* Bottom Overlay */}
                        <div className="reel-overlay">
                            {/* Creator Info */}
                            <div className="creator-info">
                                <div className="creator-avatar">
                                    {reel.creatorName.charAt(0)}
                                </div>
                                <div className="creator-details">
                                    <span className="creator-name">{reel.creatorName}</span>
                                    {reel.locationTag && (
                                        <span className="location">
                                            <MapPin className="w-3 h-3" />
                                            {reel.locationTag.name}
                                        </span>
                                    )}
                                </div>
                                <button className="follow-btn">Follow</button>
                            </div>

                            {/* Caption */}
                            <p className="caption">{reel.caption}</p>

                            {/* Hashtags */}
                            <div className="hashtags">
                                {reel.hashtags.map((tag, i) => (
                                    <span key={i} className="hashtag">#{tag}</span>
                                ))}
                            </div>

                            {/* Music */}
                            {reel.musicTitle && (
                                <div className="music-info">
                                    <Music2 className="w-4 h-4" />
                                    <span className="marquee">{reel.musicTitle} {reel.musicArtist && `• ${reel.musicArtist}`}</span>
                                </div>
                            )}
                        </div>

                        {/* Right Actions */}
                        <div className="reel-actions">
                            <button
                                className={`action-btn ${reel.isLiked ? 'liked' : ''}`}
                                aria-label="Like this reel"
                                onClick={(e) => { e.stopPropagation(); handleLike(); }}
                            >
                                <Heart className={`w-7 h-7 ${reel.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                                <span>{formatCount(reel.likeCount)}</span>
                            </button>

                            <button
                                className="action-btn"
                                aria-label="View comments"
                                onClick={(e) => { e.stopPropagation(); setShowComments(true); loadComments(); }}
                            >
                                <MessageCircle className="w-7 h-7" />
                                <span>{formatCount(reel.commentCount)}</span>
                            </button>

                            <button
                                className="action-btn"
                                aria-label="Share reel"
                                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                            >
                                <Share2 className="w-7 h-7" />
                                <span>{formatCount(reel.shareCount)}</span>
                            </button>
                        </div>
                    </ReelItem>
                ))}
            </div>

            {/* Controls */}
            <div className="reel-controls">
                <button
                    className="control-btn"
                    aria-label={muted ? "Unmute" : "Mute"}
                    onClick={() => setMuted(!muted)}
                >
                    {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <button
                    className="control-btn"
                    aria-label={paused ? "Play" : "Pause"}
                    onClick={() => setPaused(!paused)}
                >
                    {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation Arrows */}
            <div className="nav-arrows">
                <button
                    className={`nav-arrow ${currentIndex === 0 ? 'disabled' : ''}`}
                    aria-label="Previous reel"
                    onClick={() => handleScroll('up')}
                >
                    <ChevronUp className="w-6 h-6" />
                </button>
                <button
                    className={`nav-arrow ${currentIndex === reels.length - 1 ? 'disabled' : ''}`}
                    aria-label="Next reel"
                    onClick={() => handleScroll('down')}
                >
                    <ChevronDown className="w-6 h-6" />
                </button>
            </div>

            {/* Comments Sheet */}
            {showComments && (
                <div className="comments-sheet">
                    <div className="comments-header">
                        <h3>Comments ({currentReel?.commentCount || 0})</h3>
                        <button aria-label="Close comments" onClick={() => setShowComments(false)}>
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="comments-list">
                        {comments.map(comment => (
                            <div key={comment.id} className="comment-item">
                                <div className="comment-avatar">{comment.userName.charAt(0)}</div>
                                <div className="comment-content">
                                    <span className="comment-user">{comment.userName}</span>
                                    <p className="comment-text">{comment.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="comment-input">
                        <input
                            type="text"
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && postComment()}
                        />
                        <button aria-label="Post comment" onClick={postComment}>
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Create Reel Button (for creators) */}
            {isCreator && (
                <button className="create-reel-btn" aria-label="Create new reel">
                    <Plus className="w-6 h-6" />
                </button>
            )}
            <style>{`
        .reels-section {
          position: relative;
          height: calc(100vh - 140px);
          background: var(--bg-void);
          overflow: hidden;
        }

        .reels-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
          gap: 12px;
        }

        .reels-container {
          position: relative;
          height: 100%;
        }

        .reel-item {
          position: absolute;
          inset: 0;
          transition: transform 0.4s ease;
        }

        .reel-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .like-animation {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: like-pop 0.5s ease;
        }

        @keyframes like-pop {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }

        .product-tag {
          position: absolute;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--bg-glass);
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          color: white;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .product-tag .price {
          color: var(--accent-primary);
          font-weight: 600;
        }

        .reel-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 60px;
          padding: 20px;
          background: linear-gradient(transparent, rgba(0,0,0,0.8));
        }

        .creator-info {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .creator-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-tertiary), var(--accent-hot));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }

        .creator-details {
          flex: 1;
        }

        .creator-name {
          display: block;
          color: white;
          font-weight: 600;
        }

        .location {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #d1d5db;
          font-size: 0.75rem;
        }

        .follow-btn {
          padding: 6px 16px;
          background: transparent;
          border: 1px solid white;
          border-radius: 6px;
          color: white;
          font-weight: 500;
          cursor: pointer;
        }

        .caption {
          color: white;
          font-size: 0.9rem;
          line-height: 1.5;
          margin-bottom: 8px;
        }

        .hashtags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 8px;
        }

        .hashtag {
          color: #93c5fd;
          font-size: 0.875rem;
        }

        .music-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: white;
          font-size: 0.875rem;
        }

        .marquee {
          overflow: hidden;
          white-space: nowrap;
        }

        .reel-actions {
          position: absolute;
          right: 8px;
          bottom: 100px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
        }

        .action-btn span {
          font-size: 0.75rem;
        }

        .action-btn.liked svg {
          animation: like-bounce 0.3s ease;
        }

        @keyframes like-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }

        .reel-controls {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          gap: 12px;
        }

        .control-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(0,0,0,0.5);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .nav-arrows {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .nav-arrow {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .nav-arrow.disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .comments-sheet {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60%;
          background: white;
          border-radius: 20px 20px 0 0;
          display: flex;
          flex-direction: column;
          z-index: 100;
        }

        .comments-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .comments-header h3 {
          font-weight: 600;
        }

        .comments-header button {
          background: none;
          border: none;
          cursor: pointer;
        }

        .comments-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .comment-item {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .comment-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: #374151;
          flex-shrink: 0;
        }

        .comment-user {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .comment-text {
          font-size: 0.875rem;
          color: #374151;
        }

        .comment-input {
          display: flex;
          gap: 12px;
          padding: 12px 16px;
          border-top: 1px solid #e5e7eb;
        }

        .comment-input input {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          outline: none;
        }

        .comment-input button {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #3b82f6;
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .create-reel-btn {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
        }
      `}</style>
        </div>
    );
};

const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
};


export default ReelsSection;