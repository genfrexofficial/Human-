const fs = require('fs');
const path = require('path');
const {
  isGoogleDriveConfigured,
  uploadToGoogleDrive,
  getFileStreamFromGoogleDrive,
  getFileMetadataFromGoogleDrive,
  deleteFileFromGoogleDrive,
  replaceFileInGoogleDrive,
  getGoogleDriveDiagnostics
} = require('./googleDriveService');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const {
  uploadToS3,
  getSignedDownloadUrl,
  deleteFromS3,
  isS3Configured
} = require('./s3Service');
const File = require('../models/File');

/**
 * Determine Google Drive folder path based on module, category, and entity metadata
 */
const resolveFolderPath = (options = {}) => {
  const module = (options.module || options.relatedModule || 'PROJECT').toUpperCase();
  const category = (options.category || 'DELIVERABLE').toUpperCase();

  // 1. HR Folder Hierarchy
  if (module === 'HR' || category.startsWith('HR_')) {
    if (category === 'HR_APPOINTMENT') {
      return ['HR', 'Appointment Letters'];
    }
    if (category === 'HR_OFFER' || options.isOfferLetter) {
      return ['HR', 'Offer Letters'];
    }
    if (category === 'HR_DOCUMENT' || options.candidateName || options.candidateId) {
      return ['HR', 'Candidates'];
    }
    return ['HR'];
  }

  // 2. Client Folder Hierarchy
  if (module === 'CLIENT' || options.clientName) {
    const clientFolder = options.clientName || 'General Client';
    if (options.isProject || options.projectName) {
      return ['Clients', clientFolder, 'Projects'];
    }
    return ['Clients', clientFolder, 'Documents'];
  }

  // 3. Employee Folder Hierarchy
  if (module === 'Employee' || options.EmployeeName) {
    const EmployeeFolder = options.EmployeeName || 'General Employee';
    return ['Employees', EmployeeFolder];
  }

  // 4. Project Folder Hierarchy
  if (module === 'PROJECT' || options.projectName) {
    const projectFolder = options.projectName || 'General Project';
    return ['Projects', projectFolder];
  }

  // 5. Default General Folder
  return ['General'];
};

/**
 * Primary Storage Dispatcher
 * Priority 1: Google Drive (Official GENFREX cloud storage)
 * Fallback 1: Private S3 (if Google Drive unavailable and S3 configured for confidential)
 * Fallback 2: Cloudinary (if Google Drive unavailable and media)
 * Fallback 3: Secure Local Storage (/uploads)
 */
