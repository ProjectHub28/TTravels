# from google import genai
# from google.genai import types
# import os
# import json
# import logging
# from typing import Dict, List, Optional, Any
# from datetime import datetime, timedelta
# from services.translate import translation_service
# from services.notification import notification_service

# # Configure logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# class TTravelsChatbot:
#     def __init__(self):
#         """Initialize the TTravels AI Chatbot."""
#         self.gemini_client = None
#         self.conversation_history = {}
#         self._init_gemini()
    
#     def _init_gemini(self):
#         """Initialize Gemini client."""
#         try:
#             GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
#             if not GEMINI_API_KEY:
#                 logger.error("GEMINI_API_KEY not found in environment variables")
#                 return
            
#             self.gemini_client = genai.Client(api_key=GEMINI_API_KEY)
#             logger.info("Gemini client initialized successfully")
#         except Exception as e:
#             logger.error(f"Failed to initialize Gemini client: {e}")
    
#     def get_system_instructions(self) -> str:
#         """Get comprehensive system instructions for the chatbot."""
#         return """
#         You are TTravels Assistant, an advanced AI travel booking chatbot with the following capabilities:

#         CORE FUNCTIONS:
#         1. Travel Planning: Help users plan complete trips including flights, hotels, trains, buses, and car rentals
#         2. Booking Assistance: Guide users through booking processes and provide booking references
#         3. Multilingual Support: Communicate in multiple languages (Hindi, English, Spanish, French, etc.)
#         4. Voice Interaction: Support both text and voice-based interactions
#         5. Smart Recommendations: Provide personalized travel suggestions based on user preferences

#         TRAVEL SERVICES:
#         - Flights: Search and book domestic/international flights
#         - Hotels: Find and book accommodations with price comparisons
#         - Trains: Indian railway bookings and route planning
#         - Buses: Intercity and local bus bookings
#         - Car Rentals: Self-drive and chauffeur-driven options
#         - Travel Packages: Complete holiday packages

#         RESPONSE GUIDELINES:
#         1. Always be helpful, friendly, and professional
#         2. Provide specific, actionable information
#         3. Ask clarifying questions when needed
#         4. Offer multiple options when available
#         5. Include relevant details like prices, timings, and booking references
#         6. Suggest additional services that might be useful
#         7. If you don't know something, admit it and offer to help find the information

#         CONTEXT AWARENESS:
#         - Remember previous conversation context
#         - Build on user preferences and past bookings
#         - Provide personalized recommendations
#         - Maintain conversation flow naturally

#         BOOKING INTEGRATION:
#         - When users want to book, guide them to the appropriate booking page
#         - Provide booking references and confirmation details
#         - Help with booking modifications and cancellations
#         - Send booking confirmations and reminders

#         Always respond in a conversational, helpful manner that makes users feel confident about their travel decisions.
#         """
    
#     def get_travel_context(self, user_message: str) -> Dict[str, Any]:
#         """
#         Extract travel context from user message.
        
#         Args:
#             user_message: User's message
            
#         Returns:
#             Dictionary containing extracted travel context
#         """
#         context = {
#             "intent": "general",
#             "service_type": None,
#             "origin": None,
#             "destination": None,
#             "travel_date": None,
#             "return_date": None,
#             "passengers": 1,
#             "budget": None,
#             "preferences": []
#         }
        
#         message_lower = user_message.lower()
        
#         # Detect service type
#         if any(word in message_lower for word in ["flight", "fly", "airplane", "airline"]):
#             context["service_type"] = "flight"
#         elif any(word in message_lower for word in ["hotel", "accommodation", "stay", "room"]):
#             context["service_type"] = "hotel"
#         elif any(word in message_lower for word in ["train", "railway", "rail"]):
#             context["service_type"] = "train"
#         elif any(word in message_lower for word in ["bus", "coach"]):
#             context["service_type"] = "bus"
#         elif any(word in message_lower for word in ["car", "rental", "drive"]):
#             context["service_type"] = "car"
        
#         # Detect intent
#         if any(word in message_lower for word in ["book", "reserve", "buy", "purchase"]):
#             context["intent"] = "booking"
#         elif any(word in message_lower for word in ["search", "find", "look for", "show"]):
#             context["intent"] = "search"
#         elif any(word in message_lower for word in ["plan", "suggest", "recommend"]):
#             context["intent"] = "planning"
#         elif any(word in message_lower for word in ["cancel", "modify", "change"]):
#             context["intent"] = "modification"
        
#         # Extract dates (basic pattern matching)
#         import re
#         date_patterns = [
#             r"(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})",  # DD/MM/YYYY or DD-MM-YYYY
#             r"(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})",  # YYYY/MM/DD or YYYY-MM-DD
#             r"(tomorrow|today|next week|next month)",
#             r"(january|february|march|april|may|june|july|august|september|october|november|december)"
#         ]
        
#         for pattern in date_patterns:
#             match = re.search(pattern, message_lower)
#             if match:
#                 context["travel_date"] = match.group(0)
#                 break
        
#         return context
    
#     def generate_response(self, user_message: str, user_id: Optional[str] = None, 
#                          language: str = "en", conversation_id: Optional[str] = None) -> Dict[str, Any]:
#         """
#         Generate a comprehensive response using Gemini API.
        
#         Args:
#             user_message: User's message
#             user_id: User ID for personalization
#             language: User's preferred language
#             conversation_id: Conversation ID for context
            
#         Returns:
#             Dictionary containing response data
#         """
#         if not self.gemini_client:
#             return {
#                 "reply": "I'm sorry, but I'm currently unavailable. Please try again later.",
#                 "error": "Gemini client not initialized"
#             }
        
#         try:
#             # Get conversation history
#             history = self.conversation_history.get(conversation_id or "default", [])
            
#             # Extract travel context
#             travel_context = self.get_travel_context(user_message)
            
#             # Build context-aware prompt
#             context_prompt = self._build_context_prompt(user_message, travel_context, history, user_id)
            
