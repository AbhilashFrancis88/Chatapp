import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './App.module.css';
import {
  ROOMS, AVATAR_COLORS, AVATAR_TEXT_COLORS,
  FLOWBOT_RESPONSES, REACTION_EMOJIS, EMOJIS,
} from './data';

/* ── Constants ─────────────────────────────────────────── */
const TAB_ID = crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const FLOWBOT_NAME = 'FlowBot';
const FLOWBOT_COLOR = '#B0BEC5';

/* ── Helpers ───────────────────────────────────────────── */
const genId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function getStoredUser() {
  try {
    const raw = localStorage.getItem('chat-user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeUser(u) {
  localStorage.setItem('chat-user', JSON.stringify(u));
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtFull(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString([], {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }) + ' at ' + fmtTime(ts);
}

function timeDividerLabel(ts) {
  const now = new Date();
  const d = new Date(ts);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  let day;
  if (msgDay === todayStart) day = 'Today';
  else if (msgDay === yesterdayStart) day = 'Yesterday';
  else day = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return `${day} · ${fmtTime(ts)}`;
}

function ini(name) {
  return name.slice(0, 2).toUpperCase();
}

function tc(bg) {
  return AVATAR_TEXT_COLORS[bg] || '#37474F';
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.frequency.value = 440;
    osc.type = 'sine';
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

/* ── Onboarding screen ─────────────────────────────────── */
function Onboarding({ onJoin, dark }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(
    () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  );
  const submit = () => {
    const t = name.trim();
    if (t) onJoin({ username: t, avatarColor: color });
  };
  return (
    <div className={`${styles.onboarding} ${dark ? styles.dark : styles.light}`}>
      <div className={styles.onboardingCard}>
        <img src="/logo.svg" alt="Logo" className={styles.onboardingLogo} />
        <h1 className={styles.onboardingAppName}>Realtime Chat</h1>
        <h2 className={styles.onboardingHeading}>What should we call you?</h2>
        <div className={styles.onboardingInputRow}>
          <div
            className={styles.onboardingAvatar}
            style={{ background: color, color: tc(color) }}
          >
            {name.trim() ? ini(name.trim()) : '?'}
          </div>
          <input
            className={styles.onboardingInput}
            value={name}
            onChange={e => setName(e.target.value.slice(0, 20))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Display name"
            maxLength={20}
            autoFocus
          />
        </div>
        <div className={styles.colorPicker}>
          {AVATAR_COLORS.map(c => (
            <button
              key={c}
              className={`${styles.colorDot} ${c === color ? styles.colorDotActive : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <button className={styles.joinBtn} onClick={submit} disabled={!name.trim()}>
          Join Chat
        </button>
      </div>
    </div>
  );
}

/* ── Avatar ────────────────────────────────────────────── */
function UserAvatar({ name, color, size = 28 }) {
  return (
    <div
      className={styles.avatarCircle}
      style={{
        width: size, height: size,
        background: color, color: tc(color),
        fontSize: size * 0.38,
      }}
    >
      {ini(name)}
    </div>
  );
}

/* ── Ticks ─────────────────────────────────────────────── */
function Ticks({ status }) {
  if (status === 'seen')
    return <span className={`${styles.ticks} ${styles.ticksSeen}`}>✓✓</span>;
  if (status === 'delivered')
    return <span className={styles.ticks}>✓✓</span>;
  return <span className={styles.ticks}>✓</span>;
}

/* ── Message bubble ────────────────────────────────────── */
function Bubble({ msg, isMe, isFirst, isGrouped, onReact, onReply, currentUser, onImageClick, isNew }) {
  const [showActions, setShowActions] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const longPressRef = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const animClass = isNew ? (isMe ? styles.slideInRight : styles.slideInLeft) : '';

  const bubbleCls = [
    styles.bubble,
    isMe ? styles.mine : styles.other,
    isFirst && !isGrouped ? styles.firstBubble : '',
    isGrouped ? styles.grouped : '',
  ].filter(Boolean).join(' ');

  const handleTouchStart = () => {
    longPressRef.current = setTimeout(() => setShowPicker(true), 500);
  };
  const handleTouchEnd = () => clearTimeout(longPressRef.current);

  const reactionEntries = msg.reactions
    ? Object.entries(msg.reactions).filter(([, u]) => u.length > 0)
    : [];

  return (
    <div
      id={`msg-${msg.id}`}
      className={`${styles.msgRow} ${isMe ? styles.mine : ''} ${animClass}`}
    >
      {!isMe && (
        isFirst && !isGrouped
          ? <UserAvatar name={msg.user} color={msg.avatarColor} />
          : <div className={styles.avatarPlaceholder} />
      )}
      <div
        className={styles.msgContent}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { setShowActions(false); setShowPicker(false); }}
      >
        {isFirst && !isGrouped && (
          <div className={styles.msgMeta}>
            <span className={styles.msgAuthor}>{isMe ? 'You' : msg.user}</span>
            <span className={styles.msgTime}>{fmtTime(msg.time)}</span>
          </div>
        )}

        {msg.replyTo && (
          <div
            className={styles.quotedBlock}
            onClick={() => {
              const el = document.getElementById(`msg-${msg.replyTo.id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            <span className={styles.quotedAuthor}>{msg.replyTo.user}</span>
            <span className={styles.quotedText}>
              {msg.replyTo.text?.slice(0, 80)}{msg.replyTo.text?.length > 80 ? '…' : ''}
            </span>
          </div>
        )}

        <div
          className={bubbleCls}
          title={fmtFull(msg.time)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {msg.imageData && (
            <img
              src={msg.imageData}
              alt="shared"
              className={styles.imageInBubble}
              onClick={e => { e.stopPropagation(); onImageClick(msg.imageData); }}
            />
          )}
          {msg.text && (
            <span className={styles.bubbleText}>
              {msg.text}
              {isMe && msg.status && <Ticks status={msg.status} />}
            </span>
          )}
          {!msg.text && isMe && msg.status && <Ticks status={msg.status} />}
        </div>

        {showActions && (
          <div className={`${styles.msgActions} ${isMe ? styles.actionsLeft : ''}`}>
            <button className={styles.actionBtn} onClick={() => setShowPicker(v => !v)} title="React">
              😊
            </button>
            <button className={styles.actionBtn} onClick={() => onReply(msg)} title="Reply">
              <i className="ti ti-arrow-back-up" />
            </button>
          </div>
        )}

        {showPicker && (
          <div className={styles.reactionPicker} ref={pickerRef}>
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                className={styles.reactionPickerBtn}
                onClick={() => { onReact(msg.id, emoji); setShowPicker(false); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {reactionEntries.length > 0 && (
          <div className={styles.reactionBar}>
            {reactionEntries.map(([emoji, users]) => (
              <span
                key={emoji}
                className={`${styles.reaction} ${users.includes(currentUser) ? styles.myReaction : ''}`}
                onClick={() => onReact(msg.id, emoji)}
              >
                {emoji} {users.length}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Typing indicator ──────────────────────────────────── */
function TypingIndicator({ names }) {
  if (!names.length) return null;
  const label = names.length === 1
    ? `${names[0]} is typing…`
    : `${names.join(' and ')} are typing…`;
  return (
    <div className={styles.typingRow}>
      <div className={styles.typingDots}><span /><span /><span /></div>
      <span className={styles.typingLabel}>{label}</span>
    </div>
  );
}

/* ── Lightbox ──────────────────────────────────────────── */
function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div className={styles.lightbox} onClick={onClose}>
      <img src={src} alt="Full" className={styles.lightboxImg} onClick={e => e.stopPropagation()} />
    </div>
  );
}

/* ── Main App ──────────────────────────────────────────── */
export default function App() {
  const [user, setUser] = useState(getStoredUser);
  const [dark, setDark] = useState(false);
  const [activeRoom, setActiveRoom] = useState('general');
  const [messages, setMessages] = useState(() =>
    Object.fromEntries(ROOMS.map(r => [r.id, []]))
  );
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState(() =>
    Object.fromEntries(ROOMS.map(r => [r.id, 0]))
  );
  const [inputVal, setInputVal] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showPresence, setShowPresence] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newMsgIds, setNewMsgIds] = useState(new Set());

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const globalBcRef = useRef(null);
  const roomBcsRef = useRef({});
  const activeRoomRef = useRef(activeRoom);
  const heartbeatRef = useRef(null);
  const botQueueRef = useRef(shuffled(FLOWBOT_RESPONSES));
  const botIdxRef = useRef(0);
  const lastTypingSentRef = useRef(0);
  const typingStopTimerRef = useRef(null);
  const titleIntervalRef = useRef(null);
  const originalTitle = useRef(document.title);
  const messagesRef = useRef(messages);

  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const onlineCount = useMemo(() => Object.keys(onlineUsers).length + 1, [onlineUsers]);
  const demoBotActive = onlineCount === 1;
  const demoBotRef = useRef(demoBotActive);
  useEffect(() => { demoBotRef.current = demoBotActive; }, [demoBotActive]);

  const onlineNames = useMemo(() => {
    const names = Object.values(onlineUsers).map(u => u.username);
    if (user) names.push(user.username);
    return [...new Set(names)];
  }, [onlineUsers, user]);

  const typingNames = useMemo(() =>
    Object.entries(typingUsers)
      .filter(([, t]) => t.room === activeRoom)
      .map(([name]) => name),
    [typingUsers, activeRoom]
  );

  useEffect(() => { document.body.classList.toggle('dark', dark); }, [dark]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeRoom, typingUsers]);

  /* notification permission */
  useEffect(() => {
    if (localStorage.getItem('chat-notif-asked') !== 'true' && 'Notification' in window) {
      Notification.requestPermission().finally(() => {
        localStorage.setItem('chat-notif-asked', 'true');
      });
    }
  }, []);

  /* track new message ids for animation */
  const markNew = useCallback((id) => {
    setNewMsgIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setNewMsgIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  }, []);

  /* ── BroadcastChannel setup ────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    const globalBc = new BroadcastChannel('chat-presence');
    globalBcRef.current = globalBc;

    globalBc.postMessage({
      type: 'presence:join',
      username: user.username,
      avatarColor: user.avatarColor,
      tabId: TAB_ID,
    });

    heartbeatRef.current = setInterval(() => {
      globalBc.postMessage({
        type: 'presence:heartbeat',
        username: user.username,
        avatarColor: user.avatarColor,
        tabId: TAB_ID,
      });
    }, 5000);

    globalBc.onmessage = (e) => {
      const d = e.data;
      if (d.tabId === TAB_ID) return;
      if (d.type === 'presence:join' || d.type === 'presence:heartbeat') {
        setOnlineUsers(prev => ({
          ...prev,
          [d.tabId]: { username: d.username, avatarColor: d.avatarColor, lastSeen: Date.now() },
        }));
        if (d.type === 'presence:join') {
          globalBc.postMessage({
            type: 'presence:heartbeat',
            username: user.username,
            avatarColor: user.avatarColor,
            tabId: TAB_ID,
          });
        }
      } else if (d.type === 'presence:leave') {
        setOnlineUsers(prev => {
          const n = { ...prev };
          delete n[d.tabId];
          return n;
        });
      }
    };

    const roomBcs = {};
    ROOMS.forEach(room => {
      const bc = new BroadcastChannel(`chat-room-${room.id}`);
      roomBcs[room.id] = bc;
      bc.onmessage = (e) => {
        const d = e.data;
        if (d.type === 'chat:message') {
          const msg = d.msg;
          setMessages(prev => ({
            ...prev,
            [room.id]: [...(prev[room.id] || []), msg],
          }));
          setNewMsgIds(prev => new Set(prev).add(msg.id));
          setTimeout(() => {
            setNewMsgIds(prev => {
              const n = new Set(prev);
              n.delete(msg.id);
              return n;
            });
          }, 400);

          if (activeRoomRef.current !== room.id) {
            setUnreadCounts(prev => ({ ...prev, [room.id]: (prev[room.id] || 0) + 1 }));
          }

          bc.postMessage({ type: 'chat:delivered', messageId: msg.id });
          if (document.visibilityState === 'visible' && activeRoomRef.current === room.id) {
            bc.postMessage({ type: 'chat:seen', messageId: msg.id });
          }

          if (document.visibilityState !== 'visible' && !msg.isBot) {
            playNotifSound();
            if ('Notification' in window && Notification.permission === 'granted') {
              const n = new Notification(msg.user, {
                body: (msg.text || '📷 Image').slice(0, 60),
                icon: '/logo.svg',
              });
              n.onclick = () => { window.focus(); n.close(); };
            }
            if (!titleIntervalRef.current) {
              titleIntervalRef.current = setInterval(() => {
                document.title = document.title === originalTitle.current
                  ? '💬 New message!' : originalTitle.current;
              }, 1500);
            }
          }
        }

        if (d.type === 'chat:delivered') {
          setMessages(prev => ({
            ...prev,
            [room.id]: prev[room.id].map(m =>
              m.id === d.messageId && m.status === 'sent'
                ? { ...m, status: 'delivered' } : m
            ),
          }));
        }

        if (d.type === 'chat:seen') {
          setMessages(prev => ({
            ...prev,
            [room.id]: prev[room.id].map(m =>
              m.id === d.messageId && m.status !== 'seen'
                ? { ...m, status: 'seen' } : m
            ),
          }));
        }

        if (d.type === 'typing:start') {
          if (d.username === user.username) return;
          setTypingUsers(prev => ({
            ...prev,
            [d.username]: { room: room.id, ts: Date.now() },
          }));
        }

        if (d.type === 'typing:stop') {
          if (d.username === user.username) return;
          setTypingUsers(prev => {
            const n = { ...prev };
            delete n[d.username];
            return n;
          });
        }

        if (d.type === 'reaction:toggle') {
          setMessages(prev => ({
            ...prev,
            [room.id]: prev[room.id].map(m => {
              if (m.id !== d.messageId) return m;
              const reactions = { ...(m.reactions || {}) };
              const users = [...(reactions[d.emoji] || [])];
              const idx = users.indexOf(d.username);
              if (idx >= 0) users.splice(idx, 1);
              else users.push(d.username);
              reactions[d.emoji] = users;
              return { ...m, reactions };
            }),
          }));
        }
      };
    });
    roomBcsRef.current = roomBcs;

    const staleCheck = setInterval(() => {
      setOnlineUsers(prev => {
        const now = Date.now();
        const next = {};
        Object.entries(prev).forEach(([tid, u]) => {
          if (now - u.lastSeen < 12000) next[tid] = u;
        });
        return next;
      });
    }, 6000);

    const typingSafety = setInterval(() => {
      setTypingUsers(prev => {
        const now = Date.now();
        const next = {};
        Object.entries(prev).forEach(([name, t]) => {
          if (now - t.ts < 3000) next[name] = t;
        });
        return next;
      });
    }, 1000);

    const handleUnload = () => {
      globalBc.postMessage({ type: 'presence:leave', tabId: TAB_ID });
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeatRef.current);
      clearInterval(staleCheck);
      clearInterval(typingSafety);
      window.removeEventListener('beforeunload', handleUnload);
      globalBc.close();
      Object.values(roomBcs).forEach(bc => bc.close());
    };
  }, [user]); // eslint-disable-line

  /* visibility change — restore title + send seen acks */
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        if (titleIntervalRef.current) {
          clearInterval(titleIntervalRef.current);
          titleIntervalRef.current = null;
          document.title = originalTitle.current;
        }
        const room = activeRoomRef.current;
        const bc = roomBcsRef.current[room];
        const msgs = messagesRef.current[room] || [];
        if (bc && user) {
          msgs.forEach(m => {
            if (m.user !== user.username && m.user !== FLOWBOT_NAME) {
              bc.postMessage({ type: 'chat:seen', messageId: m.id });
            }
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [user]);

  /* ── Send message ──────────────────────────────────────── */
  const sendMessage = useCallback(() => {
    if (!user) return;
    const text = inputVal.trim();
    const img = imagePreview;
    if (!text && !img) return;

    const msg = {
      id: genId(),
      user: user.username,
      avatarColor: user.avatarColor,
      text: text || '',
      imageData: img?.dataUrl || null,
      time: Date.now(),
      reactions: {},
      status: 'sent',
      replyTo: replyTo ? { id: replyTo.id, user: replyTo.user, text: replyTo.text } : null,
      isBot: false,
    };

    setMessages(prev => ({
      ...prev,
      [activeRoom]: [...(prev[activeRoom] || []), msg],
    }));
    markNew(msg.id);
    setInputVal('');
    setReplyTo(null);
    setImagePreview(null);

    const bc = roomBcsRef.current[activeRoom];
    if (bc) bc.postMessage({ type: 'chat:message', msg });

    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    if (bc) bc.postMessage({ type: 'typing:stop', username: user.username });

    if (demoBotRef.current) {
      const delay = 1500 + Math.random() * 1500;
      const room = activeRoom;

      setTimeout(() => {
        setTypingUsers(prev => ({
          ...prev,
          [FLOWBOT_NAME]: { room, ts: Date.now() },
        }));
        const typingDuration = 800 + Math.random() * 600;
        setTimeout(() => {
          setTypingUsers(prev => {
            const n = { ...prev };
            delete n[FLOWBOT_NAME];
            return n;
          });
          if (botIdxRef.current >= botQueueRef.current.length) {
            botQueueRef.current = shuffled(FLOWBOT_RESPONSES);
            botIdxRef.current = 0;
          }
          const botText = botQueueRef.current[botIdxRef.current++];
          const botMsg = {
            id: genId(),
            user: FLOWBOT_NAME,
            avatarColor: FLOWBOT_COLOR,
            text: botText,
            imageData: null,
            time: Date.now(),
            reactions: {},
            status: 'sent',
            replyTo: null,
            isBot: true,
          };
          setMessages(prev => ({
            ...prev,
            [room]: [...(prev[room] || []), botMsg],
          }));
          setNewMsgIds(prev => new Set(prev).add(botMsg.id));
          setTimeout(() => setNewMsgIds(prev => {
            const n = new Set(prev);
            n.delete(botMsg.id);
            return n;
          }), 400);
        }, typingDuration);
      }, delay);
    }
  }, [inputVal, activeRoom, replyTo, imagePreview, user, markNew]);

  /* ── Typing broadcast ──────────────────────────────────── */
  const handleInputChange = useCallback((e) => {
    setInputVal(e.target.value);
    if (!user) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 500) {
      const bc = roomBcsRef.current[activeRoomRef.current];
      if (bc) bc.postMessage({ type: 'typing:start', username: user.username });
      lastTypingSentRef.current = now;
    }
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      const bc = roomBcsRef.current[activeRoomRef.current];
      if (bc) bc.postMessage({ type: 'typing:stop', username: user.username });
    }, 2000);
  }, [user]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ── Reactions ─────────────────────────────────────────── */
  const addReaction = useCallback((msgId, emoji) => {
    if (!user) return;
    setMessages(prev => ({
      ...prev,
      [activeRoom]: prev[activeRoom].map(m => {
        if (m.id !== msgId) return m;
        const reactions = { ...(m.reactions || {}) };
        const users = [...(reactions[emoji] || [])];
        const idx = users.indexOf(user.username);
        if (idx >= 0) users.splice(idx, 1);
        else users.push(user.username);
        reactions[emoji] = users;
        return { ...m, reactions };
      }),
    }));
    const bc = roomBcsRef.current[activeRoom];
    if (bc) bc.postMessage({ type: 'reaction:toggle', messageId: msgId, emoji, username: user.username });
  }, [activeRoom, user]);

  /* ── Image picker ──────────────────────────────────────── */
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert('Image too large — max 500KB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview({ dataUrl: reader.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* ── Room switch ───────────────────────────────────────── */
  const switchRoom = useCallback((roomId) => {
    setActiveRoom(roomId);
    setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
    setReplyTo(null);
    setImagePreview(null);
  }, []);

  const handleReply = useCallback((msg) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  }, []);

  const insertEmoji = (emoji) => {
    setInputVal(v => v + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  /* ── Render ────────────────────────────────────────────── */
  if (!user) {
    return <Onboarding onJoin={u => { storeUser(u); setUser(u); }} dark={dark} />;
  }

  const roomMsgs = messages[activeRoom] || [];
  const activeRoomObj = ROOMS.find(r => r.id === activeRoom);

  const renderItems = [];
  for (let i = 0; i < roomMsgs.length; i++) {
    const msg = roomMsgs[i];
    const prev = i > 0 ? roomMsgs[i - 1] : null;

    if (!prev || msg.time - prev.time > 300000) {
      renderItems.push({ type: 'divider', label: timeDividerLabel(msg.time), key: `div-${i}` });
    }

    const isGrouped = prev
      && prev.user === msg.user
      && msg.time - prev.time < 120000
      && prev && msg.time - prev.time <= 300000;

    renderItems.push({
      type: 'message', msg,
      isMe: msg.user === user.username,
      isFirst: !isGrouped,
      isGrouped: !!isGrouped,
      key: msg.id,
    });
  }

  return (
    <div className={`${styles.app} ${dark ? styles.dark : styles.light}`}>

      {/* ── Sidebar (desktop) ─────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <img src="/logo.svg" alt="Logo" className={styles.logo} />
          <span className={styles.sidebarTitle}>Realtime Chat</span>
          <button className={styles.themeBtn} onClick={() => setDark(d => !d)} title="Toggle theme">
            <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} />
          </button>
        </div>

        <div className={styles.userBadge}>
          <UserAvatar name={user.username} color={user.avatarColor} size={32} />
          <div>
            <div className={styles.badgeName}>{user.username}</div>
            <div className={styles.badgeLabel}>Online</div>
          </div>
        </div>

        <div className={styles.sectionLabel}>Rooms</div>
        <div className={styles.channelList}>
          {ROOMS.map(room => (
            <div
              key={room.id}
              className={`${styles.channelItem} ${room.id === activeRoom ? styles.active : ''}`}
              onClick={() => switchRoom(room.id)}
            >
              <i className={`ti ${room.icon} ${styles.channelIcon}`} />
              <div className={styles.chInfo}>
                <div className={styles.chName}># {room.name}</div>
              </div>
              {unreadCounts[room.id] > 0 && (
                <span className={styles.unreadBadge}>{unreadCounts[room.id]}</span>
              )}
            </div>
          ))}
        </div>

        <div className={styles.onlineSection}>
          <div className={styles.sectionLabel} style={{ padding: 0, marginBottom: 8 }}>
            Online · {onlineCount}
          </div>
          <div className={styles.onlineList}>
            {onlineNames.map(name => (
              <div key={name} className={styles.onlineChip}>
                <div className={styles.onlineDot} />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Mobile room tabs ──────────────────────────── */}
      <div className={styles.mobileRoomTabs}>
        {ROOMS.map(room => (
          <button
            key={room.id}
            className={`${styles.mobileRoomTab} ${room.id === activeRoom ? styles.active : ''}`}
            onClick={() => switchRoom(room.id)}
          >
            # {room.name}
            {unreadCounts[room.id] > 0 && (
              <span className={styles.mobileUnread}>{unreadCounts[room.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Chat area ─────────────────────────────────── */}
      <main className={styles.chatArea}>
        {demoBotActive && (
          <div className={styles.demoBanner}>
            🤖 Demo mode — open another tab to chat live
          </div>
        )}

        <div className={styles.chatHeader}>
          <div className={styles.chatTitleGroup}>
            <span className={styles.chHash}>#</span>
            <div>
              <div className={styles.chTitleText}>{activeRoomObj?.name}</div>
            </div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.presenceBtn} onClick={() => setShowPresence(v => !v)}>
              <div className={styles.onlineDotSmall} />
              <span>{onlineCount} online</span>
            </div>
            {showPresence && (
              <div className={styles.presencePopover}>
                {onlineNames.map(name => (
                  <div key={name} className={styles.presenceItem}>
                    <div className={styles.onlineDotSmall} />
                    {name}
                  </div>
                ))}
              </div>
            )}
            <button className={styles.headerBtn} onClick={() => setDark(d => !d)} title="Theme">
              <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} />
            </button>
          </div>
        </div>

        <div className={styles.messages}>
          {roomMsgs.length === 0 && (
            <div className={styles.emptyRoom}>
              No messages yet — say something!
            </div>
          )}

          {renderItems.map(item => {
            if (item.type === 'divider') {
              return (
                <div key={item.key} className={styles.dateDivider}>
                  <span>{item.label}</span>
                </div>
              );
            }
            return (
              <Bubble
                key={item.key}
                msg={item.msg}
                isMe={item.isMe}
                isFirst={item.isFirst}
                isGrouped={item.isGrouped}
                onReact={addReaction}
                onReply={handleReply}
                currentUser={user.username}
                onImageClick={setLightboxImage}
                isNew={newMsgIds.has(item.msg.id)}
              />
            );
          })}

          {typingNames.length > 0 && <TypingIndicator names={typingNames} />}
          <div ref={messagesEndRef} />
        </div>

        {replyTo && (
          <div className={styles.replyPreview}>
            <div className={styles.replyAccent} />
            <div className={styles.replyInfo}>
              <span className={styles.replyAuthor}>{replyTo.user}</span>
              <span className={styles.replyText}>
                {replyTo.text?.slice(0, 80)}{replyTo.text?.length > 80 ? '…' : ''}
              </span>
            </div>
            <button className={styles.replyCancelBtn} onClick={() => setReplyTo(null)}>×</button>
          </div>
        )}

        {imagePreview && (
          <div className={styles.imagePreviewBar}>
            <img src={imagePreview.dataUrl} alt="Preview" className={styles.imagePreviewThumb} />
            <button className={styles.replyCancelBtn} onClick={() => setImagePreview(null)}>×</button>
          </div>
        )}

        <div className={styles.inputArea}>
          <div className={styles.inputRow}>
            <button
              className={styles.emojiBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Share image"
            >
              <i className="ti ti-paperclip" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />
            <div className={styles.emojiPickerWrap}>
              <button className={styles.emojiBtn} onClick={() => setShowEmojiPicker(v => !v)} title="Emoji">😊</button>
              {showEmojiPicker && (
                <div className={styles.emojiPickerPopover}>
                  {EMOJIS.map(e => (
                    <button key={e} className={styles.reactionPickerBtn} onClick={() => insertEmoji(e)}>{e}</button>
                  ))}
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              className={styles.msgInput}
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${activeRoomObj?.name}…`}
              maxLength={500}
              autoComplete="off"
            />
            <button
              className={styles.sendBtn}
              onClick={sendMessage}
              disabled={!inputVal.trim() && !imagePreview}
              title="Send"
            >
              <i className="ti ti-send" />
            </button>
          </div>
        </div>
      </main>

      <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
