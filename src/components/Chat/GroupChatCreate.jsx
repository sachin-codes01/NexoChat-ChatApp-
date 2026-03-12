import '../Dashboard/Dashboard.css'
import React, { useState, useEffect } from 'react'
import { db, auth } from '../../firebase/firebase'
import { collection, getDocs, addDoc } from 'firebase/firestore'

const GroupChatCreate = ({ onClose }) => {
  const [groupName, setGroupName] = useState('')
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, 'users'))
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.uid !== auth.currentUser.uid)
      setUsers(allUsers)
    }
    fetchUsers()
  }, [])

  const toggleUser = (uid) => {
    setSelectedUsers(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]
    )
  }

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0)
      return alert("Enter a group name and select at least one member.")
    await addDoc(collection(db, 'groups'), {
      name: groupName.trim(),
      members: [auth.currentUser.uid, ...selectedUsers],
      createdAt: new Date()
    })
    onClose()
  }

  return (
    <div className="group-create-overlay" onClick={onClose}>
      <div className="create-group" onClick={e => e.stopPropagation()}>
        <h3>Create Group Chat</h3>

        <input type="text" placeholder="Group name..." value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus />

        <h4>Select Members</h4>

        <ul>
          {users.map(u => (
            <li key={u.id}>
              <label>
                <input type="checkbox" checked={selectedUsers.includes(u.uid)} onChange={() => toggleUser(u.uid)} />
                {u.name}
              </label>
            </li>
          ))}
        </ul>

        <div className="create-group-actions">
          <button onClick={createGroup}>Create</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default GroupChatCreate