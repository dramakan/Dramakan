// server.js (Final Version)

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-super-secret-key-that-should-be-long-and-random-for-security';

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// --- In-Memory Database ---
let users = [];
let otpStore = {};

// --- Helper function to log user activity ---
function logActivity(userEmail, message) {
    const user = users.find(u => u.email === userEmail);
    if (user) {
        if (!user.activity) user.activity = [];
        user.activity.unshift({
            timestamp: new Date(),
            message: message
        });
        // Keep the activity log from getting too big
        if (user.activity.length > 20) {
            user.activity.pop();
        }
    }
}

// --- Nodemailer & Auth Middleware (No changes needed) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'zabaazcreations@gmail.com', pass: 'bzcs gwlt zdzf ehjn' }
});
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, userPayload) => {
        if (err) return res.sendStatus(403);
        req.user = userPayload;
        next();
    });
};

// --- AUTH ROUTES (Register, Login - No changes needed) ---
// --- 7. API ROUTES ---

// == REGISTRATION ROUTE 1: SEND OTP ==
app.post('/api/send-otp', async (req, res) => {
    try {
        const email = req.body.email.toLowerCase();
        const { password, username } = req.body;

        if (users.find(user => user.email === email)) {
            return res.status(400).json({ success: false, message: "An account with this email already exists." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const expires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

        otpStore[email] = { otp, username, password: hashedPassword, expires };

       // This is the NEW, corrected email code
const mailOptions = {
    from: `"DramaKan" <${transporter.options.auth.user}>`,
    to: email,
    subject: 'Welcome to DramaKan! Here is Your Verification Code ✨',
    html: `
        <body style="margin: 0; padding: 0; box-sizing: border-box; background-color: #0B0C10; font-family: 'Poppins', sans-serif;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
                <tr>
                    <td align="center" style="padding: 20px 0;">
                        <img src="d.png" alt="DramaKan Logo" width="150">
                    </td>
                </tr>
                <tr>
                    <td bgcolor="#1A1A1D" style="padding: 40px 30px; border-radius: 12px;">
                        <h1 style="color: #F5F5F5; font-size: 24px; margin: 0;">Welcome to the Club!</h1>
                        <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 15px 0;">
                            We're so excited to have you join our community of drama lovers! Just one more step to begin your adventure. Please use the verification code below to complete your sign-up.
                        </p>
                        <p style="background-color: #8A2BE2; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 15px 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
                            ${otp}
                        </p>
                        <p style="color: #a0a0a0; font-size: 14px;">
                            This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.
                        </p>
                    </td>
                </tr>
                <tr>
                    <td align="center" style="padding: 20px 0; font-size: 12px; color: #a0a0a0;">
                        &copy; 2025 DramaKan. All rights reserved.
                    </td>
                </tr>
            </table>
        </body>
    `
};
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${email}: ${otp}`);
        res.json({ success: true, message: "OTP has been sent to your email." });

    } catch (error) {
        console.error("Error sending OTP email:", error);
        res.status(500).json({ success: false, message: "Failed to send OTP. Please check server credentials." });
    }
});

// == REGISTRATION ROUTE 2: VERIFY OTP ==
app.post('/api/verify-otp', (req, res) => {
    const email = req.body.email.toLowerCase();
    const { otp } = req.body;
    const storedData = otpStore[email];

    if (!storedData || Date.now() > storedData.expires || storedData.otp !== otp) {
        if (storedData && Date.now() > storedData.expires) delete otpStore[email];
        return res.status(400).json({ success: false, message: "OTP is incorrect or has expired." });
    }

    const newUser = {
        id: users.length + 1,
        username: storedData.username,
        email: email,
        password: storedData.password,
        bio: `Welcome to the profile of ${storedData.username}!`,
        profilePicture: 'https://via.placeholder.com/160',
        profileBanner: 'https://via.placeholder.com/1200x250/1A1A1D/808080?text=+',
        watchlist: [],
        likedDramas: [],
        watchProgress: {}
    };
    users.push(newUser);
    delete otpStore[email];

    console.log('--- USER DATABASE UPDATED (Registration) ---');
    console.log(users.map(({password, ...user}) => user)); // Log users without passwords
    
    res.status(201).json({ success: true, message: "Account created successfully! You can now log in." });
});

// == LOGIN ROUTE ==
app.post('/api/login', async (req, res) => {
    const email = req.body.email.toLowerCase();
    const { password } = req.body;
    
    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(400).json({ success: false, message: "No account found with this email." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ success: false, message: "Incorrect password." });
    }

    const userPayload = { email: user.email, username: user.username };
    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1d' });

    console.log(`User logged in: ${user.email}`);
    res.json({
        success: true,
        message: "Login successful!",
        token: accessToken,
        user: userPayload
    });
});

// === NEW & UPGRADED PROFILE ROUTES ===

// GET Full Profile Data
app.get('/api/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.email === req.user.email);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    const { password, ...profileData } = user;
    res.json({ success: true, profile: profileData });
});

// UPDATE Basic Profile Info (Username, Bio, Images)
app.put('/api/profile', authenticateToken, (req, res) => {
    const { username, bio, profilePicture, profileBanner } = req.body;
    const userIndex = users.findIndex(u => u.email === req.user.email);
    if (userIndex === -1) return res.status(404).json({ success: false, message: "User not found." });

    if (username) users[userIndex].username = username;
    if (bio) users[userIndex].bio = bio;
    if (profilePicture) users[userIndex].profilePicture = profilePicture;
    if (profileBanner) users[userIndex].profileBanner = profileBanner;
    
    logActivity(req.user.email, "Updated your profile details.");
    
    const user = users[userIndex];
    const userPayload = { email: user.email, username: user.username };
    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, message: "Profile updated!", token: accessToken, user: userPayload });
});

// UPDATE Password
app.put('/api/profile/change-password', authenticateToken, async (req, res) => {
    // ... (This endpoint remains the same as before) ...
});

// ADD/REMOVE from Watchlist
app.post('/api/profile/watchlist', authenticateToken, (req, res) => {
    const { drama } = req.body;
    const userIndex = users.findIndex(u => u.email === req.user.email);
    if (userIndex === -1) return res.status(404).json({ success: false, message: "User not found." });
    
    const watchlist = users[userIndex].watchlist || [];
    const dramaIndex = watchlist.findIndex(d => d.url === drama.url);

    if (dramaIndex > -1) {
        watchlist.splice(dramaIndex, 1);
        logActivity(req.user.email, `Removed "${drama.title}" from your watchlist.`);
        res.json({ success: true, inWatchlist: false });
    } else {
        watchlist.unshift(drama);
        logActivity(req.user.email, `Added "${drama.title}" to your watchlist.`);
        res.json({ success: true, inWatchlist: true });
    }
    users[userIndex].watchlist = watchlist;
});

// ADD/REMOVE from Liked Dramas
app.post('/api/profile/like', authenticateToken, (req, res) => {
    const { drama } = req.body;
    const userIndex = users.findIndex(u => u.email === req.user.email);
    if (userIndex === -1) return res.status(404).json({ success: false, message: "User not found." });

    const likedDramas = users[userIndex].likedDramas || [];
    const dramaIndex = likedDramas.findIndex(d => d.url === drama.url);

    if (dramaIndex > -1) {
        likedDramas.splice(dramaIndex, 1);
        logActivity(req.user.email, `Unliked "${drama.title}".`);
        res.json({ success: true, isLiked: false });
    } else {
        likedDramas.unshift(drama);
        logActivity(req.user.email, `Liked "${drama.title}".`);
        res.json({ success: true, isLiked: true });
    }
    users[userIndex].likedDramas = likedDramas;
});

// DELETE Account
app.delete('/api/profile', authenticateToken, async (req, res) => {
    const { password } = req.body;
    const userIndex = users.findIndex(u => u.email === req.user.email);
    if (userIndex === -1) return res.status(404).json({ success: false, message: "User not found." });

    const user = users[userIndex];
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) return res.status(403).json({ success: false, message: "Incorrect password. Deletion failed." });

    // Remove user from the array
    users.splice(userIndex, 1);
    console.log(`Account deleted for ${req.user.email}`);
    res.json({ success: true, message: "Your account has been permanently deleted." });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});