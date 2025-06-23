import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string) {
  // Using bcrypt for password hashing with 10 rounds
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Using bcrypt to compare passwords
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "intralog-painlesspermit-secret-key-for-session-management",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Disable secure cookies for Replit environment
      httpOnly: true,
      sameSite: 'lax'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false);
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        console.log(`Password check for ${username}: ${passwordMatch ? 'success' : 'failed'}`);
        
        if (passwordMatch) {
          return done(null, user);
        } else {
          return done(null, false);
        }
      } catch (error) {
        console.error('Login error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.id} (${user.username})`);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user with ID: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`User ID ${id} not found during deserialization`);
        return done(null, false);
      }
      console.log(`User ${user.username} deserialized successfully`);
      done(null, user);
    } catch (error) {
      console.error(`Error deserializing user ${id}:`, error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      res.status(400).json({ message: "Registration failed", error });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login request received for:", req.body.username);
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Authentication error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Authentication failed for:", req.body.username);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      console.log("Authentication successful for:", user.username);
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return next(loginErr);
        }
        
        console.log("User successfully logged in:", user.username);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Forgot password endpoint
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Generate reset token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token to database
      await storage.setPasswordResetToken(email, resetToken, resetExpires);

      // Send email (requires SendGrid setup)
      try {
        const { sendPasswordResetEmail } = await import('./email');
        const emailSent = await sendPasswordResetEmail(email, resetToken);
        
        if (!emailSent) {
          console.warn('Failed to send password reset email - SendGrid may not be configured');
        }
      } catch (error) {
        console.warn('Email service not configured:', error);
      }

      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  // Reset password endpoint
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body;
      
      if (!token || !password || !confirmPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Find user by valid reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update password and clear reset token
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.clearPasswordResetToken(user.id);

      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/user", (req, res) => {
    console.log("GET /api/user called, isAuthenticated:", req.isAuthenticated());
    if (req.isAuthenticated()) {
      console.log("User data:", req.user);
      res.json(req.user);
    } else {
      console.log("User not authenticated, sending 401");
      res.sendStatus(401);
    }
  });

  // Update user's default contact information
  app.put("/api/user/contact-defaults", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { defaultContactEmail, defaultContactPhone } = req.body;
      const userId = req.user!.id;
      
      await storage.updateUserContactDefaults(userId, {
        defaultContactEmail,
        defaultContactPhone,
      });
      
      res.json({ success: true, message: "Contact defaults updated" });
    } catch (error) {
      console.error("Error updating user contact defaults:", error);
      res.status(500).json({ error: "Failed to update contact defaults" });
    }
  });

  // Get users for stakeholder assignment
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "specialist") return res.sendStatus(403);
    
    try {
      const users = await storage.getUsers();
      // Filter out sensitive information
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }));
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });
}
