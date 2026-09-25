export const QueueStatus = {
  WAITING: "WAITING",
  CALLED: "CALLED",
  SKIPPED: "SKIPPED",
  DONE: "DONE",
} as const;

export type QueueStatus = (typeof QueueStatus)[keyof typeof QueueStatus];

export const AdminRole = {
  STAFF: "STAFF",
  SUPERADMIN: "SUPERADMIN",
} as const;

export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

export const NotificationType = {
  ISSUED: "ISSUED",
  ALMOST_TURN: "ALMOST_TURN",
  CALLED: "CALLED",
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationStatus = {
  SENT: "SENT",
  FAILED: "FAILED",
} as const;

export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];
