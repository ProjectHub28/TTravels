from flask import Flask, render_template, request, jsonify, session, redirect, send_from_directory, url_for
# Whisper Speech-to-Text API
import os

import requests
from appwrite.client import Client
from appwrite.services.account import Account
from appwrite.services.databases import Databases
from appwrite.id import ID
from db import create_user_document, insert_booking_document, insert_payment_document, save_trip_plan_document, get_saved_trip_plans_for_user, get_trip_plan_document, update_trip_plan_document
from auth import Auth, AdminAuth
from appwrite.exception import AppwriteException
import secrets
import os
from dotenv import load_dotenv
from serpapi import GoogleSearch
import json
from datetime import datetime, timedelta
import random
from functools import wraps
# from chatbot import get_gemini_response, chatbot
# from services.speech_to_text import stt_service
# from services.text_to_speech import tts_service
# from services.translate import translation_service
# from services.notification import notification_service
# from flask_mail import Mail, Message

# Chatbot & services used by unified endpoint
from chatbot import chatbot
from services.gemini_service import gemini_service
from services.text_to_speech import tts_service

# Speech-to-text and translate service (used in other endpoints)
from services.speech_to_text import stt_service
# from services.translate import translation_service
from services.notification import notification_service

# Trip planner for modifications
from trip_planner import modify_trip_plan

app = Flask(__name__)
# You can generate a secret key using Python's secrets module:
# import secrets
# print(secrets.token_hex(32))
# Replace 'your-secret-key-here' with the generated value.
app.secret_key = secrets.token_hex(32)  # Required for sessions

# Initialize Flask-Mail
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@ttravels.com')

# Flask-Mail initialization paused:
# The Mail extension and notification wiring are temporarily disabled to
# avoid import/runtime errors while working on email features. Re-enable
# by uncommenting the block and ensuring `flask_mail.Mail` and
# `notification_service` are available and configured.
#
# app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
# app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
# app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
# app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
# app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
# app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@ttravels.com')
#
# from flask_mail import Mail
# mail = Mail(app)
# try:
#     notification_service.mail = mail
#     notification_service.app = app
# except NameError:
#     # notification_service not imported/enabled — will wire later
#     pass


# # ---- Appwrite Setup ----
client = Client()
load_dotenv()

client.set_endpoint(os.getenv("APPWRITE_ENDPOINT"))
client.set_project(os.getenv("APPWRITE_PROJECT_ID"))
client.set_key(os.getenv("APPWRITE_API_KEY"))

account = Account(client)
databases = Databases(client)

SERPAPI_KEY = os.getenv("SERPAPI_KEY")

# ---- Load Train Data ----
# Get the directory where this script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Path to the trains.json file
JSON_PATH = os.path.join(BASE_DIR, "static", "js", "trains.json")

# Load train data once
try:
    with open(JSON_PATH, "r") as f:
        train_data = json.load(f)
    print(f"Loaded {len(train_data)} trains from {JSON_PATH}")
except Exception as e:
    print(f"Error loading train data: {e}")
    train_data = []

# Load stations data
STATIONS_JSON_PATH = os.path.join(BASE_DIR, "static", "js", "stations.json")
try:
    with open(STATIONS_JSON_PATH, "r") as f:
        stations_data = json.load(f)
    print(f"Loaded {len(stations_data)} stations from {STATIONS_JSON_PATH}")
except Exception as e:
    print(f"Error loading stations data: {e}")
    stations_data = []
# ------------------------

# ---------------------------SESSION MANAGEMENT--------------
# Decorator to require admin login
def admin_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_user_id' not in session:
            return redirect('/admin')
        return f(*args, **kwargs)
    return decorated_function
# Decorator to require user login
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect('/login')
        return f(*args, **kwargs)
    return decorated_function
# --------------------------------End-----------------------


#------Flight data load------------
# Load airport data once
AIRPORTS_JSON_PATH = os.path.join(BASE_DIR, "static", "js", "airports.json")
try:
    with open(AIRPORTS_JSON_PATH, "r") as f:
        airport_data = json.load(f)
    print(f"Loaded {len(airport_data)} airports from {AIRPORTS_JSON_PATH}")
except Exception as e:
    print(f"Error loading airport data: {e}")
    airport_data = []
#----------End----------------------

@app.route("/")
def index():
    return redirect("/index.html")

@app.route("/index.html")
def index_html():
    # Check if user is logged in
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("index.html", logged_in=logged_in, username=username)

# # Signup page route
# @app.route("/signup", methods=["GET"])
# def signup():
#     return render_template("signup.html")

