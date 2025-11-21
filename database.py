# database.py
"""
Appwrite Database setup for TTravels booking and payment tables.
This script uses the Appwrite Python SDK to create collections and attributes for bookings and payments.
"""

from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
import os
from dotenv import load_dotenv

# Load environment from .env (if present)
load_dotenv()

# Load Appwrite credentials from environment variables or config
APPWRITE_ENDPOINT = os.getenv('APPWRITE_ENDPOINT')
APPWRITE_PROJECT = os.getenv('APPWRITE_PROJECT_ID')
APPWRITE_API_KEY = os.getenv('APPWRITE_API_KEY')
DATABASE_ID = os.getenv('APPWRITE_DATABASE_ID')

# Quick sanity check to provide a clearer error than AttributeError when env is missing
missing_vars = [k for k in ("APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY", "APPWRITE_DATABASE_ID") if not os.getenv(k)]
if missing_vars:
    raise SystemExit(f"Missing required environment variables: {', '.join(missing_vars)}.\n"
                     "Set them in your environment or add them to a .env file in the project root.")

client = Client()
client.set_endpoint(APPWRITE_ENDPOINT)
client.set_project(APPWRITE_PROJECT)
client.set_key(APPWRITE_API_KEY)

db = Databases(client)

# --- Create Bookings Collection ---
BOOKINGS_COLLECTION_ID = 'bookings'
try:
    db.create_collection(
        database_id=DATABASE_ID,
        collection_id=BOOKINGS_COLLECTION_ID,
        name='Bookings',
        permissions=[],
        document_security=False
    )
except Exception as e:
    print('Bookings collection may already exist:', e)

# Add attributes to Bookings collection
booking_attributes = [
    ('type', 'string', True),
    ('user_id', 'string', False),
    # Consider using 'relationship' type for user_id if you have a users collection
    # ('user_id', 'relationship', False, 'users'),
    ('service_type', 'string', True),
    ('service_id', 'string', True),
    ('num_passengers', 'integer', False),
    ('num_guests', 'integer', False),
    ('fare_total', 'float', True),
    ('payment_status', 'string', True),
    ('created_at', 'datetime', True),
    ('contact_info', 'string', False),  # JSON string for contact details
    ('details', 'string', False)  # JSON string for booking details
]
for attr, attr_type, required, *rest in booking_attributes:
    try:
        if attr_type == 'string':
            db.create_string_attribute(DATABASE_ID, BOOKINGS_COLLECTION_ID, attr, 255, required)
        elif attr_type == 'integer':
            db.create_integer_attribute(DATABASE_ID, BOOKINGS_COLLECTION_ID, attr, required)
        elif attr_type == 'float':
            db.create_float_attribute(DATABASE_ID, BOOKINGS_COLLECTION_ID, attr, required)
        elif attr_type == 'boolean':
            db.create_boolean_attribute(DATABASE_ID, BOOKINGS_COLLECTION_ID, attr, required)
        elif attr_type == 'datetime':
            db.create_datetime_attribute(DATABASE_ID, BOOKINGS_COLLECTION_ID, attr, required)
        elif attr_type == 'enum':
            # Example: db.create_enum_attribute(DATABASE_ID, BOOKINGS_COLLECTION_ID, attr, ["option1", "option2"], required)
            pass
        elif attr_type == 'relationship':
            # Example: db.create_relationship_attribute(DATABASE_ID, BOOKINGS_COLLECTION_ID, attr, rest[0], required)
            pass
    except Exception as e:
        print(f'Attribute {attr} may already exist:', e)

# --- Create Payments Collection ---
PAYMENTS_COLLECTION_ID = 'payments'
try:
    db.create_collection(
        database_id=DATABASE_ID,
        collection_id=PAYMENTS_COLLECTION_ID,
        name='Payments',
        permissions=[],
        document_security=False
    )
except Exception as e:
    print('Payments collection may already exist:', e)

