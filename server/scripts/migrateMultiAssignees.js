const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Task = require('../models/Task');

const migrate = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clientflow';
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // 1. Tasks with assignedTo but empty or missing assignedEmployees
    const singleAssignedTasks = await Task.find({
      assignedTo: { $ne: null },
      $or: [
        { assignedEmployees: { $exists: false } },
        { assignedEmployees: { $size: 0 } }
      ]
    });

    console.log(`Found ${singleAssignedTasks.length} tasks needing assignedEmployees sync.`);

    let updatedCount = 0;
    for (const task of singleAssignedTasks) {
      task.assignedEmployees = [task.assignedTo];
      await task.save();
      updatedCount++;
    }

    console.log(`Successfully migrated ${updatedCount} tasks to multi-assignee array!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();