@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        fname = request.form.get("firstName", "").strip()
        lname = request.form.get("lastName", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirmPassword", "")
        mobile = request.form.get("mobile", "").strip()

        if password != confirm_password:
            return render_template("signup.html", error="Passwords do not match")
        
        # user = account.create(ID.unique(), email, password, f"{fname} {lname}")

        # # You do NOT need to create the Appwrite user here since you are using create_user_document from db.py.
        # # Remove the following block if you are not using Appwrite Account API directly:
        # # user = account.create(
        # #     ID.unique(),
        # #     email,
        # #     password,
        # #     f"{fname} {lname}"
        # # )

        # # Store profile data in DB using db.py
        # create_user_document(fname, lname, email, mobile)

        # # Log user in by storing user ID in session
        # session['user_id'] = user['$id']

        # return redirect("/hotel3.html")
    
        try:
            user = account.create(ID.unique(), email, password, f"{fname} {lname}")
            create_user_document(fname, lname, email, mobile)
            session['user_id'] = user['$id']
            return redirect("/login")
        except AppwriteException as e:
            # Show Appwrite error (like invalid password) on the signup page
            return render_template("signup.html", error=f"Signup failed: {e.message}")
        except Exception as e:
            # Show any other error
            return render_template("signup.html", error=f"Signup failed: {str(e)}")

    return render_template("signup.html")

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')

        if not email or not password:
            error = 'Please enter email and password.'
            return render_template('login.html', error=error)

        auth = Auth()
        result = auth.login(email, password)
        print('Login result:', result)  # Debug print
        if isinstance(result, dict) and 'error' in result:
            error = result['error']
            print('Login error:', error)  # Debug print
        else:
            # Store complete user session data
            session['user_id'] = result['userId'] if 'userId' in result else None
            session['user_email'] = email
            session['username'] = result.get('username', email.split('@')[0])  # Use email prefix as username
            session['logged_in'] = True
            session['login_time'] = datetime.now().isoformat()
            
            print(f'Login successful for {email}, redirecting to dashboard')  # Debug print
            return redirect("/dashboard")
        
    return render_template('login.html', error=error)

# ----------------------Logout------------------------
@app.route('/logout')
def logout():
    # Clear all session data
    username = session.get('username', 'User')
    session.clear()
    print(f'User {username} logged out successfully')
    return redirect('/index.html')

# ----------------------END------------------------

#-------Flight Routes & Search -------

# Load airport data once

@app.route("/flights")
def flights():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("flight.html", logged_in=logged_in, username=username)

@app.route("/search", methods=["POST"])
def search():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Validate required fields
        required_fields = ["from", "to", "departure"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Handle one-way vs round-trip
        return_date = data.get("return", "")
        if not return_date:
            # One-way flight
            params = {
                "engine": "google_flights",
                "departure_id": data["from"],
                "arrival_id": data["to"],
                "outbound_date": data["departure"],
                "currency": "INR",
                "hl": "en",
                "api_key": SERPAPI_KEY
            }
            
        else:
            # Round-trip flight
            params = {
                "engine": "google_flights",
                "departure_id": data["from"],
                "arrival_id": data["to"],
                "outbound_date": data["departure"],
                "return_date": return_date,
                "currency": "INR",
                "hl": "en",
                "api_key": SERPAPI_KEY  # Use the API key from .env
            }
            
        
        search = GoogleSearch(params)
        results = search.get_dict()

        # Check for API errors
        if "error" in results:
            return jsonify({"error": results["error"]}), 500


        def enrich_flights(flight_list):
            enriched = []
            for item in flight_list or []:
                seg = item.get('flights', [{}])[0] if item.get('flights') else {}
                # Gather all details from SerpApi response
                enriched.append({
                    'airline': seg.get('airline', item.get('airline', '')),
                    'flight_number': seg.get('flight_number', ''),
                    'departure_time': seg.get('departure_airport', {}).get('time', ''),
                    'arrival_time': seg.get('arrival_airport', {}).get('time', ''),
                    'origin': seg.get('departure_airport', {}).get('id', ''),
                    'origin_name': seg.get('departure_airport', {}).get('name', ''),
                    'destination': seg.get('arrival_airport', {}).get('id', ''),
                    'destination_name': seg.get('arrival_airport', {}).get('name', ''),
                    'duration': seg.get('duration', item.get('duration', '')),
                    'airplane': seg.get('airplane', ''),
                    'travel_class': seg.get('travel_class', ''),
                    'legroom': seg.get('legroom', ''),
                    'extensions': seg.get('extensions', []),
                    'carbon_emissions': item.get('carbon_emissions', {}),
                    'type': item.get('type', ''),
                    'airline_logo': seg.get('airline_logo', item.get('airline_logo', '')),
                    'stops': item.get('stops', 0),
                    'price': item.get('price', 0),
                    'local_prices': item.get('local_prices', []),
                    'refundable': item.get('refundable', False),
                    'baggage_prices': item.get('baggage_prices', {}),
                    'booking_options': item.get('booking_options', []),
                    'total_duration': item.get('total_duration', ''),
                    'flight_segments': item.get('flights', []),
                    'departure_token': item.get('departure_token', ''),
                    'raw': item  # include original for reference
                })
            return enriched

        best_flights = enrich_flights(results.get('best_flights', []))
        other_flights = enrich_flights(results.get('other_flights', []))

        return jsonify({
            "best_flights": best_flights,
            "other_flights": other_flights,
            "search_metadata": results.get("search_metadata", {}),
            "price_insights": results.get("price_insights", {}),
            "baggage_prices": results.get("baggage_prices", {}),
            "booking_options": results.get("booking_options", []),
            "selected_flights": results.get("selected_flights", []),
        })
        
    except Exception as e:
        print(f"Flight search error: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@app.route("/booking", methods=["POST"])
def get_booking_details():
    try:
        data = request.get_json()
        if not data or 'flight' not in data:
            return jsonify({"error": "Missing flight data"}), 400

        # Extract booking info from frontend
        flight = data['flight']
        passengers = data.get('passengers', 1)
        addons = data.get('addons', [])
        total_amount = data.get('amount', 0)
        contact = data.get('contact', {})

        # Generate booking reference
        booking_reference = f"TT{random.randint(100000, 999999)}"

        booking = {
            "status": "confirmed",
            "booking_reference": booking_reference,
            "flight": flight,
            "passengers": passengers,
            "addons": addons,
            "total_amount": total_amount,
            "contact": contact,
            "booking_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "payment_status": "pending"
        }

        # Optionally: save booking to DB here

        return jsonify(booking)
    except Exception as e:
        print(f"Booking error: {str(e)}")
        return jsonify({"error": "Failed to process booking", "details": str(e)}), 500

@app.route("/api/confirm-booking", methods=["POST"])
def confirm_booking():
    """Confirm and store booking after payment"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No booking data provided"}), 400

        # Generate booking ID
        booking_id = f"TT{random.randint(100000, 999999)}"
        
        # Create booking record
        booking_record = {
            "booking_id": booking_id,
            "type": data.get('type', 'flight'),
            "service": data.get('service', ''),
            "route": data.get('route', ''),
            "passengers": data.get('passengers', 1),
            "amount": data.get('totalAmount', '₹0'),
            "payment_method": data.get('paymentMethod', ''),
            "status": "confirmed",
            "booked_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "user_id": session.get('user_id', 'guest'),
            "contact_info": data.get('contact', {}),
            "flight_details": data.get('flight', {}),
            "addons": data.get('addons', [])
        }

        # In a real application, save to database here
        # For now, we'll just return success
        print(f"Booking confirmed: {booking_record}")
        
        return jsonify({
            "success": True,
            "booking_id": booking_id,
            "message": "Booking confirmed successfully"
        })
        
    except Exception as e:
        print(f"Booking confirmation error: {str(e)}")
        return jsonify({"error": "Failed to confirm booking", "details": str(e)}), 500
#-------End of Flight Routes & Search -------------------------

#-----Rout the trains page------------------------------------
@app.route("/trains")
def trains_page():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("trains.html", logged_in=logged_in, username=username)

@app.route("/api/stations")
def get_stations():
    """API endpoint to get all stations for autocomplete"""
    try:
        search = request.args.get('q', '').lower()
        limit = min(int(request.args.get('limit', '10')), 50)  # Limit max results to 50
        
        filtered_stations = []
        for station in stations_data:
            if (search in station['code'].lower() or 
                search in station['name'].lower() or 
                search in station['city'].lower()):
                filtered_stations.append({
                    'code': station['code'],
                    'name': station['name'],
                    'city': station['city'],
                    'state': station['state']
                })
                if len(filtered_stations) >= limit:
                    break
                    
        return jsonify({
            'success': True,
            'data': filtered_stations
        })
    except Exception as e:
        print(f"Error in get_stations: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch stations'
        }), 500

@app.route("/search_trains", methods=["POST"])
def search_trains():
    try:
        print("Received search request")
        
        if not request.is_json:
            print("Request is not JSON")
            return jsonify({"error": "Request must be JSON"}), 400
            
        data = request.get_json()
        print(f"Request data: {data}")
        
        source = data.get("source", "").strip().upper()
        destination = data.get("destination", "").strip().upper()
        
        print(f"Searching for trains from {source} to {destination}")
        
        if not source or not destination:
            return jsonify({"error": "Source and destination are required"}), 400
        
        # Filter trains (case-insensitive)
        results = []
        for train in train_data:
            if train["source"].upper() == source and train["destination"].upper() == destination:
                results.append(train)
        
        print(f"Found {len(results)} trains")
        
        return jsonify(results)
        
    except Exception as e:
        print(f"Error in search_trains: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Serve static files explicitly (for debugging)
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

# Add some debug routes
@app.route("/debug/trains")
def debug_trains():
    return jsonify({
        "total_trains": len(train_data),
        "trains": train_data,
        "json_path": JSON_PATH,
        "file_exists": os.path.exists(JSON_PATH)
    })
#------------------------

#------------------------Hotel Routes & Search ------------
import re
# @app.route("/hotels.html")
# def hotels():
#     return render_template("hotels.html")

@app.route("/hotels.html", methods=["GET", "POST"])
def hotels_search():
    hotels = None
    destination = None
    check_in = None
    check_out = None
    guests = None
    page = request.args.get("page", 1, type=int)
    per_page = 6  # Show 6 hotels per page
    
    if request.method == "POST":
        destination = request.form.get("destination", "Delhi, India")
        check_in = request.form.get("check_in", "")
        check_out = request.form.get("check_out", "")
        guests = request.form.get("guests", "2 Adults, 1 Room")
        
        # Parse adults
        adults_match = re.search(r"(\d+)", guests)
        adults = int(adults_match.group(1)) if adults_match else 2
        
        params = {
            "engine": "google_hotels",
            "q": destination,
            "check_in_date": check_in,
            "check_out_date": check_out,
            "adults": adults,
            "currency": "INR",
            "gl": "us",
            "hl": "en",
            "api_key": SERPAPI_KEY
        }
        try:
            print(f"[DEBUG] Hotel search params: {params}")
            search = GoogleSearch(params)
            results = search.get_dict()
            print(f"[DEBUG] API response keys: {list(results.keys())}")
            all_hotels = results.get("properties", [])
            
            # Calculate pagination
            total_hotels = len(all_hotels)
            total_pages = (total_hotels + per_page - 1) // per_page
            start_idx = (page - 1) * per_page
            end_idx = start_idx + per_page
            hotels = all_hotels[start_idx:end_idx]
            
            # Get coordinates for hotels using Google Maps API
            for hotel in hotels:
                if not hotel.get('gps_coordinates'):
                    try:
                        # Search for hotel location
                        map_params = {
                            "engine": "google_maps",
                            "q": f"{hotel.get('name', '')} {destination}",
                            "type": "search",
                            "api_key": SERPAPI_KEY
                        }
                        map_search = GoogleSearch(map_params)
                        map_results = map_search.get_dict()
                        local_results = map_results.get("local_results", [])
                        
                        if local_results:
                            coords = local_results[0].get("gps_coordinates")
                            if coords:
                                hotel['gps_coordinates'] = coords
                    except Exception as e:
                        print(f"[WARNING] Could not get coordinates for {hotel.get('name', '')}: {e}")
                        # Set default coordinates
                        hotel['gps_coordinates'] = {
                            "latitude": 48.8566 + (len(hotels) * 0.01),
                            "longitude": 2.3522 + (len(hotels) * 0.01)
                        }
            
            # Store search parameters in session for pagination
            session['hotel_search'] = {
                'destination': destination,
                'check_in': check_in,
                'check_out': check_out,
                'guests': guests,
                'total_hotels': total_hotels,
                'total_pages': total_pages
            }
            
        except Exception as e:
            print(f"[ERROR] Hotel search failed: {e}")
            hotels = []
            total_hotels = 0
            total_pages = 0
    else:
        # Handle pagination for existing search
        search_data = session.get('hotel_search', {})
        if search_data:
            destination = search_data.get('destination', 'Paris, France')
            check_in = search_data.get('check_in', '')
            check_out = search_data.get('check_out', '')
            guests = search_data.get('guests', '2 Adults, 1 Room')
            total_hotels = search_data.get('total_hotels', 0)
            total_pages = search_data.get('total_pages', 0)
            
            # Re-run the search to get all hotels for pagination
            params = {
                "engine": "google_hotels",
                "q": destination,
                "check_in_date": check_in,
                "check_out_date": check_out,
                "adults": 2,  # Default value
                "currency": "INR",
                "gl": "us",
                "hl": "en",
                "api_key": SERPAPI_KEY
            }
            try:
                search = GoogleSearch(params)
                results = search.get_dict()
                all_hotels = results.get("properties", [])
                start_idx = (page - 1) * per_page
                end_idx = start_idx + per_page
                hotels = all_hotels[start_idx:end_idx]
            except Exception as e:
                print(f"[ERROR] Hotel pagination failed: {e}")
                hotels = []
                total_hotels = 0
                total_pages = 0
        else:
            hotels = []
            total_hotels = 0
            total_pages = 0
    
    # Get today's date for the min attribute in the date inputs
    today_date = datetime.now().strftime("%Y-%m-%d")
    
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("hotels.html", 
                         hotels=hotels, 
                         destination=destination, 
                         check_in=check_in, 
                         check_out=check_out, 
                         guests=guests, 
                         today_date=today_date,
                         current_page=page,
                         total_pages=total_pages,
                         total_hotels=total_hotels,
                         per_page=per_page,
                         logged_in=logged_in,
                         username=username)

@app.route("/api/hotels")
def get_hotels():
    """API endpoint to get hotels for map display"""
    # Get search parameters from request
    location = request.args.get("location", "Paris")
    lat = request.args.get("lat", "48.8566")
    lng = request.args.get("lng", "2.3522")
    
    params = {
        "engine": "google_maps",
        "q": f"hotels in {location}",
        "ll": f"@{lat},{lng},15.1z",
        "type": "search",
        "api_key": SERPAPI_KEY
    }

    try:
        search = GoogleSearch(params)
        results = search.get_dict()

        local_results = results.get("local_results", [])
        
        # Normalize structure for frontend
        hotels = []
        for item in local_results:
            coords = item.get("gps_coordinates")
            if coords:
                hotels.append({
                    "name": item.get("title"),
                    "rating": item.get("rating"),
                    "price": item.get("price"),
                    "address": item.get("address"),
                    "gps_coordinates": {
                        "latitude": coords["latitude"],
                        "longitude": coords["longitude"]
                    }
                })

        return jsonify(hotels)
    except Exception as e:
        print(f"[ERROR] Map hotel search failed: {e}")
        return jsonify([])

@app.route("/api/hotel-search", methods=["POST"])
def hotel_search():
    """API endpoint for AJAX hotel search"""
    try:
        data = request.json
        destination = data.get("destination", "Paris, France")
        check_in = data.get("check_in", "")
        check_out = data.get("check_out", "")
        adults = data.get("adults", 2)
        
        params = {
            "engine": "google_hotels",
            "q": destination,
            "check_in_date": check_in,
            "check_out_date": check_out,
            "adults": adults,
            "currency": "INR",
            "gl": "us",
            "hl": "en",
            "api_key": SERPAPI_KEY
        }
        
        search = GoogleSearch(params)
        results = search.get_dict()
        
        return jsonify({
            "success": True,
            "hotels": results.get("properties", []),
            "total_hotels": len(results.get("properties", []))
        })
        
    except Exception as e:
        print(f"[ERROR] Hotel search failed: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
# API endpoint to fetch hotel details from SerpApi by property_token
@app.route('/api/hotel-details', methods=['GET'])
def api_hotel_details():
    property_token = request.args.get('property_token')
    query = request.args.get('q', '')
    check_in_date = request.args.get('check_in_date')
    check_out_date = request.args.get('check_out_date')
    adults = request.args.get('adults', '2')
    # currency = request.args.get('currency', 'INR')
    gl = request.args.get('gl', 'us')
    hl = request.args.get('hl', 'en')
    print(f"[DEBUG] /api/hotel-details called with property_token={property_token}, query={query}, check_in_date={check_in_date}, check_out_date={check_out_date}, adults={adults}")
    if not property_token:
        print("[ERROR] Missing property_token")
        return jsonify({'error': 'Missing property_token'}), 400
    try:
        params = {
            "engine": "google_hotels",
            "q": query,
            "check_in_date": check_in_date,
            "check_out_date": check_out_date,
            "adults": adults,
            "currency": "INR",
            "gl": gl,
            "hl": hl,
            "property_token": property_token,
            "api_key": SERPAPI_KEY
        }
        print(f"[DEBUG] SerpApi params: {params}")
        search = GoogleSearch(params)
        results = search.get_dict()
        print(f"[DEBUG] SerpApi response: {json.dumps(results)[:500]}")
        if 'error' in results:
            print(f"[ERROR] SerpApi error: {results['error']}")
            return jsonify({'error': 'SerpApi error', 'details': results['error']}), 500
        if not results:
            print("[ERROR] Empty response from SerpApi")
            return jsonify({'error': 'No hotel details found'}), 404
        return jsonify(results)
    except Exception as e:
        print(f"[ERROR] Failed to fetch hotel details: {e}")
        return jsonify({'error': 'Failed to fetch hotel details', 'details': str(e)}), 500

@app.route("/api/map-search", methods=["POST"])
def map_search():
    """API endpoint to search for locations using Google Maps API via SerpAPI"""
    try:
        data = request.json
        query = data.get("query", "hotels")
        location = data.get("location", "@48.8566,-2.3522,15.1z")
        
        params = {
            "engine": "google_maps",
            "q": query,
            "ll": location,
            "type": "search",
            "api_key": SERPAPI_KEY
        }
        
        search = GoogleSearch(params)
        results = search.get_dict()
        
        # Extract local results
        local_results = results.get("local_results", [])
        
        return jsonify({
            "success": True,
            "results": local_results,
            "total_results": len(local_results)
        })
        
    except Exception as e:
        print(f"[ERROR] Map search failed: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

#----------------------------------------------------------

#------------------------Cars Routes & Search ------------
@app.route("/cars")
def cars_page():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("cars.html", logged_in=logged_in, username=username)
#------------------------END ------------

#------------------------Buses Routes & Search ------------
@app.route("/buses")
def buses_page():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("buses.html", logged_in=logged_in, username=username)
#------------------------END ------------

#------------------------Explore Routes & Search ------------
@app.route("/explore")
def explore_page():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("explore.html", logged_in=logged_in, username=username)
#------------------------END ------------

#------------------------DASHBOARD Routes & Search ------------
@app.route("/dashboard")
@login_required
def dashboard_page():
    # Get user data from session
    username = session.get('username', 'User')
    user_email = session.get('user_email', '')
    login_time = session.get('login_time', '')
    
    return render_template("dashboard.html", 
                         username=username, 
                         user_email=user_email,
                         login_time=login_time)

#------------------------END ------------

#------------------------ADMIN PANEL ------------
@app.route('/admin', methods=['GET', 'POST'])
def admin_index():
    error = None
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')

        if not email or not password:
            error = 'Please enter email and password.'
            return render_template('admin/index.html', error=error)

        admin_auth = AdminAuth()
        result = admin_auth.admin_login(email, password)

        if isinstance(result, dict) and 'error' in result:
            error = result['error']
        else:
            # Store admin session
            session['admin_user_id'] = result['userId']
            session['admin_email'] = email
            return redirect('/admin/dashboard')

    return render_template('admin/index.html', error=error)

@app.route('/admin/dashboard')
@admin_login_required
def admin_dashboard():
    admin_email = session.get('admin_email', 'Admin User')
    return render_template('admin/dashboard.html', admin_email=admin_email)

@app.route('/admin/bookings')
@admin_login_required
def admin_bookings():
    return render_template('admin/bookings.html')

@app.route('/admin/users')
@admin_login_required
def admin_users():
    return render_template('admin/users.html')

@app.route('/admin/logout')
def admin_logout():
    session.clear()
    return redirect('/admin')
#------------------------END ------------


# ------------------------------CHATBOT--------------------------------------
@app.route('/api/gemini-chat', methods=['POST'])
def gemini_chat():
    data = request.get_json()
    user_message = data.get("message", "")
    if not user_message:
        return jsonify({"reply": "No message provided."}), 400

    reply = get_gemini_response(user_message)
    return jsonify({"reply": reply})

# Enhanced chatbot endpoint with multilingual support
@app.route('/api/chat', methods=['POST'])
def enhanced_chat():
    """Enhanced chatbot endpoint with multilingual and voice support."""
    try:
        data = request.get_json()
        user_message = data.get("message", "")
        user_id = session.get('user_id')
        language = data.get("language", "en")
        conversation_id = data.get("conversation_id", "default")
        
        if not user_message:
            return jsonify({"error": "No message provided."}), 400
        
        # Generate response using enhanced chatbot
        response = chatbot.generate_response(
            user_message=user_message,
            user_id=user_id,
            language=language,
            conversation_id=conversation_id
        )
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Enhanced chat error: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

# Speech-to-Text endpoint
@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text():
    """Convert speech to text using Whisper."""
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        language = request.form.get('language')  # Optional language hint
        
        if not audio_file.filename:
            return jsonify({"error": "No audio file selected"}), 400
        
        # Transcribe audio
        transcribed_text, metadata = stt_service.transcribe_audio_file(
            audio_file, language
        )
        
        return jsonify({
            "text": transcribed_text,
            "metadata": metadata,
            "success": True
        })
        
    except Exception as e:
        print(f"Speech-to-text error: {str(e)}")
        return jsonify({"error": "Speech-to-text failed", "details": str(e)}), 500

# Text-to-Speech endpoint
@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech using ElevenLabs."""
    try:
        data = request.get_json()
        text = data.get("text", "")
        language = data.get("language", "en")
        voice_id = data.get("voice_id")

        if not text:
            return jsonify({"error": "No text provided"}), 400

        audio_data_uri = None
        metadata = {}

        # Prefer a text_to_speech API that returns (bytes, metadata) or bytes
        if hasattr(tts_service, 'text_to_speech'):
            res = tts_service.text_to_speech(text)
            if res:
                if isinstance(res, tuple) and len(res) >= 1:
                    audio_bytes, meta = res[0], res[1] if len(res) > 1 else {}
                else:
                    audio_bytes, meta = res, {}
                mime = meta.get('mime') if isinstance(meta, dict) and meta.get('mime') else 'audio/mpeg'
                import base64
                audio_data_uri = f"data:{mime};base64,{base64.b64encode(audio_bytes).decode('utf-8')}"
                metadata = meta

        # Fallback to generate_speech if present
        if not audio_data_uri and hasattr(tts_service, 'generate_speech'):
            try:
                res = tts_service.generate_speech(text=text, voice_id=voice_id, language=language)
                if isinstance(res, tuple) and isinstance(res[0], (bytes, bytearray)):
                    import base64
                    meta = res[1] if len(res) > 1 else {}
                    mime = meta.get('mime') if isinstance(meta, dict) and meta.get('mime') else 'audio/mpeg'
                    audio_data_uri = f"data:{mime};base64,{base64.b64encode(res[0]).decode('utf-8')}"
                    metadata = meta
                elif isinstance(res, (bytes, bytearray)):
                    import base64
                    audio_data_uri = f"data:audio/mpeg;base64,{base64.b64encode(res).decode('utf-8')}"
            except Exception as e:
                print(f"TTS generate_speech error: {e}")

        if not audio_data_uri:
            return jsonify({"error": "TTS generation failed or returned no audio"}), 500

        return jsonify({
            "audio": audio_data_uri,
            "metadata": metadata,
            "success": True
        })

    except Exception as e:
        print(f"Text-to-speech error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Text-to-speech failed", "details": str(e)}), 500

# Translation endpoint
# @app.route('/api/translate', methods=['POST'])
# def translate_text():
#     """Translate text between languages."""
#     try:
#         data = request.get_json()
#         text = data.get("text", "")
#         target_language = data.get("target_language", "en")
#         source_language = data.get("source_language")  # Optional
        
#         if not text:
#             return jsonify({"error": "No text provided"}), 400
        
#         if source_language:
#             # Direct translation
#             translated_text = translation_service.translate_text(
#                 text, source_language, target_language
#             )
#             detected_language = source_language
#         else:
#             # Detect and translate
#             translated_text, detected_language, confidence = translation_service.detect_and_translate(
#                 text, target_language
#             )
        
#         return jsonify({
#             "translated_text": translated_text,
#             "detected_language": detected_language,
#             "target_language": target_language,
#             "success": True
#         })
        
#     except Exception as e:
#         print(f"Translation error: {str(e)}")
#         return jsonify({"error": "Translation failed", "details": str(e)}), 500

# Previous voice_chat endpoint (deprecated)
# The old, multi-step `voice_chat` handler is commented out because the
# unified `/api/voice-chat` endpoint implemented later in this file now
# handles both text and voice requests. Keeping this commented block for
# reference; remove entirely when you're confident the unified handler is
# stable.
# @app.route('/api/voice-chat', methods=['POST'])
# def voice_chat():
#     """Deprecated: previous voice interaction pipeline.
#     This function combined STT, translation, chat, and TTS but has been
#     replaced by `unified_voice_chat`. It was left here commented for
#     reference during migration and debugging.
#     """
#     pass

# Get available voices endpoint
# ==========================================================
# UNIFIED CHATBOT API ENDPOINT (CORRECTED VERSION)
# ==========================================================
@app.route('/api/voice-chat', methods=['POST'])
def unified_voice_chat():
    # Backwards-compatible unified handler — route to the new separated endpoints
    # Keep this endpoint working by delegating to the text/voice handlers below.
    # If a client sends multipart/form-data with 'audio' file, forward to chat_voice()
    if request.files and 'audio' in request.files:
        return chat_voice()
    else:
        return chat_text()
    
# Get supported languages endpoint
# @app.route('/api/languages', methods=['GET'])
# def get_languages():
#     """Get supported languages for translation."""
#     try:
#         languages = translation_service.get_supported_languages()
#         return jsonify({
#             "languages": languages,
#             "success": True
#         })
#     except Exception as e:
#         print(f"Get languages error: {str(e)}")
#         return jsonify({"error": "Failed to get languages", "details": str(e)}), 500


# ===== New separate endpoints: /api/chat-text and /api/chat-voice =====
def _chat_pipeline(user_text, conversation_id='default'):
    """Core pipeline: generate AI response and (optionally) TTS audio bytes.
    Returns a dict: { reply_text, audio (data-uri or None), response_data }
    """
    # Generate AI response (chatbot returns a dict or a string)
    response_data = chatbot.generate_response(user_text, conversation_id)
    ai_response_text = response_data.get('reply') if isinstance(response_data, dict) else str(response_data)

    if not ai_response_text:
        raise ValueError('AI response empty')

    audio_base64 = None
    try:
        # Prefer explicit text_to_speech api
        if hasattr(tts_service, 'text_to_speech'):
            res = tts_service.text_to_speech(ai_response_text)
            if res:
                # Backwards-compatible: res may be bytes or (bytes, metadata)
                if isinstance(res, tuple) and len(res) >= 1:
                    audio_bytes, metadata = res[0], res[1] if len(res) > 1 else {}
                else:
                    audio_bytes, metadata = res, {}
                # Determine mime
                mime = metadata.get('mime') if isinstance(metadata, dict) and metadata.get('mime') else 'audio/mpeg'
                import base64
                audio_base64_raw = base64.b64encode(audio_bytes).decode('utf-8')
                # Send as data URI to frontend for simplicity
                audio_base64 = f"data:{mime};base64,{audio_base64_raw}"
        elif hasattr(tts_service, 'generate_speech'):
            res = tts_service.generate_speech(ai_response_text)
            if isinstance(res, tuple) and res[0]:
                import base64
                audio_base64_raw = base64.b64encode(res[0]).decode('utf-8')
                mime = res[1].get('mime') if isinstance(res[1], dict) and res[1].get('mime') else 'audio/mpeg'
                audio_base64 = f"data:{mime};base64,{audio_base64_raw}"
            elif isinstance(res, (bytes, bytearray)):
                import base64
                audio_base64_raw = base64.b64encode(res).decode('utf-8')
                audio_base64 = f"data:audio/mpeg;base64,{audio_base64_raw}"
    except Exception as e:
        # TTS is best-effort — log and continue
        print(f"TTS conversion error (pipeline): {e}")

    return { 'reply_text': ai_response_text, 'audio': audio_base64, 'response_data': response_data }


@app.route('/api/chat-text', methods=['POST'])
def chat_text():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "No message provided"}), 400
        user_message = data.get('message', '')
        if not user_message or not str(user_message).strip():
            return jsonify({"error": "No message provided"}), 400

        conversation_id = data.get('conversation_id', 'default')

        result = _chat_pipeline(user_message, conversation_id)

        # Normalize response and lift trip_plan (if present) to top-level for frontend ease
        response_data = result.get('response_data') or {}
        trip_plan = None
        if isinstance(response_data, dict):
            trip_plan = response_data.get('trip_plan')

        reply_text = result.get('reply_text') or result.get('reply') or ''

        payload = {
            'reply': reply_text,
            'reply_text': reply_text,
            'audio': result.get('audio'),
            'response_data': response_data,
            'success': True
        }
        if trip_plan:
            payload['trip_plan'] = trip_plan

        return jsonify(payload)
    except Exception as e:
        print(f"chat-text error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Chat (text) failed", "details": str(e)}), 500


