/**
 * ChatSection - WhatsApp-style Messaging
 * USS v3.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import {
    Search, MoreVertical, Phone, Video, Send, Paperclip,
    Image, Camera, MapPin, Package, Mic, Smile, Check, CheckCheck,
    ArrowLeft, X, Loader2
} from 'lucide-react';

interface ChatSectionProps {
    user: User;
}

interface Conversation {
    id: string;
    participants: { userId: string; name: string; avatar?: string }[];
    type: 'DIRECT' | 'ORDER_CHAT';
    orderId?: string;
    lastMessage: {
        text: string;
        senderId: string;
        timestamp: Date;
        type: string;
    };
    myUnreadCount: number;
}

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    type: 'TEXT' | 'IMAGE' | 'LOCATION' | 'PRODUCT' | 'VOICE_NOTE';
    content: string;
    mediaUrl?: string;
    productData?: { productId: string; name: string; price: number; image: string };
    locationData?: { lat: number; lng: number; address: string };
    status: 'SENT' | 'DELIVERED' | 'READ';
    timestamp: Date;
    reactions: { userId: string; emoji: string }[];
}

const ChatSection: React.FC<ChatSectionProps> = ({ user }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAttachments, setShowAttachments] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchConversations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setConversations(data.conversations);
            }
        } catch (error) {
            console.error('Fetch conversations error:', error);
            // Demo data
            setConversations([
                {
                    id: 'CONV-1',
                    participants: [
                        { userId: user.id, name: user.name },
                        { userId: 'seller-1', name: 'Sharma Dhaba' }
                    ],
                    type: 'DIRECT',
                    lastMessage: {
                        text: 'Your order is ready for pickup!',
                        senderId: 'seller-1',
                        timestamp: new Date(Date.now() - 300000),
                        type: 'TEXT'
                    },
                    myUnreadCount: 2
                },
                {
                    id: 'CONV-2',
                    participants: [
                        { userId: user.id, name: user.name },
                        { userId: 'farmer-1', name: 'Kisan Ramesh' }
                    ],
                    type: 'ORDER_CHAT',
                    orderId: 'SO-12345',
                    lastMessage: {
                        text: 'Fresh tomatoes available now',
                        senderId: 'farmer-1',
                        timestamp: new Date(Date.now() - 3600000),
                        type: 'TEXT'
                    },
                    myUnreadCount: 0
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (conversationId: string) => {
        setLoadingMessages(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/chat/conversation/${conversationId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error('Fetch messages error:', error);
            // Demo data
            setMessages([
                {
                    id: 'MSG-1',
                    senderId: 'seller-1',
                    senderName: 'Sharma Dhaba',
                    type: 'TEXT',
                    content: 'Hello! Welcome to Sharma Dhaba',
                    status: 'READ',
                    timestamp: new Date(Date.now() - 7200000),
                    reactions: []
                },
                {
                    id: 'MSG-2',
                    senderId: user.id,
                    senderName: user.name,
                    type: 'TEXT',
                    content: 'Hi! I want to order lunch',
                    status: 'READ',
                    timestamp: new Date(Date.now() - 7000000),
                    reactions: []
                },
                {
                    id: 'MSG-3',
                    senderId: 'seller-1',
                    senderName: 'Sharma Dhaba',
                    type: 'TEXT',
                    content: 'Sure! Here is our menu for today',
                    status: 'READ',
                    timestamp: new Date(Date.now() - 6800000),
                    reactions: []
                },
                {
                    id: 'MSG-4',
                    senderId: 'seller-1',
                    senderName: 'Sharma Dhaba',
                    type: 'PRODUCT',
                    content: 'Shared a product',
                    productData: {
                        productId: 'prod-1',
                        name: 'Thali Special',
                        price: 80,
                        image: 'https://via.placeholder.com/100'
                    },
                    status: 'READ',
                    timestamp: new Date(Date.now() - 6600000),
                    reactions: []
                },
                {
                    id: 'MSG-5',
                    senderId: 'seller-1',
                    senderName: 'Sharma Dhaba',
                    type: 'TEXT',
                    content: 'Your order is ready for pickup!',
                    status: 'DELIVERED',
                    timestamp: new Date(Date.now() - 300000),
                    reactions: []
                }
            ]);
        } finally {
            setLoadingMessages(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !activeConversation) return;

        const tempMessage: Message = {
            id: `MSG-${Date.now()}`,
            senderId: user.id,
            senderName: user.name,
            type: 'TEXT',
            content: newMessage,
            status: 'SENT',
            timestamp: new Date(),
            reactions: []
        };

        setMessages([...messages, tempMessage]);
        setNewMessage('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/chat/conversation/${activeConversation.id}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: 'TEXT',
                    content: newMessage
                })
            });

            const data = await res.json();
            if (data.success) {
                // Update with server message
                setMessages(msgs => msgs.map(m =>
                    m.id === tempMessage.id ? { ...data.message, status: 'SENT' } : m
                ));
            }
        } catch (error) {
            console.error('Send message error:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const openConversation = (conv: Conversation) => {
        setActiveConversation(conv);
        fetchMessages(conv.id);
    };

    const getOtherParticipant = (conv: Conversation) => {
        return conv.participants.find(p => p.userId !== user.id);
    };

    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const filteredConversations = conversations.filter(conv => {
        const other = getOtherParticipant(conv);
        return other?.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Conversation List View
    if (!activeConversation) {
        return (
            <div className="chat-section">
                {/* Header */}
                <div className="chat-header">
                    <h1>Messages</h1>
                    <button className="icon-btn" aria-label="More options">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="search-bar">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Conversation List */}
                <div className="conversation-list">
                    {loading ? (
                        <div className="loading-state">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <p>Loading conversations...</p>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="empty-state">
                            <p>No conversations yet</p>
                        </div>
                    ) : (
                        filteredConversations.map(conv => {
                            const other = getOtherParticipant(conv);
                            return (
                                <button
                                    key={conv.id}
                                    className="conversation-item"
                                    onClick={() => openConversation(conv)}
                                >
                                    <div className="avatar">
                                        {other?.name.charAt(0)}
                                    </div>
                                    <div className="conv-info">
                                        <div className="conv-header">
                                            <span className="conv-name">{other?.name}</span>
                                            <span className="conv-time">{formatDate(new Date(conv.lastMessage.timestamp))}</span>
                                        </div>
                                        <div className="conv-preview">
                                            <span className="last-msg">{conv.lastMessage.text}</span>
                                            {conv.myUnreadCount > 0 && (
                                                <span className="unread-badge">{conv.myUnreadCount}</span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <style>{chatStyles}</style>
            </div>
        );
    }

    // Chat View
    const otherUser = getOtherParticipant(activeConversation);

    return (
        <div className="chat-section">
            {/* Chat Header */}
            <div className="chat-header active-chat">
                <button className="back-btn" aria-label="Go back" onClick={() => setActiveConversation(null)}>
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="avatar">
                    {otherUser?.name.charAt(0)}
                </div>
                <div className="chat-user-info">
                    <span className="user-name">{otherUser?.name}</span>
                    <span className="user-status">online</span>
                </div>
                <div className="chat-actions">
                    <button className="icon-btn" aria-label="Voice call">
                        <Phone className="w-5 h-5" />
                    </button>
                    <button className="icon-btn" aria-label="Video call">
                        <Video className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="messages-container">
                {loadingMessages ? (
                    <div className="loading-state">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => {
                            const isMe = msg.senderId === user.id;
                            const showDate = index === 0 ||
                                new Date(msg.timestamp).toDateString() !==
                                new Date(messages[index - 1].timestamp).toDateString();

                            return (
                                <React.Fragment key={msg.id}>
                                    {showDate && (
                                        <div className="date-divider">
                                            <span>{formatDate(new Date(msg.timestamp))}</span>
                                        </div>
                                    )}
                                    <div className={`message ${isMe ? 'sent' : 'received'}`}>
                                        {msg.type === 'TEXT' && (
                                            <div className="message-bubble">
                                                <p>{msg.content}</p>
                                                <span className="message-meta">
                                                    {formatTime(new Date(msg.timestamp))}
                                                    {isMe && (
                                                        msg.status === 'READ' ?
                                                            <CheckCheck className="w-4 h-4 text-blue-500" /> :
                                                            <Check className="w-4 h-4" />
                                                    )}
                                                </span>
                                            </div>
                                        )}

                                        {msg.type === 'PRODUCT' && msg.productData && (
                                            <div className="message-bubble product-bubble">
                                                <div className="product-card">
                                                    <img src={msg.productData.image} alt={msg.productData.name} />
                                                    <div className="product-info">
                                                        <span className="product-name">{msg.productData.name}</span>
                                                        <span className="product-price">₹{msg.productData.price}</span>
                                                    </div>
                                                </div>
                                                <button className="view-btn">View Product</button>
                                                <span className="message-meta">
                                                    {formatTime(new Date(msg.timestamp))}
                                                </span>
                                            </div>
                                        )}

                                        {msg.type === 'LOCATION' && msg.locationData && (
                                            <div className="message-bubble location-bubble">
                                                <div className="location-preview">
                                                    <MapPin className="w-6 h-6" />
                                                    <span>📍 {msg.locationData.address}</span>
                                                </div>
                                                <button className="view-btn">Open in Maps</button>
                                                <span className="message-meta">
                                                    {formatTime(new Date(msg.timestamp))}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Attachment Menu */}
            {showAttachments && (
                <div className="attachment-menu">
                    <button className="attach-option">
                        <div className="attach-icon bg-attach-gallery">
                            <Image className="w-5 h-5" />
                        </div>
                        <span>Gallery</span>
                    </button>
                    <button className="attach-option">
                        <div className="attach-icon bg-attach-camera">
                            <Camera className="w-5 h-5" />
                        </div>
                        <span>Camera</span>
                    </button>
                    <button className="attach-option">
                        <div className="attach-icon bg-attach-location">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <span>Location</span>
                    </button>
                    <button className="attach-option">
                        <div className="attach-icon bg-attach-product">
                            <Package className="w-5 h-5" />
                        </div>
                        <span>Product</span>
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className="input-area">
                <button className="icon-btn" aria-label="Toggle attachments" onClick={() => setShowAttachments(!showAttachments)}>
                    {showAttachments ? <X className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
                </button>

                <div className="text-input-wrapper">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <button className="emoji-btn" aria-label="Insert emoji">
                        <Smile className="w-5 h-5" />
                    </button>
                </div>

                {newMessage.trim() ? (
                    <button className="send-btn" aria-label="Send message" onClick={sendMessage}>
                        <Send className="w-5 h-5" />
                    </button>
                ) : (
                    <button
                        className={`mic-btn ${isRecording ? 'recording' : ''}`}
                        aria-label="Record voice message"
                        onMouseDown={() => setIsRecording(true)}
                        onMouseUp={() => setIsRecording(false)}
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                )}
            </div>

            <style>{chatStyles}</style>
        </div>
    );
};

const chatStyles = `
  .chat-section {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 140px);
    background: #f5f5f5;
  }

  .chat-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
  }

  .chat-header h1 {
    flex: 1;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .chat-header.active-chat {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
  }

  .back-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
  }

  .avatar {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .chat-user-info {
    flex: 1;
  }

  .user-name {
    display: block;
    font-weight: 600;
  }

  .user-status {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  .chat-actions {
    display: flex;
    gap: 8px;
  }

  .icon-btn {
    background: rgba(255,255,255,0.2);
    border: none;
    border-radius: 50%;
    padding: 8px;
    color: inherit;
    cursor: pointer;
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
  }

  .search-bar input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 1rem;
  }

  .conversation-list {
    flex: 1;
    overflow-y: auto;
    background: white;
  }

  .conversation-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: white;
    border: none;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: background 0.2s;
  }

  .conversation-item:hover {
    background: #f9fafb;
  }

  .conv-info {
    flex: 1;
    min-width: 0;
  }

  .conv-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .conv-name {
    font-weight: 600;
    color: #111827;
  }

  .conv-time {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .conv-preview {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .last-msg {
    font-size: 0.875rem;
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .unread-badge {
    background: #22c55e;
    color: white;
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
  }

  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #9ca3af;
    gap: 8px;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d5db' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }

  .date-divider {
    text-align: center;
    margin: 16px 0;
  }

  .date-divider span {
    background: rgba(0,0,0,0.1);
    color: #6b7280;
    font-size: 0.75rem;
    padding: 4px 12px;
    border-radius: 10px;
  }

  .message {
    display: flex;
    margin-bottom: 8px;
  }

  .message.sent {
    justify-content: flex-end;
  }

  .message.received {
    justify-content: flex-start;
  }

  .message-bubble {
    max-width: 75%;
    padding: 10px 14px;
    border-radius: 16px;
    position: relative;
  }

  .sent .message-bubble {
    background: #dcfce7;
    border-bottom-right-radius: 4px;
  }

  .received .message-bubble {
    background: white;
    border-bottom-left-radius: 4px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }

  .message-bubble p {
    margin: 0;
    color: #111827;
    font-size: 0.9375rem;
  }

  .message-meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    margin-top: 4px;
    font-size: 0.7rem;
    color: #9ca3af;
  }

  .product-bubble {
    padding: 8px;
  }

  .product-card {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
  }

  .product-card img {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
  }

  .product-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .product-name {
    font-weight: 600;
    color: #111827;
  }

  .product-price {
    color: #22c55e;
    font-weight: 600;
  }

  .view-btn {
    display: block;
    width: 100%;
    padding: 8px;
    background: #f3f4f6;
    border: none;
    border-radius: 8px;
    color: #3b82f6;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: 8px;
  }

  .location-preview {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: #f3f4f6;
    border-radius: 8px;
    margin-bottom: 8px;
  }

  .attachment-menu {
    display: flex;
    justify-content: space-around;
    padding: 16px;
    background: white;
    border-top: 1px solid #e5e7eb;
  }

  .attach-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;
    color: #374151;
    font-size: 0.75rem;
  }

  .attach-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .input-area {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: white;
    border-top: 1px solid #e5e7eb;
  }

  .text-input-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    background: #f3f4f6;
    border-radius: 24px;
    padding: 8px 16px;
  }

  .text-input-wrapper input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 1rem;
  }

  .emoji-btn {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
  }

  .send-btn, .mic-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .send-btn {
    background: #22c55e;
    color: white;
  }

  .mic-btn {
    background: #f3f4f6;
    color: #374151;
  }

  .mic-btn.recording {
    background: #ef4444;
    color: white;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`;

export default ChatSection;
