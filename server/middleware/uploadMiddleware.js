const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Sanitize filename utility function
const sanitizeFileName = (originalName) => {
  if (!originalName) return 'file_' + Date.now();
  // Strip path traversal and risky characters
  const baseName = path.basename(originalName);
  const ext = path.extname(baseName);
  const nameWithoutExt = path.basename(baseName, ext);
  const cleanBase = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${cleanBase}${ext.toLowerCase()}`;
};

// Setup disk storage for temporary multipart processing
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const cleanName = sanitizeFileName(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${cleanName}`);
  }
});

// Explicit list of forbidden dangerous executable extensions
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.php3', '.php4', '.phtml',
  '.cgi', '.pl', '.jsp', '.asp', '.aspx', '.vbs', '.scr', '.jar', '.msi',
  '.com', '.pif', '.pyc', '.dll', '.bin', '.reg', '.wsf', '.apk', '.iso',
  '.ps1', '.psm1', '.psd1', '.msh', '.msh1', '.msh2', '.hta', '.ws', '.cpl',
  '.msc', '.gadget', '.msix', '.appx', '.inf', '.ins', '.inx', '.isu', '.job',
  '.jse', '.ksh', '.lnk', '.mad', '.maf', '.mag', '.mam', '.maq', '.mar',
  '.mas', '.mat', '.mau', '.mav', '.maw', '.mda', '.mdb', '.mde', '.mdt',
  '.mdw', '.mdz', '.pcd', '.prf', '.prg', '.pst', '.scf', '.shb', '.shs',
  '.tmp', '.url', '.vb', '.vbe', '.ws', '.wsc', '.wsf', '.wsh'
];

// Whitelist of allowed extensions for enterprise files
const ALLOWED_EXTENSIONS = [
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf', '.odt', '.md',
  // Images
  '.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.ico', '.bmp', '.tiff',
  // Archives & Design
  '.zip', '.tar', '.gz', '.7z', '.rar', '.fig', '.psd', '.ai', '.xd', '.mp4'
];

// File filter with extension and security validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Block dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File type '${ext}' is disallowed for enterprise security reasons.`), false);
  }

  // Must match allowed extensions
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Unsupported file type '${ext}'. Please upload standard documents, images, or archives.`), false);
  }

  cb(null, true);
};

// Configurable max file size from env (defaults to 25MB)
const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024
  }
});

module.exports = upload;
module.exports.sanitizeFileName = sanitizeFileName;
