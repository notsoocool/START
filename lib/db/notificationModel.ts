import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
	senderID: string;
	senderName: string;
	recipientID: string | null; // null means sent to all users
	recipientName: string | null;
	subject: string;
	message: string;
	readBy: string[]; // Array of user IDs who have read this notification
	readAt: { [key: string]: Date }; // Track when each user read the notification
	createdAt: Date;
	isFromUser: boolean; // true if from regular user, false if from Root
	isErrorReport: boolean; // true if this is an error report
	isResolved: boolean; // true if error has been resolved
	resolutionMessage?: string; // Message sent back to user when error is resolved
	resolvedAt?: Date; // When the error was resolved
	shouldDeleteAfterRead: boolean; // true if notification should be deleted after being read
	deleteAfterHours: number; // Number of hours after reading before deletion (default 24)
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
	readBy: {
		type: [String],
		default: [], // Array of user IDs who have read this notification
	},
	readAt: {
		type: Map,
		of: Date,
		default: {}, // Track when each user read the notification
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	isFromUser: {
		type: Boolean,
		default: false, // false means from Root, true means from regular user
	},
	isErrorReport: {
		type: Boolean,
		default: false,
	},
	isResolved: {
		type: Boolean,
		default: false,
	},
	resolutionMessage: {
		type: String,
	},
	resolvedAt: {
		type: Date,
	},
	shouldDeleteAfterRead: {
		type: Boolean,
		default: false,
	},
	deleteAfterHours: {
		type: Number,
		default: 24,
	},
});

// Index for efficient querying of notifications that need to be deleted
notificationSchema.index({ readAt: 1, shouldDeleteAfterRead: 1 });

// Check if the model already exists to avoid overwriting
const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;
