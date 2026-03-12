import './Chat.css'
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth, db } from '../../firebase/firebase'
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, doc, getDoc, deleteDoc, updateDoc, onSnapshot as onDocSnapshot, arrayRemove} from "firebase/firestore"
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import SendIcon from '@mui/icons-material/Send'
import SendAndArchiveIcon from '@mui/icons-material/SendAndArchive'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'

const Chat = ({ inlineChatId, onBack, onRemoveContact }) => {
  const { chatId: paramChatId } = useParams()
  const chatId    = inlineChatId || paramChatId
  const isMobile  = !inlineChatId    

  const navigate = useNavigate()

  const [message, setMessage]               = useState('')
  const [messages, setMessages]             = useState([])
  const [chatUser, setChatUser]             = useState(null)
  const [loading, setLoading]               = useState(true)
  const [editingId, setEditingId]           = useState(null)
  const [typing, setTyping]                 = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const typingTimeout = useRef(null)
  const containerRef  = useRef()
  const currentUser   = auth.currentUser

  const scrollToBottom = () => {
    if (containerRef.current)
      containerRef.current.scrollTop = containerRef.current.scrollHeight
  }

  // Reset when chat changes
  useEffect(() => {
    setMessages([])
    setChatUser(null)
    setLoading(true)
    setEditingId(null)
    setMessage('')
    setTyping(false)
    setShowRemoveConfirm(false)
  }, [chatId])

  // Load messages
  useEffect(() => {
    if (!chatId) return
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [chatId])

  // Mark messages read
  useEffect(() => {
    if (!messages.length || !chatUser) return
    messages
      .filter(m => m.sender === chatUser.uid && !m.readBy?.includes(currentUser.uid))
      .forEach(async m => {
        await updateDoc(doc(db, 'messages', m.id), {
          readBy: [...(m.readBy || []), currentUser.uid]
        })
      })
  }, [messages, chatUser])

  // Load partner and typing listener
  useEffect(() => {
    if (!chatId) return
    const load = async () => {
      setLoading(true)
      const chatRef = doc(db, 'chats', chatId)
      const chatDoc = await getDoc(chatRef)
      if (!chatDoc.exists()) return

      const otherUid = chatDoc.data().members.find(u => u !== currentUser.uid)
      const userDoc  = await getDoc(doc(db, 'users', otherUid))
      if (userDoc.exists()) setChatUser(userDoc.data())

      const unsubTyping = onDocSnapshot(chatRef, (snap) => {
        const data = snap.data()
        if (data?.typing) setTyping(data.typing[otherUid] || false)
      })
      setLoading(false)
      return unsubTyping
    }
    const p = load()
    return () => { p.then(fn => fn?.()) }
  }, [chatId])

  useEffect(() => { scrollToBottom() }, [messages])

  //Send/edit message
  const sendMessage = async () => {
    if (!message.trim()) return
    await updateDoc(doc(db, 'chats', chatId), { [`typing.${currentUser.uid}`]: false })
    if (editingId) {
      await updateDoc(doc(db, 'messages', editingId), { text: message })
      setEditingId(null)
    } else {
      await addDoc(collection(db, 'messages'), {
        chatId,
        sender: currentUser.uid,
        text: message,
        timestamp: serverTimestamp(),
        readBy: [currentUser.uid]
      })
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          text: message,
          sender: currentUser.uid,
          timestamp: serverTimestamp(),
          seenBy: [currentUser.uid]
        }
      })
    }
    setMessage('')
  }

  const handleTyping = async (e) => {
    setMessage(e.target.value)
    await updateDoc(doc(db, 'chats', chatId), { [`typing.${currentUser.uid}`]: true })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(async () => {
      await updateDoc(doc(db, 'chats', chatId), { [`typing.${currentUser.uid}`]: false })
    }, 1500)
  }

  const deleteMessage = async (id) => deleteDoc(doc(db, 'messages', id))
  const startEdit     = (msg) => { setEditingId(msg.id); setMessage(msg.text) }

  //Remove contact
  const handleRemoveContact = async () => {
    if (!chatUser) return

    await updateDoc(doc(db, 'users', currentUser.uid), {
      contacts: arrayRemove(chatUser.uid)
    })

    setShowRemoveConfirm(false)

    if (onRemoveContact) {
      onRemoveContact()
    } else {
      navigate(-1)
    }
  }

  const handleBack = () => {
    if (onBack) onBack()
    else navigate(-1)
  }

  const formatTime = (ts) => {
    if (!ts?.toDate) return ''
    return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const getInitial = (n) => n ? n.charAt(0).toUpperCase() : '?'

  return (
    <div className="chat-page">

      {/*Header*/}
      <div className="chat-header">
        <button className="back-btn" onClick={handleBack}><ArrowBackIcon /></button>

        {chatUser && (
          <div className="chat-header-avatar">{getInitial(chatUser.name)}</div>
        )}
        {!loading && <h2 className="chat-header-name">{chatUser?.name}</h2>}

        {/*Remove Contact*/}
        {chatUser && (
          <button
            className="remove-contact-btn"
            onClick={() => setShowRemoveConfirm(true)}
            title="Remove from Chats"
          >
            <PersonRemoveIcon fontSize="small" />
            <span className="remove-contact-label">Remove</span>
          </button>
        )}
      </div>

      {/*Remove Confirm*/}
      {showRemoveConfirm && (
        <div className="modal-overlay" onClick={() => setShowRemoveConfirm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">👤</div>
            <h3 className="modal-title">Remove Contact</h3>
            <p className="modal-desc">
              Remove <strong>{chatUser?.name}</strong> from your contacts?
              They will move back to the Contacts tab.
            </p>
            <div className="modal-actions">
              <button className="modal-btn modal-confirm" onClick={handleRemoveContact}>Remove</button>
              <button className="modal-btn modal-cancel"  onClick={() => setShowRemoveConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/*Messages*/}
      <div className="chat-container" ref={containerRef}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: '20px' }}>
            <CircularProgress />
          </Box>
        ) : (
          <div className="chat-messages-inner">
            {messages.map((msg, idx) => {
              const isMe    = msg.sender === currentUser.uid
              const isSeen  = isMe && msg.readBy?.includes(chatUser?.uid)
              const nextMsg = messages[idx + 1]
              const isLastInGroup = !nextMsg || nextMsg.sender !== msg.sender

              return (
                <div key={msg.id} className={`msg-row ${isMe ? 'mine' : 'theirs'}`}>
                  {!isMe && isLastInGroup && (
                    <div className="msg-avatar-col">
                      <div className="msg-avatar">{getInitial(chatUser?.name)}</div>
                      <span className="msg-avatar-time">{formatTime(msg.timestamp)}</span>
                    </div>
                  )}
                  {!isMe && !isLastInGroup && <div className="msg-avatar-col" />}

                  <div className="bubble-shell">
                    <div className={isMe ? 'my-message' : 'other-message'}>
                      <p>{msg.text}</p>
                    </div>
                    <div className="bubble-meta">
                      {isMe && <span className="timestamp">{formatTime(msg.timestamp)}</span>}
                      {isSeen && <span className="read-receipt">✓ Seen</span>}
                    </div>
                  </div>

                  {isMe && (
                    <div className="msg-actions">
                      <button onClick={() => startEdit(msg)}>Edit</button>
                      <button onClick={() => deleteMessage(msg.id)}>Delete</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/*Typing indicator*/}
      {typing && (
        <div className="typing-indicator typing-bottom">
          {chatUser?.name} is typing
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      )}

      {/*Input*/}
      <div className="chat-input">
        <input
          type="text"
          value={message}
          onChange={handleTyping}
          placeholder={editingId ? 'Edit message…' : 'Message…'}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>
          {editingId ? <SendAndArchiveIcon fontSize="small" /> : <SendIcon fontSize="small" />}
        </button>
      </div>

    </div>
  )
}

export default Chat