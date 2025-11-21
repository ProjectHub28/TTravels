from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.exception import AppwriteException
from appwrite.query import Query
import os
from dotenv import load_dotenv

load_dotenv()

ENDPOINT = os.getenv("APPWRITE_ENDPOINT")
PROJECT_ID = os.getenv("APPWRITE_PROJECT_ID")
API_KEY = os.getenv("APPWRITE_API_KEY")
DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")
COLLECTION_ID = os.getenv("APPWRITE_COLLECTION_ID")

def create_user_document(fname, lname, email, mobile):
    client = Client()
    client.set_endpoint(ENDPOINT)
    client.set_project(PROJECT_ID)
    client.set_key(API_KEY)

    databases = Databases(client)

    try:
        response = databases.create_document(
            database_id=DATABASE_ID,
            collection_id=COLLECTION_ID,
            document_id=ID.unique(),
            data={
                "fname": fname,
                "lname": lname,
                "email": email,
                "mobile": mobile
            }
        )
        print("Document created successfully:")
        print(response)
    except AppwriteException as e:
        print(f"AppwriteException: {e.message} (Code: {e.code})")
    except Exception as e:
        print(f"Error: {str(e)}")


# --- Insert Booking Document ---
def insert_booking_document(booking_data):
    """
    booking_data: dict with keys matching the bookings table schema
    """
    client = Client()
    client.set_endpoint(ENDPOINT)
    client.set_project(PROJECT_ID)
    client.set_key(API_KEY)

    databases = Databases(client)
    try:
        response = databases.create_document(
            database_id=DATABASE_ID,
            collection_id="bookings",
            document_id=ID.unique(),
            data=booking_data
        )
        print("Booking document created successfully:")
        print(response)
        return response
    except AppwriteException as e:
        print(f"AppwriteException: {e.message} (Code: {e.code})")
        return {"error": f"Appwrite error: {e.message}", "code": e.code}
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": f"Database error: {str(e)}"}


# --- Insert Payment Document ---
def insert_payment_document(payment_data):
    """
    payment_data: dict with keys matching the payments table schema
    """
    client = Client()
    client.set_endpoint(ENDPOINT)
    client.set_project(PROJECT_ID)
    client.set_key(API_KEY)

    databases = Databases(client)
    try:
        response = databases.create_document(
            database_id=DATABASE_ID,
            collection_id="payments",
            document_id=ID.unique(),
            data=payment_data
        )
        print("Payment document created successfully:")
        print(response)
        return response
    except AppwriteException as e:
        print(f"AppwriteException: {e.message} (Code: {e.code})")
        return {"error": f"Appwrite error: {e.message}", "code": e.code}
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": f"Database error: {str(e)}"}


# --- Insert Saved Trip Plan Document ---
def save_trip_plan_document(trip_plan_data):
    """
    trip_plan_data: dict with keys such as user_id, trip_plan (dict or json-string), title, metadata, created_at
    """
    client = Client()
    client.set_endpoint(ENDPOINT)
    client.set_project(PROJECT_ID)
    client.set_key(API_KEY)

    databases = Databases(client)
    # Allow overriding collection id via env var, fallback to 'saved_trip_plans'
    collection_id = os.getenv("SAVED_TRIP_PLANS_COLLECTION_ID", "saved_trip_plans")
    try:
        response = databases.create_document(
            database_id=DATABASE_ID,
            collection_id=collection_id,
            document_id=ID.unique(),
            data=trip_plan_data
        )
        print("Saved trip plan document created successfully:")
        print(response)
        return response
    except AppwriteException as e:
        print(f"AppwriteException: {e.message} (Code: {e.code})")
        return {"error": f"Appwrite error: {e.message}", "code": e.code}
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": f"Database error: {str(e)}"}


