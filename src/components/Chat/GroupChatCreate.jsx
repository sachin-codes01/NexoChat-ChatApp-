import '../Dashboard/Dashboard.css'
import React, { useState, useEffect } from 'react'
import { db, auth } from '../../firebase/firebase'
import { collection, addDoc, doc, getDoc } from 'firebase/firestore'

const GroupChatCreate = ({ onClose }) => {
  const [groupName, setGroupName]           = useState('')
  const [mutualContacts, setMutualContacts] = useState([])
  const [selectedUsers, setSelectedUsers]   = useState([])
  const [loading, setLoading]               = useState(true)

  // Load only mutual contacts: people in MY contacts who also have ME in their contacts
  useEffect(() => {
    const loadMutualContacts = async () => {
      setLoading(true)
      try {
        const currentUid = auth.currentUser.uid

        // Fetch my own user doc to get my contacts list
        const myDoc = await getDoc(doc(db, 'users', currentUid))
        if (!myDoc.exists()) { setMutualContacts([]); setLoading(false); return }

        const myContacts = myDoc.data().contacts || []
        if (myContacts.length === 0) { setMutualContacts([]); setLoading(false); return }

        // For each contact, check that they also have me in their contacts (mutual)
        const results = await Promise.all(
          myContacts.map(async (uid) => {
            const theirDoc = await getDoc(doc(db, 'users', uid))
            if (!theirDoc.exists()) return null
            const theirData     = theirDoc.data()
            const theirContacts = theirData.contacts || []
            if (!theirContacts.includes(currentUid)) return null
            return theirData
          })
        )

        setMutualContacts(results.filter(Boolean))
      } catch (err) {
        console.error('loadMutualContacts:', err)
      } finally {
        setLoading(false)
      }
    }

    loadMutualContacts()
  }, [])

  const toggleUser = (uid) => {
    setSelectedUsers(prev =>
      prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]
    )
  }

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0)
      return alert('Enter a group name and select at least one member.')
    await addDoc(collection(db, 'groups'), {
      name: groupName.trim(),
      members: [auth.currentUser.uid, ...selectedUsers],
      createdAt: new Date()
    })
    onClose()
  }

  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : '?'

  return (
    <div className="group-create-overlay" onClick={onClose}>
      <div className="create-group" onClick={e => e.stopPropagation()}>
        <h3>Create Group Chat</h3>

        <input
          type="text"
          placeholder="Group name..."
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          autoFocus
        />

        <h4>Select Members</h4>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#9aa5b4', fontSize: 13, padding: '12px 0' }}>
            Loading contacts…
          </p>
        ) : mutualContacts.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9aa5b4', fontSize: 13, padding: '12px 0', fontStyle: 'italic' }}>
            No mutual contacts yet. Add someone and wait for them to add you back.
          </p>
        ) : (
          <ul>
            {mutualContacts.map(u => (
              <li key={u.uid}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.uid)}
                    onChange={() => toggleUser(u.uid)}
                  />
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #5b6af0, #3d4bd4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0
                  }}>
                    {getInitial(u.name)}
                  </div>
                  {u.name}
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="create-group-actions">
          <button onClick={createGroup}>Create</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default GroupChatCreate