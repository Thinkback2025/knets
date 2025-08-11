import {
  users,
  children,
  devices,
  schedules,
  deviceSchedules,
  activityLogs,
  locationLogs,
  uninstallRequests,
  upiPayments,
  invoices,
  networkControlStatus,
  sessions,
  type User,
  type UpsertUser,
  type RegistrationData,
  type Child,
  type InsertChild,
  type Device,
  type InsertDevice,
  type Schedule,
  type InsertSchedule,
  type DeviceSchedule,
  type InsertDeviceSchedule,
  type ActivityLog,
  type InsertActivityLog,
  type LocationLog,
  type InsertLocationLog,
  type UninstallRequest,
  type InsertUninstallRequest,
  type UpiPayment,
  type InsertUpiPayment,
  type Invoice,
  type InsertInvoice,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscriptionStatus(userId: string, status: string): Promise<User>;
  getAllUserIds(): Promise<string[]>;
  
  // New registration operations
  registerUser(userData: RegistrationData): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  completeUserProfile(userId: string, profileData: any): Promise<User>;
  getChildByParentCode(parentCode: string): Promise<Child | undefined>;
  
  // Children operations
  getChildrenByParent(parentId: string): Promise<Child[]>;
  getChildById(childId: number): Promise<Child | undefined>;
  createChild(child: InsertChild): Promise<Child>;
  deleteChild(childId: number): Promise<void>;
  
  // Device operations
  getDevicesByParent(parentId: string): Promise<Device[]>;
  getDeviceById(id: number): Promise<Device | undefined>;
  getDeviceByImei(imei: string): Promise<Device | undefined>;
  getDeviceByPhoneNumber(phoneNumber: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDeviceStatus(id: number, isLocked: boolean): Promise<Device>;
  updateDeviceConsent(id: number, status: string): Promise<Device>;
  updateDeviceScreenTime(id: number, minutes: number): Promise<Device>;
  updateDeviceImei(id: number, imei: string): Promise<Device>;
  updateDeviceTimezone(id: number, timezone: string): Promise<Device>;
  updateExistingDevice(id: number, updates: Partial<InsertDevice>): Promise<Device>;
  updateDevice(deviceId: number, updates: Partial<InsertDevice>): Promise<Device>;
  deleteDevice(id: number): Promise<void>;
  
  // Schedule operations
  getSchedulesByParent(parentId: string): Promise<Schedule[]>;
  getSchedulesByDevice(deviceId: number): Promise<Schedule[]>;
  getScheduleById(id: number): Promise<Schedule | undefined>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, updates: Partial<InsertSchedule>): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;
  getActiveSchedules(): Promise<Schedule[]>;
  
  // Device-Schedule relationship operations
  assignDeviceToSchedule(deviceId: number, scheduleId: number): Promise<DeviceSchedule>;
  removeDeviceFromSchedule(deviceId: number, scheduleId: number): Promise<void>;
  getDevicesForSchedule(scheduleId: number): Promise<Device[]>;
  
  // Activity log operations
  logActivity(log: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivity(parentId: string, limit?: number): Promise<ActivityLog[]>;
  
  // Location tracking operations
  logLocation(log: InsertLocationLog): Promise<LocationLog>;
  getDeviceLocations(deviceId: number, limit?: number): Promise<LocationLog[]>;
  getLocationByImei(imei: string, limit?: number): Promise<LocationLog[]>;
  getLocationByPhoneNumber(phoneNumber: string, limit?: number): Promise<LocationLog[]>;
  getLatestLocation(deviceId: number): Promise<LocationLog | undefined>;
  
  // Uninstall request operations for device admin protection
  createUninstallRequest(request: InsertUninstallRequest): Promise<UninstallRequest>;
  getUninstallRequest(id: number): Promise<UninstallRequest | undefined>;
  getUninstallRequestsByParent(parentId: string): Promise<UninstallRequest[]>;
  updateUninstallRequest(id: number, updates: Partial<InsertUninstallRequest>): Promise<UninstallRequest>;
  
  // Enhanced methods for device admin workflow
  getDeviceByMobile(phoneNumber: string): Promise<Device | undefined>;
  getAllChildren(): Promise<Child[]>;
  
  // Android APK Support Methods
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  getSchedulesForDevice(deviceId: number): Promise<Schedule[]>;
  
  // UPI Payment operations
  createUpiPayment(payment: InsertUpiPayment): Promise<UpiPayment>;
  getPaymentById(paymentId: string): Promise<UpiPayment | undefined>;
  updatePaymentStatus(paymentId: string, status: string, transactionId?: string): Promise<UpiPayment>;
  getAllUpiPayments(): Promise<UpiPayment[]>;
  updateUpiPaymentStatus(id: number, status: string): Promise<void>;
  updateUserSubscription(userId: string, updates: { subscriptionStatus: string; subscriptionEndDate: Date }): Promise<User>;
  updateUserChildLimit(userId: string, additionalChildren: number): Promise<User>;
  
  // Invoice operations
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoiceById(id: number): Promise<Invoice | undefined>;
  getInvoicesByUser(userId: string): Promise<Invoice[]>;
  updateInvoiceEmailStatus(invoiceNumber: string, emailSent: boolean): Promise<void>;
  
  // Network control operations
  updateNetworkControlStatus(deviceId: number, status: any): Promise<void>;
  getActiveSchedulesForDevice(deviceId: number): Promise<Schedule[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // New registration operations
  async registerUser(userData: RegistrationData): Promise<User> {
    // Generate unique user ID
    const userId = `knets_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        username: userData.username,
        email: userData.email,
        mobileNumber: userData.mobileNumber,
        countryCode: userData.countryCode,
        deviceAdminSecretCode: userData.deviceAdminSecretCode,
        isProfileComplete: true,
        subscriptionStatus: "active",
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days trial
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async completeUserProfile(userId: string, profileData: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profileData,
        isProfileComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserSubscriptionStatus(userId: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        subscriptionStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUserIds(): Promise<string[]> {
    const userRecords = await db.select({ id: users.id }).from(users);
    return userRecords.map(user => user.id);
  }

  // Children operations
  async getChildrenByParent(parentId: string): Promise<Child[]> {
    return await db.select().from(children).where(eq(children.parentId, parentId));
  }

  async getChildById(childId: number): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.id, childId));
    return child;
  }

  async createChild(child: InsertChild): Promise<Child> {
    // Generate unique parent code for child
    let parentCode: string = "";
    let isUnique = false;
    while (!isUnique) {
      parentCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
      const existing = await db.select().from(children).where(eq(children.parentCode, parentCode));
      isUnique = existing.length === 0;
    }
    
    const [result] = await db.insert(children).values({
      ...child,
      parentCode: parentCode,
    }).returning();
    return result;
  }

  async deleteChild(childId: number): Promise<void> {
    console.log(`Starting comprehensive deletion of child ${childId}`);
    
    try {
      // First, get all devices associated with this child
      const childDevices = await db.select().from(devices).where(eq(devices.childId, childId));
      console.log(`Found ${childDevices.length} devices for child ${childId}`);
      
      // Delete all devices and their associated data
      for (const device of childDevices) {
        console.log(`Deleting device ${device.id} (${device.name}) for child ${childId}`);
        
        // Delete device-schedule relationships
        await db.delete(deviceSchedules).where(eq(deviceSchedules.deviceId, device.id));
        
        // Delete network control status
        await db.delete(networkControlStatus).where(eq(networkControlStatus.deviceId, device.id));
        
        // Delete location logs  
        await db.delete(locationLogs).where(eq(locationLogs.deviceId, device.id));
        
        // Delete activity logs
        await db.delete(activityLogs).where(eq(activityLogs.deviceId, device.id));
        
        // Delete uninstall requests
        await db.delete(uninstallRequests).where(eq(uninstallRequests.deviceId, device.id));
        
        // Finally delete the device
        await db.delete(devices).where(eq(devices.id, device.id));
        
        console.log(`Device ${device.id} and all associated data deleted`);
      }
      
      // Finally, delete the child record
      const deletedChild = await db.delete(children).where(eq(children.id, childId));
      console.log(`Deleted ${deletedChild.rowCount || 0} child record`);
      
      console.log(`Child ${childId} and all related data successfully deleted`);
    } catch (error) {
      console.error(`Error during child ${childId} deletion:`, error);
      throw error;
    }
  }

  async getChildByParentCode(parentCode: string): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.parentCode, parentCode));
    return child;
  }

  async getDeviceByChildId(childId: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.childId, childId));
    return device;
  }

  async updateChildConnectionStatus(childId: number, isConnected: boolean): Promise<Child> {
    const [child] = await db
      .update(children)
      .set({ isConnected })
      .where(eq(children.id, childId))
      .returning();
    return child;
  }

  async getChildById(id: number): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.id, id));
    return child;
  }

  // Device operations
  async getDevicesByParent(parentId: string): Promise<Device[]> {
    return await db
      .select({
        id: devices.id,
        childId: devices.childId,
        name: devices.name,
        imei: devices.imei,
        phoneNumber: devices.phoneNumber,
        deviceType: devices.deviceType,
        model: devices.model,
        timezone: devices.timezone, // IMPORTANT: Include timezone for frontend schedule logic
        isActive: devices.isActive,
        isLocked: devices.isLocked,
        lastSeen: devices.lastSeen,
        screenTimeToday: devices.screenTimeToday,
        consentStatus: devices.consentStatus,
        deviceFingerprint: devices.deviceFingerprint,
        createdAt: devices.createdAt,
      })
      .from(devices)
      .innerJoin(children, eq(devices.childId, children.id))
      .where(eq(children.parentId, parentId));
  }

  async getDeviceById(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device;
  }

  async getDeviceByImei(imei: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.imei, imei));
    return device;
  }

  async getDeviceByPhoneNumber(phoneNumber: string): Promise<Device | undefined> {
    // Try exact match first
    let [device] = await db.select().from(devices).where(eq(devices.phoneNumber, phoneNumber));
    
    if (!device) {
      // Remove spaces and try again
      const normalizedInput = phoneNumber.replace(/\s+/g, '');
      const devices_list = await db.select().from(devices);
      
      // Find device with matching phone number (with or without spaces)
      const foundDevice = devices_list.find(d => {
        const normalizedStored = d.phoneNumber?.replace(/\s+/g, '');
        return normalizedStored === normalizedInput;
      });
      device = foundDevice;
    }
    
    return device;
  }

  async updateDevice(deviceId: number, updateData: Partial<InsertDevice>): Promise<Device> {
    const [updatedDevice] = await db
      .update(devices)
      .set(updateData)
      .where(eq(devices.id, deviceId))
      .returning();
    return updatedDevice;
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const [result] = await db.insert(devices).values(device).returning();
    return result;
  }

  async updateDeviceStatus(id: number, isLocked: boolean): Promise<Device> {
    const [result] = await db
      .update(devices)
      .set({ isLocked, lastSeen: new Date() })
      .where(eq(devices.id, id))
      .returning();
    return result;
  }

  async updateDeviceConsent(id: number, status: string): Promise<Device> {
    const [result] = await db
      .update(devices)
      .set({ consentStatus: status })
      .where(eq(devices.id, id))
      .returning();
    return result;
  }

  async updateDeviceScreenTime(id: number, minutes: number): Promise<Device> {
    const [result] = await db
      .update(devices)
      .set({ screenTimeToday: minutes, lastSeen: new Date() })
      .where(eq(devices.id, id))
      .returning();
    return result;
  }

  async updateDeviceImei(id: number, imei: string): Promise<Device> {
    const [result] = await db
      .update(devices)
      .set({ imei, lastSeen: new Date() })
      .where(eq(devices.id, id))
      .returning();
    return result;
  }

  async updateDeviceTimezone(id: number, timezone: string): Promise<Device> {
    const [result] = await db
      .update(devices)
      .set({ timezone, lastSeen: new Date() })
      .where(eq(devices.id, id))
      .returning();
    return result;
  }

  async updateExistingDevice(id: number, updates: Partial<InsertDevice>): Promise<Device> {
    const [result] = await db
      .update(devices)
      .set(updates)
      .where(eq(devices.id, id))
      .returning();
    return result;
  }

  async deleteDevice(id: number): Promise<void> {
    console.log(`Starting comprehensive deletion of device ${id}`);
    
    try {
      // Delete related data in proper order to avoid foreign key constraints
      
      // 1. Delete device-schedule relationships first
      const deletedScheduleRelations = await db.delete(deviceSchedules).where(eq(deviceSchedules.deviceId, id));
      console.log(`Deleted ${deletedScheduleRelations.rowCount || 0} device-schedule relationships`);
      
      // 2. Delete location logs
      const deletedLocationLogs = await db.delete(locationLogs).where(eq(locationLogs.deviceId, id));
      console.log(`Deleted ${deletedLocationLogs.rowCount || 0} location logs`);
      
      // 3. Delete activity logs
      const deletedActivityLogs = await db.delete(activityLogs).where(eq(activityLogs.deviceId, id));
      console.log(`Deleted ${deletedActivityLogs.rowCount || 0} activity logs`);
      
      // 4. Get device info before deletion for cleanup checks
      const [deviceToDelete] = await db.select().from(devices).where(eq(devices.id, id));
      if (!deviceToDelete) {
        console.log(`Device ${id} not found`);
        return;
      }
      
      // 5. Delete the device itself
      const deletedDevice = await db.delete(devices).where(eq(devices.id, id));
      console.log(`Deleted ${deletedDevice.rowCount || 0} device record`);
      
      // 6. Check if child has any remaining devices, if not, optionally clean up child record
      const remainingDevices = await db.select().from(devices).where(eq(devices.childId, deviceToDelete.childId));
      if (remainingDevices.length === 0) {
        console.log(`Child ${deviceToDelete.childId} has no remaining devices - could be cleaned up if needed`);
      }
      
      console.log(`Device ${id} and all related data successfully deleted`);
    } catch (error) {
      console.error(`Error during device ${id} deletion:`, error);
      throw error;
    }
  }

  // Schedule operations
  async getSchedulesByParent(parentId: string): Promise<Schedule[]> {
    return await db
      .select()
      .from(schedules)
      .where(eq(schedules.parentId, parentId))
      .orderBy(desc(schedules.createdAt));
  }

  async getSchedulesByDevice(deviceId: number): Promise<Schedule[]> {
    return await db
      .select({
        id: schedules.id,
        parentId: schedules.parentId,
        name: schedules.name,
        startTime: schedules.startTime,
        endTime: schedules.endTime,
        daysOfWeek: schedules.daysOfWeek,
        isActive: schedules.isActive,
        networkRestrictionLevel: schedules.networkRestrictionLevel,
        restrictWifi: schedules.restrictWifi,
        restrictMobileData: schedules.restrictMobileData,
        allowEmergencyAccess: schedules.allowEmergencyAccess,
        createdAt: schedules.createdAt,
      })
      .from(schedules)
      .innerJoin(deviceSchedules, eq(schedules.id, deviceSchedules.scheduleId))
      .where(eq(deviceSchedules.deviceId, deviceId))
      .orderBy(desc(schedules.createdAt));
  }

  async getScheduleById(id: number): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule;
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [result] = await db.insert(schedules).values(schedule).returning();
    return result;
  }

  async updateSchedule(id: number, updates: Partial<InsertSchedule>): Promise<Schedule> {
    const [result] = await db
      .update(schedules)
      .set(updates)
      .where(eq(schedules.id, id))
      .returning();
    return result;
  }

  async deleteSchedule(id: number): Promise<void> {
    // First delete all device-schedule relationships
    await db.delete(deviceSchedules).where(eq(deviceSchedules.scheduleId, id));
    // Then delete the schedule itself
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  async getActiveSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules).where(eq(schedules.isActive, true));
  }

  // Device-Schedule relationship operations
  async assignDeviceToSchedule(deviceId: number, scheduleId: number): Promise<DeviceSchedule> {
    try {
      // Try to insert first
      const [result] = await db
        .insert(deviceSchedules)
        .values({ deviceId, scheduleId })
        .returning();
      return result;
    } catch (error: any) {
      // If it's a duplicate key error, check if the relationship already exists
      if (error.code === '23505') {
        const [existing] = await db
          .select()
          .from(deviceSchedules)
          .where(and(
            eq(deviceSchedules.deviceId, deviceId),
            eq(deviceSchedules.scheduleId, scheduleId)
          ));
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  async removeDeviceFromSchedule(deviceId: number, scheduleId: number): Promise<void> {
    await db
      .delete(deviceSchedules)
      .where(and(
        eq(deviceSchedules.deviceId, deviceId),
        eq(deviceSchedules.scheduleId, scheduleId)
      ));
  }

  async getDevicesForSchedule(scheduleId: number): Promise<Device[]> {
    return await db
      .select({
        id: devices.id,
        childId: devices.childId,
        name: devices.name,
        imei: devices.imei,
        phoneNumber: devices.phoneNumber,
        deviceType: devices.deviceType,
        model: devices.model,
        timezone: devices.timezone,
        isActive: devices.isActive,
        isLocked: devices.isLocked,
        lastSeen: devices.lastSeen,
        screenTimeToday: devices.screenTimeToday,
        consentStatus: devices.consentStatus,
        deviceFingerprint: devices.deviceFingerprint,
        createdAt: devices.createdAt,
      })
      .from(devices)
      .innerJoin(deviceSchedules, eq(devices.id, deviceSchedules.deviceId))
      .where(eq(deviceSchedules.scheduleId, scheduleId));
  }

  // Activity log operations
  async logActivity(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values(log).returning();
    return result;
  }

  async getRecentActivity(parentId: string, limit: number = 10): Promise<ActivityLog[]> {
    return await db
      .select({
        id: activityLogs.id,
        deviceId: activityLogs.deviceId,
        action: activityLogs.action,
        description: activityLogs.description,
        metadata: activityLogs.metadata,
        timestamp: activityLogs.timestamp,
      })
      .from(activityLogs)
      .innerJoin(devices, eq(activityLogs.deviceId, devices.id))
      .innerJoin(children, eq(devices.childId, children.id))
      .where(eq(children.parentId, parentId))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  // Location tracking operations
  async logLocation(log: InsertLocationLog): Promise<LocationLog> {
    const [result] = await db.insert(locationLogs).values(log).returning();
    return result;
  }

  async getDeviceLocations(deviceId: number, limit: number = 50): Promise<LocationLog[]> {
    return await db
      .select()
      .from(locationLogs)
      .where(eq(locationLogs.deviceId, deviceId))
      .orderBy(desc(locationLogs.timestamp))
      .limit(limit);
  }

  async getLocationByImei(imei: string, limit: number = 50): Promise<LocationLog[]> {
    return await db
      .select({
        id: locationLogs.id,
        deviceId: locationLogs.deviceId,
        latitude: locationLogs.latitude,
        longitude: locationLogs.longitude,
        accuracy: locationLogs.accuracy,
        address: locationLogs.address,
        locationMethod: locationLogs.locationMethod,
        timestamp: locationLogs.timestamp,
      })
      .from(locationLogs)
      .innerJoin(devices, eq(locationLogs.deviceId, devices.id))
      .where(eq(devices.imei, imei))
      .orderBy(desc(locationLogs.timestamp))
      .limit(limit);
  }

  async getLocationByPhoneNumber(phoneNumber: string, limit: number = 50): Promise<LocationLog[]> {
    return await db
      .select({
        id: locationLogs.id,
        deviceId: locationLogs.deviceId,
        latitude: locationLogs.latitude,
        longitude: locationLogs.longitude,
        accuracy: locationLogs.accuracy,
        address: locationLogs.address,
        locationMethod: locationLogs.locationMethod,
        timestamp: locationLogs.timestamp,
      })
      .from(locationLogs)
      .innerJoin(devices, eq(locationLogs.deviceId, devices.id))
      .where(eq(devices.phoneNumber, phoneNumber))
      .orderBy(desc(locationLogs.timestamp))
      .limit(limit);
  }

  async getLatestLocation(deviceId: number): Promise<LocationLog | undefined> {
    const [result] = await db
      .select()
      .from(locationLogs)
      .where(eq(locationLogs.deviceId, deviceId))
      .orderBy(desc(locationLogs.timestamp))
      .limit(1);
    return result;
  }

  // Android APK Support Methods Implementation
  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, `${phoneNumber}@knets.temp`));
    return user;
  }

  async getSchedulesForDevice(deviceId: number): Promise<Schedule[]> {
    return await this.getSchedulesByDevice(deviceId);
  }


  // Uninstall request operations for device admin protection
  async createUninstallRequest(requestData: InsertUninstallRequest): Promise<UninstallRequest> {
    const [request] = await db
      .insert(uninstallRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getUninstallRequest(id: number): Promise<UninstallRequest | undefined> {
    const [request] = await db.select().from(uninstallRequests).where(eq(uninstallRequests.id, id));
    return request;
  }

  async getUninstallRequestsByParent(parentId: string): Promise<UninstallRequest[]> {
    return await db.select().from(uninstallRequests).where(eq(uninstallRequests.parentId, parentId));
  }

  async updateUninstallRequest(id: number, updates: Partial<InsertUninstallRequest>): Promise<UninstallRequest> {
    const [request] = await db
      .update(uninstallRequests)
      .set(updates)
      .where(eq(uninstallRequests.id, id))
      .returning();
    return request;
  }

  // Enhanced methods for device admin workflow
  async getDeviceByMobile(phoneNumber: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.phoneNumber, phoneNumber));
    return device;
  }

  async getAllChildren(): Promise<Child[]> {
    return await db.select().from(children);
  }

  // UPI Payment operations implementation
  async createUpiPayment(paymentData: InsertUpiPayment): Promise<UpiPayment> {
    const [payment] = await db
      .insert(upiPayments)
      .values(paymentData)
      .returning();
    return payment;
  }

  async getPaymentById(paymentId: string): Promise<UpiPayment | undefined> {
    const [payment] = await db.select().from(upiPayments).where(eq(upiPayments.paymentId, paymentId));
    return payment;
  }

  async updatePaymentStatus(paymentId: string, status: string, transactionId?: string): Promise<UpiPayment> {
    const updateData: any = { status };
    if (transactionId) {
      updateData.transactionId = transactionId;
      updateData.completedAt = new Date();
    }
    
    const [payment] = await db
      .update(upiPayments)
      .set(updateData)
      .where(eq(upiPayments.paymentId, paymentId))
      .returning();
    return payment;
  }

  async updateUserSubscription(userId: string, updates: { subscriptionStatus: string; subscriptionEndDate: Date }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: updates.subscriptionStatus,
        subscriptionEndDate: updates.subscriptionEndDate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserChildLimit(userId: string, additionalChildren: number): Promise<User> {
    // Get current user to get current maxChildren
    const currentUser = await this.getUser(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }
    
    const newMaxChildren = (currentUser.maxChildren || 3) + additionalChildren;
    
    const [user] = await db
      .update(users)
      .set({
        maxChildren: newMaxChildren,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    console.log(`✅ Updated user ${userId} child limit: +${additionalChildren} (total: ${newMaxChildren})`);
    return user;
  }

  async getAllUpiPayments(): Promise<UpiPayment[]> {
    return await db.select().from(upiPayments);
  }

  async updateUpiPaymentStatus(id: number, status: string): Promise<void> {
    await db
      .update(upiPayments)
      .set({ status })
      .where(eq(upiPayments.id, id));
  }

  // Invoice operations
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db
      .insert(invoices)
      .values(invoice)
      .returning();
    return newInvoice;
  }

  async getInvoiceById(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoicesByUser(userId: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.userId, userId));
  }

  async updateInvoiceEmailStatus(invoiceNumber: string, emailSent: boolean): Promise<void> {
    await db
      .update(invoices)
      .set({ emailSent })
      .where(eq(invoices.invoiceNumber, invoiceNumber));
  }

  // Network control operations
  async updateNetworkControlStatus(deviceId: number, status: any): Promise<void> {
    await db
      .insert(networkControlStatus)
      .values({
        deviceId,
        ...status,
      })
      .onConflictDoUpdate({
        target: networkControlStatus.deviceId,
        set: {
          ...status,
          lastUpdated: new Date(),
        },
      });
  }

  async getActiveSchedulesForDevice(deviceId: number): Promise<Schedule[]> {
    // Get all schedules for this device that are currently active
    const deviceScheduleData = await db
      .select({
        schedule: schedules,
      })
      .from(deviceSchedules)
      .innerJoin(schedules, eq(deviceSchedules.scheduleId, schedules.id))
      .where(and(
        eq(deviceSchedules.deviceId, deviceId),
        eq(schedules.isActive, true)
      ));
    
    return deviceScheduleData.map(row => row.schedule);
  }
}

export const storage = new DatabaseStorage();
