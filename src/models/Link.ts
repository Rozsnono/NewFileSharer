import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ILink extends Document {
    token: string; // Stored as a bcrypt hash
    type: 'send' | 'receive' | 'share';
    contentCollectionId: Types.ObjectId;
    availableDownloads: number | null; // null indicates infinite downloads
    availableBytesToUpload: number;
    maxBytesToUpload: number;
    availableTo: Date; // Expiration timestamp
    createdAt: Date;
}

const LinkSchema = new Schema<ILink>({
    token: { type: String, required: true, unique: true },
    type: {
        type: String,
        enum: ['send', 'receive', 'share'],
        required: true,
    },
    contentCollectionId: {
        type: Schema.Types.ObjectId,
        ref: 'ContentCollection',
        required: true,
    },
    availableDownloads: { type: Number, default: null },
    availableBytesToUpload: { type: Number, required: true },
    maxBytesToUpload: { type: Number, required: true },
    availableTo: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
});

const Link: Model<ILink> =
    mongoose.models.Link ||
    mongoose.model<ILink>('Link', LinkSchema);

export default Link;