import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const deleteMessage = async (adminUser, chatId, messageId) => {
  // Security check before executing
  if (adminUser.role !== 'Admin' && adminUser.role !== 'Owner') {
    alert("You do not have permission to delete messages.");
    return;
  }

  try {
    const messageRef = doc(db, `Chats/${chatId}/Messages`, messageId);
    await deleteDoc(messageRef);
    console.log("Message deleted successfully.");
  } catch (error) {
    console.error("Error deleting message: ", error);
  }
};