@app.route('/api/chat-voice', methods=['POST'])
def chat_voice():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        audio_file = request.files.get('audio')
        if not audio_file or not getattr(audio_file, 'filename', None):
            return jsonify({"error": "No audio file provided"}), 400

        audio_bytes = audio_file.read()
        mime_type = audio_file.mimetype or 'audio/webm'

        # Transcribe using STT service (gemini_service or stt_service)
        try:
            transcribed = None
            if hasattr(gemini_service, 'speech_to_text'):
                transcribed = gemini_service.speech_to_text(audio_bytes, mime_type)
            else:
                transcribed, _ = stt_service.transcribe_audio_file(audio_file, None)
        except Exception as e:
            print(f"STT error: {e}")
            transcribed = None

        if not transcribed:
            return jsonify({"error": "Could not transcribe audio"}), 500

        conversation_id = request.form.get('conversation_id', 'default')
        result = _chat_pipeline(transcribed, conversation_id)

        # Normalize response and lift trip_plan to top-level
        response_data = result.get('response_data') or {}
        trip_plan = None
        if isinstance(response_data, dict):
            trip_plan = response_data.get('trip_plan')

        reply_text = result.get('reply_text') or result.get('reply') or ''

        payload = {
            'transcribed_text': transcribed,
            'reply': reply_text,
            'reply_text': reply_text,
            'audio': result.get('audio'),
            'response_data': response_data,
            'success': True
        }
        if trip_plan:
            payload['trip_plan'] = trip_plan

        return jsonify(payload)
    except Exception as e:
        print(f"chat-voice error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Chat (voice) failed", "details": str(e)}), 500

