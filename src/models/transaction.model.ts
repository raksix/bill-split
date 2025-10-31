import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  billId: mongoose.Types.ObjectId;
  fromUser: mongoose.Types.ObjectId;
  toUser: mongoose.Types.ObjectId;
  amount: number;
  isPaid: boolean;
  paidAt?: Date;
  type?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    billId: {
      type: Schema.Types.ObjectId,
      ref: 'Bill',
      required: true,
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    type: {
      type: String,
      default: 'debt',
    },
  },
  {
    timestamps: true,
  }
);

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
