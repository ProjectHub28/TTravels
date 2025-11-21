from appwrite.client import Client
from appwrite.services.account import Account
from appwrite.exception import AppwriteException
import os
from dotenv import load_dotenv

load_dotenv()

ENDPOINT = os.getenv("APPWRITE_ENDPOINT")
PROJECT_ID = os.getenv("APPWRITE_PROJECT_ID")
API_KEY = os.getenv("APPWRITE_API_KEY")

class Auth:
    def __init__(self):
        self.client = Client()
        self.client.set_endpoint(ENDPOINT)
        self.client.set_project(PROJECT_ID)
        self.client.set_key(API_KEY)
        self.account = Account(self.client)

    def login(self, email, password):
        try:
            session = self.account.create_email_password_session(email, password)
            return session
        except AppwriteException as e:
            return {"error": e.message}
        except Exception as e:
            return {"error": str(e)}
        
class AdminAuth:
    def __init__(self):
        self.client = Client()
        self.client.set_endpoint(ENDPOINT)
        self.client.set_project(PROJECT_ID)
        self.client.set_key(API_KEY)
        self.account = Account(self.client)
        from appwrite.services.teams import Teams
        from appwrite.query import Query
        self.teams = Teams(self.client)
        self.admin_team_id = os.getenv("ADMIN_TEAM_ID")

    def admin_login(self, email, password):
        session = None
        try:
            session = self.account.create_email_password_session(email, password)
            user_id = session['userId']
            # Check if user is in the admin team
            if not self.admin_team_id:
                return {"error": "ADMIN_TEAM_ID is not configured in the environment."}
            result = self.teams.list_memberships(
                team_id=self.admin_team_id,
                queries=[__import__('appwrite.query').query.Query.equal('userId', user_id)]
            )
            is_admin = result['total'] > 0
            if not is_admin:
                # Delete the session if not admin
                self.account.delete_session(session_id=session['$id'])
                return {"error": "Access denied. You are not an administrator."}
            return session
        except AppwriteException as e:
            return {"error": e.message}
        except Exception as e:
            return {"error": str(e)}
        