# Notification endpoints
@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    """Get user notifications."""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"error": "User not logged in"}), 401
        
        notifications = notification_service.get_user_notifications(user_id)
        return jsonify({
            "notifications": notifications,
            "success": True
        })
    except Exception as e:
        print(f"Get notifications error: {str(e)}")
        return jsonify({"error": "Failed to get notifications", "details": str(e)}), 500

@app.route('/api/notifications/<notification_id>/read', methods=['POST'])
@login_required
def mark_notification_read(notification_id):
    """Mark notification as read."""
    try:
        success = notification_service.mark_notification_read(notification_id)
        return jsonify({
            "success": success,
            "message": "Notification marked as read" if success else "Failed to mark as read"
        })
    except Exception as e:
        print(f"Mark notification read error: {str(e)}")
        return jsonify({"error": "Failed to mark notification as read", "details": str(e)}), 500

# Send email notification endpoint
@app.route('/api/send-email', methods=['POST'])
@login_required
def send_email_notification():
    """Send email notification to user."""
    try:
        data = request.get_json()
        user_email = session.get('user_email')
        if not user_email:
            return jsonify({"error": "User email not found"}), 401
        
        subject = data.get("subject", "TTravels Notification")
        template = data.get("template", "default")
        template_data = data.get("data", {})
        
        success = notification_service.send_email_notification(
            to_email=user_email,
            subject=subject,
            template=template,
            data=template_data
        )
        
        return jsonify({
            "success": success,
            "message": "Email sent successfully" if success else "Failed to send email"
        })
    except Exception as e:
        print(f"Send email error: {str(e)}")
        return jsonify({"error": "Failed to send email", "details": str(e)}), 500

