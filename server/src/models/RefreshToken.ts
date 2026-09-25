import { Schema, model } from 'mongoose';

/** One document per refresh-token session. Rotated on every refresh. */
const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    /** All tokens rotated from the same login share a family for reuse detection. */
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model('RefreshToken', refreshTokenSchema);
