import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './App.module.css';
import {
  USERS, CHANNELS, SAMPLE_MESSAGES, BOT_REPLIES, EMOJIS, REACTION_EMOJIS,
} from './data';

/* ── Helpers ─────────────────────────────────────────────── */
let msgIdCounter = 1000;
const nextId = () => ++msgIdCounter;

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getUserById(id) {
  return USERS.find(u => u.id === id) || {
    id: 'you', name: 'You', initials: 'YO',
    color: '#EEEDfe', textColor: '#534AB7',
  };
}

/* ── Sub-components ──────────────────────────────────────── */
function Avatar({ user, size = 28 }) {
  return (
    <div
      className={styles.avatarSmall}
      style={{
        width: size, height: size,
        background: user.color,
        color: user.textColor,
        fontSize: size * 0.38,
      }}
    >
      {user.initials}
    </div>
  );
}

function Bubble({ msg, isMe, isFirst, onReact }) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);
  const user = isMe ? null : getUserById(msg.user);

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const bubbleCls = [
    styles.bubble,
    isMe ? styles.mine : styles.other,
    isFirst
      ? (isMe ? `${styles.firstBubble} ${styles.mine}` : `${styles.firstBubble} ${styles.other}`)
      : (isMe ? `${styles.notFirst} ${styles.mine}` : `${styles.notFirst} ${styles.other}`),
  ].join(' ');

  return (
    <div className={styles.msgRow + (isMe ? ` ${styles.mine}` : '')}>
      {!isMe && (isFirst
        ? <Avatar user={user} />
        : <div className={styles.avatarPlaceholder} />
      )}
      <div className={styles.msgContent}>
        {isFirst && !isMe && (
          <div className={styles.msgMeta}>
            <span className={styles.msgAuthor}>{user.name}</span>
            <span className={styles.msgTime}>{fmtTime(msg.time)}</span>
          </div>
        )}
        {isFirst && isMe && (
          <div className={styles.msgMeta}>
            <span className={styles.msgAuthor}>You</span>
            <span className={styles.msgTime}>{fmtTime(msg.time)}</span>
          </div>
        )}
        <div
          className={bubbleCls}
          onDoubleClick={() => setShowPicker(v => !v)}
          title="Double-click to react"
        >
          {msg.text}
        </div>

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

        {msg.reactions && msg.reactions.length > 0 && (
          <div className={styles.reactionBar}>
            {msg.reactions.map((r, i) => (
              <span key={i} className={styles.reaction}>{r}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator({ name }) {
  return (
    <div className={styles.typingRow}>
      <div className={styles.typingDots}>
        <span /><span /><span />
      </div>
      <span className={styles.typingLabel}>{name} is typing…</span>
    </div>
  );
}

/* ── Main App ────────────────────────────────────────────── */
export default function App() {
  const [dark, setDark] = useState(false);
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState(() =>
    Object.fromEntries(
      Object.entries(SAMPLE_MESSAGES).map(([k, v]) => [k, v.map(m => ({ ...m, reactions: [] }))])
    )
  );
  const [inputVal, setInputVal] = useState('');
  const [typingBot, setTypingBot] = useState(null);
  const [emojiIdx, setEmojiIdx] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const bcRef = useRef(null);

  /* scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel, typingBot]);

  /* body dark class */
  useEffect(() => {
    document.body.classList.toggle('dark', dark);
  }, [dark]);

  /* BroadcastChannel for cross-tab real-time */
  useEffect(() => {
    try {
      const bc = new BroadcastChannel('realtime-chat-app');
      bcRef.current = bc;
      bc.onmessage = (e) => {
        if (e.data.type === 'msg') {
          const { channel, msg } = e.data;
          const sender = { ...msg, user: 'alice', id: nextId() };
          setMessages(prev => ({
            ...prev,
            [channel]: [...(prev[channel] || []), sender],
          }));
        }
      };
      return () => bc.close();
    } catch (_) {}
  }, []);

  /* update placeholder when channel changes */
  const activeCh = CHANNELS.find(c => c.id === activeChannel);

  const sendMessage = useCallback(() => {
    const text = inputVal.trim();
    if (!text) return;
    const msg = { id: nextId(), user: 'you', text, time: Date.now(), reactions: [] };

    setMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), msg],
    }));
    setInputVal('');

    /* broadcast to other tabs */
    try { bcRef.current?.postMessage({ type: 'msg', channel: activeChannel, msg }); } catch (_) {}

    /* simulate bot reply */
    const botUser = USERS[Math.floor(Math.random() * USERS.length)];
    const botPool = BOT_REPLIES[activeChannel] || BOT_REPLIES.general;
    const botText = botPool[Math.floor(Math.random() * botPool.length)];
    const delay = 1200 + Math.random() * 1000;

    setTimeout(() => {
      setTypingBot(botUser.name);
      setTimeout(() => {
        setTypingBot(null);
        setMessages(prev => ({
          ...prev,
          [activeChannel]: [
            ...(prev[activeChannel] || []),
            { id: nextId(), user: botUser.id, text: botText, time: Date.now(), reactions: [] },
          ],
        }));
      }, 800 + Math.random() * 600);
    }, delay);
  }, [inputVal, activeChannel]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addReaction = useCallback((msgId, emoji) => {
    setMessages(prev => ({
      ...prev,
      [activeChannel]: prev[activeChannel].map(m =>
        m.id === msgId
          ? { ...m, reactions: m.reactions.includes(emoji) ? m.reactions.filter(r => r !== emoji) : [...m.reactions, emoji] }
          : m
      ),
    }));
  }, [activeChannel]);

  const insertEmoji = () => {
    setInputVal(v => v + EMOJIS[emojiIdx % EMOJIS.length]);
    setEmojiIdx(i => i + 1);
    inputRef.current?.focus();
  };

  const channelMsgs = messages[activeChannel] || [];

  return (
    <div className={`${styles.app} ${dark ? styles.dark : styles.light}`}>

      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Channels</span>
          <button
            className={styles.themeBtn}
            onClick={() => setDark(d => !d)}
            title="Toggle theme"
          >
            <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} />
          </button>
        </div>

        <div className={styles.userBadge}>
          <div
            className={styles.avatar}
            style={{ background: '#EEEDfe', color: '#534AB7', fontSize: 11, width: 32, height: 32 }}
          >
            YO
          </div>
          <div>
            <div className={styles.badgeName}>You</div>
            <div className={styles.badgeLabel}>You · Online</div>
          </div>
        </div>

        <div className={styles.sectionLabel}>Channels</div>
        <div className={styles.channelList}>
          {CHANNELS.map(ch => {
            const msgs = messages[ch.id] || [];
            const last = msgs[msgs.length - 1];
            const preview = last
              ? `${getUserById(last.user).name}: ${last.text}`
              : 'No messages yet';
            return (
              <div
                key={ch.id}
                className={`${styles.channelItem} ${ch.id === activeChannel ? styles.active : ''}`}
                onClick={() => setActiveChannel(ch.id)}
              >
                <i className={`ti ${ch.icon} ${styles.channelIcon}`} />
                <div className={styles.chInfo}>
                  <div className={styles.chName}>{ch.name}</div>
                  <div className={styles.chPreview}>{preview.substring(0, 30)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.onlineSection}>
          <div className={styles.sectionLabel} style={{ padding: 0, marginBottom: 8 }}>Online now</div>
          <div className={styles.onlineList}>
            {[...USERS.slice(0, 3), { id: 'you', name: 'You' }].map(u => (
              <div key={u.id} className={styles.onlineChip}>
                <div className={styles.onlineDot} />
                <span>{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Chat area ─────────────────────────────────── */}
      <main className={styles.chatArea}>
        <div className={styles.chatHeader}>
          <div className={styles.chatTitleGroup}>
            <span className={styles.chHash}>#</span>
            <div>
              <div className={styles.chTitleText}>{activeCh?.name}</div>
              <div className={styles.chOnlineCount}>4 members online</div>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.headerBtn} title="Search">
              <i className="ti ti-search" />
            </button>
            <button className={styles.headerBtn} title="Members">
              <i className="ti ti-users" />
            </button>
          </div>
        </div>

        <div className={styles.messages}>
          <div className={styles.dateDivider}><span>Today</span></div>

          {channelMsgs.map((msg, i) => {
            const isMe = msg.user === 'you';
            const isFirst = i === 0 || channelMsgs[i - 1].user !== msg.user;
            return (
              <Bubble
                key={msg.id}
                msg={msg}
                isMe={isMe}
                isFirst={isFirst}
                onReact={addReaction}
              />
            );
          })}

          {typingBot && <TypingIndicator name={typingBot} />}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          <div className={styles.inputRow}>
            <button className={styles.emojiBtn} onClick={insertEmoji} title="Emoji">😊</button>
            <input
              ref={inputRef}
              className={styles.msgInput}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${activeCh?.name}…`}
              maxLength={500}
              autoComplete="off"
            />
            <button
              className={styles.sendBtn}
              onClick={sendMessage}
              disabled={!inputVal.trim()}
              title="Send"
            >
              <i className="ti ti-send" />
            </button>
          </div>
          <div className={styles.inputHint}>
            Open multiple tabs to chat in real-time · Double-click any message to react
          </div>
        </div>
      </main>
    </div>
  );
}