# ------------------------------END--------------------------------------

#---------------------------------Booking------------------------------------
@app.route("/booking/flight.html")
@login_required
def booking_flight():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("booking/flight.html", logged_in=logged_in, username=username)

@app.route("/booking/payment.html")
@login_required
def booking_payment():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("booking/payment.html", logged_in=logged_in, username=username)

@app.route("/booking/confirmation.html")
@login_required
def booking_confirmation():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("booking/confirmation.html", logged_in=logged_in, username=username)


# Support both /booking/hotel and /booking/hotel.html for backward compatibility
@app.route("/booking/hotel")
@app.route("/booking/hotel.html")
@login_required
def booking_hotel():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("booking/hotel.html", logged_in=logged_in, username=username)

@app.route("/booking/train.html")
@login_required
def booking_train():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("booking/train.html", logged_in=logged_in, username=username)

@app.route("/booking/bus.html")
@login_required
def booking_bus():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("booking/bus.html", logged_in=logged_in, username=username)

@app.route("/booking/car.html")
@login_required
def booking_car():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("booking/car.html", logged_in=logged_in, username=username)

@app.route("/booking/package.html")
@login_required
def booking_package():
    logged_in = session.get('logged_in', False)
    username = session.get('username', '')
    return render_template("booking/package.html", logged_in=logged_in, username=username)

