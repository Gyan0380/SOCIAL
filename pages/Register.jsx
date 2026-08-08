import React, { useState } from 'react';
import { checkUsernameUnique } from '../services/validationService';
import { registerUser } from '../services/authService';
import { uploadSchoolId } from '../services/storageService';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '', password: '', repeatPassword: '', fullName: '', 
    dob: '', classLevel: 'Class 1', schoolName: '', bio: ''
  });
  const [schoolIdFile, setSchoolIdFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setSchoolIdFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. Validation: Check Passwords Match
    if (formData.password !== formData.repeatPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    // 2. Validation: Check Unique Username
    const isUnique = await checkUsernameUnique(formData.username);
    if (!isUnique) {
      setError("Username is already taken. Please choose another.");
      setLoading(false);
      return;
    }

    // 3. Validation: School ID is Mandatory
    if (!schoolIdFile) {
      setError("School ID upload is required for verification.");
      setLoading(false);
      return;
    }

    // 4. Create User Auth & DB Profile
    const regResult = await registerUser(formData.username + "@studentchat.com", formData.password, formData);
    
    if (regResult.success) {
      // 5. Upload Private School ID
      try {
        await uploadSchoolId(schoolIdFile, regResult.uid);
        alert("Account Created! Pending Admin Verification.");
        // Redirect to Login Page here
      } catch (err) {
        setError("Account created, but School ID upload failed.");
      }
    } else {
      setError(regResult.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
        
        {error && <div className="bg-red-100 text-red-700 p-2 rounded text-sm text-center">{error}</div>}

        <input type="text" name="username" placeholder="Unique Username" required onChange={handleChange} className="w-full p-2 border rounded" />
        <input type="text" name="fullName" placeholder="Real Name" required onChange={handleChange} className="w-full p-2 border rounded" />
        
        <div className="flex space-x-2">
          <input type="password" name="password" placeholder="Password" required onChange={handleChange} className="w-1/2 p-2 border rounded" />
          <input type="password" name="repeatPassword" placeholder="Repeat Password" required onChange={handleChange} className="w-1/2 p-2 border rounded" />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Date of Birth (For Age)</label>
          <input type="date" name="dob" required onChange={handleChange} className="w-full p-2 border rounded" />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Select Class</label>
          <select name="classLevel" required onChange={handleChange} className="w-full p-2 border rounded">
            {[...Array(12)].map((_, i) => (
              <option key={i+1} value={`Class ${i+1}`}>Class {i+1}</option>
            ))}
          </select>
        </div>

        <input type="text" name="schoolName" placeholder="School / College Name" required onChange={handleChange} className="w-full p-2 border rounded" />
        <textarea name="bio" placeholder="Short Bio..." maxLength="150" onChange={handleChange} className="w-full p-2 border rounded h-20"></textarea>

        <div className="bg-blue-50 p-3 rounded border border-blue-100">
          <label className="text-sm text-gray-800 font-semibold block mb-1">Upload School ID (Private)</label>
          <p className="text-xs text-gray-500 mb-2">Only Admins can see this. It is never shown to other students.</p>
          <input type="file" accept="image/*" required onChange={handleFileChange} className="w-full text-sm" />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700">
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;