const uploadFile = async (file, options = {}) => {
  const isConfidential = Boolean(
    options.isConfidential ||
    options.category === 'HR_APPOINTMENT' ||
    options.category === 'HR_DOCUMENT'
  );

  const folderPath = resolveFolderPath(options);
  const targetFileName = options.fileName || file.originalname || file.filename;

  // 1. GOOGLE DRIVE (Primary enterprise cloud storage)
  if (isGoogleDriveConfigured()) {
    try {
      const driveResult = await uploadToGoogleDrive({
        filePath: file.path,
        fileName: targetFileName,
        mimeType: file.mimetype || 'application/octet-stream',
        folderPath
      });

      // Cleanup local temp upload file if it exists
      try {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (unlinkErr) {
        console.warn(`[Storage] Failed to unlink temp file ${file.path}: ${unlinkErr.message}`);
      }

      return {
        storageProvider: 'GOOGLE_DRIVE',
        driveFileId: driveResult.driveFileId,
        driveFolderId: driveResult.driveFolderId,
        storageKey: driveResult.driveFileId,
        publicId: driveResult.driveFileId,
        fileUrl: '', // Served through backend streaming
        fileSize: driveResult.fileSize || file.size,
        mimeType: driveResult.mimeType || file.mimetype,
        isConfidential
      };
    } catch (driveError) {
      console.warn(`[Storage] Google Drive upload failed: ${driveError.message}. Initiating graceful fallback.`);
      // Continue to fallbacks below
    }
  }

  const isImageOrMedia = file.mimetype && (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/')
  );

  // 2. Private S3 for confidential files (Fallback)
  if (isConfidential && isS3Configured) {
    try {
      const safeBaseName = path.basename(file.originalname || file.filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `private/${(options.category || 'documents').toLowerCase()}/${Date.now()}_${safeBaseName}`;

      const s3Result = await uploadToS3({
        filePath: file.path,
        key,
        mimeType: file.mimetype,
        isConfidential: true
      });

      return {
        storageProvider: 'S3',
        storageKey: s3Result.storageKey,
        publicId: s3Result.storageKey,
        fileUrl: s3Result.fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        isConfidential: true
      };
    } catch (s3Error) {
      console.warn(`[Storage] S3 upload error: ${s3Error.message}. Falling back.`);
    }
  }

  // 3. Cloudinary for enterprise cloud storage
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: 'auto',
        folder: 'clientflow_deliverables',
        use_filename: true,
        unique_filename: true
      });

      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch (err) {
        console.warn(`[Storage] Failed to unlink temp file ${file.path}: ${err.message}`);
      }

      return {
        storageProvider: 'CLOUDINARY',
        storageKey: result.public_id,
        publicId: result.public_id,
        fileUrl: result.secure_url,
        fileSize: file.size,
        mimeType: file.mimetype,
        isConfidential: Boolean(isConfidential)
      };
    } catch (cloudinaryError) {
      console.warn(`[Storage] Cloudinary upload failed: ${cloudinaryError.message}. Falling back.`);
    }
  }

  // 4. S3 for general project files (Fallback)
  if (isS3Configured && !isImageOrMedia) {
    try {
      const safeBaseName = path.basename(file.originalname || file.filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `projects/${(options.category || 'deliverables').toLowerCase()}/${Date.now()}_${safeBaseName}`;

      const s3Result = await uploadToS3({
        filePath: file.path,
        key,
        mimeType: file.mimetype,
        isConfidential: false
      });

      return {
        storageProvider: 'S3',
        storageKey: s3Result.storageKey,
        publicId: s3Result.storageKey,
        fileUrl: s3Result.fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        isConfidential: false
      };
    } catch (err) {
      console.warn(`[Storage] S3 upload error: ${err.message}. Falling back.`);
    }
  }

  // 5. Default Local Storage
  return {
    storageProvider: 'LOCAL',
    storageKey: file.filename,
    publicId: file.filename,
    fileUrl: `/uploads/${file.filename}`,
    fileSize: file.size,
    mimeType: file.mimetype,
    isConfidential
  };
};

/**
 * Generate authenticated accessible URL for preview or download
 */
const getAccessibleDownloadUrl = async (fileRecord) => {
  if (!fileRecord) return null;

  if (fileRecord.storageProvider === 'EXTERNAL_LINK' || fileRecord.isLink || fileRecord.linkUrl) {
    return fileRecord.linkUrl || fileRecord.fileUrl;
  }

  if (fileRecord.storageProvider === 'GOOGLE_DRIVE') {
    return `/api/files/${fileRecord._id}/download`;
  }

  if (fileRecord.storageProvider === 'S3' && fileRecord.storageKey && isS3Configured) {
    try {
      return await getSignedDownloadUrl(fileRecord.storageKey, 900); // 15 mins
    } catch (err) {
      console.warn(`[Storage] Presigned URL generation failed: ${err.message}`);
    }
  }

  return fileRecord.fileUrl || `/api/files/${fileRecord._id}/download`;
};

/**
 * Handle file deletion across all storage providers
 */
const deleteFile = async (fileRecord) => {
  if (!fileRecord) return;

  const provider = fileRecord.storageProvider;
  const key = fileRecord.driveFileId || fileRecord.storageKey || fileRecord.publicId;

  if (provider === 'GOOGLE_DRIVE' && (fileRecord.driveFileId || fileRecord.storageKey)) {
    await deleteFileFromGoogleDrive(fileRecord.driveFileId || fileRecord.storageKey);
  } else if (provider === 'S3' && key) {
    await deleteFromS3(key);
  } else if (provider === 'CLOUDINARY' && key) {
    if (isCloudinaryConfigured) {
      try {
        await cloudinary.uploader.destroy(key);
      } catch (err) {
        console.warn(`[Storage] Cloudinary delete failed: ${err.message}`);
      }
    }
  }

  // If local file exists, remove from disk
  const localFileName = fileRecord.storageKey || (fileRecord.fileUrl && fileRecord.fileUrl.startsWith('/uploads/') ? fileRecord.fileUrl.replace('/uploads/', '') : null);
  if (localFileName) {
    const localPath = path.join(__dirname, '../uploads', localFileName);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (err) {
        console.warn(`[Storage] Failed to delete local file ${localPath}: ${err.message}`);
      }
    }
  }
};

