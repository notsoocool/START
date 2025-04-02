import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
	senderID: string;
	senderName: string;
	recipientID: string | null; // null means sent to all users
	recipientName: string | null;
	subject: string;
	message: string;
	isRead: boolean;
	createdAt: Date;
	isFromUser: boolean; // true if from regular user, false if from Root
}

const notificationSchema: Schema = new mongoose.Schema({
	senderID: {
		type: String,
		required: true,
	},
	senderName: {
		type: String,
		required: true,
	},
	recipientID: {
		type: String,
		default: null, // null means sent to all users
	},
	recipientName: {
		type: String,
		default: null,
	},
	subject: {
		type: String,
		required: true,
	},
	message: {
		type: String,
		required: true,
	},
	isRead: {
		type: Boolean,
		default: false,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	isFromUser: {
		type: Boolean,
		default: false, // false means from Root, true means from regular user
	},
});

// Check if the model already exists to avoid overwriting
const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;
