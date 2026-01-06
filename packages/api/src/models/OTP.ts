import mongoose, { Schema, Document } from 'mongoose';

export interface IOTPDocument extends Document {
  email: string;
  otp: string;
  createdAt: Date;
  expiresAt: Date;
}

const OTPSchema = new Schema<IOTPDocument>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
    length: 6,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index - automatically delete after expiry
  },
});

// Indexes
OTPSchema.index({ email: 1, otp: 1 });
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static methods
OTPSchema.statics.generateOTP = function() {
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

OTPSchema.statics.createOTP = async function(email: string) {
  const otp = this.generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete any existing OTPs for this email
  await this.deleteMany({ email });

  // Create new OTP
  return this.create({
    email,
    otp,
    expiresAt,
  });
};

OTPSchema.statics.verifyOTP = async function(email: string, otp: string) {
  const otpDoc = await this.findOne({
    email,
    otp,
    expiresAt: { $gt: new Date() }, // Not expired
  });

  if (!otpDoc) {
    return false;
  }

  // Delete OTP after successful verification (one-time use)
  await this.deleteOne({ _id: otpDoc._id });

  return true;
};

export const OTP = mongoose.model<IOTPDocument>('OTP', OTPSchema);
