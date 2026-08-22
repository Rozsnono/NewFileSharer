import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContentCollection extends Document {
    name?: string;
    isPublic: boolean;
    publicExpiresAt: Date | null;
    createdAt: Date;
}

const ContentCollectionSchema = new Schema<IContentCollection>({
    name: { type: String, required: false },
    isPublic: { type: Boolean, default: false },
    publicExpiresAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
});

const ContentCollection: Model<IContentCollection> =
    mongoose.models.ContentCollection ||
    mongoose.model<IContentCollection>('ContentCollection', ContentCollectionSchema);

export default ContentCollection;