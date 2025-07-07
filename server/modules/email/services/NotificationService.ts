/**
 * Notification Service - DevOps Event Tracking
 * Handles system notifications and monitoring events
 */

export interface NotificationEvent {
  id: string;
  type: 'verification_email_sent' | 'verification_link_clicked' | 'user_account_activated' | 'welcome_email_sent';
  severity: 'info' | 'warning' | 'error' | 'success';
  message: string;
  userId?: number;
  email?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface DevOpsNotification {
  event: NotificationEvent['type'];
  severity: NotificationEvent['severity'];
  message: string;
  userId?: number;
  email?: string;
  metadata?: Record<string, any>;
}

class NotificationService {
  private events: NotificationEvent[] = [];
  private isDevMode: boolean = process.env.NODE_ENV === 'development';

  constructor() {
    console.log('[NOTIFICATION SERVICE] Initialized for DevOps event tracking');
  }

  /**
   * Record a notification event
   */
  recordEvent(notification: DevOpsNotification): NotificationEvent {
    const event: NotificationEvent = {
      id: `notify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: notification.event,
      severity: notification.severity,
      message: notification.message,
      userId: notification.userId,
      email: notification.email,
      metadata: notification.metadata,
      timestamp: new Date()
    };

    this.events.push(event);

    // Log to console for development monitoring
    console.log(`[DEVOPS EVENT] ${event.type.toUpperCase()}:`, {
      id: event.id,
      severity: event.severity,
      message: event.message,
      userId: event.userId,
      email: event.email,
      timestamp: event.timestamp
    });

    // In development, also show flyout-style notification
    if (this.isDevMode) {
      this.showDevFlyout(event);
    }

    return event;
  }

  /**
   * Show development flyout notification
   */
  private showDevFlyout(event: NotificationEvent): void {
    const emoji = this.getSeverityEmoji(event.severity);
    const formattedMessage = `${emoji} [DEVOPS] ${event.type}: ${event.message}`;
    
    // Console styling for better visibility in development
    const style = this.getSeverityStyle(event.severity);
    console.log(`%c${formattedMessage}`, style);
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: NotificationEvent['severity']): string {
    switch (severity) {
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '📋';
    }
  }

  /**
   * Get console styling for severity
   */
  private getSeverityStyle(severity: NotificationEvent['severity']): string {
    switch (severity) {
      case 'success': return 'color: #059669; font-weight: bold;';
      case 'info': return 'color: #2563eb; font-weight: bold;';
      case 'warning': return 'color: #d97706; font-weight: bold;';
      case 'error': return 'color: #dc2626; font-weight: bold;';
      default: return 'color: #374151; font-weight: bold;';
    }
  }

  /**
   * Get all recorded events
   */
  getEvents(): NotificationEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: NotificationEvent['type']): NotificationEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get events by user
   */
  getEventsByUser(userId: number): NotificationEvent[] {
    return this.events.filter(event => event.userId === userId);
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents(): void {
    this.events = [];
    console.log('[NOTIFICATION SERVICE] Event history cleared');
  }

  /**
   * Get event statistics
   */
  getStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    this.events.forEach(event => {
      stats[event.type] = (stats[event.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Email verification sent notification
   */
  emailVerificationSent(userId: number, email: string): NotificationEvent {
    return this.recordEvent({
      event: 'verification_email_sent',
      severity: 'info',
      message: `Email verification sent to ${email}`,
      userId,
      email,
      metadata: { action: 'registration_flow' }
    });
  }

  /**
   * Verification link clicked notification
   */
  verificationLinkClicked(userId: number, email: string, token: string): NotificationEvent {
    return this.recordEvent({
      event: 'verification_link_clicked',
      severity: 'info',
      message: `Verification link clicked for ${email}`,
      userId,
      email,
      metadata: { token: token.substring(0, 8) + '...' } // Partial token for security
    });
  }

  /**
   * User account activated notification
   */
  userAccountActivated(userId: number, email: string): NotificationEvent {
    return this.recordEvent({
      event: 'user_account_activated',
      severity: 'success',
      message: `User account activated: ${email}`,
      userId,
      email,
      metadata: { action: 'email_verification_complete' }
    });
  }

  /**
   * Welcome email sent notification
   */
  welcomeEmailSent(userId: number, email: string): NotificationEvent {
    return this.recordEvent({
      event: 'welcome_email_sent',
      severity: 'success',
      message: `Welcome email sent to ${email}`,
      userId,
      email,
      metadata: { action: 'onboarding_flow' }
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();