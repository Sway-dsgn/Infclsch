import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, MessageCircle, X, User } from 'lucide-react';

type ChatMessage = {
  roomId: string;
  sender: string;
  text: string;
  timestamp: number;
};

type Contact = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  online: boolean;
};

const SELF_NAME = 'Kamu (Brand)';

export default function ChatRoom() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [typing, setTyping] = useState('');
  const [roomId, setRoomId] = useState<string>('');
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const [contacts] = useState<Contact[]>([
    { id: 'm-bdg-1', name: 'Rizky Ramadhan', username: '@rizkyr_kuliner', avatar: 'RR', online: true },
    { id: 'm-bdg-2', name: 'Siti Nurhaliza', username: '@sitinur_style', avatar: 'SN', online: true },
    { id: 'm-bdg-3', name: 'Geraldi Wijaya', username: '@gege_vlog', avatar: 'GW', online: false },
    { id: 'm-sby-1', name: 'Bimo Suroboyo', username: '@bimosby_kuliner', avatar: 'BS', online: true },
  ]);

  useEffect(() => {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port || (protocol === 'https:' ? '443' : '80');
    const wsUrl = `${protocol === 'https:' ? 'wss' : 'ws'}://${host}:${port}`;

    const newSocket = io(wsUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));

    newSocket.on('chat-history', (history: ChatMessage[]) => {
      setMessages(history || []);
    });

    newSocket.on('new-message', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some(m => m.timestamp === msg.timestamp && m.sender === msg.sender && m.text === msg.text)) return prev;
        return [...prev, msg];
      });
    });

    newSocket.on('user-typing', (sender: string) => {
      setTyping(sender);
    });

    newSocket.on('user-stop-typing', () => {
      setTyping('');
    });

    setSocket(newSocket);
    return () => { newSocket.close(); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const prevRoomIdRef = useRef<string>('');

  const openChat = (contact: Contact) => {
    if (prevRoomIdRef.current && socket) {
      socket.emit('leave-room', prevRoomIdRef.current);
    }
    setSelectedContact(contact);
    const newRoomId = `dm-${contact.id}`;
    setRoomId(newRoomId);
    setMessages([]);
    socket?.emit('join-room', newRoomId);
    prevRoomIdRef.current = newRoomId;
    setShowChat(true);
  };

  const handleSend = () => {
    if (!inputText.trim() || !socket || !roomId) return;
    const msg: ChatMessage = {
      roomId,
      sender: SELF_NAME,
      text: inputText.trim(),
      timestamp: Date.now(),
    };
    socket.emit('send-message', msg);
    setInputText('');

    socket.emit('stop-typing', { roomId });

    // Simulate AI influencer reply after delay
    const delay = 2000 + Math.random() * 3000;
    setTimeout(async () => {
      if (!socket || !selectedContact) return;

      // Show typing indicator
      socket.emit('typing', { roomId, sender: selectedContact.name });
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

      try {
        const savedProvider = localStorage.getItem('ai_provider') || 'gemini';
        const savedKey = localStorage.getItem('ai_api_key') || localStorage.getItem('gemini_custom_api_key') || '';
        const savedBaseUrl = localStorage.getItem('ai_base_url') || '';
        const savedModel = localStorage.getItem('ai_model') || '';

        const response = await fetch('/api/generate-chat-reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AI-Provider': savedProvider,
            'X-AI-API-Key': savedKey,
            'X-AI-Base-URL': savedBaseUrl,
            'X-AI-Model': savedModel,
            'X-Gemini-API-Key': savedKey
          },
          body: JSON.stringify({
            messages,
            influencer: {
              name: selectedContact.name,
              username: selectedContact.username,
              platform: 'Instagram',
              location: 'Solo Raya',
              category: 'Lifestyle'
            }
          })
        });

        socket.emit('stop-typing', { roomId });

        const data = await response.json();
        const replyText = data.text || 'Terima kasih!';

        const reply: ChatMessage = {
          roomId,
          sender: selectedContact.name,
          text: replyText,
          timestamp: Date.now(),
        };
        socket?.emit('send-message', reply);
      } catch {
        socket.emit('stop-typing', { roomId });
        const fallbackReplies = [
          'Halo! Terima kasih sudah menghubungi saya 😊',
          'Wah menarik nih! Bisa ceritain lebih detail?',
          'Saya tertarik! Boleh kirim rate card?',
          'Noted, saya tunggu info selanjutnya ya',
        ];
        const reply: ChatMessage = {
          roomId,
          sender: selectedContact.name,
          text: fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)],
          timestamp: Date.now(),
        };
        socket?.emit('send-message', reply);
      }
    }, delay);
  };

  const handleTyping = () => {
    if (!socket || !roomId) return;
    socket.emit('typing', { roomId, sender: SELF_NAME });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { roomId });
    }, 2000);
  };

  const closeChat = () => {
    setShowChat(false);
    setSelectedContact(null);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all cursor-pointer ${
          connected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400'
        }`}
        id="chat-fab"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>

      {/* Connection indicator */}
      {!connected && (
        <div className="fixed bottom-24 right-6 z-50 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg">
          Disconnected
        </div>
      )}

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[600px]" id="chat-panel">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-blue-600 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-bold">Chat DM</span>
            </div>
            <button onClick={closeChat} className="cursor-pointer hover:bg-blue-500 rounded-lg p-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contact list or chat area */}
          {!selectedContact ? (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 pt-2 pb-1">Pilih penerima DM:</p>
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => openChat(contact)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300 shrink-0">
                    {contact.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">{contact.name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{contact.username}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${contact.online ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <button onClick={() => setSelectedContact(null)} className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mr-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300">
                  {selectedContact.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800 dark:text-white truncate">{selectedContact.name}</div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500">{selectedContact.online ? 'Online' : 'Offline'}</div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
                {messages.length === 0 && (
                  <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-8">
                    Mulai percakapan dengan {selectedContact.name}
                  </div>
                )}
                {messages.map((msg) => {
                  const isSelf = msg.sender === SELF_NAME;
                  return (
                    <div key={`${msg.timestamp}-${msg.sender}-${msg.text.slice(0, 10)}`} className={`flex ${isSelf ? 'justify-end' : 'justify-start'} gap-2`}>
                      {!isSelf && (
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-[8px] font-bold text-blue-700 dark:text-blue-300 mt-1 shrink-0">
                          {selectedContact.avatar}
                        </div>
                      )}
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        isSelf
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-bl-md'
                      }`}>
                        <span className="font-semibold text-[9px] block mb-0.5 opacity-70">
                          {isSelf ? 'Kamu' : msg.sender}
                        </span>
                        {msg.text}
                        <span className="text-[8px] opacity-50 block text-right mt-0.5">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {isSelf && (
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[8px] font-bold text-white mt-1 shrink-0">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {typing && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 italic pl-2">
                    <span className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" />
                    {typing} sedang mengetik...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => { setInputText(e.target.value); handleTyping(); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ketik pesan..."
                    className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 focus:ring-1 focus:ring-blue-300 outline-none text-slate-800 dark:text-slate-200"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
