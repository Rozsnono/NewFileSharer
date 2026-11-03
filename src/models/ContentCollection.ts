import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IContentCollection extends Document {
    name?: string;
    isPublic: boolean;
    publicExpiresAt: Date | null;
    // Parent folder for the admin file manager. null = top-level folder.
    // Optional and defaulted, so existing documents stay valid without migration.
    parentId: Types.ObjectId | null;
    createdAt: Date;
}

const ContentCollectionSchema = new Schema<IContentCollection>({
    name: { type: String, required: false },
    isPublic: { type: Boolean, default: false },
    publicExpiresAt: { type: Date, default: null },
    parentId: { type: Schema.Types.ObjectId, ref: 'ContentCollection', default: null },
    createdAt: { type: Date, default: Date.now },
});

const ContentCollection: Model<IContentCollection> =
    mongoose.models.ContentCollection ||
    mongoose.model<IContentCollection>('ContentCollection', ContentCollectionSchema);

export default ContentCollection;