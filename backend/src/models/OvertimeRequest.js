import mongoose from 'mongoose';

const overtimeSchema = new mongoose.Schema(
  {
    attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    requestedHours: { type: Number, required: true, min: 0.5, max: 12 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewRemarks: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export const OvertimeRequest = mongoose.model('OvertimeRequest', overtimeSchema);
