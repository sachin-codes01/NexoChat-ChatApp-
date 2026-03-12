import './Dashboard.css';
import React, { useState, useEffect, useRef } from 'react'
import { auth, db } from '../../firebase/firebase'
import { signOut, deleteUser, onAuthStateChanged } from "firebase/auth"
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, addDoc, deleteDoc,
  doc, onSnapshot, updateDoc, getDoc, arrayUnion, arrayRemove, serverTimestamp} from "firebase/firestore"
import CircularProgress from '@mui/material/CircularProgress'
import GroupChatCreate from "../Chat/GroupChatCreate"
import Chat from "../Chat/Chat"
import GroupChat from "../Chat/GroupChat"

const Dashboard = () => {

  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState([])
  const [showGroupCreate, setShowGroupCreate] = useState(false)
  const [chats, setChats] = useState([])
  const [myContactUids, setMyContactUids] = useState([])

  const [myContactsSearch, setMyContactsSearch] = useState("")
  const [allContactsSearch, setAllContactsSearch] = useState("")
  const [activeTab, setActiveTab] = useState('chats')

  const [selectedChat, setSelectedChat] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // "Who Added Me" state
  const [showAddedMePopup, setShowAddedMePopup] = useState(false)
  const [usersWhoAddedMe, setUsersWhoAddedMe] = useState([])
  const [seenAddedMeUids, setSeenAddedMeUids] = useState([])
  const addedMePopupRef = useRef(null)

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const unsubUsersRef     = useRef(null)
  const unsubGroupsRef    = useRef(null)
  const unsubChatsRef     = useRef(null)
  const unsubContactsRef  = useRef(null)
  const unsubAddedMeRef   = useRef(null)
  const dropdownRef       = useRef(null)
  const navigate          = useNavigate()

  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    const h = (e) => {
      if (addedMePopupRef.current && !addedMePopupRef.current.contains(e.target))
        setShowAddedMePopup(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { navigate('/Login'); return }
      setCurrentUser(user)
      setName(user.displayName || '')
      setEmail(user.email || '')
      updateDoc(doc(db, 'users', user.uid), { isOnline: true }).catch(() => {})
      window.addEventListener('beforeunload', () =>
        updateDoc(doc(db, 'users', user.uid), { isOnline: false }).catch(() => {})
      )
      unsubUsersRef.current?.()
      unsubGroupsRef.current?.()
      unsubChatsRef.current?.()
      unsubContactsRef.current?.()
      unsubAddedMeRef.current?.()
      unsubUsersRef.current    = listenUsers(user.uid)
      unsubGroupsRef.current   = listenGroups(user.uid)
      unsubChatsRef.current    = listenChats(user.uid)
      unsubContactsRef.current = listenMyContacts(user.uid)
      unsubAddedMeRef.current  = listenUsersWhoAddedMe(user.uid)
    })
    return () => {
      unsubAuth()
      unsubUsersRef.current?.()
      unsubGroupsRef.current?.()
      unsubChatsRef.current?.()
      unsubContactsRef.current?.()
      unsubAddedMeRef.current?.()
    }
  }, [])

  const listenUsers = (uid) => {
    setLoading(true)
    return onSnapshot(collection(db, 'users'),
      (snap) => {
        setUsers(snap.docs.map(d => d.data()).filter(u => u.uid && u.uid !== uid))
        setLoading(false)
      },
      () => setLoading(false)
    )
  }

  const listenGroups = (uid) => {
    const q = query(collection(db, 'groups'), where('members', 'array-contains', uid))
    return onSnapshot(q,
      (snap) => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err)  => console.error('listenGroups:', err.code)
    )
  }

  const listenChats = (uid) => {
    const q = query(collection(db, 'chats'), where('members', 'array-contains', uid))
    return onSnapshot(q,
      (snap) => setChats(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err)  => console.error('listenChats:', err.code)
    )
  }

  const listenMyContacts = (uid) => {
    return onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) setMyContactUids(snap.data().contacts || [])
    })
  }

  // Real-time listener: who has me in their contacts
  const listenUsersWhoAddedMe = (uid) => {
    const q = query(collection(db, 'users'), where('contacts', 'array-contains', uid))
    return onSnapshot(q, (snap) => {
      const result = snap.docs.map(d => d.data()).filter(u => u.uid !== uid)
      setUsersWhoAddedMe(result)
    }, (err) => console.error('listenUsersWhoAddedMe:', err.code))
  }

  // Open popup and immediately mark all visible entries as "seen"
  const handleOpenAddedMe = () => {
    setShowAddedMePopup(true)
    setSeenAddedMeUids(prev => {
      const updated = [...prev]
      usersWhoAddedMe.forEach(u => { if (!updated.includes(u.uid)) updated.push(u.uid) })
      return updated
    })
  }

  // Badge: people who added me, not yet seen, not already in my contacts
  const pendingAddedMeCount = usersWhoAddedMe.filter(
    u => !seenAddedMeUids.includes(u.uid) && !myContactUids.includes(u.uid)
  ).length

  // ── Find or create 1-on-1 chat ──
  const findOrCreateChat = async (partnerUid) => {
    const q    = query(collection(db, 'chats'), where('members', 'array-contains', currentUser.uid))
    const snap = await getDocs(q)
    let chatId = null
    snap.forEach(d => { if (d.data().members.includes(partnerUid)) chatId = d.id })
    if (!chatId) {
      const chat = await addDoc(collection(db, 'chats'), {
        members: [currentUser.uid, partnerUid],
        type: 'private',
        lastMessage: null
      })
      chatId = chat.id
    }
    return chatId
  }

  // ── System message helper: sends TWO messages so each user sees the other's name ──
  const sendMutualConnectMessages = async (chatId, partnerName, partnerUid) => {
    const myName = currentUser.displayName || name || 'Someone'
    // Message 1: the partner reads "[partnerName] is available to chat!" (addressed to them)
    await addDoc(collection(db, 'messages'), {
      chatId,
      sender: 'system',
      recipientUid: partnerUid,
      text: `👋 ${partnerName || 'Your contact'} is available to chat!`,
      timestamp: serverTimestamp(),
      readBy: []
    })
    // Message 2: I read "[myName] is available to chat!" (addressed to me)
    await addDoc(collection(db, 'messages'), {
      chatId,
      sender: 'system',
      recipientUid: currentUser.uid,
      text: `👋 ${myName} is available to chat!`,
      timestamp: serverTimestamp(),
      readBy: []
    })
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: {
        text: `👋 ${myName} is available to chat!`,
        sender: 'system',
        timestamp: serverTimestamp(),
        seenBy: [currentUser.uid]
      }
    })
  }

  // ── Add contact (plain — from Contacts tab "+" button) ──
  const addToMyContacts = async (uid, partnerName) => {
    if (!currentUser) return
    const theirDoc       = await getDoc(doc(db, 'users', uid))
    const alreadyAddedMe = theirDoc.exists() &&
      (theirDoc.data().contacts || []).includes(currentUser.uid)

    await updateDoc(doc(db, 'users', currentUser.uid), { contacts: arrayUnion(uid) })

    if (alreadyAddedMe) {
      const cid = await findOrCreateChat(uid)
      await sendMutualConnectMessages(cid, partnerName, uid)
    }
  }

  // ── Add back from "Who Added Me" popup ──
  const addBackFromPopup = async (user) => {
    const theirDoc       = await getDoc(doc(db, 'users', user.uid))
    const alreadyAddedMe = theirDoc.exists() &&
      (theirDoc.data().contacts || []).includes(currentUser.uid)

    await updateDoc(doc(db, 'users', currentUser.uid), { contacts: arrayUnion(user.uid) })

    if (alreadyAddedMe) {
      const cid = await findOrCreateChat(user.uid)
      await sendMutualConnectMessages(cid, user.name, user.uid)
    }
  }

  // ── Remove contact (called by Chat via onRemoveContact prop) ──
  // Message is sent inside Chat.js's handleRemoveContact — no duplicate here
  const removeFromMyContacts = async (uid) => {
    if (!currentUser) return
    await updateDoc(doc(db, 'users', currentUser.uid), { contacts: arrayRemove(uid) })
    setSelectedChat(prev => (prev?.partnerUid === uid ? null : prev))
  }

  const logout = async () => {
    if (auth.currentUser)
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { isOnline: false }).catch(() => {})
    await signOut(auth)
    navigate('/Login')
  }

  const deleteAccount = () => { setShowDeleteModal(true); setShowDropdown(false) }

  const confirmDeleteAccount = async () => {
    setShowDeleteModal(false)
    try {
      setLoading(true)
      const user = auth.currentUser
      await deleteDoc(doc(db, 'users', user.uid))
      await deleteUser(user)
      navigate('/Register')
    } catch (err) {
      alert("Failed to delete account: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const openChat = async (user) => {
    if (!currentUser) return
    const q    = query(collection(db, 'chats'), where('members', 'array-contains', currentUser.uid))
    const snap = await getDocs(q)
    let chatId = null
    snap.forEach(d => { if (d.data().members.includes(user.uid)) chatId = d.id })

    if (chatId) {
      const chatRef  = doc(db, 'chats', chatId)
      const chatSnap = await getDoc(chatRef)
      if (chatSnap.exists() && chatSnap.data().lastMessage) {
        const seenBy = chatSnap.data().lastMessage.seenBy || []
        if (!seenBy.includes(currentUser.uid))
          await updateDoc(chatRef, { 'lastMessage.seenBy': [...seenBy, currentUser.uid] })
      }
    } else {
      const chat = await addDoc(collection(db, 'chats'), {
        members: [currentUser.uid, user.uid],
        type: 'private',
        lastMessage: null
      })
      chatId = chat.id
    }

    if (isMobile) navigate(`/Chat/${chatId}`)
    else setSelectedChat({ type: 'private', id: chatId, partnerUid: user.uid })
  }

  const openGroupChat = async (groupId) => {
    if (!currentUser) return
    const groupRef  = doc(db, 'groups', groupId)
    const groupSnap = await getDoc(groupRef)
    if (groupSnap.exists() && groupSnap.data().lastMessage) {
      const seenBy = groupSnap.data().lastMessage.seenBy || []
      if (!seenBy.includes(currentUser.uid))
        await updateDoc(groupRef, { 'lastMessage.seenBy': [...seenBy, currentUser.uid] })
    }
    if (isMobile) navigate(`/GroupChat/${groupId}`)
    else setSelectedChat({ type: 'group', id: groupId })
  }

  const hasNewMessage = (userId) => {
    if (!currentUser) return false
    return chats.some(c =>
      c.members.includes(userId) &&
      c.members.includes(currentUser.uid) &&
      c.lastMessage?.sender === userId &&
      !c.lastMessage?.seenBy?.includes(currentUser.uid)
    )
  }

  const getChatTimestamp = (uid) => {
    const chat = chats.find(c =>
      c.members.includes(uid) && c.members.includes(currentUser?.uid)
    )
    return chat?.lastMessage?.timestamp?.toMillis?.() ?? 0
  }

  const getInitial   = (n) => n ? n.charAt(0).toUpperCase() : '?'
  const activeChatId = selectedChat?.id ?? null

  const myContactUsers = users
    .filter(u => myContactUids.includes(u.uid))
    .filter(u => u.name?.toLowerCase().includes(myContactsSearch.toLowerCase()))
    .sort((a, b) => getChatTimestamp(b.uid) - getChatTimestamp(a.uid))

  const discoverUsers = users
    .filter(u => !myContactUids.includes(u.uid))
    .filter(u => u.name?.toLowerCase().includes(allContactsSearch.toLowerCase()))

  return (
    <div className="dashboard-wrapper">
      {loading && (
        <div className="loading-overlay">
          <CircularProgress style={{ color: '#5b6af0' }} />
        </div>
      )}

      <div className="sidebar">

        <div className="sidebar-profile">
          <div className="sidebar-profile-info">
            <div className="sidebar-avatar">{getInitial(name)}</div>
            <div>
              <div className="sidebar-profile-name">{name}</div>
              <div className="sidebar-profile-email">{email}</div>
            </div>
          </div>
          <div className="profile-menu-wrapper" ref={dropdownRef}>
            <button className="three-dots-btn" onClick={() => setShowDropdown(v => !v)}>&#8942;</button>
            {showDropdown && (
              <div className="profile-dropdown">
                <button className="dropdown-item item-group"  onClick={() => { setShowGroupCreate(true); setShowDropdown(false) }}>+ Create Group</button>
                <button className="dropdown-item item-delete" onClick={deleteAccount}>Delete Account</button>
                <button className="dropdown-item item-logout" onClick={() => { setShowDropdown(false); logout() }}>Logout</button>
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-actions">
          <button className="btn-action btn-logout" onClick={logout}>Logout</button>
          <button className="btn-action btn-delete" onClick={deleteAccount}>Delete Account</button>
          <button className="btn-action btn-group"  onClick={() => setShowGroupCreate(true)}>+ Group</button>
        </div>

        <div className="sidebar-tabs">
          <button className={`sidebar-tab${activeTab === 'chats' ? ' sidebar-tab--active' : ''}`}
            onClick={() => setActiveTab('chats')}>Chats</button>
          <button className={`sidebar-tab${activeTab === 'contacts' ? ' sidebar-tab--active' : ''}`}
            onClick={() => setActiveTab('contacts')}>Contacts</button>
        </div>

        {activeTab === 'chats' && (
          <>
            <div className="sidebar-search">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input type="text" placeholder="Search my contacts…"
                  value={myContactsSearch} onChange={e => setMyContactsSearch(e.target.value)}/>
              </div>
            </div>

            <div className="sidebar-list">
              <div className="sidebar-section-title">My Contacts</div>

              {myContactUsers.length === 0 && (
                <div className="sidebar-empty-hint">
                  {myContactUids.length === 0
                    ? 'No contacts yet — add people from the Contacts tab.'
                    : 'No contacts match your search.'}
                </div>
              )}

              {myContactUsers.map(user => {
                const userChat = chats.find(c =>
                  c.members.includes(user.uid) && c.members.includes(currentUser?.uid)
                )
                const isActive = userChat?.id === activeChatId
                return (
                  <div key={user.uid} className={`sidebar-item${isActive ? ' active' : ''}`}
                    onClick={() => openChat(user)}>
                    <div className="item-avatar">{getInitial(user.name)}</div>
                    <div className="item-body">
                      <div className="item-name">{user.name}</div>
                      <div className="item-preview">{user.email}</div>
                    </div>
                    {hasNewMessage(user.uid) && (
                      <div className="item-meta"><span className="badge-new">●</span></div>
                    )}
                  </div>
                )
              })}

              {groups.length > 0 && (
                <>
                  <div className="sidebar-section-title groups-title">Groups</div>
                  {groups.map(group => (
                    <div key={group.id}
                      className={`sidebar-item${group.id === activeChatId ? ' active' : ''}`}
                      onClick={() => openGroupChat(group.id)}>
                      <div className="item-avatar group-avatar">{getInitial(group.name)}</div>
                      <div className="item-body">
                        <div className="item-name">{group.name}</div>
                        <div className="item-preview">{group.members.length} members</div>
                      </div>
                      {currentUser && group.lastMessage &&
                        group.lastMessage.sender !== currentUser.uid &&
                        !group.lastMessage.seenBy?.includes(currentUser.uid) && (
                          <div className="item-meta"><span className="badge-new">●</span></div>
                        )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'contacts' && (
          <>
            <div className="sidebar-search">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input type="text" placeholder="Search registered users…"
                  value={allContactsSearch}
                  onChange={e => setAllContactsSearch(e.target.value)}/>
              </div>
            </div>

            {/* Who Added Me */}
            <div className="added-me-bar" ref={addedMePopupRef}>
              <button className="added-me-btn" onClick={handleOpenAddedMe}>
                <span className="added-me-btn__icon">👥</span>
                <span>Who added me?</span>
                {pendingAddedMeCount > 0 && (
                  <span className="added-me-badge">{pendingAddedMeCount}</span>
                )}
              </button>

              {showAddedMePopup && (
                <div className="added-me-popup">
                  <div className="added-me-popup__header">
                    <span className="added-me-popup__title">People who added you</span>
                    <button className="added-me-popup__close"
                      onClick={() => setShowAddedMePopup(false)}>✕</button>
                  </div>

                  {usersWhoAddedMe.length === 0 ? (
                    <div className="added-me-popup__empty">
                      <span className="added-me-popup__empty-icon">🕊️</span>
                      <p>Nobody has added you yet.</p>
                    </div>
                  ) : (
                    <ul className="added-me-popup__list">
                      {usersWhoAddedMe.map(user => {
                        const alreadyInContacts = myContactUids.includes(user.uid)
                        return (
                          <li key={user.uid} className="added-me-popup__item">
                            <div className="added-me-popup__avatar">{getInitial(user.name)}</div>
                            <div className="added-me-popup__info">
                              <span className="added-me-popup__name">{user.name}</span>
                              <span className="added-me-popup__email">{user.email}</span>
                            </div>
                            {alreadyInContacts ? (
                              <span className="added-me-popup__mutual">✓ Mutual</span>
                            ) : (
                              <button className="added-me-popup__add-btn"
                                onClick={() => addBackFromPopup(user)}>
                                + Add back
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="sidebar-list">
              <div className="sidebar-section-title">
                Registered Users
                <span className="contacts-count">{discoverUsers.length}</span>
              </div>

              {discoverUsers.length === 0 && (
                <div className="sidebar-empty-hint">
                  {users.filter(u => !myContactUids.includes(u.uid)).length === 0
                    ? "You've added everyone! 🎉" : 'No users match your search.'}
                </div>
              )}

              {discoverUsers.map(user => (
                <div key={user.uid} className="sidebar-item sidebar-item--discover">
                  <div className="item-avatar">{getInitial(user.name)}</div>
                  <div className="item-body">
                    <div className="item-name">{user.name}</div>
                    <div className="item-preview">{user.email}</div>
                  </div>
                  <button className="add-contact-btn"
                    onClick={() => addToMyContacts(user.uid, user.name)}
                    title={`Add ${user.name} to My Contacts`}>+</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="dashboard-main">
        {!selectedChat ? (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">💬</div>
            <p className="dashboard-empty-title">Your Messages</p>
            <p className="dashboard-empty-sub">Select a conversation to start chatting</p>
          </div>
        ) : selectedChat.type === 'private' ? (
          <Chat
            inlineChatId={selectedChat.id}
            onBack={() => setSelectedChat(null)}
            onRemoveContact={() => removeFromMyContacts(selectedChat.partnerUid)}
          />
        ) : (
          <GroupChat
            inlineChatId={selectedChat.id}
            onBack={() => setSelectedChat(null)}
            onGroupDeleted={() => setSelectedChat(null)}
          />
        )}
      </div>

      {showGroupCreate && <GroupChatCreate onClose={() => setShowGroupCreate(false)} />}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <h3 className="modal-title">Delete Account</h3>
            <p className="modal-desc">This action is irreversible. All your data will be permanently removed.</p>
            <div className="modal-actions">
              <button className="modal-btn modal-confirm" onClick={confirmDeleteAccount}>Delete</button>
              <button className="modal-btn modal-cancel"  onClick={() => setShowDeleteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard