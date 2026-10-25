import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [60, 'Name cannot exceed 60 characters']
    },
    email: {
      type: String,
      required: [true, 'College email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (val) {
          // Must end with @mitaoe.ac.in
          return /^[a-zA-Z0-9._%+-]+@mitaoe\.ac\.in$/.test(val);
        },
        message: 'Must be a valid MIT Academy of Engineering email (@mitaoe.ac.in). Students: use your 12-digit PRN@mitaoe.ac.in'
      }
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false // Do not include in queries by default
    },
    role: {
      type: String,
      enum: ['student', 'faculty', 'admin'],
      default: 'student'
    },
    prn: {
      type: String,
      trim: true,
      validate: {
        validator: function (val) {
          if (this.role === 'student') {
            return !val || /^\d{12}$/.test(val);
          }
          return true;
        },
        message: 'Student PRN must be a valid 12-digit number'
      }
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: [
        'School of Computer Engineering',
        'Software Engineering',
        'Data Science Engineering',
        'AIML Engineering',
        'Information Technology',
        'Electronics & Telecommunication',
        'Mechanical Engineering',
        'Civil Engineering',
        'Chemical Engineering',
        'School of Design',
        'First Year Engineering',
        'Administration / Staff'
      ]
    },
    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
      validate: {
        validator: function (val) {
          return /^(\+91[\-\s]?)?[6-9]\d{9}$/.test(val);
        },
        message: 'Phone number must be a valid 10-digit Indian mobile number'
      }
    },
    vehicle: {
      hasVehicle: { type: Boolean, default: false },
      type: { type: String, enum: ['car', 'bike', 'none'], default: 'none' },
      model: { type: String, trim: true, default: '' },
      plate: { type: String, trim: true, default: '' }
    },
    rating: {
      average: { type: Number, default: 5.0, min: 1, max: 5 },
      count: { type: Number, default: 0 }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password instance method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
