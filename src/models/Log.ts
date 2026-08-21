import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILog extends Document {
    level: 'info' | 'warning' | 'error';
    message: string;
    details?: Record<string, any>;
    createdAt: Date;
}

const LogSchema = new Schema<ILog>({
    level: {
        type: String,
        enum: ['info', 'warning', 'error'],
        required: true,
    },
    message: { type: String, required: true },
    details: { type: Schema.Types.Mixed, required: false },
    createdAt: { type: Date, default: Date.now },
});

const Log: Model<ILog> =
    mongoose.models.Log ||
    mongoose.model<ILog>('Log', LogSchema);

export default Log;