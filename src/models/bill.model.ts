import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBillItem {
  ad?: string; // Yeni format için
  urun_adi?: string; // Eski format için backward compatibility
  fiyat: number;
  miktar?: number;
  birim?: string;
  toplam?: number;
  isPersonal?: boolean;
}

export interface IBill extends Document {
  userId?: mongoose.Types.ObjectId; // Yeni format
  uploadedBy?: mongoose.Types.ObjectId; // Eski format - backward compatibility
  market_adi: string;
  tarih: string | Date;
  urunler: IBillItem[];
  toplam_tutar: number;
  participants?: mongoose.Types.ObjectId[];
  imageUrl?: string;
  description?: string;
  isManual?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BillItemSchema = new Schema({
  ad: {
    type: String, // Yeni format
  },
  urun_adi: {
    type: String, // Eski format - backward compatibility
  },
  fiyat: {
    type: Number,
    required: true,
  },
  miktar: {
    type: Number,
    default: 1,
  },
  birim: {
    type: String,
    default: 'adet',
  },
  toplam: {
    type: Number,
  },
  isPersonal: {
    type: Boolean,
    default: false,
  },
});

const BillSchema: Schema<IBill> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    market_adi: {
      type: String,
      default: '',
    },
    tarih: {
      type: Schema.Types.Mixed, // String veya Date olabilir
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
    description: {
      type: String,
    },
    isManual: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Bill: Model<IBill> = mongoose.models.Bill || mongoose.model<IBill>('Bill', BillSchema);

export default Bill;
