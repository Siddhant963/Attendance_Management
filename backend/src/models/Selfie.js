import mongoose from 'mongoose';

// Image bytes live in their own collection so attendance queries never load them.
// Documents are only ever read by _id (referenced from Attendance), so no extra index is needed.
const selfieSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['in', 'out'], required: true },
    contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Selfie = mongoose.model('Selfie', selfieSchema);
