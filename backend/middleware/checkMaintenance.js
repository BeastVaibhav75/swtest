const jwt = require('jsonwebtoken');
const AppConfig = require('../models/AppConfig');

// Checks maintenance mode and blocks non-admin users when enabled.
module.exports = async function checkMaintenance(req, res, next) {
  try {
    // Allow these paths regardless
    const allowedPrefixes = ['/health', '/', '/api/maintenance', '/api/auth'];
    if (allowedPrefixes.some((p) => req.path === p || req.path.startsWith(p))) {
      return next();
    }

    const doc = await AppConfig.findOne({ key: 'maintenance' });
    const maintenanceOn = Boolean(doc?.value?.enabled);
    if (!maintenanceOn) return next();

    // If maintenance is ON, allow admins to proceed; block others
    let role = null;
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        role = decoded?.role || null;
      } catch (e) {
        // invalid token; treat as non-admin
      }
    }

    if (role === 'admin') return next();

    return res.status(503).json({
      message: doc?.value?.message || 'The app is under maintenance.',
    });
  } catch (error) {
    return next();
  }
};


