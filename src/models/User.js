import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import validator from 'validator';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      // validator.isEmail replaces a regex that only allowed 2-3 character
      // endings and so rejected valid addresses such as user@example.info
      validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false // Don't return password in queries by default
    },
    ideotype: {
      profile: String,
      scores: {
        visual: Number,
        auditory: Number,
        linguistic: Number
      },
      dominantChannel: String,
      secondaryChannel: String,
      archetype: String,
      description: String,
      recommendations: [String],
      completedAt: Date
    },
    learningPreferences: {
      pace: {
        type: String,
        enum: ['slow', 'normal', 'fast'],
        default: 'normal'
      },
      style: {
        type: String,
        enum: ['visual', 'auditory', 'linguistic', 'mixed'],
        default: 'mixed'
      },
      difficultyLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
      }
    },
    activeSubjects: [
      {
        name: String,
        topic: String,
        startedAt: { type: Date, default: Date.now },
        progress: { type: Number, default: 0 }
      }
    ],
    totalSessionsCompleted: {
      type: Number,
      default: 0
    },
    totalMinutesPracticed: {
      type: Number,
      default: 0
    },
    lastActivityDate: Date,
    profileImageUrl: String,
    isActive: {
      type: Boolean,
      default: true
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    metadata: {
      device: String,
      os: String,
      lastIP: String
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcryptjs.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to get user without sensitive fields
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
