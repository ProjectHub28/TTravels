import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from flask_mail import Mail, Message
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, app=None, mail: Optional[Mail] = None):
        """
        Initialize the Notification service.
        
        Args:
            app: Flask app instance
            mail: Flask-Mail instance
        """
        self.app = app
        self.mail = mail
        self.client = None
        self.databases = None
        
        # Initialize Appwrite client
        self._init_appwrite()
    
    def _init_appwrite(self):
        """Initialize Appwrite client for database operations."""
        try:
            self.client = Client()
            self.client.set_endpoint(os.getenv("APPWRITE_ENDPOINT"))
            self.client.set_project(os.getenv("APPWRITE_PROJECT_ID"))
            self.client.set_key(os.getenv("APPWRITE_API_KEY"))
            self.databases = Databases(self.client)
            logger.info("Appwrite client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Appwrite client: {e}")
    
    def send_email_notification(self, to_email: str, subject: str, 
                              template: str, data: Dict[str, Any]) -> bool:
        """
        Send email notification using Flask-Mail.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            template: Email template name
            data: Template data
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.mail:
            logger.error("Flask-Mail not initialized")
            return False
        
        try:
            msg = Message(
                subject=subject,
                recipients=[to_email],
                sender=os.getenv('MAIL_DEFAULT_SENDER', 'noreply@ttravels.com')
            )
            
            # Render template with data
            msg.html = self._render_email_template(template, data)
            
            self.mail.send(msg)
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    def _render_email_template(self, template: str, data: Dict[str, Any]) -> str:
        """
        Render email template with data.
        
        Args:
            template: Template name
            data: Template data
            
        Returns:
            Rendered HTML content
        """
        templates = {
            'booking_confirmation': self._booking_confirmation_template,
            'trip_reminder': self._trip_reminder_template,
            'booking_cancellation': self._booking_cancellation_template,
            'price_alert': self._price_alert_template,
            'welcome': self._welcome_template
        }
        
        template_func = templates.get(template, self._default_template)
        return template_func(data)
    
    def _booking_confirmation_template(self, data: Dict[str, Any]) -> str:
        """Booking confirmation email template."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Booking Confirmation - TTravels</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #4f46e5; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .booking-details {{ background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .footer {{ text-align: center; padding: 20px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Booking Confirmed!</h1>
                </div>
                <div class="content">
                    <p>Dear {data.get('customer_name', 'Customer')},</p>
                    <p>Your booking has been confirmed successfully!</p>
                    
                    <div class="booking-details">
                        <h3>Booking Details</h3>
                        <p><strong>Booking ID:</strong> {data.get('booking_id', 'N/A')}</p>
                        <p><strong>Service:</strong> {data.get('service_type', 'N/A')}</p>
                        <p><strong>Route:</strong> {data.get('route', 'N/A')}</p>
                        <p><strong>Date:</strong> {data.get('travel_date', 'N/A')}</p>
                        <p><strong>Amount:</strong> {data.get('amount', 'N/A')}</p>
                    </div>
                    
                    <p>Thank you for choosing TTravels!</p>
                </div>
                <div class="footer">
                    <p>TTravels - Your Journey, Our Priority</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _trip_reminder_template(self, data: Dict[str, Any]) -> str:
        """Trip reminder email template."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Trip Reminder - TTravels</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #10b981; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f0fdf4; }}
                .reminder-details {{ background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .footer {{ text-align: center; padding: 20px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⏰ Trip Reminder</h1>
                </div>
                <div class="content">
                    <p>Dear {data.get('customer_name', 'Customer')},</p>
                    <p>Your trip is coming up soon!</p>
                    
                    <div class="reminder-details">
                        <h3>Trip Details</h3>
                        <p><strong>Destination:</strong> {data.get('destination', 'N/A')}</p>
                        <p><strong>Departure:</strong> {data.get('departure_time', 'N/A')}</p>
                        <p><strong>Booking Reference:</strong> {data.get('booking_id', 'N/A')}</p>
                        <p><strong>Days Remaining:</strong> {data.get('days_remaining', 'N/A')}</p>
                    </div>
                    
                    <p>Have a safe and enjoyable journey!</p>
                </div>
                <div class="footer">
                    <p>TTravels - Your Journey, Our Priority</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _booking_cancellation_template(self, data: Dict[str, Any]) -> str:
        """Booking cancellation email template."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Booking Cancelled - TTravels</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #ef4444; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #fef2f2; }}
                .cancellation-details {{ background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .footer {{ text-align: center; padding: 20px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>❌ Booking Cancelled</h1>
                </div>
                <div class="content">
                    <p>Dear {data.get('customer_name', 'Customer')},</p>
                    <p>Your booking has been cancelled as requested.</p>
                    
                    <div class="cancellation-details">
                        <h3>Cancellation Details</h3>
                        <p><strong>Booking ID:</strong> {data.get('booking_id', 'N/A')}</p>
                        <p><strong>Service:</strong> {data.get('service_type', 'N/A')}</p>
                        <p><strong>Refund Amount:</strong> {data.get('refund_amount', 'N/A')}</p>
                        <p><strong>Refund Status:</strong> {data.get('refund_status', 'Processing')}</p>
                    </div>
                    
                    <p>We hope to serve you again soon!</p>
                </div>
                <div class="footer">
                    <p>TTravels - Your Journey, Our Priority</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _price_alert_template(self, data: Dict[str, Any]) -> str:
        """Price alert email template."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Price Alert - TTravels</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #f59e0b; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #fffbeb; }}
                .price-details {{ background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .footer {{ text-align: center; padding: 20px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💰 Price Alert!</h1>
                </div>
                <div class="content">
                    <p>Dear {data.get('customer_name', 'Customer')},</p>
                    <p>Great news! The price for your tracked route has dropped!</p>
                    
                    <div class="price-details">
                        <h3>Price Update</h3>
                        <p><strong>Route:</strong> {data.get('route', 'N/A')}</p>
                        <p><strong>Previous Price:</strong> {data.get('old_price', 'N/A')}</p>
                        <p><strong>New Price:</strong> {data.get('new_price', 'N/A')}</p>
                        <p><strong>Savings:</strong> {data.get('savings', 'N/A')}</p>
                    </div>
                    
                    <p>Book now to secure this great deal!</p>
                </div>
                <div class="footer">
                    <p>TTravels - Your Journey, Our Priority</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _welcome_template(self, data: Dict[str, Any]) -> str:
        """Welcome email template."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Welcome to TTravels</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #4f46e5; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .footer {{ text-align: center; padding: 20px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome to TTravels!</h1>
                </div>
                <div class="content">
                    <p>Dear {data.get('customer_name', 'Customer')},</p>
                    <p>Welcome to TTravels! We're excited to help you plan your next adventure.</p>
                    <p>With our AI-powered assistant, you can:</p>
                    <ul>
                        <li>Search and book flights, hotels, trains, and more</li>
                        <li>Get personalized travel recommendations</li>
                        <li>Receive real-time price alerts</li>
                        <li>Plan your entire trip with voice commands</li>
                    </ul>
                    <p>Start exploring and book your next trip today!</p>
                </div>
                <div class="footer">
                    <p>TTravels - Your Journey, Our Priority</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _default_template(self, data: Dict[str, Any]) -> str:
        """Default email template."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>TTravels Notification</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #4f46e5; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .footer {{ text-align: center; padding: 20px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>TTravels Notification</h1>
                </div>
                <div class="content">
                    <p>{data.get('message', 'You have a new notification from TTravels.')}</p>
                </div>
                <div class="footer">
                    <p>TTravels - Your Journey, Our Priority</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def create_web_notification(self, user_id: str, title: str, message: str, 
                              notification_type: str = 'info', data: Dict[str, Any] = None) -> bool:
        """
        Create a web notification for a user.
        
        Args:
            user_id: User ID
            title: Notification title
            message: Notification message
            notification_type: Type of notification (info, success, warning, error)
            data: Additional data
            
        Returns:
            True if created successfully, False otherwise
        """
        if not self.databases:
            logger.error("Appwrite databases not initialized")
            return False
        
        try:
            notification_data = {
                "user_id": user_id,
                "title": title,
                "message": message,
                "type": notification_type,
                "data": json.dumps(data or {}),
                "read": False,
                "created_at": datetime.now().isoformat()
            }
            
            result = self.databases.create_document(
                database_id=os.getenv("APPWRITE_DATABASE_ID"),
                collection_id="notifications",
                document_id=None,  # Let Appwrite generate ID
                data=notification_data
            )
            
            logger.info(f"Web notification created for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create web notification: {e}")
            return False
    
    def get_user_notifications(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get notifications for a user.
        
        Args:
            user_id: User ID
            limit: Maximum number of notifications to return
            
        Returns:
            List of notification dictionaries
        """
        if not self.databases:
            return []
        
        try:
            result = self.databases.list_documents(
                database_id=os.getenv("APPWRITE_DATABASE_ID"),
                collection_id="notifications",
                queries=[
                    Query.equal("user_id", user_id),
                    Query.order_desc("created_at"),
                    Query.limit(limit)
                ]
            )
            
            return result.get('documents', [])
            
        except Exception as e:
            logger.error(f"Failed to get user notifications: {e}")
            return []
    
    def mark_notification_read(self, notification_id: str) -> bool:
        """
        Mark a notification as read.
        
        Args:
            notification_id: Notification ID
            
        Returns:
            True if updated successfully, False otherwise
        """
        if not self.databases:
            return False
        
        try:
            self.databases.update_document(
                database_id=os.getenv("APPWRITE_DATABASE_ID"),
                collection_id="notifications",
                document_id=notification_id,
                data={"read": True}
            )
            
            logger.info(f"Notification {notification_id} marked as read")
            return True
            
        except Exception as e:
            logger.error(f"Failed to mark notification as read: {e}")
            return False

# Global instance
notification_service = NotificationService()
