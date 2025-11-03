import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProcessingQueue extends Document {
  type: 'bill_upload' | 'bill_ocr' | 'image_upload';
  status: 'pending' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  userId: mongoose.Types.ObjectId;
  data: {
    billId?: string;
    imagePath?: string;
    imageUrl?: string;
    filename?: string;
    retryCount?: number;
    errorMessage?: string;
    progressPercentage?: number;
    processingStep?: string;
    [key: string]: any;
  };
  priority: number;
  attempts: number;
  maxAttempts: number;
  processedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProcessingQueueSchema: Schema<IProcessingQueue> = new Schema(
  {
    type: {
      type: String,
      enum: ['bill_upload', 'bill_ocr', 'image_upload'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'uploading', 'uploaded', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    priority: {
      type: Number,
      default: 0, // Yüksek sayı = yüksek öncelik
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    processedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexler
ProcessingQueueSchema.index({ status: 1, priority: -1, createdAt: 1 });
ProcessingQueueSchema.index({ userId: 1, status: 1 });
ProcessingQueueSchema.index({ type: 1, status: 1 });

const ProcessingQueue: Model<IProcessingQueue> =
  mongoose.models.ProcessingQueue || 
  mongoose.model<IProcessingQueue>('ProcessingQueue', ProcessingQueueSchema);

export default ProcessingQueue;