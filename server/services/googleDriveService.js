const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// In-memory cache for folder path -> folderId to minimize Drive API round trips
const folderCache = new Map();

/**
 * Check if Google Drive credentials are fully configured in the environment
 */
const isGoogleDriveConfigured = () => {
  const hasOAuth = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );

  const hasServiceAccount = Boolean(
    (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  );

  return hasOAuth || hasServiceAccount;
};

/**
 * Obtain an authenticated Google Drive API v3 client
 */
const getDriveClient = () => {
  if (!isGoogleDriveConfigured()) {
    throw new Error('Google Drive credentials are not configured in the server environment.');
  }

  // 1. OAuth2 Refresh Token Strategy (Recommended for dedicated GENFREX storage account)
  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  ) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // 2. Service Account Strategy
  let auth;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    let keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH);
    if (!fs.existsSync(keyPath)) {
      const altPath = path.resolve(__dirname, '..', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH);
      if (fs.existsSync(altPath)) keyPath = altPath;
    }
    auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/drive']
    });
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive']
    });
  } else {
    // Formatted private key with replaced escaped newlines
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/drive']
    );
  }

  return google.drive({ version: 'v3', auth });
};

/**
 * Retrieve or dynamically create a folder under a parent in Google Drive
 */
const findOrCreateFolder = async (folderName, parentFolderId = null) => {
  const drive = getDriveClient();
  const cacheKey = `${parentFolderId || 'root'}:${folderName}`;

  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey);
  }

  try {
    let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`;
    }

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      pageSize: 1
    });

    if (response.data.files && response.data.files.length > 0) {
      const existingId = response.data.files[0].id;
      folderCache.set(cacheKey, existingId);
      return existingId;
    }

    // Folder does not exist, create it
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const created = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name'
    });

    const newFolderId = created.data.id;
    folderCache.set(cacheKey, newFolderId);
    return newFolderId;
  } catch (err) {
    const errorMsg = parseDriveError(err);
    throw new Error(`Failed to resolve or create Google Drive folder "${folderName}": ${errorMsg}`);
  }
};

/**
 * Traverse and ensure a folder path hierarchy exists in Google Drive
 * e.g. ['Clients', 'Acme Corp', 'Documents']
 * or ['HR', 'Appointment Letters']
 */
const ensureFolderPath = async (pathSegments = []) => {
  if (!isGoogleDriveConfigured()) {
    return null;
  }

  let currentParentId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null;

  // If no root folder ID was explicitly configured, create or get a 'GENFREX' root folder
  if (!currentParentId) {
    currentParentId = await findOrCreateFolder('GENFREX', null);
  }

  for (const segment of pathSegments) {
    if (!segment || !segment.trim()) continue;
    const cleanSegment = segment.trim().replace(/[\/\\?%*:|"<>]/g, '_');
    currentParentId = await findOrCreateFolder(cleanSegment, currentParentId);
  }

  return currentParentId;
};

/**
 * Upload a file to Google Drive under a specific folder path
 */
const uploadToGoogleDrive = async ({
  filePath,
  buffer,
  stream,
  fileName,
  mimeType = 'application/octet-stream',
  folderPath = []
}) => {
  const drive = getDriveClient();

  // Ensure target folder exists
  const targetFolderId = await ensureFolderPath(folderPath);

  let mediaBody;
  if (stream) {
    mediaBody = stream;
  } else if (filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File at path "${filePath}" does not exist for Google Drive upload.`);
    }
    mediaBody = fs.createReadStream(filePath);
  } else if (buffer) {
    const { Readable } = require('stream');
    mediaBody = Readable.from(buffer);
  } else {
    throw new Error('Upload to Google Drive requires either a filePath, buffer, or stream.');
  }

  const cleanFileName = (fileName || 'untitled_file').replace(/[\/\\?%*:|"<>]/g, '_');

  const fileMetadata = {
    name: cleanFileName
  };

  if (targetFolderId) {
    fileMetadata.parents = [targetFolderId];
  }

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType,
        body: mediaBody
      },
      fields: 'id, name, mimeType, size, createdTime'
    });

    return {
      driveFileId: response.data.id,
      driveFolderId: targetFolderId,
      fileName: response.data.name,
      mimeType: response.data.mimeType || mimeType,
      fileSize: parseInt(response.data.size, 10) || 0,
      createdAt: response.data.createdTime
    };
  } catch (err) {
    const errorMsg = parseDriveError(err);
    throw new Error(`Google Drive upload failed: ${errorMsg}`);
  }
};

/**
 * Retrieve a readable stream from Google Drive for secure backend piping
 */
