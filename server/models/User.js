const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
      type: String,
      enum: ['ADMIN', 'Employee', 'CLIENT', 'HR'],
      default: 'CLIENT',
      required: true
    },
    title: {
      type: String,
      trim: true,
      default: ''
    },
    skills: {
      type: [String],
      default: []
    },
    companyName: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    avatar: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true
    },
    tokenVersion: {
      type: Number,
      default: 0,
      required: true
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate'
    },
    appointmentLetterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AppointmentLetter'
    },
    hiredFromCandidate: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      }
    }
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