# --------------------------------------END-------------------------------------

@app.route("/api/save-booking", methods=["POST"])
@login_required
def save_booking():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No booking data provided"}), 400
        
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"success": False, "error": "User not logged in"}), 401
        
        import json
        booking_data = {
            "user_id": user_id,
            "type": data.get("type"),
            "service_type": data.get("service_type"),
            "service_id": data.get("service_id"),
            "num_passengers": data.get("num_passengers"),
            "num_guests": data.get("num_guests"),
            "fare_total": data.get("fare_total"),
            "payment_status": data.get("payment_status", "pending"),
            "created_at": datetime.now().isoformat(),
            # New fields for contact_info and details, stored as JSON strings
            "contact_info": json.dumps(data.get("contact_info", {})) if isinstance(data.get("contact_info"), dict) else data.get("contact_info"),
            "details": json.dumps(data.get("details", {})) if isinstance(data.get("details"), dict) else data.get("details")
        }
        
        print(f"Saving booking data: {booking_data}")
        result = insert_booking_document(booking_data)
        
        if result and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 500
        
        if result and '$id' in result:
            return jsonify({"success": True, "message": "Booking saved!", "booking_id": result['$id']})
        else:
            return jsonify({"success": False, "error": "Failed to save booking"}), 500
            
    except Exception as e:
        print(f"Booking save error: {str(e)}")
        return jsonify({"success": False, "error": f"Booking save failed: {str(e)}"}), 500