# Add attributes to Payments collection
payment_attributes = [
    ('booking_id', 'string', True),  # Consider 'relationship' to bookings
    ('amount', 'float', True),
    ('method', 'string', True),
    ('status', 'string', True),
    ('transaction_id', 'string', False),
    ('timestamp', 'datetime', True),
    ('user_id', 'string', False)  # Consider 'relationship' to users
]
for attr, attr_type, required, *rest in payment_attributes:
    try:
        if attr_type == 'string':
            db.create_string_attribute(DATABASE_ID, PAYMENTS_COLLECTION_ID, attr, 255, required)
        elif attr_type == 'integer':
            db.create_integer_attribute(DATABASE_ID, PAYMENTS_COLLECTION_ID, attr, required)
        elif attr_type == 'float':
            db.create_float_attribute(DATABASE_ID, PAYMENTS_COLLECTION_ID, attr, required)
        elif attr_type == 'boolean':
            db.create_boolean_attribute(DATABASE_ID, PAYMENTS_COLLECTION_ID, attr, required)
        elif attr_type == 'datetime':
            db.create_datetime_attribute(DATABASE_ID, PAYMENTS_COLLECTION_ID, attr, required)
        elif attr_type == 'enum':
            # Example: db.create_enum_attribute(DATABASE_ID, PAYMENTS_COLLECTION_ID, attr, ["option1", "option2"], required)
            pass
        elif attr_type == 'relationship':
            # Example: db.create_relationship_attribute(DATABASE_ID, PAYMENTS_COLLECTION_ID, attr, rest[0], required)
            pass
    except Exception as e:
        print(f'Attribute {attr} may already exist:', e)


# --- Create Saved Trip Plans Collection ---
SAVED_COLLECTION_ID = 'saved_trip_plans'
try:
    db.create_collection(
        database_id=DATABASE_ID,
        collection_id=SAVED_COLLECTION_ID,
        name='Saved Trip Plans',
        permissions=[],
        document_security=False
    )
except Exception as e:
    print('Saved Trip Plans collection may already exist:', e)

# Add attributes to Saved Trip Plans collection
saved_attributes = [
    ('user_id', 'string', True),
    ('title', 'string', False),
    ('trip_plan', 'string', True),  # store JSON string of the plan
    ('metadata', 'string', False),
    ('created_at', 'datetime', True)
]
for attr, attr_type, required, *rest in saved_attributes:
    try:
        if attr_type == 'string':
            # allow larger size for trip_plan
            size = 65535 if attr == 'trip_plan' else 255
            db.create_string_attribute(DATABASE_ID, SAVED_COLLECTION_ID, attr, size, required)
        elif attr_type == 'integer':
            db.create_integer_attribute(DATABASE_ID, SAVED_COLLECTION_ID, attr, required)
        elif attr_type == 'float':
            db.create_float_attribute(DATABASE_ID, SAVED_COLLECTION_ID, attr, required)
        elif attr_type == 'boolean':
            db.create_boolean_attribute(DATABASE_ID, SAVED_COLLECTION_ID, attr, required)
        elif attr_type == 'datetime':
            db.create_datetime_attribute(DATABASE_ID, SAVED_COLLECTION_ID, attr, required)
        elif attr_type == 'enum':
            pass
        elif attr_type == 'relationship':
            pass
    except Exception as e:
        print(f'Attribute {attr} may already exist:', e)


def insert_saved_trip_plan(doc_data):
    """Insert a saved trip plan document into Appwrite. Returns the created document or None."""
    try:
        result = db.create_document(DATABASE_ID, SAVED_COLLECTION_ID, ID.unique(), doc_data)
        print('Saved trip plan created:', result)
        return result
    except Exception as e:
        print('Failed to create saved trip plan:', e)
        return None


def list_saved_trip_plans_for_user(user_id):
    """List saved trip plans for a given user_id. Returns the Appwrite SDK response or None."""
    try:
        from appwrite.query import Query
        result = db.list_documents(DATABASE_ID, SAVED_COLLECTION_ID, queries=[Query.equal('user_id', [user_id])])
        return result
    except Exception as e:
        print('Failed to list saved trip plans:', e)
        return None

print('Appwrite database setup complete.')


