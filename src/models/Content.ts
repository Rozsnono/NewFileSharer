import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IContent extends Document {
    contentCollectionId: Types.ObjectId;
    originalName: string;
    mimeType: string;
    size: number;
    webdavPath: string;
    createdAt: Date;
}

const ContentSchema = new Schema<IContent>({
    contentCollectionId: {
        type: Schema.Types.ObjectId,
        ref: 'ContentCollection',
        required: true,
    },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // Represented in bytes
    webdavPath: { type: String, required: true }, // Path of file on the Synology NAS
    createdAt: { type: Date, default: Date.now },
});

const Content: Model<IContent> =
    mongoose.models.Content ||
    mongoose.model<IContent>('Content', ContentSchema);

export default Content;