import React, { useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const AdminMemberSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Search by Username (Exact match for simplicity)
  const handleSearch = async () => {
    const usersRef = collection(db, "Users");
    // You can also add another query for "fullName" here
    const q = query(usersRef, where("username", "==", searchTerm));
    
    const querySnapshot = await getDocs(q);
    const results = [];
    querySnapshot.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
    setSearchResults(results);
  };

  // Update User Class (Admin Action)
  const updateUserClass = async (userId, newClass) => {
    const userRef = doc(db, "Users", userId);
    await updateDoc(userRef, {
      classLevel: newClass
    });
    alert(`User class updated to ${newClass}`);
  };

  return (
    <div className="admin-search-container p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Search & Manage Members</h2>
      
      <div className="flex space-x-2 mb-6">
        <input 
          type="text" 
          placeholder="Enter Exact Username..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 flex-1 rounded-md"
        />
        <button onClick={handleSearch} className="bg-green-600 text-white px-4 py-2 rounded-md">
          Search
        </button>
      </div>

      {/* Search Results */}
      <div className="results-area space-y-4">
        {searchResults.map(user => (
          <div key={user.id} className="border p-4 rounded-md">
            <p><strong>Name:</strong> {user.fullName} (@{user.username})</p>
            <p><strong>Current Class:</strong> {user.classLevel}</p>
            
            {/* Admin Edit Controls */}
            <div className="mt-3 flex items-center space-x-3">
              <label className="text-sm font-semibold">Change Class:</label>
              <select 
                className="border p-1 rounded-md"
                onChange={(e) => updateUserClass(user.id, e.target.value)}
                defaultValue={user.classLevel}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={`Class ${i+1}`}>Class {i+1}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminMemberSearch;