#             # Call Gemini API
#             response = self.gemini_client.models.generate_content(
#                 model="gemini-2.5-flash",
#                 contents=context_prompt,
#                 config=types.GenerateContentConfig(
#                     temperature=0.7,
#                     top_p=0.9,
#                     max_output_tokens=800,
#                     thinking_config=types.ThinkingConfig(thinking_budget=0)
#                 ),
#             )
            
#             reply_text = getattr(response, 'text', None) or "Sorry, I couldn't generate a reply."
            
#             # Update conversation history
#             history.append({"role": "user", "content": user_message})
#             history.append({"role": "assistant", "content": reply_text})
            
#             # Keep only last 10 exchanges
#             if len(history) > 20:
#                 history = history[-20:]
            
#             self.conversation_history[conversation_id or "default"] = history
            
#             # Generate response data
#             response_data = {
#                 "reply": reply_text,
#                 "travel_context": travel_context,
#                 "suggestions": self._generate_suggestions(travel_context),
#                 "quick_actions": self._get_quick_actions(travel_context),
#                 "language": language,
#                 "timestamp": datetime.now().isoformat()
#             }
            
#             # Add booking-specific actions
#             if travel_context["intent"] == "booking":
#                 response_data["booking_actions"] = self._get_booking_actions(travel_context)
            
#             return response_data
            
#         except Exception as e:
#             logger.error(f"Error generating response: {e}")
#             return {
#                 "reply": "I'm sorry, I encountered an error. Please try again.",
#                 "error": str(e)
#             }
    
#     def _build_context_prompt(self, user_message: str, travel_context: Dict[str, Any], 
#                             history: List[Dict], user_id: Optional[str]) -> str:
#         """Build a context-aware prompt for Gemini."""
#         system_instructions = self.get_system_instructions()
        
#         # Add conversation history
#         history_text = ""
#         if history:
#             history_text = "\n\nPrevious conversation:\n"
#             for exchange in history[-6:]:  # Last 6 exchanges
#                 role = "User" if exchange["role"] == "user" else "Assistant"
#                 history_text += f"{role}: {exchange['content']}\n"
        
#         # Add travel context
#         context_text = f"""
#         Current travel context:
#         - Intent: {travel_context['intent']}
#         - Service Type: {travel_context['service_type'] or 'Not specified'}
#         - Origin: {travel_context['origin'] or 'Not specified'}
#         - Destination: {travel_context['destination'] or 'Not specified'}
#         - Travel Date: {travel_context['travel_date'] or 'Not specified'}
#         - Passengers: {travel_context['passengers']}
#         """
        
#         # Add user personalization
#         user_context = ""
#         if user_id:
#             user_context = f"\nUser ID: {user_id} (use this for personalization)"
        
#         return f"{system_instructions}\n\n{context_text}\n{user_context}\n{history_text}\n\nCurrent user message: {user_message}"
    
#     def _generate_suggestions(self, travel_context: Dict[str, Any]) -> List[str]:
#         """Generate relevant suggestions based on travel context."""
#         suggestions = []
        
#         if travel_context["service_type"] == "flight":
#             suggestions.extend([
#                 "Search for flights",
#                 "Check flight prices",
#                 "Book a flight",
#                 "View flight schedules"
#             ])
#         elif travel_context["service_type"] == "hotel":
#             suggestions.extend([
#                 "Find hotels",
#                 "Check hotel availability",
#                 "Book accommodation",
#                 "View hotel reviews"
#             ])
#         elif travel_context["service_type"] == "train":
#             suggestions.extend([
#                 "Search trains",
#                 "Check train schedules",
#                 "Book train tickets",
#                 "View train routes"
#             ])
#         else:
#             suggestions.extend([
#                 "Plan a trip",
#                 "Search for travel options",
#                 "Get travel recommendations",
#                 "Check my bookings"
#             ])
        
#         return suggestions[:4]  # Limit to 4 suggestions
    
#     def _get_quick_actions(self, travel_context: Dict[str, Any]) -> List[Dict[str, str]]:
#         """Get quick action buttons based on context."""
#         actions = []
        
#         if travel_context["intent"] == "booking":
#             actions.append({"text": "Complete Booking", "action": "book", "icon": "ri-check-line"})
#             actions.append({"text": "View Details", "action": "details", "icon": "ri-eye-line"})
#         elif travel_context["intent"] == "search":
#             actions.append({"text": "Search Now", "action": "search", "icon": "ri-search-line"})
#             actions.append({"text": "Filter Results", "action": "filter", "icon": "ri-filter-line"})
#         else:
#             actions.append({"text": "Get Help", "action": "help", "icon": "ri-question-line"})
#             actions.append({"text": "Contact Support", "action": "support", "icon": "ri-customer-service-line"})
        
#         return actions
    
#     def _get_booking_actions(self, travel_context: Dict[str, Any]) -> List[Dict[str, str]]:
#         """Get booking-specific actions."""
#         actions = []
        
#         if travel_context["service_type"] == "flight":
#             actions.append({"text": "Book Flight", "url": "/booking/flight.html", "icon": "ri-flight-takeoff-line"})
#         elif travel_context["service_type"] == "hotel":
#             actions.append({"text": "Book Hotel", "url": "/booking/hotel.html", "icon": "ri-hotel-line"})
#         elif travel_context["service_type"] == "train":
#             actions.append({"text": "Book Train", "url": "/booking/train.html", "icon": "ri-train-line"})
#         elif travel_context["service_type"] == "bus":
#             actions.append({"text": "Book Bus", "url": "/booking/bus.html", "icon": "ri-bus-line"})
#         elif travel_context["service_type"] == "car":
#             actions.append({"text": "Book Car", "url": "/booking/car.html", "icon": "ri-car-line"})
        
#         return actions
    
#     def send_travel_notification(self, user_id: str, notification_type: str, 
#                                travel_data: Dict[str, Any]) -> bool:
#         """
#         Send travel-related notification to user.
        