def get_saved_trip_plans_for_user(user_id, limit=50, offset=0):
    """
    List saved trip plans for a user. Returns a dict or error structure similar to other helpers.
    - user_id: string
    - limit: max documents to return
    - offset: pagination offset
    """
    client = Client()
    client.set_endpoint(ENDPOINT)
    client.set_project(PROJECT_ID)
    client.set_key(API_KEY)

    databases = Databases(client)
    collection_id = os.getenv("SAVED_TRIP_PLANS_COLLECTION_ID", "saved_trip_plans")
    try:
        # Use Query.equal to filter by user_id
        result = databases.list_documents(
            database_id=DATABASE_ID,
            collection_id=collection_id,
            queries=[Query.equal("user_id", [user_id])]
        )
        return result
    except AppwriteException as e:
        print(f"AppwriteException: {e.message} (Code: {e.code})")
        return {"error": f"Appwrite error: {e.message}", "code": e.code}
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": f"Database error: {str(e)}"}


def get_trip_plan_document(document_id):
    """
    Retrieve a saved trip plan document by its Appwrite document id.
    Returns the document dict or an error dict.
    """
    client = Client()
    client.set_endpoint(ENDPOINT)
    client.set_project(PROJECT_ID)
    client.set_key(API_KEY)

    databases = Databases(client)
    collection_id = os.getenv("SAVED_TRIP_PLANS_COLLECTION_ID", "saved_trip_plans")
    try:
        result = databases.get_document(
            database_id=DATABASE_ID,
            collection_id=collection_id,
            document_id=document_id
        )
        return result
    except AppwriteException as e:
        print(f"AppwriteException: {e.message} (Code: {e.code})")
        return {"error": f"Appwrite error: {e.message}", "code": e.code}
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": f"Database error: {str(e)}"}


def update_trip_plan_document(document_id, trip_plan_data):
    """
    Update a saved trip plan document by its Appwrite document id.
    trip_plan_data: dict with keys such as trip_plan (dict or json-string), title, metadata
    Returns the updated document dict or an error dict.
    """
    client = Client()
    client.set_endpoint(ENDPOINT)
    client.set_project(PROJECT_ID)
    client.set_key(API_KEY)

    databases = Databases(client)
    collection_id = os.getenv("SAVED_TRIP_PLANS_COLLECTION_ID", "saved_trip_plans")
    try:
        import json as _json
        # Prepare update data
        update_data = {}
        
        # Handle trip_plan field
        if 'trip_plan' in trip_plan_data:
            trip_plan = trip_plan_data['trip_plan']
            if isinstance(trip_plan, (dict, list)):
                update_data['trip_plan'] = _json.dumps(trip_plan)
            else:
                update_data['trip_plan'] = trip_plan
        
        # Handle other fields
        if 'title' in trip_plan_data:
            update_data['title'] = trip_plan_data['title']
        if 'metadata' in trip_plan_data:
            metadata = trip_plan_data['metadata']
            if isinstance(metadata, (dict, list)):
                update_data['metadata'] = _json.dumps(metadata)
            else:
                update_data['metadata'] = metadata

        result = databases.update_document(
            database_id=DATABASE_ID,
            collection_id=collection_id,
            document_id=document_id,
            data=update_data
        )
        print("Trip plan document updated successfully")
        return result
    except AppwriteException as e:
        print(f"AppwriteException: {e.message} (Code: {e.code})")
        return {"error": f"Appwrite error: {e.message}", "code": e.code}
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": f"Database error: {str(e)}"}


def delete_trip_plan_document(document_id):
    """
    Delete a saved trip plan document by its Appwrite document id.
    Returns deleted document info on success or an error dict.
    """
    client = Client()
    client.set_endpoint(ENDPOINT)
    client.set_project(PROJECT_ID)
    client.set_key(API_KEY)

    databases = Databases(client)
    collection_id = os.getenv("SAVED_TRIP_PLANS_COLLECTION_ID", "saved_trip_plans")
    try:
        result = databases.delete_document(
            database_id=DATABASE_ID,
            collection_id=collection_id,
            document_id=document_id
        )
        print(f"Trip plan document {document_id} deleted successfully")
        return result
    except AppwriteException as e:
        print(f"AppwriteException: {e.message} (Code: {e.code})")
        return {"error": f"Appwrite error: {e.message}", "code": e.code}
    except Exception as e:
        print(f"Error deleting trip plan: {str(e)}")
        return {"error": f"Database error: {str(e)}"}



if __name__ == "__main__":
    # Example usage
    create_user_document(
        fname="John",
        lname="Doe",
        email="john.doe@example.com",
        mobile="1234567890"
    )
