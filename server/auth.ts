import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // If stored password doesn't have the expected format (hash.salt), 
    // it might be a plain text password from development
    if (!stored.includes('.')) {
      return supplied === stored;
    }
    
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "intralog-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
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