#         Args:
#             user_id: User ID
#             notification_type: Type of notification
#             travel_data: Travel-related data
            
#         Returns:
#             True if sent successfully, False otherwise
#         """
#         try:
#             if notification_type == "booking_confirmation":
#                 return notification_service.create_web_notification(
#                     user_id=user_id,
#                     title="Booking Confirmed! 🎉",
#                     message=f"Your {travel_data.get('service_type', 'travel')} booking has been confirmed.",
#                     notification_type="success",
#                     data=travel_data
#                 )
#             elif notification_type == "trip_reminder":
#                 return notification_service.create_web_notification(
#                     user_id=user_id,
#                     title="Trip Reminder ⏰",
#                     message=f"Your trip to {travel_data.get('destination', 'destination')} is coming up!",
#                     notification_type="info",
#                     data=travel_data
#                 )
            
#             return True
#         except Exception as e:
#             logger.error(f"Failed to send notification: {e}")
#             return False

# # Global instance
# chatbot = TTravelsChatbot()

# def get_gemini_response(user_message: str) -> str:
#     """
#     Legacy function for backward compatibility.
    
#     Args:
#         user_message: User's message
        
#     Returns:
#         Chatbot response
#     """
#     response = chatbot.generate_response(user_message)
#     return response.get("reply", "Sorry, I couldn't generate a response.")


# File: chatbot.py
import os
import logging
from typing import Dict, List, Optional, Any
from flask import session
from datetime import datetime, timedelta
# from trip_planner import generate_trip_plan
# At the top of chatbot.py
from trip_planner import generate_trip_plan_from_details, extract_trip_details, get_flight_options, get_hotel_options, get_attractions, build_itinerary