/**
 * Replace a file across storage providers safely
 */
const replaceFileStorage = async (fileRecord, newFile, options = {}) => {
  if (!fileRecord) throw new Error('File record is required for replacement.');

  const targetFileName = options.fileName || newFile.originalname || newFile.filename;
  const folderPath = resolveFolderPath({
    module: fileRecord.module,
    category: fileRecord.category,
    ...options
  });

  // 1. Google Drive replacement
  if (fileRecord.storageProvider === 'GOOGLE_DRIVE' && isGoogleDriveConfigured()) {
    const driveResult = await replaceFileInGoogleDrive(fileRecord.driveFileId, {
      filePath: newFile.path,
      fileName: targetFileName,
      mimeType: newFile.mimetype || 'application/octet-stream',
      folderPath
    });

    try {
      if (newFile.path && fs.existsSync(newFile.path)) {
        fs.unlinkSync(newFile.path);
      }
    } catch (e) {
      // Ignored
    }

    return {
      storageProvider: 'GOOGLE_DRIVE',
      driveFileId: driveResult.driveFileId,
      driveFolderId: driveResult.driveFolderId,
      storageKey: driveResult.driveFileId,
      fileSize: driveResult.fileSize || newFile.size,
      mimeType: driveResult.mimeType || newFile.mimetype
    };
  }

  // Standard upload new and delete old
  const newStorage = await uploadFile(newFile, {
    ...options,
    category: fileRecord.category,
    module: fileRecord.module
  });

  await deleteFile(fileRecord);
  return newStorage;
};

/**
 * Get comprehensive storage metrics for Admin Dashboard
 */
const getStorageDiagnostics = async () => {
  const totalFiles = await File.countDocuments({ status: { $ne: 'DELETED' } });

  const aggregateStats = await File.aggregate([
    { $match: { status: { $ne: 'DELETED' } } },
    {
      $group: {
        _id: '$storageProvider',
        count: { $sum: 1 },
        totalBytes: { $sum: '$fileSize' }
      }
    }
  ]);

  const moduleStats = await File.aggregate([
    { $match: { status: { $ne: 'DELETED' } } },
    {
      $group: {
        _id: '$module',
        count: { $sum: 1 },
        totalBytes: { $sum: '$fileSize' }
      }
    }
  ]);

  const categoryStats = await File.aggregate([
    { $match: { status: { $ne: 'DELETED' } } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalBytes: { $sum: '$fileSize' }
      }
    }
  ]);

  const confidentialCount = await File.countDocuments({
    isConfidential: true,
    status: { $ne: 'DELETED' }
  });

  let totalBytesAll = 0;
  const isGoogleDrive = isGoogleDriveConfigured();

  const providerBreakdown = {
    GOOGLE_DRIVE: { count: 0, bytes: 0, status: isGoogleDrive ? 'CONNECTED' : 'STANDBY' },
    S3: { count: 0, bytes: 0, status: isS3Configured ? 'CONNECTED' : 'STANDBY' },
    CLOUDINARY: { count: 0, bytes: 0, status: isCloudinaryConfigured ? 'CONNECTED' : 'STANDBY' },
    LOCAL: { count: 0, bytes: 0, status: 'ACTIVE' }
  };

  aggregateStats.forEach((stat) => {
    const prov = stat._id || 'LOCAL';
    if (providerBreakdown[prov]) {
      providerBreakdown[prov].count = stat.count;
      providerBreakdown[prov].bytes = stat.totalBytes;
    }
    totalBytesAll += stat.totalBytes;
  });

  // Fetch live Google Drive diagnostic status
  let googleDriveDetails = null;
  try {
    googleDriveDetails = await getGoogleDriveDiagnostics();
  } catch (err) {
    googleDriveDetails = {
      status: 'ERROR',
      error: err.message
    };
  }

  return {
    totalFiles,
    totalBytes: totalBytesAll,
    confidentialCount,
    providers: providerBreakdown,
    modules: moduleStats,
    categories: categoryStats,
    googleDrive: googleDriveDetails,
    isGoogleDriveConfigured: isGoogleDrive,
    isCloudinaryConfigured,
    isS3Configured
  };
};

module.exports = {
  uploadFile,
  getAccessibleDownloadUrl,
  deleteFile,
  replaceFileStorage,
  getStorageDiagnostics,
  resolveFolderPath,
  getFileStreamFromGoogleDrive
};
