const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const File = require('../models/File');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const {
  uploadFile,
  getAccessibleDownloadUrl,
  deleteFile: removeFileStorage,
  replaceFileStorage,
  getStorageDiagnostics,
  getFileStreamFromGoogleDrive
} = require('../services/storageService');
const { logActivity } = require('../services/activityService');
const { sendNotification } = require('../services/notificationService');
const { cloudinary } = require('../config/cloudinary');

/**
 * Log a storage audit event safely without secrets
 */
const recordStorageAudit = async ({
  performedBy,
  performedByRole,
  fileId,
  fileName,
  relatedModule = 'GENERAL',
  relatedEntityId = null,
  action,
  metadata = {}
}) => {
  try {
    await AuditLog.create({
      performedBy,
      performedByRole,
      action,
      fileId,
      fileName,
      relatedModule,
      relatedEntityId,
      metadata: {
        ...metadata,
        timestamp: new Date()
      }
    });
  } catch (err) {
    console.warn(`[AuditLog] Storage audit log error: ${err.message}`);
  }
};

// @desc    Get all files for a project
// @route   GET /api/files/project/:projectId
// @access  Private
const getProjectFiles = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { category, taskId } = req.query;

    if (!projectId || projectId === 'undefined' || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(200).json({
        success: true,
        count: 0,
        files: []
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    if (req.user.role === 'CLIENT' && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view files for this project.'
      });
    }

    if (req.user.role === 'Employee') {
      const isAssigned = project.assignedEmployees && project.assignedEmployees.some(
        (w) => w.toString() === req.user._id.toString()
      );
      const hasTask = await Task.exists({ project: project._id, assignedTo: req.user._id });
      if (!isAssigned && !hasTask) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view files for this project.'
        });
      }
    }

    let query = { project: projectId, status: { $ne: 'DELETED' } };
    if (category) {
      query.category = category;
    }
    if (taskId) {
      query.task = taskId;
    }

    // Confidential files are hidden from non-admin/non-HR
    if (req.user.role !== 'ADMIN' && req.user.role !== 'HR') {
      query.isConfidential = { $ne: true };
    }

    const files = await File.find(query)
      .populate('uploadedBy', 'name email avatar role title')
      .populate('reviewedBy', 'name email')
      .populate('task', 'title status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: files.length,
      files
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload project file / deliverable
// @route   POST /api/files/upload
// @access  Private (Admin, Employee, Client, HR)
const uploadProjectFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please choose a file to upload.'
      });
    }

    const { projectId, category, fileName, taskId, isConfidential, module: targetModule } = req.body;

    if (!projectId && !targetModule) {
      return res.status(400).json({
        success: false,
        message: 'Project ID or Module is required.'
      });
    }

    let project = null;
    let clientName = '';
    let projectName = '';

    if (projectId) {
      project = await Project.findById(projectId).populate('client', 'name email');
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found.'
        });
      }

      // Role validation
      if (req.user.role === 'CLIENT' && project.client?._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to upload files to this project.'
        });
      }

      if (req.user.role === 'Employee') {
        const isAssigned = project.assignedEmployees && project.assignedEmployees.some(
          (w) => w.toString() === req.user._id.toString()
        );
        const hasTask = await Task.exists({ project: project._id, assignedTo: req.user._id });
        if (!isAssigned && !hasTask) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized to upload files to this project.'
          });
        }
      }

      projectName = project.name || 'Project';
      clientName = project.client?.name || 'Client';
    }

    const shouldBeConfidential = Boolean(
      isConfidential === 'true' ||
      isConfidential === true ||
      category === 'HR_APPOINTMENT' ||
      category === 'HR_DOCUMENT'
    );

    const determinedModule = targetModule || (project ? 'PROJECT' : 'GENERAL');
    const isDeliverable = category === 'DELIVERABLE';
    const cleanFileName = fileName ? fileName.trim() : req.file.originalname;

    // Process upload via Google Drive (or graceful fallback)
    const stored = await uploadFile(req.file, {
      category: category || 'DELIVERABLE',
      module: determinedModule,
      isConfidential: shouldBeConfidential,
      projectName,
      clientName,
      fileName: cleanFileName
    });

    const fileDoc = await File.create({
      project: project ? project._id : null,
      task: taskId || null,
      client: project?.client?._id || project?.client || null,
      uploadedBy: req.user._id,
      uploadedByRole: req.user.role,
      fileName: cleanFileName,
      originalFileName: req.file.originalname,
      fileUrl: stored.fileUrl || `/api/files/download`,
      publicId: stored.publicId || '',
      storageProvider: stored.storageProvider || 'GOOGLE_DRIVE',
      storageKey: stored.storageKey || stored.publicId || '',
      driveFileId: stored.driveFileId || '',
      driveFolderId: stored.driveFolderId || '',
      mimeType: stored.mimeType || req.file.mimetype,
      fileType: stored.mimeType || req.file.mimetype,
      fileSize: stored.fileSize || req.file.size,
      module: determinedModule,
      relatedModule: determinedModule,
      relatedEntityId: project ? project._id : req.user._id,
      category: category || 'DELIVERABLE',
      isDeliverable,
      isConfidential: shouldBeConfidential,
      status: 'ACTIVE',
      approvalStatus: isDeliverable ? 'PENDING_REVIEW' : 'APPROVED'
    });

    // Set permanent URL referencing backend streaming endpoint for local/drive, or retain CDN url for Cloudinary
    if (fileDoc.storageProvider !== 'CLOUDINARY') {
      fileDoc.fileUrl = `/api/files/${fileDoc._id}/download`;
      await fileDoc.save();
    }

    // Create Audit Log
    await recordStorageAudit({
      performedBy: req.user._id,
      performedByRole: req.user.role,
      fileId: fileDoc._id,
      fileName: fileDoc.fileName,
      relatedModule: determinedModule,
      relatedEntityId: fileDoc.project || fileDoc._id,
      action: 'FILE_UPLOAD',
      metadata: {
        storageProvider: fileDoc.storageProvider,
        fileSize: fileDoc.fileSize,
        mimeType: fileDoc.mimeType,
        driveFileId: fileDoc.driveFileId
      }
    });

    // Activity log for projects
    if (project) {
      await logActivity({
        projectId: project._id,
        userId: req.user._id,
        action: 'FILE_UPLOADED',
        description: `${req.user.name} uploaded ${isDeliverable ? 'deliverable' : 'file'} "${fileDoc.fileName}".`,
        entityType: 'FILE',
        entityId: fileDoc._id,
        clientVisible: !shouldBeConfidential
      });

      // Notify client if deliverable is uploaded by admin or Employee
      if (isDeliverable && req.user.role !== 'CLIENT' && project.client) {
        await sendNotification({
          userId: project.client._id || project.client,
          title: 'New Deliverable Ready for Review',
          message: `${req.user.name} uploaded deliverable "${fileDoc.fileName}" for project "${project.name}".`,
          type: 'DELIVERABLE_UPLOADED',
          entityId: fileDoc._id
        });
      }
    }

    const populatedFile = await File.findById(fileDoc._id)
      .populate('uploadedBy', 'name email avatar role title')
      .populate('task', 'title');

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully.',
      file: populatedFile
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload confidential HR document (Admin & HR only)
// @route   POST /api/files/upload-confidential
// @access  Private (Admin, HR only)
const uploadConfidentialHRFile = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'HR') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only HR and Administrators may upload confidential documents.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please choose a file to upload.'
      });
    }

    const { candidateId, appointmentLetterId, category, fileName } = req.body;
    const cleanFileName = fileName ? fileName.trim() : req.file.originalname;

    const stored = await uploadFile(req.file, {
      category: category || 'HR_DOCUMENT',
      module: 'HR',
      isConfidential: true,
      fileName: cleanFileName,
      candidateId,
      appointmentLetterId
    });

    const fileDoc = await File.create({
      candidate: candidateId || null,
      appointmentLetter: appointmentLetterId || null,
      uploadedBy: req.user._id,
      uploadedByRole: req.user.role,
      fileName: cleanFileName,
      originalFileName: req.file.originalname,
      fileUrl: stored.fileUrl || `/api/files/download`,
      publicId: stored.publicId || '',
      storageProvider: stored.storageProvider || 'GOOGLE_DRIVE',
      storageKey: stored.storageKey || '',
      driveFileId: stored.driveFileId || '',
      driveFolderId: stored.driveFolderId || '',
      mimeType: stored.mimeType || req.file.mimetype,
      fileType: stored.mimeType || req.file.mimetype,
      fileSize: stored.fileSize || req.file.size,
      module: 'HR',
      relatedModule: 'HR',
      relatedEntityId: appointmentLetterId || candidateId || null,
      category: category || 'HR_DOCUMENT',
      isDeliverable: false,
      isConfidential: true,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED'
    });

    if (fileDoc.storageProvider !== 'CLOUDINARY') {
      fileDoc.fileUrl = `/api/files/${fileDoc._id}/download`;
      await fileDoc.save();
    }

    // Audit log
    await recordStorageAudit({
      performedBy: req.user._id,
      performedByRole: req.user.role,
      fileId: fileDoc._id,
      fileName: fileDoc.fileName,
      relatedModule: 'HR',
      relatedEntityId: fileDoc.appointmentLetter || fileDoc.candidate || fileDoc._id,
      action: 'FILE_UPLOAD',
      metadata: {
        isConfidential: true,
        storageProvider: fileDoc.storageProvider,
        driveFileId: fileDoc.driveFileId
      }
    });

    res.status(201).json({
      success: true,
      message: 'Confidential document uploaded securely.',
      file: fileDoc
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Replace an existing file with a new version
// @route   PUT /api/files/:id/replace
// @access  Private (Admin or Uploader)
const replaceFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file || file.status === 'DELETED') {
      return res.status(404).json({
        success: false,
        message: 'File record not found.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please choose a replacement file to upload.'
      });
    }

    const isUploader = file.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';
    const isAuthorizedHR = req.user.role === 'HR' && file.module === 'HR';

    if (!isUploader && !isAdmin && !isAuthorizedHR) {
      await recordStorageAudit({
        performedBy: req.user._id,
        performedByRole: req.user.role,
        fileId: file._id,
        fileName: file.fileName,
        relatedModule: file.module,
        action: 'FILE_ACCESS_DENIED',
        metadata: { attempt: 'REPLACE_UNAUTHORIZED' }
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to replace this file.'
      });
    }

    const newTargetName = req.body.fileName ? req.body.fileName.trim() : req.file.originalname;

    // Perform atomic replacement (upload new -> delete old on success)
    const replaced = await replaceFileStorage(file, req.file, {
      fileName: newTargetName,
      module: file.module,
      category: file.category
    });

    const previousDriveId = file.driveFileId;
    file.fileName = newTargetName;
    file.originalFileName = req.file.originalname;
    file.fileSize = replaced.fileSize || req.file.size;
    file.mimeType = replaced.mimeType || req.file.mimetype;
    file.fileType = replaced.mimeType || req.file.mimetype;
    if (replaced.driveFileId) file.driveFileId = replaced.driveFileId;
    if (replaced.driveFolderId) file.driveFolderId = replaced.driveFolderId;
    if (replaced.storageKey) file.storageKey = replaced.storageKey;
    if (replaced.storageProvider) file.storageProvider = replaced.storageProvider;
    await file.save();

    await recordStorageAudit({
      performedBy: req.user._id,
      performedByRole: req.user.role,
      fileId: file._id,
      fileName: file.fileName,
      relatedModule: file.module,
      relatedEntityId: file.relatedEntityId || file._id,
      action: 'FILE_REPLACE',
      metadata: {
        previousDriveId,
        newDriveId: file.driveFileId,
        storageProvider: file.storageProvider,
        fileSize: file.fileSize
      }
    });

    res.status(200).json({
      success: true,
      message: 'File replaced successfully in cloud storage.',
      file
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download or view file with strict RBAC verification and direct Drive streaming
// @route   GET /api/files/:id/download or GET /api/files/:id/view
// @access  Private (RBAC enforced)
const downloadFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id)
      .populate('project')
      .populate('task');

    if (!file || file.status === 'DELETED') {
      return res.status(404).json({
        success: false,
        message: 'File record not found.'
      });
    }

    // 1. STRICT HR CONFIDENTIALITY ENFORCEMENT
    if (
      file.isConfidential ||
      file.module === 'HR' ||
      file.category === 'HR_APPOINTMENT' ||
      file.category === 'HR_DOCUMENT'
    ) {
      if (req.user.role !== 'ADMIN' && req.user.role !== 'HR') {
        await recordStorageAudit({
          performedBy: req.user._id,
          performedByRole: req.user.role,
          fileId: file._id,
          fileName: file.fileName,
          relatedModule: 'HR',
          action: 'FILE_ACCESS_DENIED',
          metadata: { reason: 'HR_CONFIDENTIAL_BARRIER' }
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view or download confidential HR documents.'
        });
      }
    }

    // 2. CLIENT ACCESS ENFORCEMENT
    if (req.user.role === 'CLIENT') {
      // Must not access Employee, HR, or other modules
      if (file.module === 'Employee' || file.module === 'HR') {
        await recordStorageAudit({
          performedBy: req.user._id,
          performedByRole: req.user.role,
          fileId: file._id,
          fileName: file.fileName,
          relatedModule: file.module,
          action: 'FILE_ACCESS_DENIED',
          metadata: { reason: 'CLIENT_MODULE_BARRIER' }
        });
        return res.status(403).json({
          success: false,
          message: 'Access denied. Unauthorized to view internal documents.'
        });
      }

      // If file has client ownership
      if (file.client && file.client.toString() !== req.user._id.toString()) {
        await recordStorageAudit({
          performedBy: req.user._id,
          performedByRole: req.user.role,
          fileId: file._id,
          fileName: file.fileName,
          relatedModule: file.module,
          action: 'FILE_ACCESS_DENIED',
          metadata: { reason: 'CROSS_CLIENT_BARRIER' }
        });
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this document.'
        });
      }

      // If attached to project
      if (file.project) {
        const projectClient = file.project.client ? file.project.client.toString() : '';
        if (projectClient !== req.user._id.toString()) {
          await recordStorageAudit({
            performedBy: req.user._id,
            performedByRole: req.user.role,
            fileId: file._id,
            fileName: file.fileName,
            relatedModule: file.module,
            action: 'FILE_ACCESS_DENIED',
            metadata: { reason: 'CROSS_PROJECT_CLIENT_BARRIER' }
          });
          return res.status(403).json({
            success: false,
            message: 'Unauthorized. You do not have access to files for this project.'
          });
        }

        if (file.task && file.task.clientVisible === false) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. This file belongs to an internal task.'
          });
        }
      }
    }

    // 3. Employee ACCESS ENFORCEMENT
    if (req.user.role === 'Employee') {
      if (file.module === 'HR') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Employee cannot access HR files.'
        });
      }

      if (file.module === 'Employee') {
        const isEmployeeOwner = (file.relatedEntityId && file.relatedEntityId.toString() === req.user._id.toString()) ||
          (file.uploadedBy && file.uploadedBy.toString() === req.user._id.toString());
        if (!isEmployeeOwner) {
          await recordStorageAudit({
            performedBy: req.user._id,
            performedByRole: req.user.role,
            fileId: file._id,
            fileName: file.fileName,
            relatedModule: file.module,
            action: 'FILE_ACCESS_DENIED',
            metadata: { reason: 'CROSS_Employee_BARRIER' }
          });
          return res.status(403).json({
            success: false,
            message: 'Access denied to other Employee documents.'
          });
        }
      }

      if (file.project) {
        const isAssigned = file.project.assignedEmployees && file.project.assignedEmployees.some(
          (w) => w.toString() === req.user._id.toString()
        );
        const isTaskAssigned = file.task && file.task.assignedTo && file.task.assignedTo.toString() === req.user._id.toString();
        const hasTaskInProject = await Task.exists({ project: file.project._id, assignedTo: req.user._id });

        if (!isAssigned && !isTaskAssigned && !hasTaskInProject) {
          await recordStorageAudit({
            performedBy: req.user._id,
            performedByRole: req.user.role,
            fileId: file._id,
            fileName: file.fileName,
            relatedModule: file.module,
            action: 'FILE_ACCESS_DENIED',
            metadata: { reason: 'Employee_UNASSIGNED_PROJECT' }
          });
          return res.status(403).json({
            success: false,
            message: 'Unauthorized. You are not assigned to this project or its tasks.'
          });
        }
      }
    }

    const isViewOnly = req.query.view === 'true';

    // Log authorized access in Audit Trail
    await recordStorageAudit({
      performedBy: req.user._id,
      performedByRole: req.user.role,
      fileId: file._id,
      fileName: file.fileName,
      relatedModule: file.module || 'PROJECT',
      relatedEntityId: file.relatedEntityId || file.project?._id || file._id,
      action: isViewOnly ? 'FILE_VIEW' : 'FILE_DOWNLOAD',
      metadata: {
        storageProvider: file.storageProvider,
        fileSize: file.fileSize
      }
    });

    // If client requested JSON metadata
    if (req.query.json === 'true') {
      const url = await getAccessibleDownloadUrl(file);
      return res.status(200).json({
        success: true,
        url,
        fileName: file.fileName,
        storageProvider: file.storageProvider,
        fileType: file.fileType || file.mimeType,
        fileSize: file.fileSize
      });
    }

    // 1. STREAM SECURELY FROM GOOGLE DRIVE (No public Drive links exposed)
    if (file.storageProvider === 'GOOGLE_DRIVE' && (file.driveFileId || file.storageKey)) {
      try {
        const driveFileId = file.driveFileId || file.storageKey;
        const driveStream = await getFileStreamFromGoogleDrive(driveFileId);

        const mime = file.mimeType || file.fileType || 'application/octet-stream';
        const disposition = isViewOnly ? 'inline' : 'attachment';

        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.fileName || 'file')}"`);
        if (file.fileSize) res.setHeader('Content-Length', file.fileSize);
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

        return driveStream.pipe(res);
      } catch (streamError) {
        console.error(`[Google Drive Stream Error] ${streamError.message}`);
        // Fall through to fallback check if applicable
      }
    }

    // 2. S3 Private object -> redirect to short-lived signed URL
    if (file.storageProvider === 'S3') {
      const signedUrl = await getAccessibleDownloadUrl(file);
      if (signedUrl && !signedUrl.startsWith('s3://')) {
        return res.redirect(signedUrl);
      }
    }

    // 3. Cloudinary -> redirect to secure URL
    if (file.storageProvider === 'CLOUDINARY') {
      const targetUrl = (file.fileUrl && file.fileUrl.startsWith('http'))
        ? file.fileUrl
        : cloudinary.url(file.storageKey || file.publicId, { secure: true, resource_type: 'auto' });
      return res.redirect(targetUrl);
    }

    // 4. Local disk file fallback
    const filename = file.storageKey || (file.fileUrl && file.fileUrl.startsWith('/uploads/') ? file.fileUrl.replace('/uploads/', '') : (file.fileUrl && !file.fileUrl.includes('/download') ? path.basename(file.fileUrl) : null));
    if (filename) {
      const filePath = path.join(__dirname, '../uploads', filename);

      if (fs.existsSync(filePath)) {
        if (isViewOnly) {
          return res.sendFile(filePath);
        }
        return res.download(filePath, file.fileName);
      }
    }

    return res.status(404).json({
      success: false,
      message: file.storageProvider === 'LOCAL'
        ? 'File is no longer available in server storage (it may have been purged or deleted). Please re-upload the file.'
        : 'File asset is currently unavailable in cloud storage.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project or cloud file
// @route   DELETE /api/files/:id
// @access  Private (Admin or Uploader / Authorized HR)
const deleteProjectFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file || file.status === 'DELETED') {
      return res.status(404).json({
        success: false,
        message: 'File not found.'
      });
    }

    const isUploader = file.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';
    const isAuthorizedHR = req.user.role === 'HR' && file.module === 'HR';

    if (!isUploader && !isAdmin && !isAuthorizedHR) {
      await recordStorageAudit({
        performedBy: req.user._id,
        performedByRole: req.user.role,
        fileId: file._id,
        fileName: file.fileName,
        relatedModule: file.module,
        action: 'FILE_ACCESS_DENIED',
        metadata: { attempt: 'DELETE_UNAUTHORIZED' }
      });

      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this file.'
      });
    }

    // Attempt storage deletion
    try {
      await removeFileStorage(file);
    } catch (storageErr) {
      console.warn(`[Storage] Remote deletion warning: ${storageErr.message}`);
    }

    // Mark as DELETED in MongoDB
    file.status = 'DELETED';
    await file.save();

    // Audit log
    await recordStorageAudit({
      performedBy: req.user._id,
      performedByRole: req.user.role,
      fileId: file._id,
      fileName: file.fileName,
      relatedModule: file.module || 'PROJECT',
      relatedEntityId: file.relatedEntityId || file.project || file._id,
      action: 'FILE_DELETE',
      metadata: {
        storageProvider: file.storageProvider,
        driveFileId: file.driveFileId
      }
    });

    if (file.project) {
      await logActivity({
        projectId: file.project,
        userId: req.user._id,
        action: 'FILE_DELETED',
        description: `${req.user.name} removed file "${file.fileName}".`,
        entityType: 'FILE',
        entityId: file._id,
        clientVisible: !file.isConfidential
      });
    }

    res.status(200).json({
      success: true,
      message: 'File deleted successfully from storage.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Review deliverable (Approve or Request Changes)
// @route   PUT /api/files/:id/review
// @access  Private (Client or Admin)
const reviewDeliverable = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const file = await File.findById(req.params.id);

    if (!file || file.status === 'DELETED') {
      return res.status(404).json({
        success: false,
        message: 'Deliverable not found.'
      });
    }

    const project = await Project.findById(file.project);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Associated project not found.'
      });
    }

    // Role check: client can review their project's deliverables
    if (req.user.role === 'CLIENT' && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to review this deliverable.'
      });
    }

    if (!['APPROVED', 'CHANGES_REQUESTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either APPROVED or CHANGES_REQUESTED.'
      });
    }

    if (status === 'CHANGES_REQUESTED' && (!reason || !reason.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide feedback/reason when requesting revisions.'
      });
    }

    file.approvalStatus = status;
    file.revisionNotes = reason || '';
    file.reviewedBy = req.user._id;
    file.reviewedAt = new Date();
    await file.save();

    const action = status === 'APPROVED' ? 'DELIVERABLE_APPROVED' : 'CHANGES_REQUESTED';
    const description = status === 'APPROVED'
      ? `${req.user.name} approved deliverable "${file.fileName}".`
      : `${req.user.name} requested changes on deliverable "${file.fileName}": "${reason}".`;

    await logActivity({
      projectId: project._id,
      userId: req.user._id,
      action,
      description,
      entityType: 'FILE',
      entityId: file._id,
      clientVisible: true
    });

    res.status(200).json({
      success: true,
      message: `Deliverable marked as ${status.replace('_', ' ')}.`,
      file
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get live Storage Diagnostics, Usage Metrics & Audit ledger (Admin only)
// @route   GET /api/files/storage-stats
// @access  Private (Admin only)
const getStorageStats = async (req, res, next) => {
  try {
    const diagnostics = await getStorageDiagnostics();

    // 10 most recent uploads
    const recentUploads = await File.find({ status: { $ne: 'DELETED' } })
      .populate('uploadedBy', 'name email role')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // 10 most recent deletions from Audit Log
    const recentDeletions = await AuditLog.find({ action: 'FILE_DELETE' })
      .populate('performedBy', 'name email role')
      .sort({ timestamp: -1 })
      .limit(10);

    // 10 recent storage security / access denied events
    const storageErrors = await AuditLog.find({ action: 'FILE_ACCESS_DENIED' })
      .populate('performedBy', 'name email role')
      .sort({ timestamp: -1 })
      .limit(10);

    // File type breakdown (PDF, Images, Documents, Archives, Other)
    const fileTypeAgg = await File.aggregate([
      { $match: { status: { $ne: 'DELETED' } } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: '$mimeType', regex: /pdf/i } }, then: 'PDF' },
                { case: { $regexMatch: { input: '$mimeType', regex: /image/i } }, then: 'Image' },
                { case: { $regexMatch: { input: '$mimeType', regex: /word|sheet|msword|excel|officedocument|text/i } }, then: 'Document' },
                { case: { $regexMatch: { input: '$mimeType', regex: /zip|tar|rar|7z|gzip/i } }, then: 'Archive' }
              ],
              default: 'Other'
            }
          },
          count: { $sum: 1 },
          bytes: { $sum: '$fileSize' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      diagnostics,
      recentUploads,
      recentDeletions,
      storageErrors,
      fileTypeBreakdown: fileTypeAgg
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Browse, search and filter storage files indexed in MongoDB (Admin & authorized users)
// @route   GET /api/files/browse
// @access  Private (Admin, HR, Employee, Client according to RBAC)
const browseFiles = async (req, res, next) => {
  try {
    const { search, module, fileType, uploadedBy, startDate, endDate, page = 1, limit = 20 } = req.query;

    let query = { status: { $ne: 'DELETED' } };

    // RBAC filtering
    if (req.user.role === 'CLIENT') {
      query.client = req.user._id;
      query.isConfidential = { $ne: true };
    } else if (req.user.role === 'Employee') {
      query.isConfidential = { $ne: true };
      query.module = { $ne: 'HR' };
    } else if (req.user.role === 'HR') {
      // HR can view HR and general files
    }

    // Name search
    if (search && search.trim()) {
      query.fileName = { $regex: search.trim(), $options: 'i' };
    }

    // Module filter
    if (module && module !== 'ALL') {
      query.module = module.toUpperCase();
    }

    // Uploaded by filter
    if (uploadedBy && uploadedBy !== 'ALL') {
      query.uploadedBy = uploadedBy;
    }

    // File type filter
    if (fileType && fileType !== 'ALL') {
      switch (fileType.toUpperCase()) {
        case 'PDF':
          query.mimeType = { $regex: /pdf/i };
          break;
        case 'IMAGE':
          query.mimeType = { $regex: /image/i };
          break;
        case 'DOCUMENT':
          query.mimeType = { $regex: /word|sheet|msword|excel|officedocument|text/i };
          break;
        case 'ARCHIVE':
          query.mimeType = { $regex: /zip|tar|rar|7z|gzip/i };
          break;
        default:
          break;
      }
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [total, files] = await Promise.all([
      File.countDocuments(query),
      File.find(query)
        .populate('uploadedBy', 'name email role')
        .populate('project', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      files
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjectFiles,
  uploadProjectFile,
  uploadConfidentialHRFile,
  replaceFile,
  deleteProjectFile,
  reviewDeliverable,
  downloadFile,
  getStorageStats,
  browseFiles
};
