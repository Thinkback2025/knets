import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // New registration fields
  username: varchar("username").unique(), // Full name for registration
  mobileNumber: varchar("mobile_number"),
  countryCode: varchar("country_code").default("+91"),
  // Security fields
  deviceAdminSecretCode: varchar("device_admin_secret_code"), // 4-digit code for device admin
  isProfileComplete: boolean("is_profile_complete").default(false), // Track if signup is complete
  // Subscription fields
  subscriptionStatus: varchar("subscription_status").default("active"), // 'active', 'expired', 'trial'
  subscriptionStartDate: timestamp("subscription_start_date").defaultNow(),
  subscriptionEndDate: timestamp("subscription_end_date"),
  maxChildren: integer("max_children").default(3), // Maximum children allowed
  trialDays: integer("trial_days").default(21), // Trial period in days
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Children table - stores child information
export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  parentId: varchar("parent_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  age: integer("age"),
  imei: varchar("imei"), // Optional IMEI pre-registration for enhanced security
  parentCode: varchar("parent_code").notNull().unique(), // 6-8 digit unique code for device connection
  isConnected: boolean("is_connected").default(false), // Track if child device is connected
  createdAt: timestamp("created_at").defaultNow(),
});

// Devices table - stores device information
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull().references(() => children.id),
  name: varchar("name").notNull(),
  imei: varchar("imei").notNull().unique(),
  phoneNumber: varchar("phone_number").notNull(),
  deviceType: varchar("device_type").notNull(), // 'mobile', 'tablet'
  model: varchar("model"),
  timezone: varchar("timezone").default("UTC"), // Device timezone for accurate schedule enforcement
  isActive: boolean("is_active").default(true),
  isLocked: boolean("is_locked").default(false),
  lastSeen: timestamp("last_seen"),
  screenTimeToday: integer("screen_time_today").default(0), // in minutes
  consentStatus: varchar("consent_status").default("pending"), // 'pending', 'approved', 'denied'
  deviceFingerprint: varchar("device_fingerprint"), // Device security fingerprint for SIM swap detection
  createdAt: timestamp("created_at").defaultNow(),
});

