import type { Express } from "express";
import { storage } from "../storage";
import { registrationSchema, type RegistrationData } from "@shared/schema";

export function registerRegistrationRoutes(app: Express) {
  // Registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Validate request body
      const validationResult = registrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validationResult.error.errors,
        });
      }

      const userData: RegistrationData = validationResult.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({
          message: "User with this email already exists",
        });
      }

      // Create user
      const newUser = await storage.registerUser(userData);

      res.status(201).json({
        message: "Registration successful",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          mobileNumber: newUser.mobileNumber,
          countryCode: newUser.countryCode,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        message: "Registration failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Parent code verification endpoint for child devices
  app.post("/api/auth/verify-parent-code", async (req, res) => {
    try {
      const { parentCode, deviceInfo } = req.body;

      if (!parentCode) {
        return res.status(400).json({
          message: "Parent code is required",
        });
      }

      // Find child by parent code
      const child = await storage.getChildByParentCode(parentCode);
      if (!child) {
        return res.status(404).json({
          message: "Invalid parent code",
        });
      }

      // Get parent information
      const parent = await storage.getUser(child.parentId);
      if (!parent) {
        return res.status(404).json({
          message: "Parent not found",
        });
      }

      res.json({
        message: "Parent code verified",
        child: {
          id: child.id,
          name: child.name,
          parentCode: child.parentCode,
        },
        parent: {
          id: parent.id,
          username: parent.username,
          deviceAdminSecretCode: parent.deviceAdminSecretCode, // For device admin setup
        },
      });
    } catch (error) {
      console.error("Parent code verification error:", error);
      res.status(500).json({
        message: "Verification failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get registration status (for checking if user needs to complete signup)
  app.get("/api/auth/registration-status/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json({
        isProfileComplete: user.isProfileComplete || false,
        hasChildren: (await storage.getChildrenByParent(userId)).length > 0,
        subscriptionStatus: user.subscriptionStatus,
      });
    } catch (error) {
      console.error("Registration status check error:", error);
      res.status(500).json({
        message: "Status check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}