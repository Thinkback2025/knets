import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { registerRegistrationRoutes } from "./routes/registration";
import QRCode from 'qrcode';
import { insertChildSchema, insertDeviceSchema, insertScheduleSchema, insertUninstallRequestSchema } from "@shared/schema";
import { z } from "zod";
import { InvoiceGenerator } from "./invoiceGenerator";
import { getSubscriptionPrice, getChildUpgradePrice } from "@shared/config";

// Middleware to check subscription status
const requireActiveSubscription = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (user?.subscriptionStatus === 'inactive') {
      return res.status(403).json({ 
        message: "Subscription expired", 
        subscriptionStatus: "inactive" 
      });
    }
    
    next();
  } catch (error) {
    console.error("Error checking subscription status:", error);
    res.status(500).json({ message: "Failed to verify subscription" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize invoice generator
  const invoiceGenerator = new InvoiceGenerator();
  
  // Auth middleware
  await setupAuth(app);
  
  // Registration routes (public)
  registerRegistrationRoutes(app);
  
  // Configuration endpoint - get pricing information
  app.get('/api/config/pricing', (req, res) => {
    res.json({
      subscription: {
        yearly: getSubscriptionPrice('yearly'),
        monthly: getSubscriptionPrice('monthly'),
      },
      childUpgrade: {
        perChild: getChildUpgradePrice(1),
      }
    });
  });

  // Country codes endpoint - get all country codes
  app.get('/api/config/country-codes', (req, res) => {
    const countryCodes = [
      { code: "+93", country: "Afghanistan", flag: "🇦🇫" },
      { code: "+355", country: "Albania", flag: "🇦🇱" },
      { code: "+213", country: "Algeria", flag: "🇩🇿" },
      { code: "+1", country: "United States", flag: "🇺🇸" },
      { code: "+376", country: "Andorra", flag: "🇦🇩" },
      { code: "+244", country: "Angola", flag: "🇦🇴" },
      { code: "+54", country: "Argentina", flag: "🇦🇷" },
      { code: "+374", country: "Armenia", flag: "🇦🇲" },
      { code: "+61", country: "Australia", flag: "🇦🇺" },
      { code: "+43", country: "Austria", flag: "🇦🇹" },
      { code: "+994", country: "Azerbaijan", flag: "🇦🇿" },
      { code: "+973", country: "Bahrain", flag: "🇧🇭" },
      { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
      { code: "+375", country: "Belarus", flag: "🇧🇾" },
      { code: "+32", country: "Belgium", flag: "🇧🇪" },
      { code: "+501", country: "Belize", flag: "🇧🇿" },
      { code: "+229", country: "Benin", flag: "🇧🇯" },
      { code: "+975", country: "Bhutan", flag: "🇧🇹" },
      { code: "+591", country: "Bolivia", flag: "🇧🇴" },
      { code: "+387", country: "Bosnia and Herzegovina", flag: "🇧🇦" },
      { code: "+267", country: "Botswana", flag: "🇧🇼" },
      { code: "+55", country: "Brazil", flag: "🇧🇷" },
      { code: "+673", country: "Brunei", flag: "🇧🇳" },
      { code: "+359", country: "Bulgaria", flag: "🇧🇬" },
      { code: "+226", country: "Burkina Faso", flag: "🇧🇫" },
      { code: "+257", country: "Burundi", flag: "🇧🇮" },
      { code: "+855", country: "Cambodia", flag: "🇰🇭" },
      { code: "+237", country: "Cameroon", flag: "🇨🇲" },
      { code: "+1", country: "Canada", flag: "🇨🇦" },
      { code: "+238", country: "Cape Verde", flag: "🇨🇻" },
      { code: "+236", country: "Central African Republic", flag: "🇨🇫" },
      { code: "+235", country: "Chad", flag: "🇹🇩" },
      { code: "+56", country: "Chile", flag: "🇨🇱" },
      { code: "+86", country: "China", flag: "🇨🇳" },
      { code: "+57", country: "Colombia", flag: "🇨🇴" },
      { code: "+269", country: "Comoros", flag: "🇰🇲" },
      { code: "+242", country: "Congo", flag: "🇨🇬" },
      { code: "+243", country: "Democratic Republic of Congo", flag: "🇨🇩" },
      { code: "+506", country: "Costa Rica", flag: "🇨🇷" },
      { code: "+225", country: "Cote d'Ivoire", flag: "🇨🇮" },
      { code: "+385", country: "Croatia", flag: "🇭🇷" },
      { code: "+53", country: "Cuba", flag: "🇨🇺" },
      { code: "+357", country: "Cyprus", flag: "🇨🇾" },
      { code: "+420", country: "Czech Republic", flag: "🇨🇿" },
      { code: "+45", country: "Denmark", flag: "🇩🇰" },
      { code: "+253", country: "Djibouti", flag: "🇩🇯" },
      { code: "+593", country: "Ecuador", flag: "🇪🇨" },
      { code: "+20", country: "Egypt", flag: "🇪🇬" },
      { code: "+503", country: "El Salvador", flag: "🇸🇻" },
      { code: "+240", country: "Equatorial Guinea", flag: "🇬🇶" },
      { code: "+291", country: "Eritrea", flag: "🇪🇷" },
      { code: "+372", country: "Estonia", flag: "🇪🇪" },
      { code: "+251", country: "Ethiopia", flag: "🇪🇹" },
      { code: "+679", country: "Fiji", flag: "🇫🇯" },
      { code: "+358", country: "Finland", flag: "🇫🇮" },
      { code: "+33", country: "France", flag: "🇫🇷" },
      { code: "+241", country: "Gabon", flag: "🇬🇦" },
      { code: "+220", country: "Gambia", flag: "🇬🇲" },
      { code: "+995", country: "Georgia", flag: "🇬🇪" },
      { code: "+49", country: "Germany", flag: "🇩🇪" },
      { code: "+233", country: "Ghana", flag: "🇬🇭" },
      { code: "+30", country: "Greece", flag: "🇬🇷" },
      { code: "+502", country: "Guatemala", flag: "🇬🇹" },
      { code: "+224", country: "Guinea", flag: "🇬🇳" },
      { code: "+245", country: "Guinea-Bissau", flag: "🇬🇼" },
      { code: "+592", country: "Guyana", flag: "🇬🇾" },
      { code: "+509", country: "Haiti", flag: "🇭🇹" },
      { code: "+504", country: "Honduras", flag: "🇭🇳" },
      { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
      { code: "+36", country: "Hungary", flag: "🇭🇺" },
      { code: "+354", country: "Iceland", flag: "🇮🇸" },
      { code: "+91", country: "India", flag: "🇮🇳" },
      { code: "+62", country: "Indonesia", flag: "🇮🇩" },
      { code: "+98", country: "Iran", flag: "🇮🇷" },
      { code: "+964", country: "Iraq", flag: "🇮🇶" },
      { code: "+353", country: "Ireland", flag: "🇮🇪" },
      { code: "+972", country: "Israel", flag: "🇮🇱" },
      { code: "+39", country: "Italy", flag: "🇮🇹" },
      { code: "+81", country: "Japan", flag: "🇯🇵" },
      { code: "+962", country: "Jordan", flag: "🇯🇴" },
      { code: "+7", country: "Kazakhstan", flag: "🇰🇿" },
      { code: "+254", country: "Kenya", flag: "🇰🇪" },
      { code: "+965", country: "Kuwait", flag: "🇰🇼" },
      { code: "+996", country: "Kyrgyzstan", flag: "🇰🇬" },
      { code: "+856", country: "Laos", flag: "🇱🇦" },
      { code: "+371", country: "Latvia", flag: "🇱🇻" },
      { code: "+961", country: "Lebanon", flag: "🇱🇧" },
      { code: "+266", country: "Lesotho", flag: "🇱🇸" },
      { code: "+231", country: "Liberia", flag: "🇱🇷" },
      { code: "+218", country: "Libya", flag: "🇱🇾" },
      { code: "+423", country: "Liechtenstein", flag: "🇱🇮" },
      { code: "+370", country: "Lithuania", flag: "🇱🇹" },
      { code: "+352", country: "Luxembourg", flag: "🇱🇺" },
      { code: "+853", country: "Macau", flag: "🇲🇴" },
      { code: "+389", country: "Macedonia", flag: "🇲🇰" },
      { code: "+261", country: "Madagascar", flag: "🇲🇬" },
      { code: "+265", country: "Malawi", flag: "🇲🇼" },
      { code: "+60", country: "Malaysia", flag: "🇲🇾" },
      { code: "+960", country: "Maldives", flag: "🇲🇻" },
      { code: "+223", country: "Mali", flag: "🇲🇱" },
      { code: "+356", country: "Malta", flag: "🇲🇹" },
      { code: "+222", country: "Mauritania", flag: "🇲🇷" },
      { code: "+230", country: "Mauritius", flag: "🇲🇺" },
      { code: "+52", country: "Mexico", flag: "🇲🇽" },
      { code: "+691", country: "Micronesia", flag: "🇫🇲" },
      { code: "+373", country: "Moldova", flag: "🇲🇩" },
      { code: "+377", country: "Monaco", flag: "🇲🇨" },
      { code: "+976", country: "Mongolia", flag: "🇲🇳" },
      { code: "+382", country: "Montenegro", flag: "🇲🇪" },
      { code: "+212", country: "Morocco", flag: "🇲🇦" },
      { code: "+258", country: "Mozambique", flag: "🇲🇿" },
      { code: "+95", country: "Myanmar", flag: "🇲🇲" },
      { code: "+264", country: "Namibia", flag: "🇳🇦" },
      { code: "+674", country: "Nauru", flag: "🇳🇷" },
      { code: "+977", country: "Nepal", flag: "🇳🇵" },
      { code: "+31", country: "Netherlands", flag: "🇳🇱" },
      { code: "+64", country: "New Zealand", flag: "🇳🇿" },
      { code: "+505", country: "Nicaragua", flag: "🇳🇮" },
      { code: "+227", country: "Niger", flag: "🇳🇪" },
      { code: "+234", country: "Nigeria", flag: "🇳🇬" },
      { code: "+850", country: "North Korea", flag: "🇰🇵" },
      { code: "+47", country: "Norway", flag: "🇳🇴" },
      { code: "+968", country: "Oman", flag: "🇴🇲" },
      { code: "+92", country: "Pakistan", flag: "🇵🇰" },
      { code: "+680", country: "Palau", flag: "🇵🇼" },
      { code: "+507", country: "Panama", flag: "🇵🇦" },
      { code: "+675", country: "Papua New Guinea", flag: "🇵🇬" },
      { code: "+595", country: "Paraguay", flag: "🇵🇾" },
      { code: "+51", country: "Peru", flag: "🇵🇪" },
      { code: "+63", country: "Philippines", flag: "🇵🇭" },
      { code: "+48", country: "Poland", flag: "🇵🇱" },
      { code: "+351", country: "Portugal", flag: "🇵🇹" },
      { code: "+974", country: "Qatar", flag: "🇶🇦" },
      { code: "+40", country: "Romania", flag: "🇷🇴" },
      { code: "+7", country: "Russia", flag: "🇷🇺" },
      { code: "+250", country: "Rwanda", flag: "🇷🇼" },
      { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
      { code: "+221", country: "Senegal", flag: "🇸🇳" },
      { code: "+381", country: "Serbia", flag: "🇷🇸" },
      { code: "+248", country: "Seychelles", flag: "🇸🇨" },
      { code: "+232", country: "Sierra Leone", flag: "🇸🇱" },
      { code: "+65", country: "Singapore", flag: "🇸🇬" },
      { code: "+421", country: "Slovakia", flag: "🇸🇰" },
      { code: "+386", country: "Slovenia", flag: "🇸🇮" },
      { code: "+27", country: "South Africa", flag: "🇿🇦" },
      { code: "+82", country: "South Korea", flag: "🇰🇷" },
      { code: "+211", country: "South Sudan", flag: "🇸🇸" },
      { code: "+34", country: "Spain", flag: "🇪🇸" },
      { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
      { code: "+249", country: "Sudan", flag: "🇸🇩" },
      { code: "+597", country: "Suriname", flag: "🇸🇷" },
      { code: "+268", country: "Swaziland", flag: "🇸🇿" },
      { code: "+46", country: "Sweden", flag: "🇸🇪" },
      { code: "+41", country: "Switzerland", flag: "🇨🇭" },
      { code: "+963", country: "Syria", flag: "🇸🇾" },
      { code: "+886", country: "Taiwan", flag: "🇹🇼" },
      { code: "+992", country: "Tajikistan", flag: "🇹🇯" },
      { code: "+255", country: "Tanzania", flag: "🇹🇿" },
      { code: "+66", country: "Thailand", flag: "🇹🇭" },
      { code: "+228", country: "Togo", flag: "🇹🇬" },
      { code: "+676", country: "Tonga", flag: "🇹🇴" },
      { code: "+216", country: "Tunisia", flag: "🇹🇳" },
      { code: "+90", country: "Turkey", flag: "🇹🇷" },
      { code: "+993", country: "Turkmenistan", flag: "🇹🇲" },
      { code: "+256", country: "Uganda", flag: "🇺🇬" },
      { code: "+380", country: "Ukraine", flag: "🇺🇦" },
      { code: "+971", country: "United Arab Emirates", flag: "🇦🇪" },
      { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
      { code: "+598", country: "Uruguay", flag: "🇺🇾" },
      { code: "+998", country: "Uzbekistan", flag: "🇺🇿" },
      { code: "+678", country: "Vanuatu", flag: "🇻🇺" },
      { code: "+58", country: "Venezuela", flag: "🇻🇪" },
      { code: "+84", country: "Vietnam", flag: "🇻🇳" },
      { code: "+967", country: "Yemen", flag: "🇾🇪" },
      { code: "+260", country: "Zambia", flag: "🇿🇲" },
      { code: "+263", country: "Zimbabwe", flag: "🇿🇼" }
    ];
    
    res.json(countryCodes);
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      // Check if subscription is expired and update status
      if (user && user.subscriptionEndDate) {
        const isExpired = new Date(user.subscriptionEndDate) < new Date();
        const currentStatus = user.subscriptionStatus;
        
        if (isExpired && currentStatus === 'active') {
          // Update status to inactive if expired
          await storage.updateUserSubscriptionStatus(userId, 'inactive');
          user = await storage.getUser(userId); // Refresh user data
        } else if (!isExpired && currentStatus === 'inactive') {
          // Restore to active if subscription is valid again
          await storage.updateUserSubscriptionStatus(userId, 'active');
          user = await storage.getUser(userId); // Refresh user data
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Complete logout including from Replit - for testing purposes
  app.get('/api/complete-logout', (req, res) => {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
        // Redirect to Replit logout which will also logout from Replit itself
        res.redirect('https://replit.com/logout?redirect=' + encodeURIComponent(`${req.protocol}://${req.hostname}`));
      });
    });
  });

  // Test login endpoint for Sachi user
  app.get('/api-test-login-sachi', async (req, res) => {
    try {
      // Create mock session for test user
      const testUser = {
        claims: {
          sub: 'test_sachi_001',
          email: 'sachi@example.com',
          first_name: 'Sachi',
          last_name: 'Test',
          profile_image_url: 'https://replit.com/public/images/mark.png',
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        },
        access_token: 'test_token',
        refresh_token: 'test_refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      // Set up session
      req.login(testUser, (err) => {
        if (err) {
          console.error('Test login error:', err);
          return res.status(500).json({ error: 'Login failed' });
        }
        
        console.log('✅ Test login successful for Sachi');
        
        // Redirect to dashboard after successful login
        res.redirect('/');
      });
    } catch (error) {
      console.error('Test login error:', error);
      res.status(500).json({ error: 'Test login failed' });
    }
  });

  // Test login endpoint for Krishna user (multiple URL patterns for compatibility)
  app.get('/api-test-login-krishna', async (req, res) => {
    try {
      // Create mock session for test user Krishna
      const testUser = {
        claims: {
          sub: 'test_krishna_002',
          email: 'krishna@example.com',
          first_name: 'Krishna',
          last_name: 'Test',
          profile_image_url: 'https://replit.com/public/images/mark.png',
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        },
        access_token: 'test_token_krishna',
        refresh_token: 'test_refresh_krishna',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      // Set up session
      req.login(testUser, (err) => {
        if (err) {
          console.error('Test login error for Krishna:', err);
          return res.status(500).json({ error: 'Login failed' });
        }
        
        console.log('✅ Test login successful for Krishna');
        
        // Redirect to dashboard after successful login
        res.redirect('/');
      });
    } catch (error) {
      console.error('Test login error for Krishna:', error);
      res.status(500).json({ error: 'Test login failed' });
    }
  });

  // Alternative test login URLs for easier access
  app.get('/api/test-login-krishna', async (req, res) => {
    res.redirect('/api-test-login-krishna');
  });

  app.get('/api/test-login-Krishna', async (req, res) => {
    res.redirect('/api-test-login-krishna');
  });

  // Alternative URLs for test user access
  app.get('/api-test-user-krishna', async (req, res) => {
    res.redirect('/api-test-login-krishna');
  });

  app.get('/api-test-user-ktishna', async (req, res) => {
    res.redirect('/api-test-login-krishna');
  });

  // Quick login test endpoint for authentication debugging
  app.get('/api/quick-test-login-sachi', async (req, res) => {
    try {
      const testUser = {
        claims: {
          sub: 'test_sachi_001',
          email: 'sachir72@gmail.com',
          first_name: 'Sachi',
          last_name: 'Test',
          profile_image_url: null,
          exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        },
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };
      
      // Manually login the test user
      req.login(testUser, (err) => {
        if (err) {
          console.error('Test login error:', err);
          return res.status(500).json({ error: 'Test login failed' });
        }
        console.log('✅ Test user Sachi logged in successfully');
        res.redirect('/?test=login-sachi');
      });
    } catch (error) {
      console.error('Quick test login error:', error);
      res.status(500).json({ error: 'Test login failed' });
    }
  });

  // Test subscription renewal route (bypasses auth for testing)
  app.post('/api/test-subscription-renewal-qr', async (req, res) => {
    try {
      const { upiApp, userId = 'test_sachi_001' } = req.body;
      
      console.log("🧪 Test subscription renewal QR for user:", userId, "with UPI app:", upiApp);
      
      // Get subscription amount from centralized config
      const subscriptionAmount = getSubscriptionPrice('yearly');
      const subscriptionType = "yearly";
      
      // Create UPI payment record
      const paymentId = `RENEW_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const payment = await storage.createUpiPayment({
        userId,
        paymentId,
        amount: subscriptionAmount.toString(),
        upiApp,
        subscriptionType,
        subscriptionDuration: 365,
        status: "pending",
      });

      // Generate UPI payment URL
      const upiId = "sachir72-3@okicici"; // Your business UPI ID
      const paymentUrl = `upi://pay?pa=${upiId}&pn=Knets&am=${subscriptionAmount}&cu=INR&tn=Knets%20Subscription%20Renewal&tr=${paymentId}`;
      
      // Generate QR code for the payment
      const qrCodeDataUrl = await QRCode.toDataURL(paymentUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });
      
      console.log("✅ Test subscription renewal payment created:", paymentId);
      console.log("🔗 Payment URL:", paymentUrl);
      console.log("🎨 QR Code generated:", qrCodeDataUrl ? "YES" : "NO");
      
      res.json({ 
        success: true, 
        paymentId: paymentId,
        paymentUrl,
        qrCode: qrCodeDataUrl,
        amount: subscriptionAmount,
        message: "Test subscription renewal payment initiated successfully" 
      });
    } catch (error) {
      console.error("❌ Test subscription renewal error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to create test subscription renewal payment",
        error: error.message 
      });
    }
  });

  // Subscription renewal route (main endpoint)
  app.post('/api/subscription/create-renewal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { upiApp } = req.body;
      
      console.log("🔄 Creating subscription renewal for user:", userId, "with UPI app:", upiApp);
      
      // Get subscription amount from centralized config
      const subscriptionAmount = getSubscriptionPrice('yearly');
      const subscriptionType = "yearly";
      
      // Create UPI payment record
      const paymentId = `RENEW_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const payment = await storage.createUpiPayment({
        userId,
        paymentId,
        amount: subscriptionAmount.toString(),
        upiApp,
        subscriptionType,
        subscriptionDuration: 365,
        status: "pending",
      });

      // Generate UPI payment URL
      const upiId = "sachir72-3@okicici"; // Your business UPI ID
      const paymentUrl = `upi://pay?pa=${upiId}&pn=Knets&am=${subscriptionAmount}&cu=INR&tn=Knets%20Subscription%20Renewal&tr=${paymentId}`;
      
      // Generate QR code for the payment
      const qrCodeDataUrl = await QRCode.toDataURL(paymentUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });
      
      console.log("✅ Subscription renewal payment created:", paymentId);
      console.log("🔗 Payment URL:", paymentUrl);
      console.log("🎨 QR Code generated:", qrCodeDataUrl ? "YES" : "NO");
      
      res.json({ 
        success: true, 
        paymentId: paymentId,
        paymentUrl,
        qrCode: qrCodeDataUrl,
        amount: subscriptionAmount,
        message: "Subscription renewal payment initiated successfully" 
      });
    } catch (error) {
      console.error("❌ Subscription renewal error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to create subscription renewal payment",
        error: error.message 
      });
    }
  });

  // Alternative subscription management route
  app.post('/api/subscription/renew', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscriptionType, upiApp, amount } = req.body;
      
      // Create UPI payment record
      const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const payment = await storage.createUpiPayment({
        userId,
        paymentId,
        amount: amount.toString(),
        upiApp,
        subscriptionType,
        subscriptionDuration: subscriptionType === "yearly" ? 365 : 30,
        status: "pending",
      });

      // Generate UPI payment URL (simplified for demo)
      const upiId = "sachir72-3@okicici"; // Your business UPI ID
      const paymentUrl = `upi://pay?pa=${upiId}&pn=Knets&am=${amount}&cu=INR&tn=Knets%20Subscription%20${subscriptionType}&tr=${paymentId}`;
      
      // Generate QR code for the payment
      const qrCodeDataUrl = await QRCode.toDataURL(paymentUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });
      
      res.json({ 
        success: true, 
        paymentId: paymentId, // Use the actual paymentId string, not the database ID
        paymentUrl,
        qrCode: qrCodeDataUrl,
        message: "Payment initiated successfully" 
      });
    } catch (error) {
      console.error("Subscription renewal error:", error);
      res.status(500).json({ message: "Failed to initiate subscription renewal" });
    }
  });

  // Child limit upgrade route
  app.post('/api/subscription/upgrade-child-limit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { additionalChildren, upiApp } = req.body;
      
      console.log("🎯 Child upgrade request:", { userId, additionalChildren, upiApp });
      
      // Validate input
      if (!additionalChildren || additionalChildren <= 0) {
        return res.status(400).json({ message: "Invalid additional children count" });
      }
      
      // Calculate total amount using centralized pricing config
      const pricePerChild = getChildUpgradePrice(1);
      const totalAmount = additionalChildren * pricePerChild;
      
      console.log("💰 Payment details:", { pricePerChild, totalAmount, additionalChildren });
      
      // Get current user to check current limit
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create UPI payment record for child limit upgrade
      const paymentId = `CHILD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const payment = await storage.createUpiPayment({
        userId,
        paymentId,
        amount: totalAmount.toString(),
        upiApp,
        subscriptionType: "child_upgrade",
        additionalChildren,
        status: "pending",
      });

      // Generate UPI payment URL
      const upiId = "sachir72-3@okicici"; // Your business UPI ID
      const paymentUrl = `upi://pay?pa=${upiId}&pn=Knets&am=${totalAmount}&cu=INR&tn=Knets%20Child%20Limit%20Upgrade%20${additionalChildren}%20children&tr=${paymentId}`;
      
      // Generate QR code for the payment
      console.log("🔗 Payment URL:", paymentUrl);
      const qrCodeDataUrl = await QRCode.toDataURL(paymentUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });
      
      console.log("🎨 QR Code generated:", qrCodeDataUrl ? "YES" : "NO");
      console.log("📏 QR Code length:", qrCodeDataUrl?.length || 0);
      
      const response = {
        success: true, 
        paymentId: paymentId, // Use the actual paymentId string, not the database ID
        paymentUrl,
        qrCode: qrCodeDataUrl,
        additionalChildren,
        totalAmount,
        pricePerChild,
        message: `Child limit upgrade payment initiated: ${additionalChildren} children for ₹${totalAmount}` 
      };
      
      console.log("📤 Sending response keys:", Object.keys(response));
      console.log("📤 QR Code starts with:", qrCodeDataUrl?.substring(0, 50) || "MISSING");
      console.log("📤 Response size:", JSON.stringify(response).length);
      
      // Send response with explicit headers
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(response);
    } catch (error) {
      console.error("Child limit upgrade error:", error);
      res.status(500).json({ message: "Failed to initiate child limit upgrade" });
    }
  });

  // Get user invoices/payment history
  app.get('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoices = await storage.getInvoicesByUser(userId);
      
      res.json({
        success: true,
        invoices: invoices.map(invoice => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          subscriptionFee: parseFloat(invoice.subscriptionFee),
          sgstAmount: parseFloat(invoice.sgstAmount),
          cgstAmount: parseFloat(invoice.cgstAmount),
          totalAmount: parseFloat(invoice.totalAmount),
          emailSent: invoice.emailSent,
          createdAt: invoice.createdAt,
        }))
      });
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Payment success webhook (would be called by payment gateway)
  app.post('/api/subscription/payment-success', async (req, res) => {
    try {
      const { paymentId, transactionId, status } = req.body;
      
      if (status === "success") {
        await storage.updatePaymentStatus(paymentId, "success", transactionId);
        const payment = await storage.getPaymentById(paymentId);
        
        if (payment) {
          const user = await storage.getUser(payment.userId);
          let invoiceData = null;
          
          if (payment.subscriptionType === "child_upgrade" && payment.additionalChildren) {
            // Handle child limit upgrade
            await storage.updateUserChildLimit(payment.userId, payment.additionalChildren);
            
            // Generate invoice for child upgrade - get amount from centralized config
            const childrenAdded = payment.additionalChildren || 1;
            const totalAmount = childrenAdded * getChildUpgradePrice(1); // Price per child from config
            invoiceData = {
              invoiceNumber: await invoiceGenerator.generateInvoiceNumber('child_upgrade'),
              invoiceDate: new Date().toLocaleDateString('en-IN'),
              userName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || 'Customer',
              userEmail: user?.email || '',
              userMobile: user?.mobileNumber || (user?.countryCode && user?.mobileNumber ? user.countryCode + ' ' + user.mobileNumber : 'Not provided'),
              subscriptionFee: totalAmount,
              gstNumber: '29AABCT1332L000', // Your GST number
            };
            
            console.log(`📋 Generating invoice for child upgrade: +${payment.additionalChildren} children`);
          } else {
            // Handle regular subscription renewal
            let newEndDate = new Date();
            
            // If user has an existing subscription that hasn't expired, extend from current end date
            if (user?.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date()) {
              newEndDate = new Date(user.subscriptionEndDate);
              console.log(`📅 Early renewal: extending from existing end date ${newEndDate.toISOString()}`);
            } else {
              console.log(`📅 Expired/New subscription: extending from current date ${newEndDate.toISOString()}`);
            }
            
            // For yearly subscriptions, use setFullYear for precise calculation
            if (payment.subscriptionDuration === 365 || payment.subscriptionType === 'yearly') {
              newEndDate.setFullYear(newEndDate.getFullYear() + 1);
              console.log(`📅 Added 1 year using setFullYear: ${newEndDate.toISOString()}`);
            } else {
              // For other durations, use day-based calculation
              const daysToAdd = payment.subscriptionDuration || 365;
              newEndDate.setDate(newEndDate.getDate() + daysToAdd);
              console.log(`📅 Added ${daysToAdd} days: ${newEndDate.toISOString()}`);
            }
            
            await storage.updateUserSubscription(payment.userId, {
              subscriptionStatus: "active",
              subscriptionEndDate: newEndDate,
            });
            
            // Generate invoice for subscription - get amount from centralized config
            const subscriptionAmount = getSubscriptionPrice('yearly'); // Subscription price including tax
            invoiceData = {
              invoiceNumber: await invoiceGenerator.generateInvoiceNumber('subscription'),
              invoiceDate: new Date().toLocaleDateString('en-IN'),
              userName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || 'Customer',
              userEmail: user?.email || '',
              userMobile: user?.mobileNumber || (user?.countryCode && user?.mobileNumber ? user.countryCode + ' ' + user.mobileNumber : 'Not provided'),
              subscriptionFee: subscriptionAmount,
              gstNumber: '29AABCT1332L000', // Your GST number
            };
            
            console.log(`✅ Subscription renewed until: ${newEndDate.toISOString()}`);
            console.log(`📋 Generating invoice for subscription renewal: ${payment.subscriptionType}`);
          }
          
          // Generate and send invoice if user has email
          if (invoiceData && user?.email) {
            try {
              // Save invoice to database with proper base amount calculation
              const baseAmount = invoiceData.subscriptionFee / 1.18;
              const savedInvoice = await storage.createInvoice({
                invoiceNumber: invoiceData.invoiceNumber,
                userId: payment.userId,
                paymentId: payment.paymentId,
                invoiceDate: invoiceData.invoiceDate,
                subscriptionFee: baseAmount.toFixed(2),
                sgstAmount: (baseAmount * 0.09).toFixed(2),
                cgstAmount: (baseAmount * 0.09).toFixed(2),
                totalAmount: invoiceData.subscriptionFee.toString(),
                gstNumber: invoiceData.gstNumber,
                emailSent: false,
              });
              
              // Send invoice email
              const emailSent = await invoiceGenerator.sendInvoiceEmail(invoiceData);
              
              // Update email status in database
              await storage.updateInvoiceEmailStatus(invoiceData.invoiceNumber, emailSent);
              
              console.log(`📧 Invoice ${invoiceData.invoiceNumber} ${emailSent ? 'sent successfully' : 'failed to send'} to ${user.email}`);
            } catch (invoiceError) {
              console.error("Invoice generation error:", invoiceError);
              // Don't fail the payment processing if invoice fails
            }
          }
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Payment success handling error:", error);
      res.status(500).json({ message: "Failed to process payment success" });
    }
  });

  // Test endpoint to reset user subscription date
  app.post('/api/test-reset-user', async (req, res) => {
    try {
      const { userId, subscriptionEndDate } = req.body;
      await storage.updateUserSubscription(userId, {
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date(subscriptionEndDate)
      });
      
      const user = await storage.getUser(userId);
      res.json({
        success: true,
        user: {
          subscriptionStatus: user?.subscriptionStatus,
          subscriptionEndDate: user?.subscriptionEndDate?.toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset user", error: error.message });
    }
  });

  // Test endpoint to simulate complete subscription renewal flow
  app.post('/api/test-subscription-renewal', async (req, res) => {
    try {
      console.log("🧪 Testing subscription renewal flow...");
      
      // Step 1: Create a renewal payment record
      const paymentId = `TEST_PAY_${Date.now()}_renewal`;
      const testPayment = await storage.createUpiPayment({
        userId: 'test_sachi_001',
        paymentId,
        amount: '1',
        upiApp: 'gpay',
        subscriptionType: 'yearly',
        subscriptionDuration: 365,
        status: 'pending',
      });
      
      console.log("✅ Step 1: Payment record created:", testPayment.id);
      
      // Step 2: Get user before payment
      const userBefore = await storage.getUser('test_sachi_001');
      console.log("📊 User before payment:", {
        subscriptionStatus: userBefore?.subscriptionStatus,
        subscriptionEndDate: userBefore?.subscriptionEndDate?.toISOString(),
        maxChildren: userBefore?.maxChildren
      });
      
      // Step 3: Simulate payment success
      await storage.updatePaymentStatus(paymentId, 'success', `TXN_TEST_${Date.now()}`);
      const payment = await storage.getPaymentById(paymentId);
      
      if (payment && payment.subscriptionType !== 'child_upgrade') {
        // Step 4: Process subscription renewal with early renewal logic
        const user = await storage.getUser('test_sachi_001');
        let newEndDate = new Date();
        
        // Test early renewal scenario: extend from current end date if subscription is still active
        if (user?.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date()) {
          newEndDate = new Date(user.subscriptionEndDate);
          console.log(`📅 Early renewal test: extending from existing end date ${newEndDate.toISOString()}`);
        } else {
          console.log(`📅 Expired/New subscription test: extending from current date ${newEndDate.toISOString()}`);
        }
        
        // More precise date calculation for test
        if (payment.subscriptionDuration === 365 || payment.subscriptionType === 'yearly') {
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
          console.log(`📅 Test: Added 1 year using setFullYear: ${newEndDate.toISOString()}`);
        } else {
          const daysToAdd = payment.subscriptionDuration || 365;
          newEndDate.setDate(newEndDate.getDate() + daysToAdd);
          console.log(`📅 Test: Added ${daysToAdd} days: ${newEndDate.toISOString()}`);
        }
        
        await storage.updateUserSubscription('test_sachi_001', {
          subscriptionStatus: 'active',
          subscriptionEndDate: newEndDate,
        });
        
        console.log("💰 Step 4: Subscription renewed until:", newEndDate.toISOString());
      }
      
      // Step 5: Get user after payment
      const userAfter = await storage.getUser('test_sachi_001');
      console.log("📈 User after payment:", {
        subscriptionStatus: userAfter?.subscriptionStatus,
        subscriptionEndDate: userAfter?.subscriptionEndDate?.toISOString(),
        maxChildren: userAfter?.maxChildren
      });
      
      // Calculate extension
      const daysBefore = userBefore?.subscriptionEndDate ? 
        Math.ceil((new Date(userBefore.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const daysAfter = userAfter?.subscriptionEndDate ? 
        Math.ceil((new Date(userAfter.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      res.json({
        success: true,
        testResults: {
          paymentCreated: !!testPayment.id,
          subscriptionExtended: daysAfter > daysBefore,
          daysBefore,
          daysAfter,
          extensionDays: daysAfter - daysBefore,
          userBefore: {
            status: userBefore?.subscriptionStatus,
            endDate: userBefore?.subscriptionEndDate?.toISOString()
          },
          userAfter: {
            status: userAfter?.subscriptionStatus,
            endDate: userAfter?.subscriptionEndDate?.toISOString()
          }
        },
        message: "Subscription renewal test completed successfully"
      });
      
    } catch (error) {
      console.error("❌ Subscription renewal test error:", error);
      res.status(500).json({ message: "Subscription renewal test failed", error: error.message });
    }
  });

  // Test endpoint to simulate complete subscription renewal flow
  app.post('/api/test-complete-subscription-renewal', async (req, res) => {
    try {
      const { userId } = req.body;
      
      console.log(`🧪 Testing complete subscription renewal flow for user ${userId}`);
      
      // Step 1: Get user before renewal
      const userBefore = await storage.getUser(userId);
      console.log(`📊 User before renewal:`, {
        subscriptionStatus: userBefore?.subscriptionStatus,
        subscriptionEndDate: userBefore?.subscriptionEndDate?.toISOString(),
        daysLeft: userBefore?.subscriptionEndDate ? 
          Math.ceil((new Date(userBefore.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0
      });
      
      // Step 2: Create subscription renewal payment
      const paymentId = `RENEW_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const testPayment = await storage.createUpiPayment({
        userId,
        paymentId,
        amount: getSubscriptionPrice('yearly').toString(), // Subscription price from centralized config
        upiApp: "test",
        subscriptionType: "yearly",
        subscriptionDuration: 365,
        status: "pending",
      });
      console.log(`✅ Step 1: Renewal payment created:`, testPayment.id);
      
      // Step 3: Simulate payment success
      await storage.updatePaymentStatus(paymentId, 'success', `TXN_RENEW_${Date.now()}`);
      const payment = await storage.getPaymentById(paymentId);
      console.log(`✅ Step 2: Payment marked as successful`);
      
      // Step 4: Process subscription renewal (same logic as the webhook)
      if (payment && payment.subscriptionType !== "child_upgrade") {
        const user = await storage.getUser(payment.userId);
        let newEndDate = new Date();
        
        // Early renewal logic: extend from current end date if subscription is still active
        if (user?.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date()) {
          newEndDate = new Date(user.subscriptionEndDate);
          console.log(`📅 Early renewal: extending from existing end date ${newEndDate.toISOString()}`);
        } else {
          console.log(`📅 Expired/New subscription: extending from current date ${newEndDate.toISOString()}`);
        }
        
        // For yearly subscriptions, use setFullYear for precise calculation
        if (payment.subscriptionDuration === 365 || payment.subscriptionType === 'yearly') {
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
          console.log(`📅 Added 1 year using setFullYear: ${newEndDate.toISOString()}`);
        } else {
          const daysToAdd = payment.subscriptionDuration || 365;
          newEndDate.setDate(newEndDate.getDate() + daysToAdd);
          console.log(`📅 Added ${daysToAdd} days: ${newEndDate.toISOString()}`);
        }
        
        await storage.updateUserSubscription(payment.userId, {
          subscriptionStatus: "active",
          subscriptionEndDate: newEndDate,
        });
        
        console.log(`✅ Step 3: Subscription renewed until: ${newEndDate.toISOString()}`);
        
        // Generate and send test invoice
        if (user?.email) {
          try {
            const invoiceData = {
              invoiceNumber: await invoiceGenerator.generateInvoiceNumber('subscription'),
              invoiceDate: new Date().toLocaleDateString('en-IN'),
              userName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || 'Customer',
              userEmail: user.email,
              userMobile: user?.mobileNumber || (user?.countryCode ? user.countryCode + ' ' + user.mobileNumber : 'Not provided'),
              subscriptionFee: getSubscriptionPrice('yearly'), // Subscription price from centralized config
              gstNumber: '29AABCT1332L000',
            };
            
            // Save invoice to database
            const baseAmount = invoiceData.subscriptionFee / 1.18;
            await storage.createInvoice({
              invoiceNumber: invoiceData.invoiceNumber,
              userId: payment.userId,
              paymentId: payment.paymentId,
              invoiceDate: invoiceData.invoiceDate,
              subscriptionFee: baseAmount.toFixed(2),
              sgstAmount: (baseAmount * 0.09).toFixed(2),
              cgstAmount: (baseAmount * 0.09).toFixed(2),
              totalAmount: invoiceData.subscriptionFee.toString(),
              gstNumber: invoiceData.gstNumber,
              emailSent: false,
            });
            
            // Send invoice email
            const emailSent = await invoiceGenerator.sendInvoiceEmail(invoiceData);
            await storage.updateInvoiceEmailStatus(invoiceData.invoiceNumber, emailSent);
            
            console.log(`📧 Test invoice ${invoiceData.invoiceNumber} ${emailSent ? 'sent successfully' : 'failed to send'} to ${user.email}`);
          } catch (invoiceError) {
            console.error("Test invoice generation error:", invoiceError);
          }
        }
      }
      
      // Step 5: Get user after renewal
      const userAfter = await storage.getUser(userId);
      console.log(`📈 User after renewal:`, {
        subscriptionStatus: userAfter?.subscriptionStatus,
        subscriptionEndDate: userAfter?.subscriptionEndDate?.toISOString(),
        daysLeft: userAfter?.subscriptionEndDate ? 
          Math.ceil((new Date(userAfter.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0
      });
      
      // Calculate extension days
      const daysBefore = userBefore?.subscriptionEndDate ? 
        Math.ceil((new Date(userBefore.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const daysAfter = userAfter?.subscriptionEndDate ? 
        Math.ceil((new Date(userAfter.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      res.json({
        success: true,
        testResults: {
          paymentCreated: !!testPayment.id,
          subscriptionExtended: daysAfter > daysBefore,
          statusActive: userAfter?.subscriptionStatus === 'active',
          userBefore: {
            status: userBefore?.subscriptionStatus,
            endDate: userBefore?.subscriptionEndDate?.toISOString(),
            daysLeft: daysBefore
          },
          userAfter: {
            status: userAfter?.subscriptionStatus,
            endDate: userAfter?.subscriptionEndDate?.toISOString(),
            daysLeft: daysAfter
          },
          extensionDays: daysAfter - daysBefore
        },
        message: `Subscription renewal test completed: +${daysAfter - daysBefore} days extension (≈1 year)`
      });
      
    } catch (error) {
      console.error("❌ Complete subscription renewal test error:", error);
      res.status(500).json({ message: "Subscription renewal test failed", error: error.message });
    }
  });

  // Test endpoint for child limit upgrade calculation
  app.post('/api/test-child-limit-upgrade', async (req, res) => {
    try {
      const { additionalChildren } = req.body;
      
      // Validate input
      if (!additionalChildren || additionalChildren <= 0) {
        return res.status(400).json({ message: "Invalid additional children count" });
      }
      
      // Calculate total amount using centralized pricing config
      const pricePerChild = getChildUpgradePrice(1);
      const totalAmount = additionalChildren * pricePerChild;
      
      res.json({
        success: true,
        additionalChildren,
        pricePerChild,
        totalAmount,
        breakdown: `₹${pricePerChild} × ${additionalChildren} children = ₹${totalAmount}`,
        message: `Adding ${additionalChildren} children will cost ₹${totalAmount}`
      });
    } catch (error) {
      console.error("Child limit upgrade test error:", error);
      res.status(500).json({ message: "Failed to test child limit upgrade" });
    }
  });

  // Test endpoint to simulate complete child upgrade flow
  app.post('/api/test-complete-child-upgrade', async (req, res) => {
    try {
      const { userId, additionalChildren } = req.body;
      
      console.log(`🧪 Testing complete child upgrade flow for user ${userId} (+${additionalChildren} children)`);
      
      // Step 1: Get user before upgrade
      const userBefore = await storage.getUser(userId);
      console.log(`📊 User before upgrade: maxChildren = ${userBefore?.maxChildren || 3}`);
      
      // Step 2: Create child upgrade payment
      const paymentId = `CHILD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const testPayment = await storage.createUpiPayment({
        userId,
        paymentId,
        amount: (additionalChildren * getChildUpgradePrice(1)).toString(), // Price per child from config
        upiApp: "test",
        subscriptionType: "child_upgrade",
        additionalChildren,
        status: "pending",
      });
      console.log(`✅ Step 1: Child upgrade payment created:`, testPayment.id);
      
      // Step 3: Simulate payment success
      await storage.updatePaymentStatus(paymentId, 'success', `TXN_CHILD_${Date.now()}`);
      const payment = await storage.getPaymentById(paymentId);
      console.log(`✅ Step 2: Payment marked as successful`);
      
      // Step 4: Process child upgrade
      if (payment && payment.subscriptionType === "child_upgrade" && payment.additionalChildren) {
        const updatedUser = await storage.updateUserChildLimit(payment.userId, payment.additionalChildren);
        console.log(`✅ Step 3: Child limit updated successfully`);
        
        // Generate and send test invoice for child upgrade
        const user = await storage.getUser(payment.userId);
        if (user?.email) {
          try {
            const childrenAdded = payment.additionalChildren || 1;
            const totalAmount = childrenAdded * getChildUpgradePrice(1); // Price per child from config
            const invoiceData = {
              invoiceNumber: invoiceGenerator.generateInvoiceNumber(),
              invoiceDate: new Date().toLocaleDateString('en-IN'),
              userName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || 'Customer',
              userEmail: user.email,
              userMobile: user?.mobileNumber || (user?.countryCode ? user.countryCode + ' ' + user.mobileNumber : 'Not provided'),
              subscriptionFee: totalAmount,
              gstNumber: '29AABCT1332L000',
            };
            
            // Save invoice to database
            const baseAmount = invoiceData.subscriptionFee / 1.18;
            await storage.createInvoice({
              invoiceNumber: invoiceData.invoiceNumber,
              userId: payment.userId,
              paymentId: payment.paymentId,
              invoiceDate: invoiceData.invoiceDate,
              subscriptionFee: baseAmount.toFixed(2),
              sgstAmount: (baseAmount * 0.09).toFixed(2),
              cgstAmount: (baseAmount * 0.09).toFixed(2),
              totalAmount: invoiceData.subscriptionFee.toString(),
              gstNumber: invoiceData.gstNumber,
              emailSent: false,
            });
            
            // Send invoice email
            const emailSent = await invoiceGenerator.sendInvoiceEmail(invoiceData);
            await storage.updateInvoiceEmailStatus(invoiceData.invoiceNumber, emailSent);
            
            console.log(`📧 Test child upgrade invoice ${invoiceData.invoiceNumber} ${emailSent ? 'sent successfully' : 'failed to send'} to ${user.email}`);
          } catch (invoiceError) {
            console.error("Test child upgrade invoice generation error:", invoiceError);
          }
        }
      }
      
      // Step 5: Get user after upgrade
      const userAfter = await storage.getUser(userId);
      console.log(`📈 User after upgrade: maxChildren = ${userAfter?.maxChildren || 3}`);
      
      const increase = (userAfter?.maxChildren || 3) - (userBefore?.maxChildren || 3);
      
      res.json({
        success: true,
        testResults: {
          paymentCreated: !!testPayment.id,
          childLimitIncreased: increase === additionalChildren,
          userBefore: {
            maxChildren: userBefore?.maxChildren || 3
          },
          userAfter: {
            maxChildren: userAfter?.maxChildren || 3
          },
          actualIncrease: increase,
          expectedIncrease: additionalChildren
        },
        message: `Child upgrade test completed: +${increase} children (expected +${additionalChildren})`
      });
      
    } catch (error) {
      console.error("❌ Complete child upgrade test error:", error);
      res.status(500).json({ message: "Child upgrade test failed", error: error.message });
    }
  });

  // Test endpoint to simulate child limit validation
  app.post('/api/test-child-limit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const devices = await storage.getDevicesByParent(userId);
      
      const deviceCount = devices.length;
      const maxDevices = user?.maxChildren || 3;
      
      if (deviceCount >= maxDevices) {
        return res.json({
          success: false,
          limitReached: true,
          currentDevices: deviceCount,
          maxAllowed: maxDevices,
          additionalChildrenNeeded: 1,
          message: `You've reached your limit of ${maxDevices} children. Pay ₹${getChildUpgradePrice(1)} to add 1 more child.`
        });
      }
      
      res.json({
        success: true,
        limitReached: false,
        currentDevices: deviceCount,
        maxAllowed: maxDevices,
        message: "You can add more devices"
      });
    } catch (error) {
      console.error("Child limit test error:", error);
      res.status(500).json({ message: "Failed to test child limit" });
    }
  });

  // Test endpoint for email functionality
  app.post('/api/test-email', async (req, res) => {
    try {
      const { userEmail, userName } = req.body;
      
      if (!userEmail) {
        return res.status(400).json({ message: "Email address required" });
      }
      
      console.log(`📧 Testing email delivery to: ${userEmail}`);
      
      const invoiceData = {
        invoiceNumber: `TEST${Date.now()}`,
        invoiceDate: new Date().toLocaleDateString('en-IN'),
        userName: userName || 'Test User',
        userEmail,
        userMobile: '+91 9876543210',
        subscriptionFee: getSubscriptionPrice('yearly'),
        gstNumber: '29AABCT1332L000',
      };
      
      const emailSent = await invoiceGenerator.sendInvoiceEmail(invoiceData);
      
      res.json({
        success: emailSent,
        message: emailSent ? 
          `Test email sent successfully to ${userEmail}` : 
          `Failed to send test email to ${userEmail}`,
        invoiceNumber: invoiceData.invoiceNumber
      });
      
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ message: "Test email failed", error: error.message });
    }
  });

  // Test endpoint to simulate login as Sachi for testing purposes
  app.get('/api/test-login-sachi', async (req, res) => {
    try {
      // Create a test session simulating Sachi login
      req.user = {
        claims: {
          sub: 'test_sachi_001',
          email: 'sachi@example.com',
          first_name: 'Sachi',
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        },
        access_token: 'test_token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
      
      // Set authentication flag
      req.session.passport = { user: req.user };
      
      // Create test user with subscription data if it doesn't exist
      await storage.upsertUser({
        id: 'test_sachi_001',
        email: 'sachi@example.com',
        firstName: 'Sachi',
        username: 'sachi_test',
        mobileNumber: '+91 8870929411',
        deviceAdminSecretCode: 'KNETS123',
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        maxChildren: 3,
        trialDays: 21,
        countryCode: '+91',
      });
      
      // Add a third child and device to test child limit validation
      try {
        const existingThirdChild = await storage.getChildrenByParent('test_sachi_001');
        if (existingThirdChild.length < 3) {
          const thirdChild = await storage.createChild({
            parentId: 'test_sachi_001',
            name: 'Test Child 3',
            age: 8
          });
          
          await storage.createDevice({
            childId: thirdChild.id,
            name: 'Third Device',
            imei: '999888777666555',
            phoneNumber: '+91 9999888877',
            deviceType: 'mobile',
            model: 'Test Phone',
            consentStatus: 'approved'
          });
        }
      } catch (error) {
        // Child/device might already exist, ignore error
        console.log('Third test device setup skipped (already exists)');
      }
      
      res.json({ 
        success: true, 
        message: "Test login as Sachi successful",
        user: {
          id: 'test_sachi_001',
          email: 'sachi@example.com',
          firstName: 'Sachi'
        }
      });
    } catch (error) {
      console.error("Test login error:", error);
      res.status(500).json({ message: "Test login failed" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, requireActiveSubscription, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const devices = await storage.getDevicesByParent(userId);
      
      const stats = {
        totalDevices: devices.length,
        activeDevices: devices.filter(d => d.isActive && d.lastSeen && new Date(d.lastSeen).getTime() > Date.now() - 300000).length, // active in last 5 min
        lockedDevices: devices.filter(d => d.isLocked).length,
        totalScreenTime: devices.reduce((sum, d) => sum + (d.screenTimeToday || 0), 0),
        alerts: devices.filter(d => (d.screenTimeToday || 0) > 240).length, // over 4 hours
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Update device endpoint
  app.patch('/api/devices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const updateData = req.body;

      console.log(`[UPDATE] Device ${deviceId} update request:`, updateData);

      // Verify device belongs to user
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Get the child to verify parent ownership
      const children = await storage.getChildrenByParent(userId);
      const child = children.find(c => c.id === device.childId);
      if (!child) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Update device using existing method
      const updatedDevice = await storage.updateExistingDevice(deviceId, updateData);
      
      console.log(`[UPDATE] Device ${deviceId} updated successfully:`, updatedDevice);
      res.json(updatedDevice);
    } catch (error) {
      console.error('Error updating device:', error);
      res.status(500).json({ message: 'Failed to update device' });
    }
  });

  // Approve device consent endpoint
  app.patch('/api/devices/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      console.log(`[APPROVE] Device ${deviceId} consent approval request from user ${userId}`);

      // Verify device belongs to user
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Get the child to verify parent ownership
      const children = await storage.getChildrenByParent(userId);
      const child = children.find(c => c.id === device.childId);
      if (!child) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Update consent status to approved
      const updatedDevice = await storage.updateDeviceConsent(deviceId, 'approved');
      
      // Log activity
      await storage.logActivity({
        deviceId: deviceId,
        action: 'consent_approved',
        description: `Device consent approved by parent`,
      });
      
      console.log(`[APPROVE] Device ${deviceId} consent approved successfully`);
      res.json({ message: "Device consent approved", device: updatedDevice });
    } catch (error) {
      console.error('Error approving device consent:', error);
      res.status(500).json({ message: 'Failed to approve device consent' });
    }
  });

  // Delete device endpoint
  app.delete('/api/devices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      console.log(`[DELETE] Device ${deviceId} delete request from user ${userId}`);

      // Verify device belongs to user
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Get the child to verify parent ownership
      const children = await storage.getChildrenByParent(userId);
      const child = children.find(c => c.id === device.childId);
      if (!child) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Delete device
      await storage.deleteDevice(deviceId);
      
      console.log(`[DELETE] Device ${deviceId} deleted successfully`);
      res.json({ message: "Device deleted successfully" });
    } catch (error) {
      console.error('Error deleting device:', error);
      res.status(500).json({ message: 'Failed to delete device' });
    }
  });

  // Device routes
  app.get('/api/devices', isAuthenticated, requireActiveSubscription, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`[DEBUG] Fetching devices for user: ${userId}`);
      const devices = await storage.getDevicesByParent(userId);
      console.log(`[DEBUG] Found ${devices.length} devices:`, devices.map(d => ({ id: d.id, name: d.name, childId: d.childId })));
      res.json(devices);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.post('/api/devices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceData = req.body;
      
      console.log("Device registration attempt:", {
        userId,
        deviceData,
        timestamp: new Date().toISOString()
      });
      
      // Validate device data
      const validatedDevice = insertDeviceSchema.parse(deviceData);
      console.log("Validated device data:", validatedDevice);
      
      // Check for existing device by IMEI or phone number
      const existingByImei = await storage.getDeviceByImei(validatedDevice.imei);
      const existingByPhone = await storage.getDeviceByPhoneNumber(validatedDevice.phoneNumber);
      
      let device;
      let isExistingDevice = false;
      
      if (existingByImei || existingByPhone) {
        // Device already exists - use the existing one and update if needed
        const existingDevice = existingByImei || existingByPhone;
        isExistingDevice = true;
        
        console.log("Found existing device:", {
          existingDevice: existingDevice?.id,
          matchedBy: existingByImei ? 'IMEI' : 'Phone',
          currentName: existingDevice?.name,
          newName: validatedDevice.name
        });
        
        // Update the existing device with new information if needed
        device = await storage.updateExistingDevice(existingDevice!.id, {
          childId: validatedDevice.childId,
          name: validatedDevice.name,
          deviceType: validatedDevice.deviceType,
          model: validatedDevice.model,
          // Keep original IMEI and phone number - they matched
          imei: existingDevice!.imei,
          phoneNumber: existingDevice!.phoneNumber,
        });
        
        console.log("Updated existing device for new child:", device);
        
        // Log activity for existing device reuse
        await storage.logActivity({
          deviceId: device.id,
          action: 'device_linked',
          description: `Device ${device.name} linked to new child profile (matched by ${existingByImei ? 'IMEI' : 'phone number'})`,
        });
      } else {
        // Create new device
        device = await storage.createDevice(validatedDevice);
        console.log("Device created successfully:", device);
        
        // Log activity for new device
        await storage.logActivity({
          deviceId: device.id,
          action: 'device_registered',
          description: `Device ${device.name} registered and awaiting consent`,
        });
      }
      
      res.json({
        ...device,
        isExistingDevice,
        message: isExistingDevice 
          ? `Device linked successfully! Parental controls will work on this device as it was previously registered.`
          : `Device registered successfully! Awaiting consent from child.`
      });
    } catch (error) {
      console.error("Error creating device:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        res.status(400).json({ message: "Invalid device data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create device" });
      }
    }
  });

  app.patch('/api/devices/:id/lock', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { isLocked } = req.body;
      
      const device = await storage.updateDeviceStatus(deviceId, isLocked);
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: isLocked ? 'device_locked' : 'device_unlocked',
        description: `Device ${device.name} was ${isLocked ? 'locked' : 'unlocked'}`,
      });
      
      res.json(device);
    } catch (error) {
      console.error("Error updating device status:", error);
      res.status(500).json({ message: "Failed to update device status" });
    }
  });

  app.patch('/api/devices/:id/consent', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { status } = req.body;
      
      const device = await storage.updateDeviceConsent(deviceId, status);
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'consent_updated',
        description: `Device consent status changed to ${status}`,
      });
      
      res.json(device);
    } catch (error) {
      console.error("Error updating device consent:", error);
      res.status(500).json({ message: "Failed to update device consent" });
    }
  });

  app.delete('/api/devices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // First verify the device belongs to this user
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Verify ownership through child relationship
      const devices = await storage.getDevicesByParent(userId);
      const userOwnsDevice = devices.some(d => d.id === deviceId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "You don't have permission to delete this device" });
      }
      
      console.log(`User ${userId} deleting device ${deviceId}: ${device.name}`);
      
      // Log activity before deletion
      await storage.logActivity({
        deviceId: device.id,
        action: 'device_removed',
        description: `Device ${device.name} was removed by parent`,
      });
      
      // Delete the device and all related data
      await storage.deleteDevice(deviceId);
      
      console.log(`Device ${deviceId} successfully deleted`);
      res.json({ message: "Device removed successfully" });
    } catch (error) {
      console.error("Error deleting device:", error);
      res.status(500).json({ message: "Failed to remove device" });
    }
  });

  // Children routes
  app.get('/api/children', isAuthenticated, requireActiveSubscription, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const children = await storage.getChildrenByParent(userId);
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Failed to fetch children" });
    }
  });

  app.get('/api/children/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childId = parseInt(req.params.id);
      
      if (isNaN(childId)) {
        return res.status(400).json({ message: "Invalid child ID" });
      }
      
      const child = await storage.getChildById(childId);
      if (!child || child.parentId !== userId) {
        return res.status(404).json({ message: "Child not found" });
      }
      
      res.json(child);
    } catch (error) {
      console.error("Error fetching child:", error);
      res.status(500).json({ message: "Failed to fetch child" });
    }
  });

  app.post('/api/children', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childData = { ...req.body, parentId: userId };
      
      // Validate child data
      const validatedChild = insertChildSchema.parse(childData);
      
      const child = await storage.createChild(validatedChild);
      res.json(child);
    } catch (error) {
      console.error("Error creating child:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid child data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create child" });
      }
    }
  });

  app.delete('/api/children/:id', isAuthenticated, async (req: any, res) => {
    try {
      const childId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // First verify the child belongs to this user
      const child = await storage.getChildById(childId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }
      
      if (child.parentId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this child" });
      }
      
      console.log(`User ${userId} deleting child ${childId}: ${child.name}`);
      
      // Delete the child and all related data (devices, logs, schedules, etc.)
      await storage.deleteChild(childId);
      
      console.log(`Child ${childId} successfully deleted`);
      res.json({ message: "Child and all associated data removed successfully" });
    } catch (error) {
      console.error("Error deleting child:", error);
      res.status(500).json({ message: "Failed to remove child" });
    }
  });

  // Helper function to check if schedule is currently active
  const isScheduleCurrentlyActive = (schedule: any, deviceTimeZone?: string) => {
    // Use device's timezone if provided, otherwise default to UTC
    const timeZone = deviceTimeZone || 'UTC';
    
    const now = new Date();
    const deviceTime = new Date(now.toLocaleString("en-US", { timeZone }));
    const currentTime = deviceTime.toTimeString().slice(0, 5);
    const currentDay = deviceTime.getDay();
    
    console.log(`[DEBUG] Checking schedule ${schedule.name}: current time = ${currentTime}, current day = ${currentDay}, timezone = ${timeZone}`);
    
    let daysOfWeek;
    try {
      daysOfWeek = JSON.parse(schedule.daysOfWeek || '[]');
    } catch {
      daysOfWeek = [];
    }
    
    console.log(`[DEBUG] Schedule ${schedule.name} days: ${JSON.stringify(daysOfWeek)}`);
    
    // Handle both string format (["monday", "tuesday"]) and numeric format ([0, 1, 2])
    let isScheduledForToday = false;
    if (daysOfWeek.length > 0) {
      if (typeof daysOfWeek[0] === 'string') {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        isScheduledForToday = daysOfWeek.includes(dayNames[currentDay]);
        console.log(`[DEBUG] String format check: ${dayNames[currentDay]} in ${JSON.stringify(daysOfWeek)} = ${isScheduledForToday}`);
      } else {
        isScheduledForToday = daysOfWeek.includes(currentDay);
        console.log(`[DEBUG] Numeric format check: ${currentDay} in ${JSON.stringify(daysOfWeek)} = ${isScheduledForToday}`);
      }
    }
    
    if (!isScheduledForToday) {
      console.log(`[DEBUG] Schedule ${schedule.name} not scheduled for today`);
      return false;
    }
    
    const startTime = schedule.startTime;
    const endTime = schedule.endTime;
    
    console.log(`[DEBUG] Schedule ${schedule.name} time check: ${currentTime} between ${startTime} and ${endTime}`);
    
    // Handle overnight schedules (e.g., 22:00 - 06:30)
    if (startTime > endTime) {
      const isActive = currentTime >= startTime || currentTime <= endTime;
      console.log(`[DEBUG] Overnight schedule: ${isActive}`);
      return isActive;
    } else {
      const isActive = currentTime >= startTime && currentTime <= endTime;
      console.log(`[DEBUG] Same day schedule: ${isActive}`);
      return isActive;
    }
  };

  // Schedule routes
  app.get('/api/schedules/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all schedules for this parent and filter for currently active ones
      const allSchedules = await storage.getSchedulesByParent(userId);
      
      console.log(`[DEBUG] Found ${allSchedules.length} schedules for user ${userId}`);
      
      // Get all devices for this user to check device-specific timezones
      const devices = await storage.getDevicesByParent(userId);
      
      const currentlyActiveSchedules = [];
      
      for (const schedule of allSchedules) {
        if (!schedule.isActive) {
          console.log(`[DEBUG] Schedule ${schedule.name} is not active`);
          continue;
        }
        
        // Check if this schedule is active for any device it's assigned to
        let isScheduleActive = false;
        
        for (const device of devices) {
          // Get device schedules to see if this schedule applies to this device
          const deviceSchedules = await storage.getSchedulesByDevice(device.id);
          const hasThisSchedule = deviceSchedules.some(ds => ds.id === schedule.id);
          
          if (hasThisSchedule) {
            // Use device-specific timezone
            let deviceTimeZone = device.timezone;
            if (!deviceTimeZone || deviceTimeZone === 'UTC') {
              deviceTimeZone = getTimezoneFromCountryCode(device.phoneNumber);
            }
            
            const isActive = isScheduleCurrentlyActive(schedule, deviceTimeZone);
            console.log(`[DEBUG] Schedule ${schedule.name} (${schedule.startTime}-${schedule.endTime}, days: ${schedule.daysOfWeek}) is currently active: ${isActive}`);
            
            if (isActive) {
              isScheduleActive = true;
              break; // Schedule is active for at least one device
            }
          }
        }
        
        if (isScheduleActive) {
          currentlyActiveSchedules.push(schedule);
        }
      }
      
      console.log(`[DEBUG] ${currentlyActiveSchedules.length} schedules are currently active`);
      
      res.json(currentlyActiveSchedules);
    } catch (error) {
      console.error("Error fetching active schedules:", error);
      res.status(500).json({ message: "Failed to fetch active schedules" });
    }
  });

  // Auto-lock devices based on active schedules
  app.post('/api/schedules/enforce', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const devices = await storage.getDevicesByParent(userId);
      const updates = [];
      
      console.log(`[ENFORCE] Starting schedule enforcement for ${devices.length} devices`);
      
      for (const device of devices) {
        const schedules = await storage.getSchedulesByDevice(device.id);
        const activeSchedules = schedules.filter(schedule => schedule.isActive);
        
        console.log(`[ENFORCE] Device ${device.name} (${device.id}) has ${activeSchedules.length} active schedules`);
        
        // SERVER-SIDE ENFORCEMENT: Use server time in device timezone to prevent manipulation
        const deviceTimeZone = device.timezone || 'UTC';
        const hasActiveSchedule = activeSchedules.some(schedule => {
          const isActive = isScheduleCurrentlyActive(schedule, deviceTimeZone);
          console.log(`[ENFORCE] Schedule ${schedule.name} active: ${isActive} (Device TZ: ${deviceTimeZone}, SERVER TIME)`);
          return isActive;
        });
        
        console.log(`[ENFORCE] Device ${device.name} should be ${hasActiveSchedule ? 'locked' : 'unlocked'}, currently ${device.isLocked ? 'locked' : 'unlocked'}`);
        
        // Update device lock status if needed
        if (hasActiveSchedule && !device.isLocked) {
          await storage.updateDeviceStatus(device.id, true);
          await storage.logActivity({
            deviceId: device.id,
            action: 'schedule_lock',
            description: 'Device automatically locked due to active schedule',
          });
          updates.push({ deviceId: device.id, action: 'locked', deviceName: device.name });
          console.log(`[ENFORCE] ✓ Locked device ${device.name}`);
        } else if (!hasActiveSchedule && device.isLocked) {
          await storage.updateDeviceStatus(device.id, false);
          await storage.logActivity({
            deviceId: device.id,
            action: 'schedule_unlock',
            description: 'Device automatically unlocked - no active schedules',
          });
          updates.push({ deviceId: device.id, action: 'unlocked', deviceName: device.name });
          console.log(`[ENFORCE] ✓ Unlocked device ${device.name}`);
        } else {
          console.log(`[ENFORCE] - No change needed for device ${device.name}`);
        }
      }
      
      console.log(`[ENFORCE] Enforcement completed. ${updates.length} devices updated.`);
      res.json({ message: 'Schedule enforcement completed', updates, totalDevices: devices.length });
    } catch (error) {
      console.error("Error enforcing schedules:", error);
      res.status(500).json({ message: "Failed to enforce schedules" });
    }
  });

  // Update device endpoint (for IMEI updates)
  app.patch('/api/devices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceId = parseInt(req.params.id);
      const { imei } = req.body;
      
      if (!imei) {
        return res.status(400).json({ message: "IMEI is required" });
      }
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      const updatedDevice = await storage.updateDevice(deviceId, { imei });
      
      // Log activity
      await storage.logActivity({
        deviceId: deviceId,
        action: 'imei_updated',
        description: `Device IMEI updated to ${imei}`,
        metadata: { previousImei: device.imei, newImei: imei },
      });
      
      res.json({ message: "Device IMEI updated successfully", device: updatedDevice });
    } catch (error) {
      console.error("Error updating device:", error);
      res.status(500).json({ message: "Failed to update device" });
    }
  });

  // Toggle lock/unlock all devices
  app.post('/api/devices/toggle-lock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { action } = req.body; // "lock" or "unlock"
      
      const devices = await storage.getDevicesByParent(userId);
      let affectedDevices = 0;
      
      for (const device of devices) {
        const shouldLock = action === "lock";
        
        // Only update if status is different
        if (device.isLocked !== shouldLock) {
          await storage.updateDeviceStatus(device.id, shouldLock);
          affectedDevices++;
        }
        
        // Log the manual lock/unlock activity
        await storage.logActivity({
          deviceId: device.id,
          action: shouldLock ? 'manual_lock' : 'manual_unlock',
          description: `Device manually ${shouldLock ? 'locked' : 'unlocked'} by parent`,
          metadata: JSON.stringify({ 
            lockType: 'manual',
            previousState: device.isLocked ? 'locked' : 'unlocked'
          })
        });
      }
      
      res.json({ 
        message: `${action === "lock" ? "Locked" : "Unlocked"} ${devices.length} device(s)`,
        action,
        affectedDevices,
        totalDevices: devices.length
      });
    } catch (error) {
      console.error("Error toggling device lock:", error);
      res.status(500).json({ message: "Failed to toggle device lock" });
    }
  });

  // Knets Jr app endpoints (no authentication required for device access)
  
  // Get device status by IMEI for Knets Jr app
  app.get('/api/companion/status/:imei', async (req, res) => {
    try {
      const imei = req.params.imei;
      const { phoneNumber, deviceFingerprint } = req.query;
      const device = await storage.getDeviceByImei(imei);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // SECURITY: Flexible validation - either phone number OR IMEI must match
      let phoneMatches = false;
      let imeiMatches = false;
      
      // Check phone number match
      if (phoneNumber && device.phoneNumber) {
        const cleanRegisteredPhone = device.phoneNumber.replace(/\s+/g, '');
        const cleanRequestPhone = phoneNumber.toString().replace(/\s+/g, '');
        phoneMatches = (cleanRegisteredPhone === cleanRequestPhone);
      }
      
      // Check IMEI/device fingerprint match
      if (deviceFingerprint && device.deviceFingerprint) {
        imeiMatches = (deviceFingerprint === device.deviceFingerprint);
      } else if (deviceFingerprint && device.imei) {
        // Fallback: check against registered IMEI if no fingerprint stored
        imeiMatches = (deviceFingerprint === device.imei);
      }
      
      // SECURITY: At least ONE identifier must match (phone OR IMEI)
      if (!phoneMatches && !imeiMatches) {
        await storage.logActivity({
          deviceId: device.id,
          action: 'security_alert',
          description: 'Device validation failed - neither phone number nor IMEI match',
          metadata: JSON.stringify({ 
            registeredPhone: device.phoneNumber,
            attemptedPhone: phoneNumber,
            registeredIMEI: device.imei,
            attemptedFingerprint: deviceFingerprint,
            phoneMatches,
            imeiMatches,
            timestamp: new Date().toISOString(),
            securityLevel: 'MEDIUM'
          })
        });
        
        return res.status(403).json({ 
          message: "Device validation failed",
          error: "IDENTITY_MISMATCH",
          description: "Neither phone number nor device identity matches registration. Contact your parent to update device information."
        });
      }
      
      // Log successful validation with match details
      await storage.logActivity({
        deviceId: device.id,
        action: 'device_validated',
        description: `Device access granted - ${phoneMatches ? 'phone' : ''}${phoneMatches && imeiMatches ? ' and ' : ''}${imeiMatches ? 'IMEI' : ''} match`,
        metadata: JSON.stringify({
          validationMethod: phoneMatches && imeiMatches ? 'both' : phoneMatches ? 'phone' : 'imei',
          phoneMatches,
          imeiMatches,
          timestamp: new Date().toISOString()
        })
      });
      
      // Get active schedules for this device
      const schedules = await storage.getSchedulesByDevice(device.id);
      const activeSchedules = schedules.filter(schedule => {
        if (!schedule.isActive) return false;
        return isScheduleCurrentlyActive(schedule);
      });
      
      res.json({
        id: device.id,
        name: device.name,
        isLocked: device.isLocked,
        isActive: device.isActive,
        lastChecked: new Date().toISOString(),
        schedules: activeSchedules.map(s => ({
          name: s.name,
          isActive: true,
          startTime: s.startTime,
          endTime: s.endTime
        }))
      });
    } catch (error) {
      console.error("Error fetching Knets Jr device status:", error);
      res.status(500).json({ message: "Failed to fetch device status" });
    }
  });
  
  // Knets Jr app heartbeat to update device activity
  // Update device timezone from companion app
  app.put('/api/companion/timezone/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      const { timezone } = req.body;
      
      console.log(`[TIMEZONE] Updating timezone for device ${imei} to: ${timezone}`);
      
      // Update device timezone
      await storage.updateDeviceTimezone(imei, timezone);
      
      res.json({ success: true, message: 'Device timezone updated successfully' });
    } catch (error) {
      console.error("Error updating device timezone:", error);
      res.status(500).json({ success: false, message: "Failed to update device timezone" });
    }
  });

  app.post('/api/companion/heartbeat', async (req, res) => {
    try {
      const { imei, deviceFingerprint, deviceTime } = req.body;
      const device = await storage.getDeviceByImei(imei);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // SECURITY CHECK: Flexible validation for heartbeat - allow if either identifier matches
      let validatedByPhone = false;
      let validatedByIMEI = false;
      
      // Check if current phone number matches (if available)
      if (device.phoneNumber) {
        // For heartbeat, we don't have direct phone number, but we can validate device is legitimate
        validatedByIMEI = true; // Device found by IMEI, so IMEI is valid
      }
      
      // Check device fingerprint match
      if (deviceFingerprint && device.deviceFingerprint) {
        validatedByIMEI = (deviceFingerprint === device.deviceFingerprint);
      }
      
      // If we have device fingerprint but no stored fingerprint, update it
      if (deviceFingerprint && !device.deviceFingerprint) {
        validatedByIMEI = true; // Accept and store new fingerprint
      }
      
      // Update device fingerprint only (lastSeen is updated in storage method)
      await storage.updateDeviceStatus(device.id, device.isLocked || false);
      
      // Log heartbeat activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'companion_heartbeat',
        description: 'Knets Jr app check-in',
        metadata: JSON.stringify({ 
          timestamp: new Date().toISOString(),
          appType: 'knets_jr',
          securityValidated: true
        })
      });
      
      // Time manipulation detection
      const serverTime = new Date();
      const deviceTimeMs = req.body.deviceTime ? new Date(req.body.deviceTime).getTime() : null;
      const serverTimeMs = serverTime.getTime();
      
      let timeDriftWarning = null;
      if (deviceTimeMs) {
        const timeDiff = Math.abs(serverTimeMs - deviceTimeMs);
        const maxAllowedDrift = 5 * 60 * 1000; // 5 minutes
        
        if (timeDiff > maxAllowedDrift) {
          timeDriftWarning = `Device time differs from server by ${Math.round(timeDiff / 60000)} minutes`;
          console.log(`[TIME-SECURITY] ${timeDriftWarning} for device ${imei}`);
          
          // Log suspicious time manipulation
          await storage.logActivity({
            deviceId: device.id,
            action: 'time_manipulation_detected',
            description: `Device time manipulation detected: ${timeDriftWarning}`,
            metadata: {
              deviceTime: deviceTimeMs ? new Date(deviceTimeMs).toISOString() : null,
              serverTime: serverTime.toISOString(),
              timeDifference: timeDiff
            }
          });
        }
      }

      res.json({ 
        message: "Heartbeat received", 
        timestamp: serverTime.toISOString(),
        serverTime: serverTime.toISOString(),
        useServerTime: true, // Force device to use server time for schedule checks
        timeDriftWarning
      });
    } catch (error) {
      console.error("Error processing Knets Jr heartbeat:", error);
      res.status(500).json({ message: "Failed to process heartbeat" });
    }
  });

  // Companion app consent approval endpoint (no auth required)
  app.post('/api/companion/consent/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      const { action } = req.body; // 'approve' or 'deny'
      
      if (!imei || !action) {
        return res.status(400).json({ message: "IMEI and action are required" });
      }

      // Find device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Update consent status
      const newStatus = action === 'approve' ? 'approved' : 'denied';
      await storage.updateDeviceConsent(device.id, newStatus);
      
      // Log the consent action
      await storage.logActivity({
        deviceId: device.id,
        action: 'consent_' + action,
        description: `Device consent ${action}d by child user`,
        metadata: { imei, previousStatus: device.consentStatus, newStatus },
      });
      
      res.json({ 
        message: `Device consent ${action}d successfully`,
        status: newStatus 
      });
    } catch (error) {
      console.error("Error updating consent:", error);
      res.status(500).json({ message: "Failed to update consent" });
    }
  });

  // Get all device-schedule relationships for a parent
  app.get('/api/device-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all devices for this parent
      const devices = await storage.getDevicesByParent(userId);
      const deviceIds = devices.map(d => d.id);
      
      // Get all schedules for these devices
      const deviceSchedules = [];
      for (const deviceId of deviceIds) {
        const schedules = await storage.getSchedulesByDevice(deviceId);
        for (const schedule of schedules) {
          deviceSchedules.push({
            deviceId,
            schedule
          });
        }
      }
      
      res.json(deviceSchedules);
    } catch (error) {
      console.error("Error fetching device schedules:", error);
      res.status(500).json({ message: "Failed to fetch device schedules" });
    }
  });

  app.get('/api/devices/:deviceId/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceId = parseInt(req.params.deviceId);
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      const schedules = await storage.getSchedulesByDevice(deviceId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  // Get all schedules for a parent
  app.get('/api/schedules', isAuthenticated, requireActiveSubscription, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schedules = await storage.getSchedulesByParent(userId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post('/api/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleData = { ...req.body, parentId: userId };
      
      console.log(`[DEBUG] Creating schedule for user ${userId}:`, {
        scheduleName: scheduleData.name,
        deviceIds: scheduleData.deviceIds,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime
      });
      
      // Remove deviceId from the schedule data as it's now stored in junction table
      const { deviceIds, ...scheduleWithoutDevices } = scheduleData;
      
      // Validate schedule data
      const validatedSchedule = insertScheduleSchema.parse(scheduleWithoutDevices);
      
      const schedule = await storage.createSchedule(validatedSchedule);
      
      // If deviceIds are provided, assign the schedule to those devices
      if (deviceIds && Array.isArray(deviceIds)) {
        console.log(`[DEBUG] Assigning schedule to ${deviceIds.length} devices:`, deviceIds);
        for (const deviceId of deviceIds) {
          // Verify device ownership
          const device = await storage.getDeviceById(deviceId);
          console.log(`[DEBUG] Device ${deviceId}:`, device ? { id: device.id, name: device.name, childId: device.childId } : 'not found');
          
          if (device) {
            const children = await storage.getChildrenByParent(userId);
            const userOwnsDevice = children.some(child => child.id === device.childId);
            console.log(`[DEBUG] User owns device ${deviceId}:`, userOwnsDevice);
            
            if (userOwnsDevice) {
              await storage.assignDeviceToSchedule(deviceId, schedule.id);
              console.log(`[DEBUG] Successfully assigned schedule ${schedule.id} to device ${deviceId}`);
              
              // Log activity for each device
              await storage.logActivity({
                deviceId: deviceId,
                action: 'schedule_assigned',
                description: `Schedule ${schedule.name} assigned to device`,
              });
            }
          }
        }
      }
      
      res.json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid schedule data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create schedule" });
      }
    }
  });

  app.patch('/api/schedules/:scheduleId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleId = parseInt(req.params.scheduleId);
      const updates = req.body;
      
      console.log('[DEBUG] Schedule update request:', { scheduleId, updates });
      console.log('[DEBUG] Network control fields:', {
        networkRestrictionLevel: updates.networkRestrictionLevel,
        restrictWifi: updates.restrictWifi,
        restrictMobileData: updates.restrictMobileData,
        allowEmergencyAccess: updates.allowEmergencyAccess
      });
      
      // Get schedule by ID
      const schedule = await storage.getScheduleById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      console.log('[DEBUG] Current schedule before update:', {
        id: schedule.id,
        name: schedule.name,
        networkRestrictionLevel: schedule.networkRestrictionLevel,
        restrictWifi: schedule.restrictWifi,
        restrictMobileData: schedule.restrictMobileData,
        allowEmergencyAccess: schedule.allowEmergencyAccess
      });
      
      // Verify ownership through parentId
      if (schedule.parentId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to schedule" });
      }
      
      const updatedSchedule = await storage.updateSchedule(scheduleId, updates);
      
      console.log('[DEBUG] Schedule after update:', {
        id: updatedSchedule.id,
        name: updatedSchedule.name,
        networkRestrictionLevel: updatedSchedule.networkRestrictionLevel,
        restrictWifi: updatedSchedule.restrictWifi,
        restrictMobileData: updatedSchedule.restrictMobileData,
        allowEmergencyAccess: updatedSchedule.allowEmergencyAccess
      });
      
      // Log activity for all devices using this schedule
      const devicesForSchedule = await storage.getDevicesForSchedule(scheduleId);
      for (const device of devicesForSchedule) {
        await storage.logActivity({
          deviceId: device.id,
          action: 'schedule_updated',
          description: `Schedule ${schedule.name} updated`,
        });
      }
      
      res.json(updatedSchedule);
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ message: "Failed to update schedule" });
    }
  });

  app.delete('/api/schedules/:scheduleId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleId = parseInt(req.params.scheduleId);
      
      // Get schedule by ID
      const schedule = await storage.getScheduleById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      // Verify ownership through parentId
      if (schedule.parentId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to schedule" });
      }
      
      // Log activity for all devices using this schedule before deletion
      const devicesForSchedule = await storage.getDevicesForSchedule(scheduleId);
      for (const device of devicesForSchedule) {
        await storage.logActivity({
          deviceId: device.id,
          action: 'schedule_deleted',
          description: `Schedule ${schedule.name} deleted`,
        });
      }
      
      await storage.deleteSchedule(scheduleId);
      
      res.json({ message: "Schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  // Device-Schedule Assignment Routes
  app.get('/api/schedules/:scheduleId/devices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleId = parseInt(req.params.scheduleId);
      
      // Get schedule by ID and verify ownership
      const schedule = await storage.getScheduleById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      if (schedule.parentId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to schedule" });
      }
      
      const devices = await storage.getDevicesForSchedule(scheduleId);
      res.json(devices);
    } catch (error) {
      console.error("Error fetching devices for schedule:", error);
      res.status(500).json({ message: "Failed to fetch devices for schedule" });
    }
  });

  app.post('/api/schedules/:scheduleId/devices/:deviceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleId = parseInt(req.params.scheduleId);
      const deviceId = parseInt(req.params.deviceId);
      
      // Verify schedule ownership
      const schedule = await storage.getScheduleById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      if (schedule.parentId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to schedule" });
      }
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      // Assign device to schedule
      const assignment = await storage.assignDeviceToSchedule(deviceId, scheduleId);
      
      // Log activity
      await storage.logActivity({
        deviceId: deviceId,
        action: 'schedule_assigned',
        description: `Device assigned to schedule: ${schedule.name}`,
      });
      
      res.json({ message: "Device assigned to schedule successfully", assignment });
    } catch (error) {
      console.error("Error assigning device to schedule:", error);
      res.status(500).json({ message: "Failed to assign device to schedule" });
    }
  });

  app.delete('/api/schedules/:scheduleId/devices/:deviceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleId = parseInt(req.params.scheduleId);
      const deviceId = parseInt(req.params.deviceId);
      
      // Verify schedule ownership
      const schedule = await storage.getScheduleById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      if (schedule.parentId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to schedule" });
      }
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      // Remove device from schedule
      await storage.removeDeviceFromSchedule(deviceId, scheduleId);
      
      // Log activity
      await storage.logActivity({
        deviceId: deviceId,
        action: 'schedule_unassigned',
        description: `Device removed from schedule: ${schedule.name}`,
      });
      
      res.json({ message: "Device removed from schedule successfully" });
    } catch (error) {
      console.error("Error removing device from schedule:", error);
      res.status(500).json({ message: "Failed to remove device from schedule" });
    }
  });

  // Add mobile number to database for future IMEI lookup
  app.post('/api/devices/add-mobile', isAuthenticated, async (req: any, res) => {
    try {
      const { phoneNumber, imei, deviceName, childName } = req.body;
      const userId = req.user.claims.sub;
      
      console.log(`Adding mobile number to database: ${phoneNumber} with IMEI: ${imei}`);
      
      // Validate required fields
      if (!phoneNumber || !imei || !deviceName) {
        return res.status(400).json({ message: "Phone number, IMEI, and device name are required" });
      }
      
      // Check if device already exists
      const existingByImei = await storage.getDeviceByImei(imei);
      const existingByPhone = await storage.getDeviceByPhoneNumber(phoneNumber);
      
      if (existingByImei || existingByPhone) {
        return res.status(409).json({ 
          message: "Device already exists in database",
          device: existingByImei || existingByPhone
        });
      }
      
      // Create child if provided and doesn't exist
      let childId;
      if (childName) {
        const children = await storage.getChildrenByParent(userId);
        const existingChild = children.find((c: any) => c.name === childName);
        
        if (existingChild) {
          childId = existingChild.id;
        } else {
          const newChild = await storage.createChild({
            parentId: userId,
            name: childName,
            age: 12 // Default age
          });
          childId = newChild.id;
        }
      }
      
      // Create device record
      const deviceData = {
        childId,
        name: deviceName,
        imei: imei === "000000000000000" ? "PENDING_IMEI_LOOKUP" : imei, // Handle placeholder IMEI
        phoneNumber: phoneNumber,
        deviceType: "mobile",
        model: "Unknown",
        consentStatus: "pending"
      };
      
      const device = await storage.createDevice(deviceData);
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'mobile_number_added',
        description: `Mobile number ${phoneNumber} added to database for IMEI lookup`,
      });
      
      console.log(`Successfully added mobile number: ${phoneNumber} with device ID: ${device.id}`);
      
      res.json({
        message: "Mobile number added successfully",
        device: {
          id: device.id,
          imei: device.imei,
          deviceName: device.name,
          phoneNumber: device.phoneNumber
        }
      });
    } catch (error) {
      console.error("Error adding mobile number:", error);
      res.status(500).json({ message: "Failed to add mobile number to database" });
    }
  });

  // IMEI lookup by mobile number
  // IMEI lookup endpoint removed - users now provide IMEI directly during registration

  // Quick lock functionality
  app.post('/api/devices/:deviceId/quick-lock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceId = parseInt(req.params.deviceId);
      const { duration } = req.body; // duration in minutes
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      // Lock the device
      await storage.updateDeviceStatus(deviceId, true);
      
      // Create a temporary schedule for the quick lock
      const now = new Date();
      const endTime = new Date(now.getTime() + duration * 60000);
      
      const quickSchedule = await storage.createSchedule({
        deviceId,
        name: `Quick Lock - ${duration}min`,
        startTime: now.toTimeString().slice(0, 5),
        endTime: endTime.toTimeString().slice(0, 5),
        daysOfWeek: JSON.stringify([now.getDay()]),
        isActive: true,
      });
      
      // Log activity
      await storage.logActivity({
        deviceId,
        action: 'quick_lock',
        description: `Device locked for ${duration} minutes`,
        metadata: { duration, scheduleId: quickSchedule.id },
      });
      
      res.json({ message: "Device locked successfully", duration, scheduleId: quickSchedule.id });
    } catch (error) {
      console.error("Error with quick lock:", error);
      res.status(500).json({ message: "Failed to lock device" });
    }
  });

  // Activity log routes
  app.get('/api/activity', isAuthenticated, requireActiveSubscription, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivity(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Location tracking endpoints - supports both authenticated parents and companion app
  app.post('/api/location', async (req: any, res) => {
    try {
      const locationData = req.body;
      const isCompanionAccess = req.headers.authorization === 'Bearer companion-access';
      
      // Validate required fields
      if (!locationData.deviceId || !locationData.latitude || !locationData.longitude) {
        return res.status(400).json({ message: "Missing required location data" });
      }
      
      // Verify device exists
      const device = await storage.getDeviceById(locationData.deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // For companion app access, allow direct device location updates
      if (!isCompanionAccess) {
        // For parent dashboard access, verify ownership
        if (!req.user || !req.user.claims) {
          return res.status(401).json({ message: "Authentication required" });
        }
        
        const children = await storage.getChildrenByParent(req.user.claims.sub);
        const userOwnsDevice = children.some(child => child.id === device.childId);
        
        if (!userOwnsDevice) {
          return res.status(403).json({ message: "Unauthorized access to device" });
        }
      }
      
      // Parse coordinates and reverse geocode to get address
      const latitude = parseFloat(locationData.latitude);
      const longitude = parseFloat(locationData.longitude);
      
      let address = locationData.address;
      if (!address) {
        try {
          // Reverse geocode to get place name
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const geoData = await response.json();
          
          if (geoData.city && geoData.countryName) {
            address = `${geoData.city}, ${geoData.countryName}`;
          } else if (geoData.locality && geoData.countryName) {
            address = `${geoData.locality}, ${geoData.countryName}`;
          } else if (geoData.countryName) {
            address = geoData.countryName;
          } else {
            address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          }
        } catch (geoError) {
          console.error("Reverse geocoding failed:", geoError);
          address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        }
      }
      
      const locationLog = await storage.logLocation({
        deviceId: locationData.deviceId,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        accuracy: locationData.accuracy || null,
        address: address,
        locationMethod: locationData.locationMethod || 'unknown',
      });
      
      // Log activity for location update
      await storage.logActivity({
        deviceId: device.id,
        action: 'location_update',
        description: `Location updated via ${locationData.locationMethod || 'unknown'} (±${locationData.accuracy || 'unknown'}m)`,
        metadata: JSON.stringify({
          latitude,
          longitude,
          accuracy: locationData.accuracy,
          method: locationData.locationMethod,
          source: isCompanionAccess ? 'companion_app' : 'parent_dashboard',
          address
        })
      });
      
      res.json({ success: true, locationLog });
    } catch (error) {
      console.error("Error logging location:", error);
      res.status(500).json({ message: "Failed to log location" });
    }
  });

  app.get('/api/devices/:deviceId/locations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceId = parseInt(req.params.deviceId);
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      const locations = await storage.getDeviceLocations(deviceId, limit);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching device locations:", error);
      res.status(500).json({ message: "Failed to fetch device locations" });
    }
  });

  app.get('/api/location/imei/:imei', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const imei = req.params.imei;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Verify user owns a device with this IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      const locations = await storage.getLocationByImei(imei, limit);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations by IMEI:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get('/api/location/phone/:phoneNumber', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const phoneNumber = decodeURIComponent(req.params.phoneNumber);
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Verify user owns a device with this phone number
      const device = await storage.getDeviceByPhoneNumber(phoneNumber);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      const locations = await storage.getLocationByPhoneNumber(phoneNumber, limit);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations by phone:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get('/api/devices/:deviceId/location/latest', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceId = parseInt(req.params.deviceId);
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      const location = await storage.getLatestLocation(deviceId);
      if (!location) {
        return res.status(404).json({ message: "No location data found" });
      }
      
      res.json(location);
    } catch (error) {
      console.error("Error fetching latest location:", error);
      res.status(500).json({ message: "Failed to fetch latest location" });
    }
  });

  // Emergency unlock route
  app.post('/api/emergency/unlock-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const devices = await storage.getDevicesByParent(userId);
      
      // Unlock all devices
      const unlockPromises = devices
        .filter(d => d.isLocked)
        .map(async (device) => {
          await storage.updateDeviceStatus(device.id, false);
          await storage.logActivity({
            deviceId: device.id,
            action: 'emergency_unlock',
            description: `Emergency unlock activated for ${device.name}`,
          });
        });
      
      await Promise.all(unlockPromises);
      
      res.json({ message: "All devices unlocked successfully" });
    } catch (error) {
      console.error("Error during emergency unlock:", error);
      res.status(500).json({ message: "Failed to unlock devices" });
    }
  });

  // Companion App API Endpoints for Android APK
  
  // Connect device using parent code (new parent codes workflow)
  app.post('/api/device/connect', async (req, res) => {
    try {
      const { parentCode, imei, phoneNumber, deviceType = 'mobile', model, brand, androidVersion } = req.body;
      
      console.log(`[PARENT-CODE-CONNECT] Device connection attempt: Parent Code ${parentCode}, IMEI ${imei}`);
      
      if (!parentCode) {
        return res.status(400).json({ 
          success: false, 
          message: "Parent code is required" 
        });
      }

      // Find child by parent code
      const child = await storage.getChildByParentCode(parentCode);
      if (!child) {
        console.log(`[PARENT-CODE-CONNECT] No child found for parent code: ${parentCode}`);
        return res.status(404).json({ 
          success: false, 
          message: "Invalid parent code. Please check the code and try again." 
        });
      }

      console.log(`[PARENT-CODE-CONNECT] Found child: ${child.name} (ID: ${child.id})`);

      // Check if child already has a connected device
      const existingDevice = await storage.getDeviceByChildId(child.id);
      if (existingDevice) {
        console.log(`[PARENT-CODE-CONNECT] Child ${child.name} already has device: ${existingDevice.name}`);
        
        // Update existing device with new IMEI if provided
        if (imei && existingDevice.imei !== imei) {
          await storage.updateDeviceImei(existingDevice.id, imei);
        }
        
        // Update device status as connected
        await storage.updateDeviceStatus(existingDevice.id, false); // unlocked by default
        
        return res.json({
          success: true,
          message: "Device reconnected successfully",
          data: {
            id: existingDevice.id,
            name: existingDevice.name,
            childName: child.name,
            imei: imei || existingDevice.imei,
            isLocked: false,
            consentStatus: existingDevice.consentStatus || 'granted'
          }
        });
      }

      // Create new device for this child
      const deviceName = `${child.name}'s Device`;
      const device = await storage.createDevice({
        childId: child.id,
        name: deviceName,
        imei: imei || `TEMP_${Date.now()}`,
        phoneNumber: phoneNumber || '',
        deviceType: deviceType,
        model: model || 'Unknown',
        brand: brand || 'Unknown',
        isActive: true,
        isLocked: false,
        batteryLevel: 100,
        consentStatus: 'granted'
      });

      // Mark child as connected
      await storage.updateChildConnectionStatus(child.id, true);

      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'device_connected_parent_code',
        description: `Device connected using parent code ${parentCode}`,
        metadata: { parentCode, imei, deviceType, model }
      });

      console.log(`[PARENT-CODE-CONNECT] Device created successfully: ${device.name} for child ${child.name}`);

      res.json({
        success: true,
        message: "Device connected successfully",
        data: {
          id: device.id,
          name: device.name,
          childName: child.name,
          imei: device.imei,
          phoneNumber: device.phoneNumber,
          isLocked: false,
          consentStatus: 'granted'
        }
      });
    } catch (error) {
      console.error("Error connecting device with parent code:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to connect device" 
      });
    }
  });

  // Connect existing device (preferred flow)
  app.post('/api/companion/connect', async (req, res) => {
    try {
      const { phoneNumber, imei } = req.body;
      
      console.log(`[CONNECT] Android device connection: Phone ${phoneNumber}, IMEI ${imei}`);
      
      // Try multiple phone number formats to find the device
      let device = null;
      const searchFormats = [
        phoneNumber,                    // Original format (e.g., "8870929411")
        `+91${phoneNumber}`,           // Add +91 prefix (e.g., "+918870929411")
        `+91 ${phoneNumber}`,          // Add +91 with space (e.g., "+91 8870929411")
        phoneNumber.replace(/^\+91\s?/, ''), // Remove +91 if present (e.g., "8870929411")
      ];
      
      for (const format of searchFormats) {
        console.log(`[CONNECT] Trying phone format: ${format}`);
        device = await storage.getDeviceByPhoneNumber(format);
        if (device) {
          console.log(`[CONNECT] Found device with phone format: ${format}`);
          break;
        }
      }
      
      if (!device) {
        console.log(`[CONNECT] No device found for phone: ${phoneNumber}`);
        return res.status(404).json({ 
          success: false, 
          message: "Mobile number not found. Ask parent to register your device first." 
        });
      }
      
      // Update device with current IMEI if provided
      if (imei && device.imei !== imei) {
        console.log(`[CONNECT] Updating device IMEI from ${device.imei} to ${imei}`);
        await storage.updateDeviceImei(device.id, imei);
      }
      
      // Update device as active and connected
      await storage.updateDeviceStatus(device.id, device.isLocked || false);
      
      // Log connection activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'android_connected',
        description: `Knets Jr Android app connected successfully`,
        metadata: { phoneNumber, imei, connectionTime: new Date().toISOString() }
      });
      
      // Get child name for response
      const child = await storage.getChildById(device.childId);
      const childName = child ? child.name : 'Unknown Child';
      
      console.log(`[CONNECT] Device connection successful: ${device.name} (${childName})`);
      
      res.json({
        success: true,
        message: "Device connected successfully",
        data: {
          id: device.id,
          name: device.name,
          childName: childName,
          imei: device.imei,
          phoneNumber: device.phoneNumber,
          isLocked: device.isLocked,
          consentStatus: device.consentStatus
        }
      });
    } catch (error) {
      console.error("Error connecting Android device:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to connect device" 
      });
    }
  });

  // Register new device (fallback for new registrations)
  app.post('/api/companion/register', async (req, res) => {
    try {
      const { imei, deviceName, childName, parentPhone, deviceModel, deviceBrand, androidVersion } = req.body;
      
      console.log(`[DEBUG] Android device registration: IMEI ${imei}, Child: ${childName}`);
      
      // Find or create parent by phone number
      let parent = await storage.getUserByPhone(parentPhone);
      if (!parent) {
        // Create new parent account
        parent = await storage.createUser({
          email: `${parentPhone}@knets.temp`,
          firstName: 'Parent',
          lastName: 'User',
          profileImageUrl: null
        });
      }
      
      // Create child profile
      const child = await storage.createChild({
        parentId: parent.id,
        name: childName,
        age: 10, // Default age
        grade: 'Not specified'
      });
      
      // Register device
      const device = await storage.createDevice({
        childId: child.id,
        name: deviceName,
        imei: imei,
        phoneNumber: parentPhone,
        model: deviceModel,
        brand: deviceBrand,
        isActive: true,
        isLocked: false,
        // lastSeen: new Date(),
        batteryLevel: 100,
        consentStatus: 'granted'
      });
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'device_registered',
        description: `Android device registered: ${deviceName}`,
      });
      
      res.json({ success: true, data: { deviceId: device.id }, message: 'Device registered successfully' });
    } catch (error) {
      console.error("Error registering Android device:", error);
      res.status(500).json({ success: false, message: "Failed to register device" });
    }
  });

  app.get('/api/companion/schedules/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      
      console.log(`[DEBUG] Fetching schedules for Android device: ${imei}`);
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Get schedules for this device
      const schedules = await storage.getSchedulesForDevice(device.id);
      
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching device schedules:", error);
      res.status(500).json({ success: false, message: "Failed to fetch schedules" });
    }
  });

  app.put('/api/companion/status/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      const { isLocked, lastChecked, batteryLevel, isOnline } = req.body;
      
      console.log(`[DEBUG] Updating Android device status: ${imei}, locked: ${isLocked}, battery: ${batteryLevel}%`);
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Update device status
      await storage.updateDevice(device.id, {
        isLocked: isLocked,
        lastSeen: new Date(lastChecked),
        batteryLevel: batteryLevel,
        isActive: isOnline
      });
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: isLocked ? 'device_locked' : 'device_unlocked',
        description: `Android device ${isLocked ? 'locked' : 'unlocked'} by schedule`,
      });
      
      res.json({ success: true, message: 'Device status updated' });
    } catch (error) {
      console.error("Error updating device status:", error);
      res.status(500).json({ success: false, message: "Failed to update device status" });
    }
  });

  app.post('/api/companion/heartbeat/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      const timestamp = req.body;
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Update last seen
      await storage.updateDevice(device.id, {
        lastSeen: new Date(timestamp),
        isActive: true
      });
      
      res.json({ success: true, message: 'Heartbeat received' });
    } catch (error) {
      console.error("Error processing heartbeat:", error);
      res.status(500).json({ success: false, message: "Failed to process heartbeat" });
    }
  });

  app.get('/api/companion/device/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      res.json({
        success: true,
        data: {
          imei: device.imei,
          isLocked: device.isLocked,
          lastChecked: device.lastSeen?.getTime() || Date.now(),
          batteryLevel: device.batteryLevel || 100,
          isOnline: device.isActive
        }
      });
    } catch (error) {
      console.error("Error fetching device info:", error);
      res.status(500).json({ success: false, message: "Failed to fetch device info" });
    }
  });

  app.post('/api/companion/lock/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Update device to locked
      await storage.updateDevice(device.id, { isLocked: true });
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'remote_lock',
        description: 'Device locked remotely via API',
      });
      
      res.json({ success: true, message: 'Device lock command sent' });
    } catch (error) {
      console.error("Error locking device:", error);
      res.status(500).json({ success: false, message: "Failed to lock device" });
    }
  });

  app.post('/api/companion/unlock/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Update device to unlocked
      await storage.updateDevice(device.id, { isLocked: false });
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'remote_unlock',
        description: 'Device unlocked remotely via API',
      });
      
      res.json({ success: true, message: 'Device unlock command sent' });
    } catch (error) {
      console.error("Error unlocking device:", error);
      res.status(500).json({ success: false, message: "Failed to unlock device" });
    }
  });

  // Device admin protection endpoints
  app.post('/api/companion/request-device-admin-disable', async (req, res) => {
    try {
      const { imei, requestType, timestamp } = req.body;
      
      if (!imei) {
        return res.status(400).json({ success: false, message: "IMEI is required" });
      }

      // Find device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }

      // Log the uninstall request
      await storage.logActivity({
        deviceId: device.id,
        action: 'uninstall_request',
        description: 'Child requested to disable device admin',
        metadata: JSON.stringify({ requestType, timestamp, imei })
      });

      // TODO: Send SMS alert to parent (integrate with SMS service)
      console.log(`[SMS ALERT] Device admin disable requested for device: ${device.name}`);
      console.log(`[SMS ALERT] Parent should be notified at phone: ${device.phoneNumber}`);

      res.json({ 
        success: true, 
        message: "Parent notification sent. Wait for approval and secret code." 
      });
    } catch (error) {
      console.error("Error processing device admin disable request:", error);
      res.status(500).json({ success: false, message: "Failed to process request" });
    }
  });

  app.post('/api/companion/validate-secret-code', async (req, res) => {
    try {
      const { imei, secretCode } = req.body;
      
      if (!imei || !secretCode) {
        return res.status(400).json({ success: false, message: "IMEI and secret code are required" });
      }

      // Find device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }

      // Get parent user to validate secret code
      const parent = await storage.getUser(device.parentId);
      if (!parent) {
        return res.status(404).json({ success: false, message: "Parent not found" });
      }

      // Validate secret code (in production, this should be encrypted/hashed)
      const isValidCode = parent.deviceAdminSecretCode && parent.deviceAdminSecretCode === secretCode;
      
      if (isValidCode) {
        // Log successful validation
        await storage.logActivity({
          deviceId: device.id,
          action: 'secret_code_validated',
          description: 'Secret code validated successfully - device admin can be disabled',
          metadata: JSON.stringify({ imei, timestamp: new Date().toISOString() })
        });

        res.json({ 
          success: true, 
          message: "Secret code validated. Device admin can be disabled." 
        });
      } else {
        // Log failed validation
        await storage.logActivity({
          deviceId: device.id,
          action: 'secret_code_failed',
          description: 'Invalid secret code entered for device admin disable',
          metadata: JSON.stringify({ imei, enteredCode: secretCode, timestamp: new Date().toISOString() })
        });

        res.json({ 
          success: false, 
          message: "Invalid secret code. Contact your parent for the correct code." 
        });
      }
    } catch (error) {
      console.error("Error validating secret code:", error);
      res.status(500).json({ success: false, message: "Failed to validate secret code" });
    }
  });

  // Network Control API Endpoints for Android Companion App
  app.post('/api/companion/network/status/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      const { restrictionLevel, wifiEnabled, mobileDataEnabled, capabilities } = req.body;
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Update or create network control status
      await storage.updateNetworkControlStatus(device.id, {
        restrictionLevel,
        wifiEnabled,
        mobileDataEnabled,
        capabilities,
        lastUpdated: new Date(),
        enforcementSuccess: true
      });
      
      console.log(`[NETWORK] Status updated for device ${imei}: WiFi=${wifiEnabled}, Data=${mobileDataEnabled}, Level=${restrictionLevel}`);
      
      res.json({ success: true, message: "Network status updated successfully" });
    } catch (error) {
      console.error("Error updating network status:", error);
      res.status(500).json({ success: false, message: "Failed to update network status" });
    }
  });

  app.get('/api/companion/network/restrictions/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Get active schedules for this device with network restrictions
      const activeSchedules = await storage.getActiveSchedulesForDevice(device.id);
      
      let networkRestrictions = {
        restrictionLevel: 0,
        restrictWifi: false,
        restrictMobileData: false,
        allowEmergencyAccess: true
      };
      
      // Apply the highest restriction level from active schedules
      for (const schedule of activeSchedules) {
        if (schedule.networkRestrictionLevel > networkRestrictions.restrictionLevel) {
          networkRestrictions = {
            restrictionLevel: schedule.networkRestrictionLevel,
            restrictWifi: schedule.restrictWifi,
            restrictMobileData: schedule.restrictMobileData,
            allowEmergencyAccess: schedule.allowEmergencyAccess
          };
        }
      }
      
      console.log(`[NETWORK] Restrictions for device ${imei}:`, networkRestrictions);
      
      res.json({ 
        success: true, 
        data: networkRestrictions,
        message: activeSchedules.length > 0 ? "Network restrictions active" : "No restrictions active"
      });
    } catch (error) {
      console.error("Error fetching network restrictions:", error);
      res.status(500).json({ success: false, message: "Failed to fetch network restrictions" });
    }
  });

  app.post('/api/companion/network/enforce/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      const { restrictionLevel, success, errorMessage } = req.body;
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Update enforcement status
      await storage.updateNetworkControlStatus(device.id, {
        restrictionLevel,
        lastEnforcementAttempt: new Date(),
        enforcementSuccess: success
      });
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: success ? 'network_restriction_applied' : 'network_restriction_failed',
        description: success ? 
          `Network restriction level ${restrictionLevel} applied successfully` :
          `Network restriction enforcement failed: ${errorMessage}`,
        metadata: { restrictionLevel, success, errorMessage }
      });
      
      console.log(`[NETWORK] Enforcement ${success ? 'succeeded' : 'failed'} for device ${imei}: Level ${restrictionLevel}`);
      
      res.json({ success: true, message: "Enforcement status updated" });
    } catch (error) {
      console.error("Error updating enforcement status:", error);
      res.status(500).json({ success: false, message: "Failed to update enforcement status" });
    }
  });

  const httpServer = createServer(app);
  
  // Helper function to get timezone from country code
  const getTimezoneFromCountryCode = (phoneNumber: string): string => {
    if (!phoneNumber) return 'UTC';
    
    const countryTimezones: { [key: string]: string } = {
      '+91': 'Asia/Kolkata',      // India
      '+1': 'America/New_York',   // USA/Canada (EST as default)
      '+44': 'Europe/London',     // UK
      '+86': 'Asia/Shanghai',     // China
      '+81': 'Asia/Tokyo',        // Japan
      '+49': 'Europe/Berlin',     // Germany
      '+33': 'Europe/Paris',      // France
      '+61': 'Australia/Sydney',  // Australia
      '+65': 'Asia/Singapore',    // Singapore
      '+971': 'Asia/Dubai',       // UAE
      '+966': 'Asia/Riyadh',      // Saudi Arabia
      '+60': 'Asia/Kuala_Lumpur', // Malaysia
      '+66': 'Asia/Bangkok',      // Thailand
      '+62': 'Asia/Jakarta',      // Indonesia
      '+63': 'Asia/Manila',       // Philippines
      '+82': 'Asia/Seoul',        // South Korea
      '+852': 'Asia/Hong_Kong',   // Hong Kong
      '+886': 'Asia/Taipei',      // Taiwan
      '+234': 'Africa/Lagos',     // Nigeria
      '+27': 'Africa/Johannesburg', // South Africa
      '+20': 'Africa/Cairo',      // Egypt
      '+55': 'America/Sao_Paulo', // Brazil
      '+52': 'America/Mexico_City', // Mexico
      '+54': 'America/Argentina/Buenos_Aires', // Argentina
      '+56': 'America/Santiago',  // Chile
      '+57': 'America/Bogota',    // Colombia
      '+51': 'America/Lima',      // Peru
      '+58': 'America/Caracas',   // Venezuela
    };
    
    // Extract country code from phone number
    for (const [code, timezone] of Object.entries(countryTimezones)) {
      if (phoneNumber.startsWith(code)) {
        return timezone;
      }
    }
    
    return 'UTC'; // Default fallback
  };

  // Auto-enforcement: Check and enforce schedules every 2 minutes
  const scheduleEnforcementInterval = setInterval(async () => {
    try {
      console.log('[AUTO-ENFORCE] Running scheduled enforcement check...');
      
      // Get all users with devices and enforce their schedules
      const userIdsResult = await storage.getAllUserIds();
      
      for (const userId of userIdsResult) {
        const devices = await storage.getDevicesByParent(userId);
        let lockUpdates = 0;
        
        for (const device of devices) {
          // Auto-detect and update timezone if needed
          let deviceTimeZone = device.timezone;
          if (!deviceTimeZone || deviceTimeZone === 'UTC') {
            const detectedTimezone = getTimezoneFromCountryCode(device.phoneNumber);
            if (detectedTimezone !== 'UTC') {
              await storage.updateDeviceTimezone(device.id, detectedTimezone);
              deviceTimeZone = detectedTimezone;
              console.log(`[AUTO-ENFORCE] Updated timezone for ${device.name}: ${detectedTimezone}`);
            }
          }
          
          const schedules = await storage.getSchedulesByDevice(device.id);
          const activeSchedules = schedules.filter(schedule => schedule.isActive);
          
          // Check if any schedule is currently active using device's timezone
          const hasActiveSchedule = activeSchedules.some(schedule => {
            return isScheduleCurrentlyActive(schedule, deviceTimeZone);
          });
          
          // Update device lock status if needed
          if (hasActiveSchedule && !device.isLocked) {
            await storage.updateDeviceStatus(device.id, true);
            await storage.logActivity({
              deviceId: device.id,
              action: 'auto_schedule_lock',
              description: 'Device automatically locked by scheduled enforcement',
            });
            lockUpdates++;
            console.log(`[AUTO-ENFORCE] ✓ Locked device ${device.name} for user ${userId}`);
          } else if (!hasActiveSchedule && device.isLocked) {
            await storage.updateDeviceStatus(device.id, false);
            await storage.logActivity({
              deviceId: device.id,
              action: 'auto_schedule_unlock',
              description: 'Device automatically unlocked by scheduled enforcement',
            });
            lockUpdates++;
            console.log(`[AUTO-ENFORCE] ✓ Unlocked device ${device.name} for user ${userId}`);
          }
        }
        
        if (lockUpdates > 0) {
          console.log(`[AUTO-ENFORCE] Updated ${lockUpdates} devices for user ${userId}`);
        }
      }
    } catch (error) {
      console.error('[AUTO-ENFORCE] Error in scheduled enforcement:', error);
    }
  }, 2 * 60 * 1000); // Run every 2 minutes
  
  // Cleanup interval on server shutdown
  httpServer.on('close', () => {
    clearInterval(scheduleEnforcementInterval);
    console.log('[AUTO-ENFORCE] Cleanup completed');
  });
  
  console.log('[AUTO-ENFORCE] Automatic schedule enforcement started (every 2 minutes)');

  // Payment webhook endpoint for automatic account updates
  app.post('/api/payment/webhook', async (req, res) => {
    try {
      const { paymentId, status, amount, transactionId } = req.body;
      
      if (status !== 'SUCCESS') {
        return res.json({ success: false, message: 'Payment not successful' });
      }

      // Find the payment record by paymentId (stored in paymentId field)
      const payments = await storage.getAllUpiPayments();
      const payment = payments.find(p => p.paymentId === paymentId);
      
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      // Update payment status
      await storage.updateUpiPaymentStatus(payment.id, 'completed');

      // Process the payment based on type
      if (payment.subscriptionType && payment.subscriptionType !== 'child_upgrade') {
        // Subscription renewal
        const user = await storage.getUser(payment.userId);
        if (user) {
          const currentEndDate = new Date(user.subscriptionEndDate || new Date());
          const isExpired = currentEndDate < new Date();
          
          let newEndDate;
          if (isExpired) {
            // If expired, start from current date
            newEndDate = new Date();
          } else {
            // If active, extend from current end date
            newEndDate = new Date(currentEndDate);
          }
          
          // Add subscription duration
          newEndDate.setFullYear(newEndDate.getFullYear() + 1); // Always 1 year for yearly
          
          await storage.updateUserSubscription(payment.userId, {
            subscriptionStatus: 'active',
            subscriptionEndDate: newEndDate,
          });

          // Generate invoice for subscription renewal
          try {
            const { invoiceGenerator } = await import('./invoiceGenerator');
            const invoiceNumber = await invoiceGenerator.generateAndSendInvoice(
              `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User',
              user.email,
              parseFloat(payment.amount),
              undefined, // GST number
              'subscription'
            );

            // Store invoice in database
            if (invoiceNumber) {
              await storage.createInvoice({
                invoiceNumber,
                userId: payment.userId,
                paymentId: payment.paymentId,
                amount: payment.amount,
                paymentType: 'subscription',
                emailSent: true
              });
              console.log(`📧 Subscription invoice ${invoiceNumber} sent successfully to ${user.email}`);
            }
          } catch (invoiceError) {
            console.error('Invoice generation error:', invoiceError);
          }

          console.log(`[WEBHOOK] Subscription renewed for user ${payment.userId} until ${newEndDate.toISOString()}`);
        }
      } else if (payment.additionalChildren) {
        // Child limit upgrade
        const user = await storage.getUser(payment.userId);
        if (user) {
          await storage.updateUserChildLimit(payment.userId, payment.additionalChildren);
          
          // Generate invoice for child upgrade
          try {
            const { invoiceGenerator } = await import('./invoiceGenerator');
            const invoiceNumber = await invoiceGenerator.generateAndSendInvoice(
              `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User',
              user.email,
              parseFloat(payment.amount),
              undefined, // GST number
              'child_upgrade'
            );

            // Store invoice in database
            if (invoiceNumber) {
              await storage.createInvoice({
                invoiceNumber,
                userId: payment.userId,
                paymentId: payment.paymentId,
                amount: payment.amount,
                paymentType: 'child_upgrade',
                emailSent: true
              });
              console.log(`📧 Child upgrade invoice ${invoiceNumber} sent successfully to ${user.email}`);
            }
          } catch (invoiceError) {
            console.error('Invoice generation error:', invoiceError);
          }

          console.log(`[WEBHOOK] Child limit upgraded for user ${payment.userId} by ${payment.additionalChildren} children`);
        }
      }

      res.json({ 
        success: true, 
        message: 'Payment processed successfully',
        paymentId,
        amount
      });
      
    } catch (error) {
      console.error('Payment webhook error:', error);
      res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
  });

  // Payment status endpoint
  app.get('/api/payment/status/:paymentId', async (req, res) => {
    try {
      const { paymentId } = req.params;
      
      // Find the payment record by paymentId
      const payments = await storage.getAllUpiPayments();
      const payment = payments.find(p => p.paymentId === paymentId);
      
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      res.json({ 
        success: true,
        paymentId,
        status: payment.status,
        amount: payment.amount,
        createdAt: payment.createdAt
      });
      
    } catch (error) {
      console.error('Payment status check error:', error);
      res.status(500).json({ success: false, message: 'Failed to check payment status' });
    }
  });

  // Manual payment completion endpoint for testing
  app.post('/api/payment/complete-manual', async (req, res) => {
    try {
      const { paymentId } = req.body;
      
      if (!paymentId) {
        return res.status(400).json({ success: false, message: 'Payment ID required' });
      }
      
      // Simulate successful payment webhook
      const webhookPayload = {
        paymentId,
        status: 'SUCCESS',
        amount: 1, // Will be ignored, taken from payment record
        transactionId: `TEST_${Date.now()}`
      };
      
      // Process webhook internally
      const payments = await storage.getAllUpiPayments();
      const payment = payments.find(p => p.paymentId === paymentId);
      
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      // Update payment status
      await storage.updateUpiPaymentStatus(payment.id, 'completed');

      // Process the payment
      if (payment.subscriptionType && payment.subscriptionType !== 'child_upgrade') {
        // Subscription renewal
        const user = await storage.getUser(payment.userId);
        if (user) {
          const currentEndDate = new Date(user.subscriptionEndDate || new Date());
          const isExpired = currentEndDate < new Date();
          
          let newEndDate;
          if (isExpired) {
            newEndDate = new Date();
          } else {
            newEndDate = new Date(currentEndDate);
          }
          
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
          
          await storage.updateUserSubscription(payment.userId, {
            subscriptionStatus: 'active',
            subscriptionEndDate: newEndDate,
          });
        }
      } else if (payment.additionalChildren) {
        // Child limit upgrade
        const user = await storage.getUser(payment.userId);
        if (user) {
          await storage.updateUserChildLimit(payment.userId, payment.additionalChildren);
        }
      }
      
      res.json({ 
        success: true, 
        message: 'Payment completed manually',
        paymentId
      });
      
    } catch (error) {
      console.error('Manual payment completion error:', error);
      res.status(500).json({ success: false, message: 'Failed to complete payment manually' });
    }
  });

  // Manual invoice generation endpoint (for testing and manual completion)
  app.post('/api/generate-invoice-manual', async (req, res) => {
    try {
      const { paymentId } = req.body;
      
      if (!paymentId) {
        return res.status(400).json({ success: false, message: 'Payment ID is required' });
      }
      
      // Find the payment record
      const payments = await storage.getAllUpiPayments();
      const payment = payments.find(p => p.paymentId === paymentId);
      
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }
      
      if (payment.status !== 'completed') {
        return res.status(400).json({ success: false, message: 'Payment must be completed to generate invoice' });
      }
      
      const user = await storage.getUser(payment.userId);
      if (!user || !user.email) {
        return res.status(404).json({ success: false, message: 'User or email not found' });
      }
      
      try {
        const { invoiceGenerator } = await import('./invoiceGenerator');
        const paymentType = payment.subscriptionType === 'child_upgrade' ? 'child_upgrade' : 'subscription';
        
        const invoiceNumber = await invoiceGenerator.generateAndSendInvoice(
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User',
          user.email,
          parseFloat(payment.amount),
          undefined, // GST number
          paymentType
        );

        if (invoiceNumber) {
          // Store invoice in database
          await storage.createInvoice({
            invoiceNumber,
            userId: payment.userId,
            paymentId: payment.paymentId,
            amount: payment.amount,
            paymentType,
            emailSent: true
          });
          
          res.json({
            success: true,
            message: `Invoice ${invoiceNumber} generated and email sent successfully`,
            invoiceNumber,
            emailSent: true
          });
          
          console.log(`📧 Manual invoice ${invoiceNumber} sent successfully to ${user.email}`);
        } else {
          res.status(500).json({ success: false, message: 'Failed to generate invoice' });
        }
      } catch (invoiceError) {
        console.error('Manual invoice generation error:', invoiceError);
        res.status(500).json({ success: false, message: 'Invoice generation failed: ' + invoiceError.message });
      }
      
    } catch (error) {
      console.error('Manual invoice endpoint error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate invoice manually' });
    }
  });
  
  return httpServer;
}