// Schedules table - stores shared lock schedules
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  parentId: varchar("parent_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(), // HH:MM format
  daysOfWeek: varchar("days_of_week").notNull(), // JSON array of day numbers
  isActive: boolean("is_active").default(true),
  // Network restriction settings
  networkRestrictionLevel: integer("network_restriction_level").default(2), // 0=none, 1=app-level, 2=wifi-only, 3=full-block
  restrictWifi: boolean("restrict_wifi").default(false),
  restrictMobileData: boolean("restrict_mobile_data").default(false),
  allowEmergencyAccess: boolean("allow_emergency_access").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Device-Schedule junction table - many-to-many relationship
export const deviceSchedules = pgTable("device_schedules", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  scheduleId: integer("schedule_id").notNull().references(() => schedules.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Unique constraint to prevent duplicate device-schedule pairs
  index("device_schedule_unique").on(table.deviceId, table.scheduleId)
]);

// Activity logs table - stores device activity
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  action: varchar("action").notNull(), // 'lock', 'unlock', 'schedule_created', etc.
  description: text("description"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Location logs table - stores device location data
export const locationLogs = pgTable("location_logs", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  latitude: numeric("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: numeric("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: numeric("accuracy", { precision: 8, scale: 2 }), // in meters
  address: text("address"), // reverse geocoded address
  locationMethod: varchar("location_method").notNull(), // 'gps', 'network', 'imei_tracking', 'cell_tower'
  timestamp: timestamp("timestamp").defaultNow(),
});

// UPI Payment table - stores payment transactions
export const upiPayments = pgTable("upi_payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  paymentId: varchar("payment_id").notNull().unique(), // External payment gateway ID
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("INR"),
  upiApp: varchar("upi_app").notNull(), // 'paytm', 'gpay', 'phonepe', 'bhim', etc.
  upiId: varchar("upi_id"), // User's UPI ID
  transactionId: varchar("transaction_id"), // UPI transaction reference
  status: varchar("status").default("pending"), // 'pending', 'success', 'failed', 'cancelled'
  subscriptionType: varchar("subscription_type").default("yearly"), // 'yearly', 'monthly', 'child_upgrade'
  subscriptionDuration: integer("subscription_duration").default(365), // days
  additionalChildren: integer("additional_children"), // For child limit upgrades
  paymentMethod: varchar("payment_method").default("upi"), // 'upi', 'card', 'wallet'
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Invoices table for tracking generated invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  paymentId: varchar("payment_id").notNull().references(() => upiPayments.paymentId),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  invoiceDate: varchar("invoice_date").notNull(),
  subscriptionFee: numeric("subscription_fee", { precision: 10, scale: 2 }).notNull(),
  sgstAmount: numeric("sgst_amount", { precision: 10, scale: 2 }).notNull(),
  cgstAmount: numeric("cgst_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  gstNumber: varchar("gst_number").default("_______________"),
  emailSent: boolean("email_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  children: many(children),
  schedules: many(schedules),
  upiPayments: many(upiPayments),
  invoices: many(invoices),
}));

export const childrenRelations = relations(children, ({ one, many }) => ({
  parent: one(users, {
    fields: [children.parentId],
    references: [users.id],
  }),
  devices: many(devices),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  child: one(children, {
    fields: [devices.childId],
    references: [children.id],
  }),
  deviceSchedules: many(deviceSchedules),
  activityLogs: many(activityLogs),
  locationLogs: many(locationLogs),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  parent: one(users, {
    fields: [schedules.parentId],
    references: [users.id],
  }),
  deviceSchedules: many(deviceSchedules),
}));

export const deviceSchedulesRelations = relations(deviceSchedules, ({ one }) => ({
  device: one(devices, {
    fields: [deviceSchedules.deviceId],
    references: [devices.id],
  }),
  schedule: one(schedules, {
    fields: [deviceSchedules.scheduleId],
    references: [schedules.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  device: one(devices, {
    fields: [activityLogs.deviceId],
    references: [devices.id],
  }),
}));

export const locationLogsRelations = relations(locationLogs, ({ one }) => ({
  device: one(devices, {
    fields: [locationLogs.deviceId],
    references: [devices.id],
  }),
}));

export const upiPaymentsRelations = relations(upiPayments, ({ one, many }) => ({
  user: one(users, {
    fields: [upiPayments.userId],
    references: [users.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  payment: one(upiPayments, {
    fields: [invoices.paymentId],
    references: [upiPayments.paymentId],
  }),
}));





// Insert schemas
export const insertChildSchema = createInsertSchema(children).omit({
  id: true,
  createdAt: true,
  parentCode: true, // Auto-generated in storage
  isConnected: true, // Auto-set to false
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
  screenTimeToday: true,
  consentStatus: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceScheduleSchema = createInsertSchema(deviceSchedules).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

export const insertLocationLogSchema = createInsertSchema(locationLogs).omit({
  id: true,
  timestamp: true,
});

// Network control status tracking
export const networkControlStatus = pgTable("network_control_status", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  restrictionLevel: integer("restriction_level").default(0), // 0=none, 1=app, 2=wifi, 3=full
  wifiEnabled: boolean("wifi_enabled").default(true),
  mobileDataEnabled: boolean("mobile_data_enabled").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
  lastEnforcementAttempt: timestamp("last_enforcement_attempt"),
  enforcementSuccess: boolean("enforcement_success").default(false),
  capabilities: jsonb("capabilities"), // Store device network control capabilities
}, (table) => [
  // Unique constraint per device
  index("device_network_status_unique").on(table.deviceId)
]);

// Device admin uninstall requests table
export const uninstallRequests = pgTable("uninstall_requests", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  parentId: varchar("parent_id").notNull().references(() => users.id),
  childMobileNumber: varchar("child_mobile_number").notNull(),
  requestStatus: varchar("request_status").default("pending"), // 'pending', 'approved', 'denied'
  secretCodeEntered: varchar("secret_code_entered"),
  parentApproval: boolean("parent_approval").default(false),
  requestTimestamp: timestamp("request_timestamp").defaultNow(),
  responseTimestamp: timestamp("response_timestamp"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Registration types
export const registrationSchema = createInsertSchema(users, {
  username: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  mobileNumber: z.string().min(10, "Please enter a valid mobile number"),
  countryCode: z.string().min(2, "Please select a country code"),
  deviceAdminSecretCode: z.string().length(4, "Security code must be exactly 4 digits").regex(/^\d+$/, "Security code must contain only numbers"),
}).omit({
  id: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  isProfileComplete: true,
  subscriptionStatus: true,
  subscriptionStartDate: true,
  subscriptionEndDate: true,
  maxChildren: true,
  trialDays: true,
  createdAt: true,
  updatedAt: true,
});

export type RegistrationData = z.infer<typeof registrationSchema>;
export type Child = typeof children.$inferSelect;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type DeviceSchedule = typeof deviceSchedules.$inferSelect;
export type InsertDeviceSchedule = z.infer<typeof insertDeviceScheduleSchema>;
export type UpiPayment = typeof upiPayments.$inferSelect;
export type InsertUpiPayment = typeof upiPayments.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type LocationLog = typeof locationLogs.$inferSelect;
export type InsertLocationLog = z.infer<typeof insertLocationLogSchema>;

export const insertUninstallRequestSchema = createInsertSchema(uninstallRequests).omit({
  id: true,
  createdAt: true,
  requestTimestamp: true,
});

export type InsertUninstallRequest = z.infer<typeof insertUninstallRequestSchema>;
export type UninstallRequest = typeof uninstallRequests.$inferSelect;

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
