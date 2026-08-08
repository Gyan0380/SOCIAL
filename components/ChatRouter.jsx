import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

const ChatRouter = ({ currentUser, children }) => {
  const { chatRoomId } = useParams(); // Example: URL is /chat/Class-6

  // 1. Owner & Admins can access EVERYTHING
  if (currentUser.role === 'Admin' || currentUser.role === 'Owner') {
    return children;
  }

  // 2. Global Chats are accessible to everyone
  if (chatRoomId === 'Global' || chatRoomId === 'AnonymousGlobal') {
    return children;
  }

  // 3. Normal Class Chat & Anonymous Class Chat Logic
  // Assuming chatRoomId looks like "Class-6" or "Anonymous-Class-6"
  const userClassNumber = currentUser.classLevel.replace("Class ", ""); 
  
  if (chatRoomId === `Class-${userClassNumber}` || chatRoomId === `Anonymous-Class-${userClassNumber}`) {
    return children; // Access Granted
  }

  // 4. Access Denied (Redirect back to home)
  alert("You do not have permission to view other class chats!");
  return <Navigate to="/home" />;
};

export default ChatRouter;

