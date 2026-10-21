import mongoose from 'mongoose';

const punchSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    selfie: { type: String, required: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // business-timezone calendar day, YYYY-MM-DD
    punchIn: { type: punchSchema, required: true },
    punchOut: { type: punchSchema, default: undefined },
    workingMinutes: { type: Number, default: 0 },
    // in_progress: punched in only; completed: >= 8h; incomplete: < 8h
    status: { type: String, enum: ['in_progress', 'completed', 'incomplete'], default: 'in_progress' },
    verification: {
      status: { type: String, enum: ['pending', 'valid', 'invalid'], default: 'pending' },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      remarks: { type: String, trim: true, maxlength: 500 },
    },
    overtimeStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
  },
  { timestamps: true }
);

// One attendance record per user per day: the DB enforces duplicate punch-in prevention.
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
