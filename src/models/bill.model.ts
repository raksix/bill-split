import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBillItem {
  urun_adi: string;
  fiyat: number;
  isPersonal?: boolean;
}

export interface IBill extends Document {
  uploadedBy: mongoose.Types.ObjectId;
  market_adi: string;
  tarih: string;
  urunler: IBillItem[];
  toplam_tutar: number;
  participants: mongoose.Types.ObjectId[];
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BillItemSchema = new Schema({
  urun_adi: {
    type: String,
    required: true,
  },
  fiyat: {
    type: Number,
    required: true,
  },
  isPersonal: {
    type: Boolean,
    default: false,
  },
});

const BillSchema: Schema<IBill> = new Schema(
  {
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    market_adi: {
      type: String,
      default: '',
    },
    tarih: {
      type: String,
      required: true,
    },
    urunler: [BillItemSchema],
    toplam_tutar: {
      type: Number,
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    imageUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Bill: Model<IBill> = mongoose.models.Bill || mongoose.model<IBill>('Bill', BillSchema);

export default Bill;
