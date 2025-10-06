const semverCompare = (a, b) => {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
};

// Force update middleware
module.exports = function checkAppVersion(req, res, next) {
  // Allow health and version endpoints without checks
  const allowList = [
    '/health',
    '/api/auth/version',
    '/api/maintenance',
  ];
  if (allowList.some(path => req.path.startsWith(path))) {
    return next();
  }

  const minVersion = process.env.MIN_APP_VERSION || '1.1.0';
  const downloadUrl = process.env.APP_DOWNLOAD_URL || 'https://beastvaibhav75.github.io/Swanidhi_Download/';
  const clientVersion = req.header('x-app-version');

  // If client does not send version, treat as outdated
  if (!clientVersion || semverCompare(clientVersion, minVersion) < 0) {
    return res.status(426).json({
      message: 'A new version of Swanidhi is required. Please download the latest app to continue.',
      minVersion,
      clientVersion: clientVersion || null,
      downloadUrl,
    });
  }

  next();
};


