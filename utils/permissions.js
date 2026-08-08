// Check if the user is the Absolute Owner
export const isOwner = (user) => {
  return user && user.role === 'Owner';
};

// Check if the user has Admin OR Owner privileges
export const isAdminOrOwner = (user) => {
  return user && (user.role === 'Admin' || user.role === 'Owner');
};

// Example function: Granting Admin Status (Only Owner can call this)
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const grantAdminStatus = async (ownerUser, targetUserId) => {
  if (!isOwner(ownerUser)) {
    console.error("Access Denied: Only the Owner can grant Admin status.");
    return;
  }

  try {
    const targetUserRef = doc(db, "Users", targetUserId);
    await updateDoc(targetUserRef, {
      role: 'Admin',
      // Ensure 'Admin' tag is added to their profile tags
      tags: arrayUnion("Admin") 
    });
    console.log("Admin status granted successfully!");
  } catch (error) {
    console.error("Error granting Admin status: ", error);
  }
};