const getFileStreamFromGoogleDrive = async (driveFileId) => {
  const drive = getDriveClient();

  try {
    const response = await drive.files.get(
      { fileId: driveFileId, alt: 'media' },
      { responseType: 'stream' }
    );
    return response.data;
  } catch (err) {
    const errorMsg = parseDriveError(err);
    const error = new Error(`Failed to stream file from Google Drive: ${errorMsg}`);
    error.status = err.status || err.code || 500;
    throw error;
  }
};

/**
 * Retrieve file metadata from Google Drive
 */
const getFileMetadataFromGoogleDrive = async (driveFileId) => {
  const drive = getDriveClient();

  try {
    const response = await drive.files.get({
      fileId: driveFileId,
      fields: 'id, name, mimeType, size, md5Checksum, createdTime, modifiedTime, trashed'
    });
    return response.data;
  } catch (err) {
    const errorMsg = parseDriveError(err);
    const error = new Error(`Failed to retrieve file metadata from Google Drive: ${errorMsg}`);
    error.status = err.status || err.code || 500;
    throw error;
  }
};

/**
 * Permanently delete a file from Google Drive
 */
const deleteFileFromGoogleDrive = async (driveFileId) => {
  if (!driveFileId) return false;
  const drive = getDriveClient();

  try {
    await drive.files.delete({ fileId: driveFileId });
    return true;
  } catch (err) {
    // If the file is already gone (404), treat as successful deletion
    if (err.status === 404 || err.code === 404) {
      console.warn(`[Google Drive] File ${driveFileId} was already deleted or not found.`);
      return true;
    }
    const errorMsg = parseDriveError(err);
    throw new Error(`Google Drive deletion failed: ${errorMsg}`);
  }
};

/**
 * Replace a file in Google Drive safely
 * Uploads the new file first, and only upon success deletes the old one
 */
const replaceFileInGoogleDrive = async (oldDriveFileId, newFileData) => {
  // 1. Upload new file
  const uploadResult = await uploadToGoogleDrive(newFileData);

  // 2. Remove old file safely
  if (oldDriveFileId) {
    try {
      await deleteFileFromGoogleDrive(oldDriveFileId);
    } catch (delErr) {
      console.warn(`[Google Drive] Old file ${oldDriveFileId} deletion warning after replacement: ${delErr.message}`);
    }
  }

  return uploadResult;
};

/**
 * Get Google Drive storage diagnostics and quota
 */
const getGoogleDriveDiagnostics = async () => {
  const configured = isGoogleDriveConfigured();
  if (!configured) {
    return {
      status: 'STANDBY',
      configured: false,
      message: 'Google Drive credentials not set in environment.',
      rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null
    };
  }

  try {
    const drive = getDriveClient();
    const about = await drive.about.get({
      fields: 'storageQuota, user'
    });

    return {
      status: 'CONNECTED',
      configured: true,
      storageQuota: about.data.storageQuota || {},
      accountUser: about.data.user?.emailAddress || 'GENFREX Dedicated Account',
      rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'GENFREX (Auto-managed)'
    };
  } catch (err) {
    return {
      status: 'ERROR',
      configured: true,
      error: parseDriveError(err),
      rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null
    };
  }
};

/**
 * Sanitize and format Google Drive API errors safely without exposing secrets
 */
const parseDriveError = (err) => {
  if (!err) return 'Unknown error';

  if (err.response?.data?.error?.message) {
    const msg = err.response.data.error.message;
    // Map common Google errors
    if (msg.includes('invalid_grant')) {
      return 'Google Drive authentication token expired or invalid grant. Please re-authenticate.';
    }
    if (msg.includes('File not found')) {
      return 'File not found in Google Drive.';
    }
    if (msg.includes('insufficientFilePermissions') || msg.includes('Permission denied')) {
      return 'Insufficient permissions to access the requested Google Drive resource.';
    }
    if (msg.includes('User rate limit exceeded') || msg.includes('Rate Limit Exceeded')) {
      return 'Google Drive API rate limit reached. Please retry in a few moments.';
    }
    return msg;
  }

  if (err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
    return 'Google Drive network connection timeout. Please check server internet connectivity.';
  }

  return err.message || 'Google Drive service communication failure';
};

module.exports = {
  isGoogleDriveConfigured,
  getDriveClient,
  findOrCreateFolder,
  ensureFolderPath,
  uploadToGoogleDrive,
  getFileStreamFromGoogleDrive,
  getFileMetadataFromGoogleDrive,
  deleteFileFromGoogleDrive,
  replaceFileInGoogleDrive,
  getGoogleDriveDiagnostics,
  parseDriveError
};
