import React, { useState, useEffect, useRef } from 'react';
import { chatApi, usersApi } from '../../lib/api';
import { leggiRiferimento } from '../../lib/deepLink';
import { PastigliaRiferimento } from '../page/RiferimentiInterni';
import { useUser, UserData } from '../../contexts/UserContext';
import { Send, Hash, MessageSquare, AtSign } from 'lucide-react';

export interface ChatMessage {
  id: string;
  pageId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export function ProjectChat({ pageId }: { pageId: string }) {
  const { activeUser } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  // Mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadUsers();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [pageId]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [pageId, messages.length]);

  const loadMessages = async () => {
    try {
      const data = await chatApi.getMessages(pageId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    try {
      await chatApi.send(pageId, inputValue.trim());
      setInputValue('');
      setShowMentions(false);
      await loadMessages();
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredUsers[mentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Mention detection
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/(?:\s|^)@(\w*)$/);

    if (match) {
      setShowMentions(true);
      setMentionFilter(match[1].toLowerCase());
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u?.displayName || '').toLowerCase().includes(mentionFilter)
  );

  const insertMention = (user: UserData) => {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart;
    const textBeforeCursor = inputValue.slice(0, cursor);
    const match = textBeforeCursor.match(/(?:\s|^)@(\w*)$/);
    
    if (match) {
      const startPos = cursor - match[1].length - 1;
      const newText = inputValue.slice(0, startPos) + `@${user.displayName} ` + inputValue.slice(cursor);
      setInputValue(newText);
      setShowMentions(false);
      
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newCursor = startPos + user.displayName.length + 2;
          inputRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 0);
    }
  };

  // Render message content with mentions & deep links
  const renderMessageContent = (content: string) => {
    const words = content.split(/(\s+)/);
    
    return words.map((word, i) => {
      if (word.startsWith('@')) {
        const username = word.substring(1).replace(/[.,!?]$/, '');
        const punctuation = word.substring(1 + username.length);
        const user = users.find(u => (u?.displayName || '').toLowerCase() === username.toLowerCase());
        
        if (user) {
          return (
            <React.Fragment key={i}>
              <span style={{
                color: 'var(--accent)',
                fontWeight: 700,
                backgroundColor: 'rgba(66, 99, 235, 0.12)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}>
                @{user.displayName}
              </span>
              {punctuation}
            </React.Fragment>
          );
        }
      } else {
        // Il riconoscimento dei riferimenti sta in lib/deepLink: prima era
        // riscritto qui dentro, ed era l'unico punto dell'applicazione in cui
        // un indirizzo nutnote:// veniva capito.
        const riferimento = leggiRiferimento(word);
        if (riferimento) {
          return <PastigliaRiferimento key={i} riferimento={riferimento} />;
        }
      }
      return <span key={i}>{word}</span>;
    });
  };

  const getUser = (id: string) => users.find(u => u.id === id);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '420px',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      backgroundColor: 'var(--bg-surface)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-app)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} color="var(--accent)" />
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
            Chat & Commenti della Pagina
          </span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {messages.length} {messages.length === 1 ? 'messaggio' : 'messaggi'}
        </span>
      </div>

      {/* Messages Feed */}
      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            textAlign: 'center',
            fontSize: '13px',
            gap: '8px',
          }}>
            <MessageSquare size={32} strokeWidth={1.5} />
            <span>Nessun messaggio in questa discussione. Inizia a chattare o menziona i colleghi con @!</span>
          </div>
        ) : (
          messages.map(msg => {
            const u = getUser(msg.userId);
            const isMe = msg.userId === activeUser?.id;
            
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                }}
              >
                {!isMe && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: u?.avatarColor || '#4263eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '13px',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>
                    {u?.displayName.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {isMe ? 'Tu' : u?.displayName || 'Utente'}
                    </span>
                    {msg.createdAt && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {msg.createdAt.slice(11, 16)}
                      </span>
                    )}
                  </div>
                  <div style={{
                    backgroundColor: isMe ? 'var(--accent)' : 'var(--bg-app)',
                    color: isMe ? '#fff' : 'var(--text-primary)',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    borderTopRightRadius: isMe ? '2px' : '12px',
                    borderTopLeftRadius: !isMe ? '2px' : '12px',
                    fontSize: '14px',
                    wordBreak: 'break-word',
                    lineHeight: 1.5,
                    border: isMe ? 'none' : '1px solid var(--border)',
                  }}>
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input area */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', position: 'relative' }}>
        {/* Mentions popup */}
        {showMentions && filteredUsers.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '12px',
            marginBottom: '8px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)',
            width: '220px',
            maxHeight: '160px',
            overflowY: 'auto',
            zIndex: 'var(--z-menu)',
            padding: '4px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase' }}>
              Menziona Membro
            </div>
            {filteredUsers.map((u, i) => (
              <div
                key={u.id}
                onClick={() => insertMention(u)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: i === mentionIndex ? 'var(--bg-surface-active)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={() => setMentionIndex(i)}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: u.avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 700,
                }}>
                  {u.displayName.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500 }}>{u.displayName}</span>
                  {u.teamName && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{u.teamName}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio... Usa @ per taggare o incolla un link di blocco"
            rows={1}
            style={{
              flex: 1,
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px 12px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              backgroundColor: inputValue.trim() ? 'var(--accent)' : 'var(--bg-app)',
              color: inputValue.trim() ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border)',
              cursor: inputValue.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition-interactive)',
              flexShrink: 0,
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