# Import our new, clean Gemini service
from services.gemini_service import gemini_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TTravelsChatbot:
    def __init__(self):
        self.conversation_history = {}
    
    def get_system_instructions(self) -> str:
        """Get comprehensive system instructions for the chatbot."""
        # Your excellent, detailed prompt remains here.
        return """
        You are TTravels Assistant, an advanced AI travel booking chatbot with the following capabilities:

        CORE FUNCTIONS:
        1. Travel Planning: Help users plan complete trips including flights, hotels, trains, buses, and car rentals
        2. Booking Assistance: Guide users through booking processes and provide booking references
        3. Multilingual Support: Communicate in multiple languages (Hindi, English, Spanish, French, etc.)
        4. Voice Interaction: Support both text and voice-based interactions
        5. Smart Recommendations: Provide personalized travel suggestions based on user preferences

        TRAVEL SERVICES:
        - Flights: Search and book domestic/international flights
        - Hotels: Find and book accommodations with price comparisons
        - Trains: Indian railway bookings and route planning
        - Buses: Intercity and local bus bookings
        - Car Rentals: Self-drive and chauffeur-driven options
        - Travel Packages: Complete holiday packages

        RESPONSE GUIDELINES:
        1. Always be helpful, friendly, and professional
        2. Provide specific, actionable information
        3. Ask clarifying questions when needed
        4. Offer multiple options when available
        5. Include relevant details like prices, timings, and booking references
        6. Suggest additional services that might be useful
        7. If you don't know something, admit it and offer to help find the information

        CONTEXT AWARENESS:
        - Remember previous conversation context
        - Build on user preferences and past bookings
        - Provide personalized recommendations
        - Maintain conversation flow naturally

        BOOKING INTEGRATION:
        - When users want to book, guide them to the appropriate booking page
        - Provide booking references and confirmation details
        - Help with booking modifications and cancellations
        - Send booking confirmations and reminders

        Always respond in a conversational, helpful manner that makes users feel confident about their travel decisions.
        """
    
    # --- PASTE YOUR HELPER METHODS HERE ---
    # Copy and paste your existing helper methods like get_travel_context,
    # _generate_suggestions, _get_quick_actions, etc., into this space.
    # For example:
    def get_travel_context(self, user_message: str) -> Dict[str, Any]:
        """
        Extract travel context from user message.
        (Your full function content)
        """
        # (Keep the rest of your helper functions here)
        return {} # Placeholder
    
    def _build_context_prompt(self, user_message: str, history: List[Dict]) -> str:
        """Build a context-aware prompt for Gemini."""
        system_instructions = self.get_system_instructions()
        
        history_text = ""
        if history:
            history_text = "\n\nPrevious conversation:\n"
            # Keep history concise for the prompt
            for exchange in history[-6:]:
                role = "User" if exchange["role"] == "user" else "Assistant"
                history_text += f"{role}: {exchange['content']}\n"
        
        return f"{system_instructions}\n{history_text}\nCurrent user message: {user_message}"
        
    def generate_response(self, user_message: str, conversation_id: Optional[str] = "default") -> Dict[str, Any]:
        """
        Orchestrates generating a response using the Gemini service.
        """
        try:
            # Defensive normalization: some callers may accidentally pass a dict
            # (for example the whole request JSON) instead of a plain string.
            # Normalize to a text string we can safely call .lower() on.
            if not isinstance(user_message, str):
                logger.info(f"generate_response received non-str user_message of type {type(user_message)}; attempting to extract text")
                if isinstance(user_message, dict):
                    # Try common keys that might contain the text
                    for k in ("message", "text", "transcribed_text", "transcription", "transcript", "content"):
                        v = user_message.get(k)
                        if isinstance(v, str) and v.strip():
                            user_message = v
                            break
                    else:
                        # Fallback to a simple string conversion
                        user_message = str(user_message)
                else:
                    user_message = str(user_message)

            # --- PHASE 2: INTENT DETECTION ---
            # (For now, we'll use a simple keyword check. You can upgrade 
            # this to a Gemini call as we discussed in the workflow.)

            import re
            user_text_lower = user_message.lower()
            # Detect "create full trip plan" - should trigger comprehensive trip plan generation
            is_full_trip_plan_request = bool(re.search(r"\b(create|make|generate|build).*(full|complete|entire|whole|comprehensive).*(trip|plan|itinerary)\b", user_text_lower)) or \
                                        bool(re.search(r"\b(now|then|please).*(create|make|generate).*(full|complete|entire|whole|comprehensive).*(trip|plan|itinerary)\b", user_text_lower))
            # Require a planning keyword AND some indication of a destination or duration to avoid false positives
            has_plan_keyword = bool(re.search(r"\b(plan|itinerary|trip)\b", user_text_lower))
            has_destination_or_duration = bool(re.search(r"\bto\b|\bfor\b|\bdays?\b|\b\d{1,2}\b", user_text_lower))
            is_plan_request = has_plan_keyword and (has_destination_or_duration or is_full_trip_plan_request)
            
            # Detect general greetings/chat (should bypass planning)
            is_general_greeting = bool(re.search(r"\b(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b", user_text_lower)) and not has_plan_keyword

            # --- NEW: SEARCH INTENT HANDLERS ---
            # Detect flight search
            import re
            is_flight_search = bool(re.search(r"\b(flight|flights)\b", user_text_lower)) and bool(re.search(r"\b(from|to|on|depart)\b", user_text_lower))
            is_hotel_search = bool(re.search(r"\b(hotel|hotels|accommodation|stay|room|find.*hotel|show.*hotel|add.*hotel)\b", user_text_lower))
            
            # Check if user is asking to add hotels to existing trip plan
            is_add_hotels_request = bool(re.search(r"\b(add|find|show|get|search for).*(hotel|hotels|accommodation|stay)\b", user_text_lower)) and not is_plan_request

            if is_flight_search:
                # Get conversation history for context
                history = self.conversation_history.get(conversation_id, [])
                details = extract_trip_details(user_message, conversation_history=history)
                if not details:
                    return {"reply": "I couldn't parse the flight details. Could you say something like: 'Find flights from Delhi to Mumbai on 2025-11-15'?"}

                origin = details.get('origin')
                destination = details.get('destination')
                date = details.get('departure_date')
                return_date = details.get('return_date')

                if not origin or not destination or not date:
                    # Ask clarifying question for missing pieces
                    missing = []
                    if not origin:
                        missing.append('origin')
                    if not destination:
                        missing.append('destination')
                    if not date:
                        missing.append('date')
                    return {"reply": f"I need the following to search flights: {', '.join(missing)}. Could you provide that?"}

                flights = get_flight_options(origin, destination, date, return_date)
                if isinstance(flights, dict) and flights.get('error'):
                    return {"reply": f"I couldn't fetch flights: {flights.get('error')}"}
                formatted = self._format_flight_response(flights, origin, destination, date, return_date)
                
                # Update conversation history
                history = self.conversation_history.get(conversation_id, [])
                history.append({"role": "user", "content": user_message})
                history.append({"role": "assistant", "content": formatted})
                self.conversation_history[conversation_id] = history[-20:]
                
                return {"reply": formatted}

            if is_hotel_search or is_add_hotels_request:
                # Get conversation history for context
                history = self.conversation_history.get(conversation_id, [])
                details = extract_trip_details(user_message, conversation_history=history)
                
                # Try to get destination from conversation history if not in current message
                if not details or not isinstance(details, dict):
                    details = {"details": {}}
                
                details_dict = details.get("details", {}) if isinstance(details, dict) else {}
                
                # Check conversation history for previously mentioned destination
                destination = details_dict.get('destination')
                if not destination:
                    for msg in reversed(history[-10:]):
                        if msg.get("role") == "user":
                            prev_extracted = extract_trip_details(msg.get("content", ""), conversation_history=history)
                            if prev_extracted and isinstance(prev_extracted, dict):
                                prev_dest = prev_extracted.get("details", {}).get("destination")
                                if prev_dest:
                                    destination = prev_dest
                                    break
                
                # Also check session context
                if not destination:
                    context = session.get('trip_context', {})
                    destination = context.get('destination')
                
                # Check-in / check-out and other hotel params
                check_in = details_dict.get('departure_date') or session.get('trip_context', {}).get('departure_date')
                check_out = details_dict.get('return_date') or session.get('trip_context', {}).get('return_date')
                adults = details_dict.get('adults') or details_dict.get('passengers') or session.get('trip_context', {}).get('adults') or 2
                budget = details_dict.get('budget') or session.get('trip_context', {}).get('budget')

                if not destination:
                    return {"reply": "I need to know the destination. Could you tell me where you'd like to find hotels? (e.g., 'Show hotels in Goa' or 'Find hotels for my trip to Mumbai')"}

                # If no check_in provided, use a default (7 days from now)
                if not check_in:
                    check_in = (datetime.now() + timedelta(days=7)).date().isoformat()

                # If no check_out provided but days present in details, compute check_out
                days = details_dict.get('days') or session.get('trip_context', {}).get('days')
                if not check_out and days:
                    try:
                        from datetime import datetime as _dt
                        ci = _dt.fromisoformat(check_in).date()
                        check_out = (ci + timedelta(days=int(days))).isoformat()
                    except Exception:
                        check_out = None

                hotels = get_hotel_options(destination, check_in, check_out, adults=adults, budget=budget)
                if isinstance(hotels, dict) and hotels.get('error'):
                    return {"reply": f"I couldn't fetch hotels: {hotels.get('error')}"}

                # If this is an add request, return hotels in trip_plan format
                if is_add_hotels_request and hotels and not isinstance(hotels, dict):
                    # Create a mini trip plan with just hotels
                    mini_plan = {
                        "details": {
                            "destination": destination,
                            "departure_date": check_in,
                            "return_date": check_out,
                            "adults": adults,
                            "budget": budget
                        },
                        "hotels": hotels if isinstance(hotels, list) else [hotels]
                    }
                    formatted = self._format_hotel_response(hotels, destination, check_in)
                    formatted += "\n\nI've added these hotel options to your trip plan. You can select one by clicking the 'Select' button."
                    
                    history.append({"role": "user", "content": user_message})
                    history.append({"role": "assistant", "content": formatted})
                    self.conversation_history[conversation_id] = history[-20:]
                    
                    return {"reply": formatted, "trip_plan": mini_plan}
                else:
                    formatted = self._format_hotel_response(hotels, destination, check_in)
                    
                    # Update conversation history
                    history = self.conversation_history.get(conversation_id, [])
                    history.append({"role": "user", "content": user_message})
                    history.append({"role": "assistant", "content": formatted})
                    self.conversation_history[conversation_id] = history[-20:]
                    
                    # Return structured hotel results for frontend rendering
                    reply_text = formatted
                    return {"reply": reply_text, "hotel_results": hotels}

            # end search intent handlers

            # Handle general greetings (bypass planning)
            if is_general_greeting:
                history = self.conversation_history.get(conversation_id, [])
                full_prompt = self._build_context_prompt(user_message, history)
                reply_text = gemini_service.generate_chat_response(full_prompt)
                
                if not reply_text:
                    reply_text = "Hello! How can I help you plan your trip today?"
                
                history.append({"role": "user", "content": user_message})
                history.append({"role": "assistant", "content": reply_text})
                self.conversation_history[conversation_id] = history[-20:]
                
                return {"reply": reply_text, "timestamp": datetime.now().isoformat()}

            if is_plan_request:
                # Multi-task orchestrator: Extract tasks and details
                # Get conversation history for context
                history = self.conversation_history.get(conversation_id, [])
                extracted = extract_trip_details(user_message, conversation_history=history)
                
                if not extracted or not isinstance(extracted, dict):
                    return {"reply": "Sorry, I couldn't understand your request. Could you please provide more details?"}
                
                # Get tasks and details from extracted data
                tasks = extracted.get("tasks", [])
                details = extracted.get("details", {})
                
                # If user requests a "full trip plan", automatically include all tasks
                if is_full_trip_plan_request:
                    tasks = ["plan_itinerary", "find_hotels", "find_flights", "find_attractions"]
                    # Also extract any context from conversation history (previously discussed hotels/flights)
                    # We'll gather this context below when merging details
                
                # If no tasks detected, default to plan_itinerary
                if not tasks:
                    tasks = ["plan_itinerary"]
                
                # Check for missing info (iterative planning)
                # Get existing context from session and conversation history
                context = session.get('trip_context', {}) or {}
                
                # Also check conversation history for previously mentioned details
                history = self.conversation_history.get(conversation_id, [])
                for msg in history[-10:]:  # Check last 10 messages
                    if msg.get("role") == "user":
                        # Try to extract details from previous user messages
                        prev_extracted = extract_trip_details(msg.get("content", ""), conversation_history=history[:history.index(msg)])
                        if prev_extracted and isinstance(prev_extracted, dict):
                            prev_details = prev_extracted.get("details", {})
                            for k, v in prev_details.items():
                                if v and not context.get(k):  # Only use if not already in context
                                    context[k] = v
                
                # For full trip plan requests, also try to extract hotels/flights from conversation history
                # Look for any hotel or flight mentions in the conversation
                if is_full_trip_plan_request:
                    # Try to find any hotel selections or mentions in previous messages
                    hotel_context = {}
                    flight_context = {}
                    for msg in history[-15:]:  # Check last 15 messages
                        msg_content = msg.get("content", "").lower()
                        # Look for hotel mentions with destination context
                        if any(word in msg_content for word in ["hotel", "accommodation", "stay", "booked", "selected"]):
                            prev_extracted = extract_trip_details(msg.get("content", ""), conversation_history=history[:history.index(msg)] if msg in history else history)
                            if prev_extracted and isinstance(prev_extracted, dict):
                                prev_details = prev_extracted.get("details", {})
                                if prev_details.get("destination"):
                                    hotel_context["destination"] = prev_details.get("destination")
                                if prev_details.get("departure_date"):
                                    hotel_context["departure_date"] = prev_details.get("departure_date")
                                if prev_details.get("return_date"):
                                    hotel_context["return_date"] = prev_details.get("return_date")
                        # Look for flight mentions
                        if any(word in msg_content for word in ["flight", "fly", "airline", "departure", "arrival"]):
                            prev_extracted = extract_trip_details(msg.get("content", ""), conversation_history=history[:history.index(msg)] if msg in history else history)
                            if prev_extracted and isinstance(prev_extracted, dict):
                                prev_details = prev_extracted.get("details", {})
                                if prev_details.get("origin"):
                                    flight_context["origin"] = prev_details.get("origin")
                                if prev_details.get("destination"):
                                    flight_context["destination"] = prev_details.get("destination")
                                if prev_details.get("departure_date"):
                                    flight_context["departure_date"] = prev_details.get("departure_date")
                    
                    # Merge hotel and flight context into main context if not already present
                    for k, v in hotel_context.items():
                        if v and not context.get(k):
                            context[k] = v
                    for k, v in flight_context.items():
                        if v and not context.get(k):
                            context[k] = v
                
                # Merge new details into context (new details override old ones)
                for k, v in (details or {}).items():
                    if v:
                        context[k] = v
                
                # Ask for missing info in order
                if not context.get('destination'):
                    session.pop('trip_context', None)
                    reply_text = "Where would you like to go?"
                    # Update conversation history
                    history = self.conversation_history.get(conversation_id, [])
                    history.append({"role": "user", "content": user_message})
                    history.append({"role": "assistant", "content": reply_text})
                    self.conversation_history[conversation_id] = history[-20:]
                    return {"reply": reply_text}

                if not context.get('days') and "plan_itinerary" in tasks:
                    session['trip_context'] = context
                    reply_text = "Sounds fun! How many days are you planning for?"
                    # Update conversation history
                    history = self.conversation_history.get(conversation_id, [])
                    history.append({"role": "user", "content": user_message})
                    history.append({"role": "assistant", "content": reply_text})
                    self.conversation_history[conversation_id] = history[-20:]
                    return {"reply": reply_text}

                # Check if user is asking for budget info (not providing it)
                user_asks_for_budget = bool(re.search(r"\b(give me|tell me|what is|what's|show me|need|want).*budget\b", user_text_lower))
                
                if not context.get('budget') and "plan_itinerary" in tasks and not user_asks_for_budget:
                    session['trip_context'] = context
                    reply_text = "Got it. What's your approximate budget? You can say a number (like '50000' or '50k'), or a category like 'cheap', 'moderate', or 'luxury'."
                    # Update conversation history
                    history = self.conversation_history.get(conversation_id, [])
                    history.append({"role": "user", "content": user_message})
                    history.append({"role": "assistant", "content": reply_text})
                    self.conversation_history[conversation_id] = history[-20:]
                    return {"reply": reply_text}

                # All info present: execute all tasks
                full_plan = {"details": context}
                
                # For full trip plan requests, ensure we have origin if we have destination
                # This helps with flight searches
                if is_full_trip_plan_request and "find_flights" in tasks:
                    if context.get("destination") and not context.get("origin"):
                        # Try to infer origin from conversation or use a default
                        # Look for any origin mentions in conversation
                        for msg in history[-10:]:
                            if msg.get("role") == "user":
                                prev_extracted = extract_trip_details(msg.get("content", ""), conversation_history=history[:history.index(msg)] if msg in history else history)
                                if prev_extracted and isinstance(prev_extracted, dict):
                                    prev_details = prev_extracted.get("details", {})
                                    if prev_details.get("origin"):
                                        context["origin"] = prev_details.get("origin")
                                        break
                
                # Execute each task
                for task in tasks:
                    try:
                        if task == "plan_itinerary":
                            itinerary_obj = build_itinerary(
                                context.get("destination"),
                                context.get("days"),
                                context.get("interests") or [],
                                context.get("budget"),
                                context.get("origin"),
                                context.get("transport"),
                                context.get("passengers") or context.get("adults") or 1,
                                context.get("departure_date"),
                                context.get("return_date")
                            )
                            full_plan["itinerary_object"] = itinerary_obj
                            # Get summary from itinerary_object, with fallback
                            summary = itinerary_obj.get("summary", "")
                            # If summary is too short or seems generic, prefer building from day_by_day
                            if (not summary or len(summary) < 500) and itinerary_obj.get("day_by_day"):
                                # Build detailed summary from day_by_day if summary is missing or too short
                                summary_parts = []
                                summary_parts.append(f"**{context.get('destination', 'Your Destination')} Itinerary: {context.get('departure_date', '')} - {context.get('return_date', context.get('departure_date', ''))}**\n")
                                if context.get('days'):
                                    summary_parts.append(f"Here's your detailed {context.get('days')}-day trip plan to {context.get('destination', 'your destination')}:\n\n")
                                for day_info in itinerary_obj.get("day_by_day", []):
                                    if isinstance(day_info, dict):
                                        day_num = day_info.get("day", "")
                                        title = day_info.get("title", "")
                                        details = day_info.get("details", "")
                                        if day_num:
                                            if title:
                                                summary_parts.append(f"**{title}**\n")
                                            if details:
                                                summary_parts.append(f"{details}\n\n")
                                if summary_parts:
                                    summary = "\n".join(summary_parts).strip()
                                else:
                                    summary = f"Here's your {context.get('days', '')}-day trip plan to {context.get('destination', 'your destination')}."
                            full_plan["itinerary_text"] = summary
                        
                        elif task == "find_hotels":
                            hotel_options = get_hotel_options(
                                context.get("destination"),
                                context.get("departure_date"),
                                context.get("return_date"),
                                adults=context.get("adults") or context.get("passengers") or 2,
                                budget=context.get("budget")
                            )
                            if not isinstance(hotel_options, dict) or "error" not in hotel_options:
                                full_plan["hotels"] = hotel_options if isinstance(hotel_options, list) else [hotel_options]
                        
                        elif task == "find_flights":
                            flight_options = get_flight_options(
                                context.get("origin"),
                                context.get("destination"),
                                context.get("departure_date"),
                                context.get("return_date")
                            )
                            if not isinstance(flight_options, dict) or "error" not in flight_options:
                                full_plan["flights"] = flight_options if isinstance(flight_options, list) else [flight_options]
                        
                        elif task == "find_attractions":
                            attractions = get_attractions(context.get("destination"))
                            if not isinstance(attractions, dict) or "error" not in attractions:
                                full_plan["attractions"] = attractions if isinstance(attractions, list) else [attractions]
                    except Exception as e:
                        print(f"Error executing task {task}: {e}")
                        # Continue with other tasks even if one fails
                
                # Clear context
                session.pop('trip_context', None)
                
                # Generate summary text
                summary_parts = []
                if "plan_itinerary" in tasks:
                    itinerary_obj = full_plan.get("itinerary_object", {})
                    itinerary_summary = itinerary_obj.get('summary', '') or full_plan.get('itinerary_text', '')
                    
                    # Check if user asked for budget info
                    user_asks_for_budget = bool(re.search(r"\b(give me|tell me|what is|what's|show me|need|want).*budget\b", user_text_lower))
                    
                    if itinerary_summary:
                        summary_parts.append(f"Here's your {context.get('days', '')}-day trip plan to {context.get('destination', 'your destination')}:\n\n{itinerary_summary}")
                        # If user asked for budget, include estimated budget from itinerary
                        if user_asks_for_budget and itinerary_obj.get('estimated_budget'):
                            summary_parts.append(f"\nEstimated Budget: {itinerary_obj.get('estimated_budget')}")
                    else:
                        summary_parts.append(f"I've created your {context.get('days', '')}-day trip plan to {context.get('destination', 'your destination')}. Check the itinerary details below!")
                        if user_asks_for_budget:
                            summary_parts.append("I'll calculate the estimated budget based on your trip details.")
                if "find_hotels" in tasks and full_plan.get("hotels"):
                    summary_parts.append(f"I've found {len(full_plan.get('hotels', []))} hotel option(s) for you.")
                if "find_flights" in tasks and full_plan.get("flights"):
                    summary_parts.append(f"I've found {len(full_plan.get('flights', []))} flight option(s) for you.")
                if "find_attractions" in tasks and full_plan.get("attractions"):
                    summary_parts.append(f"I've found {len(full_plan.get('attractions', []))} attraction(s) to visit.")
                
                # For full trip plan requests, provide a more comprehensive summary
                if is_full_trip_plan_request:
                    reply_text = "Of course! I've put together a complete trip plan for you with all the details we discussed. Here's your comprehensive trip plan:"
                else:
                    reply_text = "\n\n".join(summary_parts) if summary_parts else "I've prepared everything for your trip!"
                
                # Update conversation history
                history = self.conversation_history.get(conversation_id, [])
                history.append({"role": "user", "content": user_message})
                history.append({"role": "assistant", "content": reply_text})
                self.conversation_history[conversation_id] = history[-20:]
                
                return {"reply": reply_text, "trip_plan": full_plan}

            # If general chat but user is in the middle of planning, treat as follow-up
            if session.get('trip_context'):
                context = session.get('trip_context', {}) or {}
                # Get conversation history for context
                history = self.conversation_history.get(conversation_id, [])
                extracted = extract_trip_details(user_message, conversation_history=history) or {}
                
                # Merge new details
                new_details = extracted.get("details", {}) if isinstance(extracted, dict) else extracted
                for k, v in (new_details or {}).items():
                    if v:
                        context[k] = v
                
                # Re-run missing checks
                if not context.get('destination'):
                    session.pop('trip_context', None)
                    reply_text = "Where would you like to go?"
                    # Update conversation history
                    history = self.conversation_history.get(conversation_id, [])
                    history.append({"role": "user", "content": user_message})
                    history.append({"role": "assistant", "content": reply_text})
                    self.conversation_history[conversation_id] = history[-20:]
                    return {"reply": reply_text}
                if not context.get('days'):
                    session['trip_context'] = context
                    reply_text = "Sounds fun! How many days are you planning for?"
                    # Update conversation history
                    history = self.conversation_history.get(conversation_id, [])
                    history.append({"role": "user", "content": user_message})
                    history.append({"role": "assistant", "content": reply_text})
                    self.conversation_history[conversation_id] = history[-20:]
                    return {"reply": reply_text}
                # Check if user is asking for budget info (not providing it)
                user_asks_for_budget = bool(re.search(r"\b(give me|tell me|what is|what's|show me|need|want).*budget\b", user_text_lower))
                
                if not context.get('budget') and not user_asks_for_budget:
                    session['trip_context'] = context
                    reply_text = "Got it. What's your approximate budget? You can say a number (like '50000' or '50k'), or a category like 'cheap', 'moderate', or 'luxury'."
                    # Update conversation history
                    history = self.conversation_history.get(conversation_id, [])
                    history.append({"role": "user", "content": user_message})
                    history.append({"role": "assistant", "content": reply_text})
                    self.conversation_history[conversation_id] = history[-20:]
                    return {"reply": reply_text}
                
                # Execute tasks (same orchestrator logic as above)
                tasks = extracted.get("tasks", ["plan_itinerary"]) if isinstance(extracted, dict) else ["plan_itinerary"]
                full_plan = {"details": context}
                
                for task in tasks:
                    try:
                        if task == "plan_itinerary":
                            itinerary_obj = build_itinerary(
                                context.get("destination"),
                                context.get("days"),
                                context.get("interests") or [],
                                context.get("budget"),
                                context.get("origin"),
                                context.get("transport"),
                                context.get("passengers") or context.get("adults") or 1,
                                context.get("departure_date"),
                                context.get("return_date")
                            )
                            full_plan["itinerary_object"] = itinerary_obj
                            # Get summary from itinerary_object, with fallback
                            summary = itinerary_obj.get("summary", "")
                            if not summary and itinerary_obj.get("day_by_day"):
                                # Build summary from day_by_day if summary is missing
                                summary_parts = []
                                for day_info in itinerary_obj.get("day_by_day", []):
                                    if isinstance(day_info, dict):
                                        day_num = day_info.get("day", "")
                                        title = day_info.get("title", "")
                                        details = day_info.get("details", "")
                                        if day_num:
                                            day_str = f"Day {day_num}"
                                            if title:
                                                day_str += f": {title}"
                                            if details:
                                                day_str += f" - {details}"
                                            summary_parts.append(day_str)
                                summary = "\n".join(summary_parts) if summary_parts else f"Here's your {context.get('days', '')}-day trip plan to {context.get('destination', 'your destination')}."
                            full_plan["itinerary_text"] = summary
                        elif task == "find_hotels":
                            hotel_options = get_hotel_options(
                                context.get("destination"),
                                context.get("departure_date"),
                                context.get("return_date"),
                                adults=context.get("adults") or context.get("passengers") or 2,
                                budget=context.get("budget")
                            )
                            if not isinstance(hotel_options, dict) or "error" not in hotel_options:
                                full_plan["hotels"] = hotel_options if isinstance(hotel_options, list) else [hotel_options]
                        elif task == "find_flights":
                            flight_options = get_flight_options(context.get("origin"), context.get("destination"), context.get("departure_date"), context.get("return_date"))
                            if not isinstance(flight_options, dict) or "error" not in flight_options:
                                full_plan["flights"] = flight_options if isinstance(flight_options, list) else [flight_options]
                        elif task == "find_attractions":
                            attractions = get_attractions(context.get("destination"))
                            if not isinstance(attractions, dict) or "error" not in attractions:
                                full_plan["attractions"] = attractions if isinstance(attractions, list) else [attractions]
                    except Exception as e:
                        print(f"Error executing task {task}: {e}")
                
                session.pop('trip_context', None)
                
                summary_parts = []
                if "plan_itinerary" in tasks:
                    itinerary_obj = full_plan.get("itinerary_object", {})
                    itinerary_summary = itinerary_obj.get('summary', '') or full_plan.get('itinerary_text', '')
                    if itinerary_summary:
                        summary_parts.append(f"Here's your {context.get('days', '')}-day trip plan to {context.get('destination', 'your destination')}:\n\n{itinerary_summary}")
                    else:
                        summary_parts.append(f"I've created your {context.get('days', '')}-day trip plan to {context.get('destination', 'your destination')}. Check the itinerary details below!")
                if "find_hotels" in tasks and full_plan.get("hotels"):
                    summary_parts.append(f"I've found {len(full_plan.get('hotels', []))} hotel option(s) for you.")
                if "find_flights" in tasks and full_plan.get("flights"):
                    summary_parts.append(f"I've found {len(full_plan.get('flights', []))} flight option(s) for you.")
                if "find_attractions" in tasks and full_plan.get("attractions"):
                    summary_parts.append(f"I've found {len(full_plan.get('attractions', []))} attraction(s) to visit.")
                
                # For full trip plan requests, provide a more comprehensive summary
                if is_full_trip_plan_request:
                    reply_text = "Of course! I've put together a complete trip plan for you with all the details we discussed. Here's your comprehensive trip plan:"
                else:
                    reply_text = "\n\n".join(summary_parts) if summary_parts else "I've prepared everything for your trip!"
                
                # Update conversation history
                history = self.conversation_history.get(conversation_id, [])
                history.append({"role": "user", "content": user_message})
                history.append({"role": "assistant", "content": reply_text})
                self.conversation_history[conversation_id] = history[-20:]
                
                return {"reply": reply_text, "trip_plan": full_plan}



            # --- DEFAULT CHAT RESPONSE ---
            # If it's not a planning request, just have a normal chat.
            history = self.conversation_history.get(conversation_id, [])
            full_prompt = self._build_context_prompt(user_message, history)
            reply_text = gemini_service.generate_chat_response(full_prompt)

            if not reply_text:
                raise Exception("Failed to get a valid reply from Gemini service.")

            # Update conversation history for ALL responses (planning or general chat)
            history.append({"role": "user", "content": user_message})
            history.append({"role": "assistant", "content": reply_text})
            self.conversation_history[conversation_id] = history[-20:]

            return {"reply": reply_text, "timestamp": datetime.now().isoformat()}

        except Exception as e:
            logger.exception(f"Error in TTravelsChatbot.generate_response: {e}") # <-- NEW (logs full traceback)
            return {"reply": "I'm sorry, I encountered an error. Please try again.", "error": str(e)}

    def _format_flight_response(self, flights, origin, destination, date, return_date=None) -> str:
        """Create a human-friendly summary of flight options."""
        try:
            if not flights:
                if return_date:
                    return f"I couldn't find any round-trip flights from {origin} to {destination} departing {date} and returning {return_date}."
                return f"I couldn't find any flights from {origin} to {destination} on {date}."

            if return_date:
                lines = [f"Top round-trip options from {origin} to {destination}: {date} → {return_date}\n"]
            else:
                lines = [f"Top flight options from {origin} to {destination} on {date}:\n"]
            for i, f in enumerate(flights[:5], start=1):
                # resilient extraction
                if isinstance(f, dict):
                    airline = f.get('airline') or f.get('carrier') or f.get('airlines') or f.get('airline_name')
                    price = f.get('price') or f.get('ticket_price') or (str(f.get('currency', '')) + ' ' + str(f.get('price')) if f.get('price') else None)
                    depart = f.get('departure_time') or f.get('depart_time') or f.get('departure')
                    arrive = f.get('arrival_time') or f.get('arrival') or f.get('arrive_time')
                    duration = f.get('duration') or f.get('flight_time')
                    snippet = f"{i}. {airline or 'Flight option'}"
                    if depart and arrive:
                        snippet += f" — {depart} → {arrive}"
                    if duration:
                        snippet += f" ({duration})"
                    if price:
                        snippet += f" — Price: {price}"
                    lines.append(snippet)
                else:
                    lines.append(f"{i}. {str(f)}")

            lines.append("\nYou can ask me to book one of these or request more details about a specific option.")
            return "\n".join(lines)
        except Exception as e:
            logger.exception(f"Error formatting flights: {e}")
            return "I found some flight options but couldn't format them."

    def _format_hotel_response(self, hotels, destination, date) -> str:
        """Create a human-friendly summary of hotel options."""
        try:
            if not hotels:
                return f"I couldn't find hotels in {destination} on {date}."

            lines = [f"Top hotel options in {destination} for {date}:\n"]
            for i, h in enumerate(hotels[:5], start=1):
                if isinstance(h, dict):
                    name = h.get('title') or h.get('name') or h.get('property_title')
                    price = h.get('price') or h.get('lowest_price')
                    rating = h.get('rating') or h.get('star_rating')
                    address = h.get('address') or h.get('vicinity')
                    snippet = f"{i}. {name or 'Hotel'}"
                    if rating:
                        snippet += f" — Rating: {rating}"
                    if price:
                        snippet += f" — Price: {price}"
                    if address:
                        snippet += f" — {address}"
                    lines.append(snippet)
                else:
                    lines.append(f"{i}. {str(h)}")

            lines.append("\nAsk me to show more options, filter by price, or start a booking for a specific hotel.")
            return "\n".join(lines)
        except Exception as e:
            logger.exception(f"Error formatting hotels: {e}")
            return "I found some hotels but couldn't format them."

# Global instance
chatbot = TTravelsChatbot()
