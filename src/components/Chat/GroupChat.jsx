import './Chat.css'
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth, db } from '../../firebase/firebase'
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, getDoc,
  updateDoc, deleteDoc, serverTimestamp, getDocs, arrayRemove, arrayUnion} from "firebase/firestore"
import SendIcon from '@mui/icons-material/Send'
import SendAndArchiveIcon from '@mui/icons-material/SendAndArchive'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import PersonAddIcon from '@mui/icons-material/PersonAdd'

const GroupChat = ({ inlineChatId, onBack, onGroupDeleted }) => {
  const { chatId: paramChatId } = useParams()
  const chatId = inlineChatId || paramChatId

  const navigate    = useNavigate()
  const currentUser = auth.currentUser

  const [group, setGroup]                     = useState(null)
  const [messages, setMessages]               = useState([])
  const [message, setMessage]                 = useState('')
  const [editingId, setEditingId]             = useState(null)
  const [typing, setTyping]                   = useState([])
  const [usersMap, setUsersMap]               = useState({})
  const [membersListVisible, setMembersListVisible] = useState(false)
  const [confirmModal, setConfirmModal]       = useState(null)

 
  const [showAddMembers, setShowAddMembers]   = useState(false)
  const [myContacts, setMyContacts]           = useState([])
  const [selectedToAdd, setSelectedToAdd]     = useState([])
  const [addMembersSearch, setAddMembersSearch] = useState('')

  const typingTimeout = useRef(null)
  const containerRef  = useRef()
  const chatPageRef   = useRef()    
  const membersRef    = useRef(null)

  const scrollToBottom = () => {
    if (containerRef.current)
      containerRef.current.scrollTop = containerRef.current.scrollHeight
  }


  useEffect(() => {
    setGroup(null)
    setMessages([])
    setMessage('')
    setEditingId(null)
    setTyping([])
    setMembersListVisible(false)
    setConfirmModal(null)
    setShowAddMembers(false)
    setSelectedToAdd([])
    setAddMembersSearch('')
  }, [chatId])

  useEffect(() => {
    if (window.innerWidth > 768) return

    const page = chatPageRef.current
    if (!page) return

    const vp = window.visualViewport
    if (!vp) return

    const updateLayout = () => {

      const keyboardHeight = Math.max(
        0,
        window.innerHeight - vp.offsetTop - vp.height
      )

      const inputEl = page.querySelector('.chat-input')
      const inputH  = inputEl ? inputEl.offsetHeight : 68

      page.style.setProperty('--kb-offset',        `${keyboardHeight}px`)
      page.style.setProperty('--kb-input-bottom',  `${keyboardHeight + inputH}px`)
      page.style.setProperty('--kb-typing-bottom', `${keyboardHeight + inputH}px`)

      requestAnimationFrame(scrollToBottom)
    }

    vp.addEventListener('resize', updateLayout)
    vp.addEventListener('scroll', updateLayout)
    updateLayout()

    return () => {
      vp.removeEventListener('resize', updateLayout)
      vp.removeEventListener('scroll', updateLayout)
      page.style.removeProperty('--kb-offset')
      page.style.removeProperty('--kb-input-bottom')
      page.style.removeProperty('--kb-typing-bottom')
    }
  }, [chatId])

  // Close members popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (membersRef.current && !membersRef.current.contains(e.target)) {
        setMembersListVisible(false)
        setShowAddMembers(false)
        setSelectedToAdd([])
        setAddMembersSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load all users once for name lookups
  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'))
      const map  = {}
      snap.docs.forEach(d => { map[d.data().uid] = d.data().name })
      setUsersMap(map)
    }
    fetchUsers()
  }, [])

  // Load current user's contacts for Add Members panel
  useEffect(() => {
    if (!currentUser) return
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), async (snap) => {
      if (!snap.exists()) return
      const contactUids = snap.data().contacts || []
      if (contactUids.length === 0) { setMyContacts([]); return }

      // Fetch contact user docs
      const contactSnaps = await Promise.all(
        contactUids.map(uid => getDoc(doc(db, 'users', uid)))
      )
      const contacts = contactSnaps
        .filter(d => d.exists())
        .map(d => d.data())
      setMyContacts(contacts)
    })
    return () => unsub()
  }, [currentUser])

  // Group info and typing indicators
  useEffect(() => {
    if (!chatId) return
    const groupRef = doc(db, 'groups', chatId)
    const unsub = onSnapshot(groupRef, snap => {
      const data = snap.data()
      if (!data) return
      setGroup(data)

      if (data.typing) {
        const typingNames = Object.entries(data.typing)
          .filter(([uid, isTyping]) => uid !== currentUser.uid && isTyping)
          .map(([uid]) => usersMap[uid] || 'Someone')
        setTyping(typingNames)
      }
    })
    return () => unsub()
  }, [chatId, usersMap])

  // Messages in real-time
  useEffect(() => {
    if (!chatId) return
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    )
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [chatId])

  // Mark incoming messages as read
  useEffect(() => {
    if (!messages.length) return
    messages
      .filter(m => !m.readBy?.includes(currentUser.uid))
      .forEach(async m => {
        await updateDoc(doc(db, 'messages', m.id), {
          readBy: [...(m.readBy || []), currentUser.uid]
        })
      })
  }, [messages])

  useEffect(() => { scrollToBottom() }, [messages])

  // Send / edit message
  const sendMessage = async () => {
    if (!message.trim()) return
    await updateDoc(doc(db, 'groups', chatId), { [`typing.${currentUser.uid}`]: false })

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
      await updateDoc(doc(db, 'groups', chatId), {
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
    await updateDoc(doc(db, 'groups', chatId), { [`typing.${currentUser.uid}`]: true })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(async () => {
      await updateDoc(doc(db, 'groups', chatId), { [`typing.${currentUser.uid}`]: false })
    }, 1500)
  }

  const startEdit     = (msg) => { setEditingId(msg.id); setMessage(msg.text) }
  const deleteMessage = async (id) => deleteDoc(doc(db, 'messages', id))

  // Add members to group
  const handleAddMembers = async () => {
    if (selectedToAdd.length === 0) return
    await updateDoc(doc(db, 'groups', chatId), {
      members: arrayUnion(...selectedToAdd)
    })
    setSelectedToAdd([])
    setShowAddMembers(false)
    setAddMembersSearch('')
  }

  const toggleSelectUser = (uid) => {
    setSelectedToAdd(prev =>
      prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]
    )
  }

  // Contacts not already in the group
  const addableContacts = myContacts.filter(u =>
    !group?.members?.includes(u.uid) &&
    u.name?.toLowerCase().includes(addMembersSearch.toLowerCase())
  )

  // Leave group
  const handleLeaveGroup = async () => {
    setConfirmModal(null)
    const groupRef  = doc(db, 'groups', chatId)
    const groupSnap = await getDoc(groupRef)
    if (!groupSnap.exists()) return

    const remaining = groupSnap.data().members.filter(uid => uid !== currentUser.uid)
    if (remaining.length === 0) {
      const q    = query(collection(db, 'messages'), where('chatId', '==', chatId))
      const snap = await getDocs(q)
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'messages', d.id))))
      await deleteDoc(groupRef)
    } else {
      await updateDoc(groupRef, { members: arrayRemove(currentUser.uid) })
    }
    if (onGroupDeleted) onGroupDeleted()
    else navigate('/Dashboard')
  }

  const handleBack = () => {
    if (onBack) onBack()
    else navigate(-1)
  }

  const formatTime = (ts) => {
    if (!ts?.toDate) return ''
    return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : '?'

  return (
    // ↓ chatPageRef lets the keyboard-fix effect target this element
    <div className="chat-page" ref={chatPageRef}>

      {/*Header*/}
      <div className="chat-header">
        <button className="back-btn" onClick={handleBack}>
          <ArrowBackIcon />
        </button>

        {/* Group name + members count + popup */}
        <div className="chat-header-info" ref={membersRef}>
          <h2>{group?.name || 'Loading…'}</h2>
          <small onClick={() => { setMembersListVisible(v => !v); setShowAddMembers(false); setSelectedToAdd([]) }}>
            {group?.members?.length} members
          </small>

          {membersListVisible && (
            <div className="members-popup">

              {/* ── Add Members header button ── */}
              <div className="members-popup-add-row">
                {!showAddMembers ? (
                  <button
                    className="members-popup-add-btn"
                    onClick={(e) => { e.stopPropagation(); setShowAddMembers(true) }}
                  >
                    <PersonAddIcon style={{ fontSize: 14 }} />
                    Add Members
                  </button>
                ) : (
                  /* ── Add Members panel ── */
                  <div className="add-members-panel" onClick={e => e.stopPropagation()}>
                    <div className="add-members-header">
                      <span>Add Members</span>
                      <button
                        className="add-members-close"
                        onClick={() => { setShowAddMembers(false); setSelectedToAdd([]); setAddMembersSearch('') }}
                      >✕</button>
                    </div>

                    <input
                      className="add-members-search"
                      type="text"
                      placeholder="Search contacts…"
                      value={addMembersSearch}
                      onChange={e => setAddMembersSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                    />

                    <ul className="add-members-list">
                      {addableContacts.length === 0 && (
                        <li className="add-members-empty">
                          {myContacts.length === 0
                            ? 'No contacts found.'
                            : 'All your contacts are already in this group.'}
                        </li>
                      )}
                      {addableContacts.map(u => (
                        <li key={u.uid} className="add-members-item">
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedToAdd.includes(u.uid)}
                              onChange={() => toggleSelectUser(u.uid)}
                            />
                            <div className="add-members-avatar">{getInitial(u.name)}</div>
                            <span>{u.name}</span>
                          </label>
                        </li>
                      ))}
                    </ul>

                    {selectedToAdd.length > 0 && (
                      <button className="add-members-confirm" onClick={handleAddMembers}>
                        Add {selectedToAdd.length} member{selectedToAdd.length > 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Member list ── */}
              {!showAddMembers && (
                <ul className="members-list-inner">
                  {group?.members?.map(uid => (
                    <li key={uid}>
                      {usersMap[uid] || 'Unknown'}
                      {uid === currentUser.uid && (<span className="members-popup-you">(you)</span>)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Action buttons and Leave */}
        <div className="chat-header-actions">
          <button
            className="group-action-btn group-action-btn--leave"
            onClick={() => setConfirmModal('leave')} title="Leave group">
            <ExitToAppIcon fontSize="small" />
            <span className="group-action-label">Leave</span>
          </button>
        </div>
      </div>

      {/*Confirm Modal (Leave)*/}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">🚪</div>
            <h3 className="modal-title">Leave Group</h3>
            <p className="modal-desc">You will leave &ldquo;{group?.name}&rdquo;. This cannot be undone.</p>
            <div className="modal-actions">
              <button className="modal-btn modal-confirm" onClick={handleLeaveGroup}>Leave</button>
              <button className="modal-btn modal-cancel" onClick={() => setConfirmModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/*Messages*/}
      <div className="chat-container" ref={containerRef}>
        <div className="chat-messages-inner">
          {messages.map((msg, idx) => {
            const isMe          = msg.sender === currentUser.uid
            const senderName    = usersMap[msg.sender] || 'Unknown'
            const readCount     = msg.readBy?.length ? msg.readBy.length - (isMe ? 1 : 0) : 0
            const nextMsg       = messages[idx + 1]
            const prevMsg       = messages[idx - 1]
            const isLastInGroup  = !nextMsg || nextMsg.sender !== msg.sender
            const isFirstInGroup = !prevMsg || prevMsg.sender !== msg.sender

            return (
              <div key={msg.id} className={`msg-row ${isMe ? 'mine' : 'theirs'}`}>
                {!isMe && isLastInGroup && (
                  <div className="msg-avatar-col">
                    <div className="msg-avatar">{getInitial(senderName)}</div>
                    <span className="msg-avatar-time">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                {!isMe && !isLastInGroup && <div className="msg-avatar-col" />}

                <div className="bubble-shell">
                  {!isMe && isFirstInGroup && (
                    <span className="username">{senderName}</span>
                  )}
                  <div className={isMe ? 'my-message' : 'other-message'}>
                    <p>{msg.text}</p>
                  </div>
                  <div className="bubble-meta">
                    {isMe && <span className="timestamp">{formatTime(msg.timestamp)}</span>}
                    {isMe && readCount > 0 && (<span className="read-receipt">✓ Read by {readCount}</span>)}
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
      </div>

      {/*Typing indicator*/}
      {typing.length > 0 && (
        <div className="typing-indicator typing-bottom">
          {typing.join(', ')} {typing.length > 1 ? 'are' : 'is'} typing
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      )}

      {/*Input*/}
      <div className="chat-input">
        <input type="text" value={message} onChange={handleTyping}
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

export default GroupChat