@app.route("/api/save-payment", methods=["POST"])
@login_required
def save_payment():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No payment data provided"}), 400
        
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"success": False, "error": "User not logged in"}), 401
        
        payment_data = {
            "booking_id": data.get("booking_id"),
            "amount": data.get("amount"),
            "method": data.get("method"),
            "status": data.get("status", "success"),
            "transaction_id": data.get("transaction_id"),
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id
        }
        
        print(f"Saving payment data: {payment_data}")
        result = insert_payment_document(payment_data)
        
        if result and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 500
        
        if result and '$id' in result:
            return jsonify({"success": True, "message": "Payment saved!", "payment_id": result['$id']})
        else:
            return jsonify({"success": False, "error": "Failed to save payment"}), 500
            
    except Exception as e:
        print(f"Payment save error: {str(e)}")
        return jsonify({"success": False, "error": f"Payment save failed: {str(e)}"}), 500


@app.route('/api/save-trip-plan', methods=['POST'])
@login_required
def save_trip_plan():
    """Save a user's trip plan to Appwrite saved_trip_plans collection."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No trip plan provided"}), 400

        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"success": False, "error": "User not logged in"}), 401

        # Accept either a dict under 'trip_plan' or a raw plan payload
        trip_plan = data.get('trip_plan') if isinstance(data.get('trip_plan'), (dict, list)) else data.get('trip_plan', data)

        # Prepare document payload
        import json as _json
        doc = {
            "user_id": user_id,
            "title": data.get('title', ''),
            "created_at": datetime.now().isoformat(),
        }

        # Store trip_plan and metadata as JSON strings to be robust
        if isinstance(trip_plan, (dict, list)):
            doc['trip_plan'] = _json.dumps(trip_plan)
        else:
            # already a string or other serializable
            doc['trip_plan'] = trip_plan

        if 'metadata' in data:
            doc['metadata'] = _json.dumps(data.get('metadata')) if isinstance(data.get('metadata'), (dict, list)) else data.get('metadata')

        print(f"Saving trip plan for user {user_id}: title={doc.get('title')}")
        result = save_trip_plan_document(doc)

        if result and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 500

        if result and '$id' in result:
            return jsonify({"success": True, "message": "Trip plan saved!", "trip_plan_id": result['$id']})
        else:
            return jsonify({"success": False, "error": "Failed to save trip plan"}), 500

    except Exception as e:
        print(f"Save trip plan error: {str(e)}")
        return jsonify({"success": False, "error": f"Save trip plan failed: {str(e)}"}), 500


@app.route('/api/my-saved-plans', methods=['GET'])
@login_required
def my_saved_plans():
    """Return list of saved trip plans for the logged-in user."""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'User not logged in'}), 401

        result = get_saved_trip_plans_for_user(user_id)
        if not result:
            return jsonify({'success': True, 'plans': []})

        if isinstance(result, dict) and result.get('error'):
            return jsonify({'success': False, 'error': result.get('error')}), 500

        # Appwrite returns a dict with 'documents' key
        docs = result.get('documents', []) if isinstance(result, dict) else []

        plans = []
        import json as _json
        for d in docs:
            # trip_plan may be stored as a JSON string
            tp = d.get('trip_plan')
            try:
                plan_obj = _json.loads(tp) if isinstance(tp, str) else tp
            except Exception:
                plan_obj = tp

            plans.append({
                'id': d.get('$id'),
                'title': d.get('title') or (plan_obj.get('details', {}).get('destination') if isinstance(plan_obj, dict) else ''),
                'saved_at': d.get('created_at') or d.get('createdAt') or d.get('$createdAt'),
                'trip_plan': plan_obj,
                'raw': d
            })

        return jsonify({'success': True, 'plans': plans})
    except Exception as e:
        print(f"Error fetching saved plans: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/saved-trip-plan/<plan_id>', methods=['GET'])
@login_required
def get_saved_plan(plan_id):
    """Return a single saved trip plan document by id."""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'User not logged in'}), 401

        result = get_trip_plan_document(plan_id)
        if not result:
            return jsonify({'success': False, 'error': 'Not found'}), 404

        if isinstance(result, dict) and result.get('error'):
            return jsonify({'success': False, 'error': result.get('error')}), 500

        import json as _json
        tp = result.get('trip_plan')
        try:
            plan_obj = _json.loads(tp) if isinstance(tp, str) else tp
        except Exception:
            plan_obj = tp

        # Confirm ownership — best-effort check
        if result.get('user_id') and result.get('user_id') != user_id:
            return jsonify({'success': False, 'error': 'Forbidden'}), 403

        return jsonify({'success': True, 'plan': {'id': result.get('$id'), 'title': result.get('title'), 'trip_plan': plan_obj, 'raw': result}})
    except Exception as e:
        print(f"Error fetching saved plan: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/edit-trip/<plan_id>', methods=['GET'])
@login_required
def edit_trip_page(plan_id):
    """Render the edit trip page."""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return redirect('/login')
        
        # Verify plan exists and belongs to user
        result = get_trip_plan_document(plan_id)
        if not result or (isinstance(result, dict) and result.get('error')):
            return redirect('/dashboard')
        
        # Check ownership
        if result.get('user_id') and result.get('user_id') != user_id:
            return redirect('/dashboard')
        
        return render_template('edit_trip.html', plan_id=plan_id)
    except Exception as e:
        print(f"Error loading edit trip page: {e}")
        return redirect('/dashboard')


@app.route('/api/edit-trip-chat', methods=['POST'])
@login_required
def edit_trip_chat():
    """Handle chat requests for modifying trip plans."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'User not logged in'}), 401
        
        user_message = data.get('user_message', '')
        current_plan = data.get('current_plan', {})
        plan_id = data.get('plan_id', '')
        
        if not user_message:
            return jsonify({'success': False, 'error': 'No message provided'}), 400
        
        if not current_plan:
            return jsonify({'success': False, 'error': 'No current plan provided'}), 400
        
        # Call modify_trip_plan function
        modified_plan, bot_reply = modify_trip_plan(user_message, current_plan)
        
        return jsonify({
            'success': True,
            'updated_plan': modified_plan,
            'reply': bot_reply,
            'bot_reply': bot_reply
        })
    except Exception as e:
        print(f"Error in edit-trip-chat: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/update-trip-plan/<plan_id>', methods=['PUT'])
@login_required
def update_trip_plan(plan_id):
    """Update a saved trip plan."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'User not logged in'}), 401
        
        # Verify plan exists and belongs to user
        result = get_trip_plan_document(plan_id)
        if not result or (isinstance(result, dict) and result.get('error')):
            return jsonify({'success': False, 'error': 'Plan not found'}), 404
        
        # Check ownership
        if result.get('user_id') and result.get('user_id') != user_id:
            return jsonify({'success': False, 'error': 'Forbidden'}), 403
        
        # Prepare update data
        trip_plan = data.get('trip_plan', {})
        update_data = {
            'trip_plan': trip_plan
        }
        
        # Update the document
        update_result = update_trip_plan_document(plan_id, update_data)
        
        if isinstance(update_result, dict) and update_result.get('error'):
            return jsonify({'success': False, 'error': update_result.get('error')}), 500
        
        return jsonify({
            'success': True,
            'message': 'Trip plan updated successfully',
            'plan_id': plan_id
        })
    except Exception as e:
        print(f"Error updating trip plan: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/delete-trip-plan/<plan_id>', methods=['DELETE'])
@login_required
def delete_trip_plan(plan_id):
    """Delete a saved trip plan."""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'User not logged in'}), 401

        # Verify plan exists
        result = get_trip_plan_document(plan_id)
        if not result or (isinstance(result, dict) and result.get('error')):
            return jsonify({'success': False, 'error': 'Plan not found'}), 404

        # Check ownership
        if result.get('user_id') and result.get('user_id') != user_id:
            return jsonify({'success': False, 'error': 'Forbidden'}), 403

        # Delete document
        from db import delete_trip_plan_document
        delete_result = delete_trip_plan_document(plan_id)
        if isinstance(delete_result, dict) and delete_result.get('error'):
            return jsonify({'success': False, 'error': delete_result.get('error')}), 500

        return jsonify({'success': True, 'message': 'Trip plan deleted'})
    except Exception as e:
        print(f"Error deleting trip plan: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# --- Frontend Example Usage (add to your booking/payment JS) ---
# To save a booking (after user confirms booking):
# fetch('/api/save-booking', {
#   method: 'POST',
#   headers: { 'Content-Type': 'application/json' },
#   body: JSON.stringify(bookingData)
# })
# .then(res => res.json())
# .then(data => { /* handle response, get booking_id for payment */ });
#
# To save a payment (after payment is successful):
# fetch('/api/save-payment', {
#   method: 'POST',
#   headers: { 'Content-Type': 'application/json' },
#   body: JSON.stringify(paymentData)
# })
# .then(res => res.json())
# .then(data => { /* handle response, show confirmation */ });

# --- API endpoint to get current user's bookings ---
@app.route('/api/my-bookings', methods=['GET'])
@login_required
def get_my_bookings():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'User not logged in'}), 401
        # Query Appwrite for bookings with this user_id
        from appwrite.query import Query
        bookings = []
        try:
            result = databases.list_documents(
                database_id=os.getenv("APPWRITE_DATABASE_ID"),
                collection_id="bookings",
                queries=[Query.equal("user_id", [user_id])]
            )
            bookings = result.get('documents', [])
        except Exception as e:
            print(f"Error fetching user bookings: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch bookings'}), 500
        return jsonify({'success': True, 'bookings': bookings})
    except Exception as e:
        print(f"Error in get_my_bookings: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --- Admin API endpoints for all bookings, users, payments ---
from appwrite.query import Query

@app.route('/api/admin/bookings', methods=['GET'])
@admin_login_required
def admin_get_bookings():
    try:
        result = databases.list_documents(
            database_id=os.getenv("APPWRITE_DATABASE_ID"),
            collection_id="bookings"
        )
        return jsonify({'success': True, 'bookings': result.get('documents', [])})
    except Exception as e:
        print(f"Admin fetch bookings error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/users', methods=['GET'])
@admin_login_required
def admin_get_users():
    try:
        result = databases.list_documents(
            database_id=os.getenv("APPWRITE_DATABASE_ID"),
            collection_id=os.getenv("APPWRITE_COLLECTION_ID")
        )
        return jsonify({'success': True, 'users': result.get('documents', [])})
    except Exception as e:
        print(f"Admin fetch users error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/payments', methods=['GET'])
@admin_login_required
def admin_get_payments():
    try:
        result = databases.list_documents(
            database_id=os.getenv("APPWRITE_DATABASE_ID"),
            collection_id="payments"
        )
        return jsonify({'success': True, 'payments': result.get('documents', [])})
    except Exception as e:
        print(f"Admin fetch payments error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/ai-logs', methods=['GET'])
@admin_login_required
def admin_get_ai_logs():
    """Fetch all saved trip plans from Appwrite"""
    try:
        collection_id = os.getenv("SAVED_TRIP_PLANS_COLLECTION_ID", "saved_trip_plans")
        result = databases.list_documents(
            database_id=os.getenv("APPWRITE_DATABASE_ID"),
            collection_id=collection_id
        )
        return jsonify({'success': True, 'logs': result.get('documents', [])})
    except Exception as e:
        print(f"Admin fetch AI logs error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/ai-logs/<log_id>', methods=['GET'])
@admin_login_required
def admin_get_ai_log(log_id):
    """Fetch a specific saved trip plan by ID"""
    try:
        collection_id = os.getenv("SAVED_TRIP_PLANS_COLLECTION_ID", "saved_trip_plans")
        result = databases.get_document(
            database_id=os.getenv("APPWRITE_DATABASE_ID"),
            collection_id=collection_id,
            document_id=log_id
        )
        return jsonify({'success': True, 'log': result})
    except Exception as e:
        print(f"Admin fetch AI log error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/ai-logs/<log_id>', methods=['DELETE'])
@admin_login_required
def admin_delete_ai_log(log_id):
    """Delete a saved trip plan by ID"""
    try:
        collection_id = os.getenv("SAVED_TRIP_PLANS_COLLECTION_ID", "saved_trip_plans")
        databases.delete_document(
            database_id=os.getenv("APPWRITE_DATABASE_ID"),
            collection_id=collection_id,
            document_id=log_id
        )
        return jsonify({'success': True, 'message': 'AI log deleted successfully'})
    except Exception as e:
        print(f"Admin delete AI log error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500



if __name__ == "__main__":
    # app.run(debug=True)
    port = int(os.environ.get("PORT", 5000))  # Render gives you a PORT
    app.run(host="0.0.0.0", port=port, debug=False)
