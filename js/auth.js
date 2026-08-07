onAuthStateChanged(auth, (user) => {
    const authSection = document.getElementById('auth-section');
    const mainScreen = document.getElementById('main-screen');
    const cornerProfile = document.getElementById('corner-profile');
    const userDisplayName = document.getElementById('user-display-name');

    if (user) {
        // User logged in hai -> Show Main Screen & Corner Profile
        authSection.style.display = 'none';
        mainScreen.style.display = 'block';
        cornerProfile.style.display = 'block';
        
        // Abhi ke liye email ka pehla hissa naam ki jagah dikhayenge
        // Baad mein ise Firebase Database se original username se replace karenge
        userDisplayName.innerText = user.email.split('@')[0]; 
        
        emailInput.value = "";
        passInput.value = "";
    } else {
        // User logged out hai -> Show Login Form & Hide Corner Profile
        authSection.style.display = 'block';
        mainScreen.style.display = 'none';
        cornerProfile.style.display = 'none';
    }
});

