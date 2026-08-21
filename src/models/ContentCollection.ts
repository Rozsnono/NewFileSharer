import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContentCollection extends Document {
    name?: string;
    createdAt: Date;
}

const ContentCollectionSchema = new Schema<IContentCollection>({
    name: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
});

const ContentCollection: Model<IContentCollection> =
    mongoose.models.ContentCollection ||
    mongoose.model<IContentCollection>('ContentCollection', ContentCollectionSchema);

export default ContentCollection;