import React from 'react';
import { useNavigate } from 'react-router-dom';

const Homepage = ({ currentUser }) => {
  const navigate = useNavigate();

  // Extract just the number (e.g., "Class 6" -> "6") for routing logic if needed
  const classRoute = currentUser.classLevel.replace(" ", "-"); 

  const enterChat = (roomType) => {
    navigate(`/chat/${roomType}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      
      {/* Top Header / Profile Summary */}
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm flex items-center space-x-6 mb-8 border-l-4 border-blue-600">
        <img 
          src={currentUser.profilePhoto} 
          alt="User DP" 
          className="w-20 h-20 rounded-full border-2 border-gray-200"
        />
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {currentUser.fullName}!</h1>
          <p className="text-gray-600">@{currentUser.username} • {currentUser.classLevel} • {currentUser.schoolName}</p>
          {currentUser.verificationStatus === "Pending" && (
            <span className="inline-block mt-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">
              Account Pending Verification
            </span>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Select a Chat Room</h2>
        
        {/* Chat Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Selected Class Chat */}
          <div onClick={() => enterChat(classRoute)} className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg hover:border-blue-500 border-2 border-transparent transition group">
            <h3 className="text-xl font-bold text-blue-600 group-hover:text-blue-800">🏫 {currentUser.classLevel} Chat</h3>
            <p className="text-sm text-gray-500 mt-2">Chat with classmates. Your profile identity is visible.</p>
          </div>

          {/* 2. Global Chat */}
          <div onClick={() => enterChat("Global")} className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg hover:border-green-500 border-2 border-transparent transition group">
            <h3 className="text-xl font-bold text-green-600 group-hover:text-green-800">🌍 Global Chat</h3>
            <p className="text-sm text-gray-500 mt-2">Chat with all students from Class 1 to 12. Identity visible.</p>
          </div>

          {/* 3. Anonymous Class Chat */}
          <div onClick={() => enterChat(`Anonymous-${classRoute}`)} className="bg-gray-800 p-6 rounded-lg shadow cursor-pointer hover:shadow-lg hover:border-gray-400 border-2 border-transparent transition group">
            <h3 className="text-xl font-bold text-gray-100 group-hover:text-white">🕵️‍♂️ Anonymous {currentUser.classLevel}</h3>
            <p className="text-sm text-gray-400 mt-2">Talk privately with your class. Name & Photo are hidden.</p>
          </div>

          {/* 4. Anonymous Global Chat */}
          <div onClick={() => enterChat("Anonymous-Global")} className="bg-black p-6 rounded-lg shadow cursor-pointer hover:shadow-lg hover:border-gray-500 border-2 border-transparent transition group">
            <h3 className="text-xl font-bold text-white">🎭 Anonymous Global</h3>
            <p className="text-sm text-gray-400 mt-2">Talk to the whole school anonymously. Total privacy.</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Homepage;

