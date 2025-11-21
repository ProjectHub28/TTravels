import os
import json
from serpapi import GoogleSearch
# Gemini service is imported lazily to avoid initialization side-effects during module import

def _get_gemini_service():
    try:
        from services.gemini_service import gemini_service as _svc
        return _svc
    except Exception as _e:
        # Don't crash on import; caller will fallback to heuristics when service is unavailable
        print(f"[trip_planner] Gemini service not available: {_e}")
        return None
import re
from datetime import datetime, timedelta

# --- Configuration ---
SERPAPI_KEY = os.getenv("SERPAPI_KEY")

# Load airports data (used to map city/name -> IATA code for SerpAPI)
_AIRPORTS = []
try:
    _ROOT = os.path.dirname(os.path.abspath(__file__))
    _AIRPATH = os.path.join(_ROOT, "static", "js", "airports.json")
    if not os.path.exists(_AIRPATH):
        # try project root static path (main.py uses BASE_DIR/static/js)
        _AIRPATH = os.path.join(os.path.dirname(_ROOT), "static", "js", "airports.json")
    with open(_AIRPATH, "r", encoding="utf-8") as _f:
        _AIRPORTS = json.load(_f)
except Exception as _e:
    print(f"Warning: could not load airports.json for mapping: {_e}")
    _AIRPORTS = []
# --- 1. Main Orchestrator Function ---

def generate_trip_plan_from_details(trip_details, conversation_id="default"):
    """
    Generates a trip plan using pre-extracted details dictionary.
    """
    try:
        # Step 1: Details are already provided, skip extraction.
        print(f"TripPlanner: Using pre-extracted details: {trip_details}")
        
        # Validate essential details
        if not trip_details or not trip_details.get("destination") or not trip_details.get("days"):
             return {"error": "Missing essential trip details (destination or days)."}

        # Step 2: Build the day-by-day itinerary using Gemini (no longer fetches flights/hotels here)
        print("TripPlanner: Building itinerary...")
        itinerary_obj = build_itinerary(
            trip_details.get("destination"), 
            trip_details.get("days"), 
            trip_details.get("interests") or [], 
            trip_details.get("budget"),
            trip_details.get("origin"),
            trip_details.get("transport"),
            trip_details.get("passengers") or trip_details.get("adults") or 1,
            trip_details.get("departure_date"),
            trip_details.get("return_date")
        )

        # Step 3: Assemble the final plan with clean structured data
        # Note: flights and hotels are now fetched separately by the orchestrator
        full_plan = {
            "details": trip_details,
            # Store structured itinerary
            "itinerary_object": itinerary_obj if isinstance(itinerary_obj, dict) else {},
            # Keep a short summary for convenience if present
            "summary_text": (itinerary_obj.get("summary") if isinstance(itinerary_obj, dict) else None) or f"Here is the {trip_details.get('days')}-day trip plan to {trip_details.get('destination')} I've prepared for you."
        }
        
        return full_plan

    except Exception as e:
        print(f"Error in generate_trip_plan_from_details: {e}")
        # Log the full traceback for debugging
        import traceback
        traceback.print_exc() 
        return {"error": f"Sorry, I encountered an error while planning your trip: {e}"}

# --- 2. Core Functions ---

def extract_trip_details(user_text, conversation_history=None):
    """
    Uses Gemini to parse the user's natural language request into a 
    structured JSON object.
    
    Args:
        user_text: The current user message
        conversation_history: Optional list of previous conversation messages in format:
            [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}, ...]
    """
    # Get current date for context
    from datetime import datetime
    today = datetime.now().date()
    current_year = today.year
    current_month = today.month
    current_day = today.day
    current_date_str = today.isoformat()
    
    # Build conversation context if history is provided
    conversation_context = ""
    if conversation_history and len(conversation_history) > 0:
        conversation_context = "\n\n**PREVIOUS CONVERSATION CONTEXT:**\n"
        # Include last 4 exchanges (2 user + 2 assistant messages) for context
        for exchange in conversation_history[-4:]:
            role = exchange.get("role", "")
            content = exchange.get("content", "")
            if role == "user":
                conversation_context += f"User: {content}\n"
            elif role == "assistant":
                conversation_context += f"Assistant: {content}\n"
        conversation_context += "\n**IMPORTANT:** Use information from the previous conversation to fill in missing details. For example, if the user previously mentioned 'Goa' and now says 'for 5 days', combine them: destination='Goa', days=5.\n"
    
    prompt = f"""
    You are a travel assistant's parsing tool. Your job is to extract key travel details
    AND identify all tasks the user wants to perform from their request.
    
    **IMPORTANT DATE CONTEXT:**
    - Today's date is: {current_date_str} (YYYY-MM-DD format)
    - Current year: {current_year}
    - Current month: {current_month}
    - Current day: {current_day}
    {conversation_context}
    The user's current request is: "{user_text}"
    
    **YOUR OUTPUT MUST BE A JSON OBJECT WITH TWO KEYS:**
    1. "tasks" (array of strings): List all tasks the user wants. Possible tasks:
       - "plan_itinerary" - if user wants a trip plan/itinerary
       - "find_hotels" - if user mentions hotels, accommodation, stay, room
       - "find_flights" - if user mentions flights, flying, airline
       - "find_attractions" - if user mentions attractions, places to visit, near places, things to see, tourist spots
    
    2. "details" (object): Extract the following fields:
    - "destination" (string): The primary city or country.
    - "origin" (string, optional): The user's starting location.
    - "days" (integer, optional): The total number of days for the trip.
    - "departure_date" (string, optional): The start date, formatted as YYYY-MM-DD.
    - "return_date" (string, optional): The return date for round-trips, formatted as YYYY-MM-DD.
    - "adults" (integer, optional): Number of adults for hotel/flight searches (e.g., 2).
    - "budget" (string, optional): The user's budget (e.g., "cheap", "moderate", "luxury", or "approx 50000 INR").
    - "interests" (list of strings, optional): Keywords like "beach", "hiking", "museums", "food".
    
    **CRITICAL DATE INFERENCE RULES:**
    - If the user provides a partial date (e.g., "December 4", "Dec 4", "December 4th") WITHOUT a year:
      * Compare the date to today's date ({current_date_str}).
      * If the partial date (month + day) has NOT YET PASSED this year, use the CURRENT YEAR ({current_year}).
      * If the partial date (month + day) HAS ALREADY PASSED this year, use NEXT YEAR ({current_year + 1}).
      * Example: If today is {current_date_str} and user says "December 4", return "2025-12-04" (since Dec 4 hasn't passed yet in {current_year}).
      * Example: If today is {current_date_str} and user says "February 10", return "2026-02-10" (since Feb 10 has already passed in {current_year}).
    - Always return a full YYYY-MM-DD format for dates. Never return partial dates.
    - If no date is mentioned, set departure_date to null.
    
    **IMPORTANT NOTES:**
    - If user says "give me budget" or "tell me budget", they are ASKING for budget information, NOT providing it. Do NOT set budget field in this case.
    - Only extract budget if user provides a budget value (e.g., "50k", "50000", "cheap", "moderate").
    - If user says "plan a trip to X for Y days and give me budget", extract destination=X, days=Y, budget=null (they want to know the budget, not provide it).
    
    **EXAMPLES:**
    - Input: "plan a trip to Silvassa for 5 days and show me hotels and near places"
      Output: {{"tasks": ["plan_itinerary", "find_hotels", "find_attractions"], "details": {{"destination": "Silvassa", "days": 5, "departure_date": null, "origin": null, "budget": null, "interests": []}}}}
    
    - Input: "plan a trip to Mumbai for 4 days and give me budget"
      Output: {{"tasks": ["plan_itinerary"], "details": {{"destination": "Mumbai", "days": 4, "departure_date": null, "origin": null, "budget": null, "interests": []}}}}
    
    - Input: "find flights from Delhi to Mumbai on December 4"
      Output: {{"tasks": ["find_flights"], "details": {{"destination": "Mumbai", "origin": "Delhi", "departure_date": "2025-12-04", "days": null, "return_date": null, "budget": null, "interests": []}}}}
    
    Return ONLY the JSON object, no additional text.
    """
    
    # First, try to use Gemini to parse structured JSON
    try:
        svc = _get_gemini_service()
        if not svc:
            raise Exception("Gemini service unavailable")
        response_text = svc.generate_chat_response(prompt)
        # Clean the response to ensure it's valid JSON
        json_response = response_text.strip().replace("```json", "").replace("```", "")
        parsed = json.loads(json_response)

        # Ensure the response has the expected structure (tasks and details)
        if not isinstance(parsed, dict):
            raise ValueError("Response is not a JSON object")
        
        # If the response doesn't have tasks/details structure, try to extract it
        if "tasks" not in parsed or "details" not in parsed:
            # Legacy format - convert to new format
            tasks = []
            if any(word in user_text.lower() for word in ["plan", "itinerary", "trip"]):
                tasks.append("plan_itinerary")
            if any(word in user_text.lower() for word in ["hotel", "accommodation", "stay", "room"]):
                tasks.append("find_hotels")
            if any(word in user_text.lower() for word in ["flight", "fly", "airline"]):
                tasks.append("find_flights")
            if any(word in user_text.lower() for word in ["attraction", "place", "visit", "see", "tourist", "near"]):
                tasks.append("find_attractions")
            
            parsed = {
                "tasks": tasks if tasks else ["plan_itinerary"],  # Default to plan_itinerary if no tasks detected
                "details": parsed  # Use the parsed data as details
            }
        
        # Normalize date fields in details
        details = parsed.get("details", {})
        if details.get("departure_date"):
            details["departure_date"] = _normalize_and_validate_date(details.get("departure_date"))
        if details.get("return_date"):
            details["return_date"] = _normalize_and_validate_date(details.get("return_date"))
        if details.get("days") and isinstance(details.get("days"), str) and details.get("days").isdigit():
            details["days"] = int(details.get("days"))
        # Normalize adults field if present
        if details.get("adults") is not None:
            try:
                details["adults"] = int(details.get("adults"))
            except Exception:
                details["adults"] = None
        
        parsed["details"] = details
        return parsed
    except Exception as e:
        print(f"Gemini parsing failed, falling back to heuristic parsing: {e}")

    # Fallback heuristic parsing if Gemini fails or returns invalid JSON
    try:
        lower = user_text.lower()
        result = {
            "destination": None,
            "origin": None,
            "days": None,
            "departure_date": None,
            "budget": None,
            "interests": [],
            "passengers": 1,
            "transport": None
        }

        import re

        # origin/destination: look for "from X to Y" first, then other patterns
        m = re.search(r"from\s+([A-Za-z\s]+)\s+to\s+([A-Za-z\s]+)", lower)
        if m:
            result["origin"] = m.group(1).strip()
            result["destination"] = m.group(2).strip()
        else:
            # Try to find 'X to Y' pairs (e.g., 'mehsana to silvassa') but avoid matching verbs like 'to create'
            pair_pattern = r"([A-Za-z\s]{2,80}?)\s+to\s+([A-Za-z\s]{2,80}?)(?:,| for | on |$)"
            pair_matches = re.findall(pair_pattern, lower)
            found_pair = False
            stopwords = set(['want','create','make','plan','i','me','my','please','provide','give','show','need','trip','plan','for','with','so'])
            for left, right in pair_matches:
                l = left.strip()
                r = right.strip()
                # skip if left or right contains obvious non-location words
                if any(sw in l.split() for sw in stopwords):
                    continue
                if any(sw in r.split() for sw in stopwords):
                    continue
                # prefer short (<=4 words) tokens
                if len(l.split()) <= 4 and len(r.split()) <= 4:
                    result['origin'] = l
                    result['destination'] = r
                    found_pair = True
                    break

            if not found_pair:
                # Check for 'in <destination>' patterns (e.g., 'in silvassa')
                m_in = re.search(r"\bin\s+([A-Za-z\s]{2,80}?)(?:,| for | on |$)", lower)
                if m_in:
                    result['destination'] = m_in.group(1).strip()
                else:
                    # Be a bit more permissive and stop at commas or 'for' etc for single 'to' (destination only)
                    m2 = re.search(r"to\s+([A-Za-z\s]+?)(?:,| for | on |$)", lower)
                    if m2:
                        result["destination"] = m2.group(1).strip()

        # days: look for "for N days" or "N-day" patterns
        m = re.search(r"for\s+(\d{1,2})\s+days?", lower) or re.search(r"(\d{1,2})-?\s*days?", lower)
        if m:
            result["days"] = int(m.group(1))

        # dates: handle explicit date ranges first (e.g., '11 december 2025 to 15 december 2025')
        date = None
        return_date = None

        # A flexible date token that matches '11 December 2025', 'December 11 2025', '2025-12-11', or '11/12/2025'
        month_names = r"(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)"
        date_token = rf"(?:\d{{1,2}}\s+{month_names}(?:\s+\d{{4}})?)|(?:{month_names}\s+\d{{1,2}}(?:\s+\d{{4}})?)|(?:\d{{4}}-\d{{2}}-\d{{2}})|(?:\d{{1,2}}/\d{{1,2}}/\d{{4}})"
        range_pattern = re.compile(rf"({date_token})\s+to\s+({date_token})", re.IGNORECASE)
        m_range = range_pattern.search(lower)
        if m_range:
            raw_dep = m_range.group(1)
            raw_ret = m_range.group(2)
            norm_dep = _normalize_and_validate_date(raw_dep)
            norm_ret = _normalize_and_validate_date(raw_ret)
            if norm_dep:
                date = norm_dep
            if norm_ret:
                return_date = norm_ret
        else:
            # fallback to the previous single-date heuristics
            if "tomorrow" in lower:
                date = _normalize_and_validate_date("tomorrow")
            elif "today" in lower:
                date = _normalize_and_validate_date("today")
            elif "next week" in lower:
                date = _normalize_and_validate_date("next week")
            else:
                # Try full ISO date first
                m = re.search(r"(\d{4}-\d{2}-\d{2})", lower)
                if m:
                    date = _normalize_and_validate_date(m.group(1))
                else:
                    # Try DD/MM/YYYY format
                    m2 = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", lower)
                    if m2:
                        d = int(m2.group(1)); mo = int(m2.group(2)); y = int(m2.group(3))
                        date = _normalize_and_validate_date(f"{y:04d}-{mo:02d}-{d:02d}")
                    else:
                        # Try to extract partial dates from the text (e.g., "December 4", "Dec 4", "December 4th")
                        month_pattern = rf"({month_names})\s*,?\s*(\d{{1,2}})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{{4}}))?"
                        month_match = re.search(month_pattern, lower, re.IGNORECASE)
                        if month_match:
                            month_str = month_match.group(1)
                            day_str = month_match.group(2)
                            year_str = month_match.group(3)
                            if year_str:
                                date = _normalize_and_validate_date(f"{month_str} {day_str} {year_str}")
                            else:
                                date = _normalize_and_validate_date(f"{month_str} {day_str}")

        # Look for explicit return date phrases: 'return', 'returning', 'back on', 'return on'
        mret = re.search(r"return(?:ing| date| on)?\s*(?:on\s*)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}-\d{2}-\d{2}|today|tomorrow|next week|in\s+\d+\s+days|\w+\s*\d{1,2}(?:,?\s*\d{4})?)", lower)
        if mret:
            raw = mret.group(1)
            # Use the new normalization function for all date formats
            return_date = _normalize_and_validate_date(raw)

        if date:
            result["departure_date"] = date
        if return_date:
            result["return_date"] = return_date

        # budget keywords
        for b in ["cheap", "moderate", "luxury", "budget", "affordable", "expensive"]:
            if b in lower:
                # Check if it's just a keyword or has a numeric value
                if b in ["cheap", "moderate", "luxury", "affordable", "expensive"]:
                    result["budget"] = b
                    break

        # Enhanced numeric budget extraction
        # Handles: "50000", "50k", "50 thousand", "50,000", "budget is 50000", "around 50k", etc.
        if not result.get('budget') or result.get('budget') in ["budget"]:
            # Pattern 1: Direct number with k/thousand (e.g., "50k", "50 thousand")
            k_pattern = re.search(r"(\d+)\s*(?:k|thousand|K|THOUSAND)", lower)
            if k_pattern:
                num = int(k_pattern.group(1))
                result['budget'] = str(num * 1000)  # Convert to full number
            
            # Pattern 2: Full number with commas (e.g., "50,000", "50000")
            if not result.get('budget') or result.get('budget') in ["budget"]:
                mbudget = re.search(r"(?:budget|around|about|approximately|roughly|max|maximum|upto|up to)(?:\s*is|:)?\s*([0-9,]+(?:\s*(?:lakh|lakhs|L|Lakh))?)", lower)
                if mbudget:
                    budget_str = mbudget.group(1).replace(',', '').strip()
                    # Handle lakh (Indian numbering: 1 lakh = 100,000)
                    if 'lakh' in budget_str.lower():
                        num = int(re.search(r'(\d+)', budget_str).group(1))
                        result['budget'] = str(num * 100000)
                    else:
                        result['budget'] = budget_str
                
                # Pattern 3: Just a number in context (e.g., "I have 50000", "spend 50k")
                if not result.get('budget') or result.get('budget') in ["budget"]:
                    simple_budget = re.search(r"(?:have|spend|want|need|can afford|afford|pay)\s+(\d+)\s*(?:k|thousand|K|rupees?|rs|inr)?", lower)
                    if simple_budget:
                        num_str = simple_budget.group(1)
                        # Check if followed by k/thousand
                        if re.search(r"(\d+)\s*(?:k|thousand)", lower):
                            num = int(num_str)
                            result['budget'] = str(num * 1000)
                        else:
                            result['budget'] = num_str

        # interests simple list
        interests = []
        for keyword in ["beach", "hiking", "museums", "food", "shopping"]:
            if keyword in lower:
                interests.append(keyword)
        result["interests"] = interests

        # Passengers: look for explicit people/adults/children counts or common 'with my wife/partner' phrasing
        if re.search(r"with my (wife|husband|partner)", lower) or re.search(r"me and my (wife|husband|partner)", lower):
            result["passengers"] = 2
        else:
            # Only match when units indicate people/adults/persons to avoid matching 'for 4 days'
            mpass = re.search(r"for\s+(\d{1,2})\s+(?:people|persons|adults|kids|children)\b", lower)
            if mpass:
                result["passengers"] = int(mpass.group(1))

        # Transport preference: look for car / driving / own car / self-drive
        if re.search(r"own car|my car|by car|drive|driving|self[- ]?drive|self drive", lower):
            result["transport"] = "car"
        elif re.search(r"flight|fly|plane|airline", lower):
            result["transport"] = "flight"

        # If user provided days but no explicit return_date, compute return_date = departure_date + days-1
        try:
            if result.get('departure_date') and result.get('days') and not result.get('return_date'):
                from datetime import datetime, timedelta
                dd = datetime.fromisoformat(result['departure_date']).date()
                ret = dd + timedelta(days=int(result['days']))
                # assume return is at end of stay -> subtract 1 day to make inclusive? keep as days later
                result['return_date'] = ret.isoformat()
        except Exception:
            pass

        # Convert to new format with tasks and details
        tasks = []
        if any(word in user_text.lower() for word in ["plan", "itinerary", "trip"]):
            tasks.append("plan_itinerary")
        if any(word in user_text.lower() for word in ["hotel", "accommodation", "stay", "room"]):
            tasks.append("find_hotels")
        if any(word in user_text.lower() for word in ["flight", "fly", "airline"]):
            tasks.append("find_flights")
        if any(word in user_text.lower() for word in ["attraction", "place", "visit", "see", "tourist", "near"]):
            tasks.append("find_attractions")
        
        # Ensure destination is trimmed and cleaned
        if isinstance(result.get('destination'), str):
            result['destination'] = result['destination'].strip().strip(',')
        return {
            "tasks": tasks if tasks else ["plan_itinerary"],
            "details": result
        }
    except Exception as e:
        print(f"Heuristic parsing failed: {e}")
        return None


def _normalize_and_validate_date(text):
    """
    Normalize and validate a date string. Handles:
    - Relative dates (today, tomorrow, next week, in N days)
    - Partial dates without year (infers upcoming year)
    - Full dates in YYYY-MM-DD format
    
    Returns YYYY-MM-DD string or None if invalid.
    """
    try:
        text = (text or "").strip()
        if not text:
            return None
            
        from datetime import datetime, timedelta
        today = datetime.now().date()
        current_year = today.year
        current_month = today.month
        current_day = today.day
        
        text_lower = text.lower()
        
        # Handle relative dates
        if text_lower == "today":
            return today.isoformat()
        if text_lower == "tomorrow":
            return (today + timedelta(days=1)).isoformat()
        if text_lower == "next week":
            return (today + timedelta(days=7)).isoformat()
        
        import re
        # Handle "in N days"
        m = re.search(r"in\s+(\d{1,2})\s+days?", text_lower)
        if m:
            days = int(m.group(1))
            return (today + timedelta(days=days)).isoformat()

        # Handle explicit day-month-year like '11 december 2025' or '11 Dec 2025'
        month_names_short = {
            'january': 1, 'jan': 1,
            'february': 2, 'feb': 2,
            'march': 3, 'mar': 3,
            'april': 4, 'apr': 4,
            'may': 5,
            'june': 6, 'jun': 6,
            'july': 7, 'jul': 7,
            'august': 8, 'aug': 8,
            'september': 9, 'sep': 9, 'sept': 9,
            'october': 10, 'oct': 10,
            'november': 11, 'nov': 11,
            'december': 12, 'dec': 12
        }
        dmY_pattern = re.search(rf"(\d{{1,2}})\s+({'|'.join(list(month_names_short.keys()))})\s*,?\s*(\d{{4}})", text_lower, re.IGNORECASE)
        if dmY_pattern:
            try:
                day = int(dmY_pattern.group(1))
                month = month_names_short[dmY_pattern.group(2).lower()]
                year = int(dmY_pattern.group(3))
                parsed_date = datetime(year, month, day).date()
                # If parsed_date in past, adjust year similarly to other rules
                if parsed_date < today:
                    test_date_this_year = datetime(today.year, month, day).date()
                    if test_date_this_year >= today:
                        year = today.year
                    else:
                        year = today.year + 1
                    parsed_date = datetime(year, month, day).date()
                return parsed_date.isoformat()
            except Exception:
                pass

        # If already ISO format (YYYY-MM-DD), validate and return
        m_iso = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", text)
        if m_iso:
            year = int(m_iso.group(1))
            month = int(m_iso.group(2))
            day = int(m_iso.group(3))
            try:
                parsed_date = datetime(year, month, day).date()
                # If date is in the past, use same logic as partial dates
                if parsed_date < today:
                    # Check if the date (month+day) hasn't passed this year
                    test_date_this_year = datetime(current_year, month, day).date()
                    if test_date_this_year >= today:
                        year = current_year
                    else:
                        year = current_year + 1
                    parsed_date = datetime(year, month, day).date()
                return parsed_date.isoformat()
            except ValueError:
                return None

        # Handle partial dates like "December 4", "Dec 4", "December 4th", "4 December"
        # Month name patterns
        month_names = {
            'january': 1, 'jan': 1,
            'february': 2, 'feb': 2,
            'march': 3, 'mar': 3,
            'april': 4, 'apr': 4,
            'may': 5,
            'june': 6, 'jun': 6,
            'july': 7, 'jul': 7,
            'august': 8, 'aug': 8,
            'september': 9, 'sep': 9, 'sept': 9,
            'october': 10, 'oct': 10,
            'november': 11, 'nov': 11,
            'december': 12, 'dec': 12
        }
        
        # Pattern: "December 4" or "Dec 4" or "December 4th" or "4 December"
        patterns = [
            r"(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?",  # "December 4" or "December 4th"
            r"(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)",  # "4 December" or "4th December"
        ]
        
        for pattern in patterns:
            m = re.search(pattern, text_lower)
            if m:
                part1 = m.group(1).lower()
                part2 = m.group(2)
                
                # Determine which is month and which is day
                if part1 in month_names:
                    month = month_names[part1]
                    day = int(part2)
                elif part2 in month_names:
                    month = month_names[part2]
                    day = int(part1)
                else:
                    continue
                
                # Infer year: if date hasn't passed this year, use current year; otherwise next year
                try:
                    test_date_this_year = datetime(current_year, month, day).date()
                    if test_date_this_year >= today:
                        year = current_year
                    else:
                        year = current_year + 1
                    
                    parsed_date = datetime(year, month, day).date()
                    return parsed_date.isoformat()
                except ValueError:
                    return None

        # Handle DD/MM/YYYY or MM/DD/YYYY format
        m_ddmm = re.match(r"^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$", text)
        if m_ddmm:
            d = int(m_ddmm.group(1))
            mo = int(m_ddmm.group(2))
            y = int(m_ddmm.group(3))
            try:
                parsed_date = datetime(y, mo, d).date()
                if parsed_date < today:
                    parsed_date = datetime(y + 1, mo, d).date()
                return parsed_date.isoformat()
            except ValueError:
                return None

        # If we can't parse it, return None
        return None
    except Exception as e:
        print(f"Error normalizing date '{text}': {e}")
        return None


def _normalize_relative_date(text):
    """
    Legacy function for backward compatibility. Now calls _normalize_and_validate_date.
    """
    return _normalize_and_validate_date(text)


def _parse_date_to_iso(text: str):
    """Try to parse a few common date formats into YYYY-MM-DD.

    Supports:
    - ISO YYYY-MM-DD
    - DD/MM/YYYY or D/M/YYYY
    - relative words handled by _normalize_relative_date
    Returns ISO string or None.
    """
    if not text:
        return None
    t = str(text).strip()
    # If already ISO
    m_iso = re.match(r"^(\d{4}-\d{2}-\d{2})$", t)
    if m_iso:
        return m_iso.group(1)

    # dd/mm/yyyy or d/m/yyyy
    m = re.match(r"^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$", t)
    if m:
        d = int(m.group(1)); mo = int(m.group(2)); y = int(m.group(3))
        try:
            return datetime(year=y, month=mo, day=d).date().isoformat()
        except Exception:
            return None

    # try relative normalizer
    rel = _normalize_relative_date(t)
    if rel:
        return rel

    return None

def get_flight_options(origin, destination, date, return_date=None):
    """ 
    Fetches flight options using SerpAPI, with an optional return_date for round-trip searches.
    """
    if not all([origin, destination, date, SERPAPI_KEY]):
        return {"error": "Missing flight details (origin, destination, or date)."}

    # Normalize origin/destination to 3-letter IATA codes if possible
    def _find_iata_code(val: str):
        if not val:
            return None
        import re
        v = re.sub(r"[^A-Za-z0-9 ()-]", "", val or "").strip()

        # If user provided something like 'Ahmedabad (AMD)'
        m = re.search(r"\(([A-Za-z]{3})\)", v)
        if m:
            return m.group(1).upper()

        # If already a 3-letter code
        if len(v) == 3 and v.isalpha():
            return v.upper()

        q = v.lower()
        candidates = []

        # Exact matches first
        for a in _AIRPORTS:
            try:
                city = (a.get('city') or '').lower()
                name = (a.get('name') or '').lower()
                code = (a.get('code') or '').upper()
                if q == city or q == name or q == code.lower():
                    return code
            except Exception:
                continue

        # Substring / startswith matches
        for a in _AIRPORTS:
            try:
                city = (a.get('city') or '').lower()
                name = (a.get('name') or '').lower()
                code = (a.get('code') or '').upper()
                if city.startswith(q) or q in city or q in name or name.startswith(q):
                    return code
                # collect candidates for later debug
                if q in city or q in name:
                    candidates.append(code)
            except Exception:
                continue

        # Fallback: match by first 3 letters of city
        for a in _AIRPORTS:
            try:
                city = (a.get('city') or '').lower()
                code = (a.get('code') or '').upper()
                if city and city[:3] == q[:3]:
                    return code
            except Exception:
                continue

        # Nothing found
        if candidates:
            # return the first candidate if we have any fuzzy matches
            return candidates[0]

        return None

    origin_code = _find_iata_code(origin)
    dest_code = _find_iata_code(destination)

    if not origin_code or not dest_code:
        details = []
        if not origin_code:
            details.append(f"origin='{origin}'")
        if not dest_code:
            details.append(f"destination='{destination}'")
        return {"error": f"Could not determine IATA codes for: {', '.join(details)}. Please provide city or airport (e.g., 'Ahmedabad (AMD)' or 'DEL')."}
    
    try:
        # Debug: show which IATA codes we are sending to SerpAPI
        print(f"SerpAPI request -> departure_id={origin_code}, arrival_id={dest_code}, outbound_date={date}")
        params = {
            "engine": "google_flights",
            # SerpAPI expects departure_id/arrival_id to be IATA code or start with '/m'
            "departure_id": origin_code,
            "arrival_id": dest_code,
            "outbound_date": date,
            "currency": "INR",
            "hl": "en",
            "api_key": SERPAPI_KEY
        }
        # If return_date provided, normalize and include it so SerpAPI performs a round-trip search
        if return_date:
            norm_ret = _parse_date_to_iso(return_date)
            if not norm_ret:
                # return a helpful error so the caller can ask user to re-specify return date
                return {"error": f"Invalid return_date format: {return_date}. Please provide YYYY-MM-DD or DD/MM/YYYY."}
            params["return_date"] = norm_ret
        search = GoogleSearch(params)
        results = search.get_dict()
        
        if "error" in results:
            return {"error": results["error"]}
        
        # Return the top 3 best flights
        return results.get("best_flights", [])[:3] 
        
    except Exception as e:
        print(f"SerpAPI Flight Error: {e}")
        return {"error": str(e)}

def get_hotel_options(destination, check_in_date, check_out_date, adults=2, budget=None):
    """
    Fetches hotel options using SerpAPI.
    Now accepts explicit check_in_date (YYYY-MM-DD) and check_out_date (YYYY-MM-DD), adults (int), and optional budget.
    Returns a list of normalized hotel objects or {"error": "..."}.
    """
    # Destination is required.
    if not destination:
        return {"error": "Missing hotel details (destination is required)."}

    # Validate presence of both dates
    if not check_in_date:
        return {"error": "Missing check_in_date parameter."}
    if not check_out_date:
        return {"error": "Missing check_out_date parameter."}

    # Mock fallback when SerpAPI key not present
    if not SERPAPI_KEY:
        mock_hotels = [
            {
                "name": f"Sample Hotel Central, {destination.title()}",
                "title": f"Sample Hotel Central - {destination.title()}",
                "price": "INR 2,500",
                "rating": "4.2",
                "address": f"Main Road, {destination.title()}",
                "reviews": "Sample reviews",
                "property_token": "mock-1",
                "gps_coordinates": {},
                "images": [],
                "amenities": ["Free WiFi", "Breakfast included"]
            },
            {
                "name": f"Comfort Stay {destination.title()}",
                "title": f"Comfort Stay - {destination.title()}",
                "price": "INR 1,800",
                "rating": "3.9",
                "address": f"Lake View, {destination.title()}",
                "reviews": "Sample reviews",
                "property_token": "mock-2",
                "gps_coordinates": {},
                "images": [],
                "amenities": ["Parking", "24/7 Reception"]
            }
        ]
        return mock_hotels

    # Normalize dates
    norm_in = _normalize_and_validate_date(check_in_date)
    norm_out = _normalize_and_validate_date(check_out_date)
    if not norm_in:
        return {"error": f"Invalid check_in_date format: {check_in_date}"}
    if not norm_out:
        return {"error": f"Invalid check_out_date format: {check_out_date}"}

    # Validate that check_out is after check_in
    try:
        from datetime import datetime
        d_in = datetime.fromisoformat(norm_in).date()
        d_out = datetime.fromisoformat(norm_out).date()
        if d_out <= d_in:
            return {"error": "check_out_date must be after check_in_date."}
    except Exception:
        pass

    # Normalize adults
    try:
        adults = int(adults) if adults else 2
    except Exception:
        adults = 2

    try:
        params = {
            "engine": "google_hotels",
            "q": f"hotels in {destination}",
            "check_in_date": norm_in,
            "check_out_date": norm_out,
            "adults": adults,
            "currency": "INR",
            "hl": "en",
            "api_key": SERPAPI_KEY
        }
        if budget:
            params["budget"] = budget

        search = GoogleSearch(params)
        results = search.get_dict()
        if "error" in results:
            return {"error": results["error"]}

        properties = results.get("properties", [])[:5]
        normalized_hotels = []
        for prop in properties:
            hotel = {
                "name": prop.get("title") or prop.get("name") or "Hotel",
                "title": prop.get("title") or prop.get("name") or "Hotel",
                "price": prop.get("price") or prop.get("lowest_price") or prop.get("rate") or "N/A",
                "rating": prop.get("rating") or prop.get("star_rating") or "",
                "address": prop.get("address") or prop.get("vicinity") or "",
                "reviews": prop.get("reviews") or "",
                "property_token": prop.get("property_token") or "",
                "gps_coordinates": prop.get("gps_coordinates") or {},
                "images": prop.get("images") or [],
                "amenities": prop.get("amenities") or []
            }
            normalized_hotels.append(hotel)

        return normalized_hotels if normalized_hotels else {"error": "No hotels found"}
    except Exception as e:
        print(f"SerpAPI Hotel Error: {e}")
        return {"error": str(e)}

def build_itinerary(destination, days, interests, budget, origin=None, transport=None, travelers=1, departure_date=None, return_date=None):
    """
    Build a structured itinerary object using Gemini. Returns a dict:
    {
        "summary": str,
        "estimated_budget": str,
        "day_by_day": [{"day": int, "title": str, "details": str}, ...]
    }
    Note: This function no longer fetches flight/hotel data - it only generates itinerary text.
    """
    # Build context string for the prompt
    origin_text = f" from {origin}" if origin else ""
    transport_text = ""
    if transport:
        if transport.lower() == "car":
            transport_text = "Private Car"
        elif transport.lower() == "flight":
            transport_text = "Flight"
        else:
            transport_text = transport.title()
    
    travelers_text = f"{travelers} Member{'s' if travelers > 1 else ''}" if travelers else "1 Member"
    budget_text = budget or "Not specified"
    if budget_text and budget_text.replace(",", "").replace("₹", "").replace("INR", "").strip().isdigit():
        budget_text = f"₹{budget_text.replace(',', '').replace('₹', '').replace('INR', '').strip()}"
    
    interests_text = ', '.join(interests) if interests else 'General travel'
    
    # Format dates if available
    date_text = ""
    if departure_date:
        try:
            from datetime import datetime
            dep_date = datetime.fromisoformat(departure_date).date()
            date_text = f"Travel Dates: {dep_date.strftime('%A, %B %d, %Y')}"
            if return_date:
                ret_date = datetime.fromisoformat(return_date).date()
                date_text += f" to {ret_date.strftime('%A, %B %d, %Y')}"
            else:
                date_text += f" (assume a {days}-day trip)"
        except:
            date_text = f"Travel Dates: {departure_date}" if departure_date else ""
    else:
        date_text = f"Travel Dates: Let's assume a {days}-day trip, e.g., Friday to Monday"
    
    prompt = f"""
    You are an expert travel planner specializing in creating highly detailed, comprehensive trip itineraries. Your task is to create a complete, actionable trip plan that provides travelers with specific times, locations, activities, and recommendations.
    
    **Trip Details:**
    - Destination: {destination}
    - Origin: {origin or 'Not specified'}
    - Duration: {days} days
    - Travelers: {travelers_text}
    - Mode of Travel: {transport_text or 'Not specified'}
    - Budget: {budget_text}
    - Interests: {interests_text}
    - {date_text}
    
    **CRITICAL INSTRUCTIONS - READ CAREFULLY:**
    
    **❌ ABSOLUTELY FORBIDDEN - DO NOT GENERATE:**
    - Generic text like "Explore [destination] - Visit local attractions, enjoy local cuisine, and experience the culture"
    - Repetitive content for each day
    - Vague descriptions without specific times, places, or activities
    - Short, undetailed itineraries
    
    **✅ REQUIRED - YOU MUST INCLUDE:**
    
    1. **Trip Plan Header Section** with:
       - Trip Plan Title (e.g., "Silvassa to Mumbai City Exploration: December 20-23, 2025")
       - Destination
       - Travel Dates with day names (e.g., "Saturday, December 20th, 2025, to Tuesday, December 23rd, 2025")
       - Number of Travelers
       - Mode of Travel
       - Budget Category
    
    2. **Travel & Accommodation Notes** section with practical information:
       - Driving time/distance from origin (if car travel) with specific details
       - Accommodation recommendations based on budget with specific area suggestions
       - In-city travel tips and transportation options
       - Seasonal context (e.g., "This is a great time to visit because...")
    
    3. **Detailed Day-by-Day Itinerary** - EACH day MUST include:
       - **Morning (specific time, e.g., 8:00 AM):** Specific activity at a named location with descriptive details
       - **Afternoon (specific time, e.g., 1:00 PM):** Specific activity at a named location with restaurant/cafe recommendations
       - **Evening (specific time, e.g., 5:30 PM):** Specific activity at a named location with detailed descriptions
       - **Night (specific time, e.g., 8:00 PM):** Specific activity or dinner recommendation
       - Real, actual places that exist in {destination}
       - Cultural context and local insights
       - Practical tips (e.g., "best time to visit", "parking available", etc.)
    
    4. **Estimated Budget Breakdown** with detailed line items:
       - Accommodation costs per night
       - Food & Drinks (breakfast, lunch, dinner estimates)
       - Fuel/Tolls/Transportation costs
       - Activities, Entry Fees & Entertainment
       - Parking/Misc expenses
       - Total Estimated Cost
    
    5. **Next Steps/Follow-up Questions** section
    
    **EXAMPLE OF GOOD ITINERARY FORMAT:**
    
    **Day 1 (Saturday, Dec 20): Arrival & Festive Evening in Bandra**
    - **Morning (8:00 AM):** Enjoy a scenic drive from [origin] to {destination} (approx. 3-4 hours). Take breaks at recommended rest stops.
    - **Afternoon (1:00 PM):** Check into your hotel. For a {budget_text if budget_text != 'Not specified' else 'moderate'} budget, I'd suggest looking for hotels in areas like [specific area names]. They are well-connected and have great food options.
    - **Evening (5:30 PM):** Head to [specific area name]. You can visit the beautiful [specific landmark name], stroll along the [specific promenade/area], and see [specific attraction]. The area will be beautifully lit up.
    - **Night (8:00 PM):** Enjoy dinner at [specific restaurant type/name] and experience [specific local activity].
    
    **Day 2 (Sunday, Dec 21): Exploring [Specific Area] Heritage**
    - **Morning (9:00 AM):** Drive to [specific area] and start at the iconic **[Specific Landmark Name]**. Take in the view of [nearby attraction]. Spend time exploring [specific details].
    - **Afternoon (1:00 PM):** Explore the bustling **[Specific Market/Area]** for some fun street shopping and have lunch at a classic [destination] cafe like [specific cafe names].
    - **Evening (5:30 PM):** Experience the magic of **[Specific Location]** as the city lights come on. It's the perfect spot for a relaxing walk.
    
    **OUTPUT FORMAT:**
    You must output ONLY valid JSON with this exact structure:
    {{
      "summary": "A comprehensive trip plan text (minimum 1000 words) that includes ALL sections above: Trip Plan Header with travel dates, Travel & Accommodation Notes with specific recommendations, Detailed Day-by-Day Itinerary with specific times (Morning/Afternoon/Evening/Night), locations, and activities, Estimated Budget Breakdown with line items, and Next Steps with follow-up questions. Format it as a complete, readable document. DO NOT use generic text - every sentence must have specific details, names, and actionable information.",
      "estimated_budget": "A detailed budget breakdown text with specific line items: Accommodation: ₹X per night, Food & Drinks: ₹X per day, Transportation: ₹X, Activities & Entry Fees: ₹X, Misc: ₹X, Total Estimated Cost: ₹X for {travelers_text}",
      "day_by_day": [
        {{
          "day": 1,
          "title": "Day 1 (Saturday, Dec 20): Arrival & [Specific Theme/Area Name]",
          "details": "**Morning (8:00 AM):** [Specific activity with named location and detailed description - minimum 2-3 sentences]. **Afternoon (1:00 PM):** [Specific activity with restaurant/cafe names and details - minimum 2-3 sentences]. **Evening (5:30 PM):** [Specific activity at named location with cultural context - minimum 2-3 sentences]. **Night (8:00 PM):** [Specific dinner recommendation or evening activity with details - minimum 2-3 sentences]."
        }},
        {{
          "day": 2,
          "title": "Day 2 (Sunday, Dec 21): [Specific Theme/Area Name] Exploration",
          "details": "**Morning (9:00 AM):** [Specific activity with named landmark and detailed description - minimum 2-3 sentences]. **Afternoon (1:00 PM):** [Specific activity at named market/area with restaurant recommendations - minimum 2-3 sentences]. **Evening (5:30 PM):** [Specific activity at named location with timing tips and descriptions - minimum 2-3 sentences]. **Night (8:00 PM):** [Specific evening activity or dinner recommendation with details - minimum 2-3 sentences]."
        }}
      ]
    }}
    
    **CRITICAL REQUIREMENTS:**
    - The "summary" field MUST be at least 1000 words and include ALL sections mentioned above
    - Each day in "day_by_day" MUST have specific times, named locations, and detailed activities
    - Each time slot (Morning/Afternoon/Evening/Night) must have at least 2-3 sentences with specific details
    - Include real, actual places, landmarks, markets, restaurants that exist in {destination}
    - Add cultural context, seasonal information, and practical tips
    - Make the itinerary realistic, practical, and engaging
    - The budget breakdown must be detailed with specific amounts
    - Ensure the "day_by_day" array has exactly {days} entries, each unique and detailed
    - DO NOT repeat the same generic text for multiple days
    - Each day must have a different theme, different areas, and different activities
    
    Return ONLY the JSON object, no additional text or explanations before or after the JSON.
    """
    
    try:
        svc = _get_gemini_service()
        if not svc:
            raise Exception("Gemini service unavailable")
        response = svc.generate_chat_response(prompt)
        cleaned = (response or "").strip().replace("```json", "").replace("```", "")
        
        # Try to extract JSON if it's wrapped in text
        import re
        json_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if json_match:
            cleaned = json_match.group(0)
        
        data = json.loads(cleaned)
        # Minimal validation
        if not isinstance(data, dict):
            raise ValueError("Itinerary response was not a JSON object")
        
        # Ensure all required fields exist
        data.setdefault("summary", "")
        data.setdefault("estimated_budget", "")
        if not isinstance(data.get("day_by_day"), list):
            data["day_by_day"] = []
        
        # Validate and enhance day_by_day entries
        generic_patterns = [
            "explore", "visit local attractions", "enjoy local cuisine", 
            "experience the culture", "visit local", "explore the area"
        ]
        
        # Check if day_by_day entries are too generic
        for day_info in data.get("day_by_day", []):
            if isinstance(day_info, dict):
                details = day_info.get("details", "").lower()
                title = day_info.get("title", "").lower()
                # If details are generic and short, try to enhance
                if details and len(details) < 100:
                    # Check if it contains generic patterns
                    is_generic = any(pattern in details for pattern in generic_patterns)
                    if is_generic:
                        print(f"Warning: Day {day_info.get('day')} has generic content, but will use AI-generated content")
        
        # Validate summary is detailed enough
        summary = data.get("summary", "")
        if summary:
            # Check if summary is too short or generic
            if len(summary) < 500:
                print(f"Warning: Summary is short ({len(summary)} chars), but will use AI-generated content")
            # Check for generic patterns in summary
            summary_lower = summary.lower()
            generic_count = sum(1 for pattern in generic_patterns if pattern in summary_lower)
            if generic_count >= 3 and len(summary) < 800:
                print(f"Warning: Summary may be too generic, but will use AI-generated content")
        
        # If summary is empty but day_by_day has content, create summary from day_by_day
        if not data.get("summary") and data.get("day_by_day"):
            summary_parts = [f"Here's your {days}-day itinerary for {destination}:"]
            for day_info in data["day_by_day"][:3]:  # First 3 days
                if isinstance(day_info, dict):
                    day_num = day_info.get("day", "")
                    title = day_info.get("title", "")
                    if day_num and title:
                        summary_parts.append(f"Day {day_num}: {title}")
            data["summary"] = "\n".join(summary_parts)
        
        # Ensure we have exactly the right number of days
        if len(data.get("day_by_day", [])) != int(days):
            print(f"Warning: Expected {days} days but got {len(data.get('day_by_day', []))} days in response")
        
        return data
    except Exception as e:
        print(f"Itinerary generation error: {e}")
        import traceback
        traceback.print_exc()
        # Fallback structure with actual content
        fallback_summary = f"Here's a {days}-day trip plan to {destination}:\n\n"
        fallback_days = []
        for day in range(1, int(days) + 1):
            fallback_summary += f"Day {day}: Explore {destination} - Visit local attractions, enjoy local cuisine, and experience the culture.\n"
            fallback_days.append({
                "day": day,
                "title": f"Day {day} in {destination}",
                "details": f"Explore {destination}, visit local attractions, enjoy local cuisine, and experience the culture."
            })
        return {
            "summary": fallback_summary,
            "estimated_budget": f"Estimated budget: {budget or 'Not specified'}",
            "day_by_day": fallback_days
        }


def get_attractions(destination):
    """
    Fetches tourist attractions using SerpAPI Google Maps engine.
    Returns a list of attractions with name, rating, and address.
    """
    if not destination or not SERPAPI_KEY:
        return {"error": "Missing destination or API key."}
    
    try:
        params = {
            "engine": "google_maps",
            "q": f"tourist attractions in {destination}",
            "type": "search",
            "api_key": SERPAPI_KEY
        }
        
        search = GoogleSearch(params)
        results = search.get_dict()
        
        if "error" in results:
            return {"error": results["error"]}
        
        # Extract local_results from Google Maps search
        local_results = results.get("local_results", [])
        
        # Format attractions data
        attractions = []
        for item in local_results[:10]:  # Top 10 attractions
            attraction = {
                "name": item.get("title", ""),
                "rating": item.get("rating", ""),
                "address": item.get("address", ""),
                "reviews": item.get("reviews", ""),
                "type": item.get("type", ""),
                "gps_coordinates": item.get("gps_coordinates", {})
            }
            if attraction["name"]:  # Only add if we have a name
                attractions.append(attraction)
        
        return attractions if attractions else {"error": "No attractions found"}
        
    except Exception as e:
        print(f"SerpAPI Attractions Error: {e}")
        return {"error": str(e)}


def modify_trip_plan(user_message, current_plan):
    """
    Modifies an existing trip plan based on user's natural language request.
    Uses Gemini to understand the modification intent and updates the plan accordingly.
    
    Args:
        user_message: The user's modification request (e.g., "change hotel to a luxury one")
        current_plan: The current trip plan object
    
    Returns:
        tuple: (modified_plan, bot_reply_text)
    """
    try:
        # Extract details from current plan
        details = current_plan.get('details', {})
        destination = details.get('destination', '')
        departure_date = details.get('departure_date', '')
        budget = details.get('budget', '')
        
        # Use Gemini to understand the modification intent
        intent_prompt = f"""
        You are a trip planning assistant. A user wants to modify their existing trip plan.
        
        **Current Trip Plan:**
        Destination: {destination}
        Departure Date: {departure_date}
        Budget: {budget}
        Current Hotels: {json.dumps(current_plan.get('hotels', []), indent=2)}
        Current Flights: {json.dumps(current_plan.get('flights', []), indent=2)}
        
        **User's Request:**
        "{user_message}"
        
        Analyze the user's request and determine what they want to modify. Return ONLY a JSON object with this structure:
        {{
            "intent": "change_hotel" | "edit_itinerary" | "change_flight" | "other",
            "details": {{
                "action": "specific action description",
                "parameters": {{}}
            }}
        }}
        
        Examples:
        - "change hotel to luxury" → {{"intent": "change_hotel", "details": {{"action": "find luxury hotels", "parameters": {{"budget_level": "luxury"}}}}}}
        - "add more beach activities" → {{"intent": "edit_itinerary", "details": {{"action": "add beach activities to itinerary"}}}}
        - "find cheaper flights" → {{"intent": "change_flight", "details": {{"action": "find cheaper flight options"}}}}
        """
        
        svc = _get_gemini_service()
        if not svc:
            intent_response = ""
        else:
            intent_response = svc.generate_chat_response(intent_prompt)
        # Clean JSON response
        intent_json = intent_response.strip().replace("```json", "").replace("```", "")
        try:
            intent_data = json.loads(intent_json)
        except json.JSONDecodeError:
            # If JSON parsing fails, try to extract JSON from the response
            import re
            json_match = re.search(r'\{[^{}]*"intent"[^{}]*\}', intent_json)
            if json_match:
                intent_data = json.loads(json_match.group())
            else:
                # Default to 'other' intent if parsing fails
                intent_data = {"intent": "other", "details": {"action": "general modification"}}
        
        intent = intent_data.get('intent', 'other')
        modified_plan = current_plan.copy()
        bot_reply = ""
        
        if intent == 'change_hotel':
            # Fetch new hotel options
            new_budget = intent_data.get('details', {}).get('parameters', {}).get('budget_level', budget)
            # Try to compute a sensible check_out_date from current plan details if available
            check_in = departure_date
            check_out = details.get('return_date') or details.get('departure_date')
            if not check_out and details.get('days'):
                try:
                    from datetime import datetime as _dt
                    ci = _dt.fromisoformat(check_in).date()
                    check_out = (ci + timedelta(days=int(details.get('days')))).isoformat()
                except Exception:
                    check_out = check_in

            hotel_options = get_hotel_options(destination, check_in, check_out, adults=details.get('adults') or 2, budget=new_budget)
            
            # Check if hotel_options is valid (not an error dict)
            if hotel_options and (not isinstance(hotel_options, dict) or 'error' not in hotel_options):
                if isinstance(hotel_options, list):
                    modified_plan['hotels'] = hotel_options
                elif hotel_options:
                    modified_plan['hotels'] = [hotel_options]
                else:
                    modified_plan['hotels'] = []
                
                if modified_plan['hotels']:
                    bot_reply = f"I've updated your hotel options. Found {len(modified_plan['hotels'])} new hotel(s) matching your preferences."
                else:
                    bot_reply = "I couldn't find new hotel options at this time. Please try again later."
            else:
                bot_reply = "I couldn't find new hotel options at this time. Please try again later."
                
        elif intent == 'change_flight':
            # Fetch new flight options
            origin = details.get('origin', '')
            return_date = details.get('return_date', '')
            flight_options = get_flight_options(origin, destination, departure_date, return_date)
            
            # Check if flight_options is valid (not an error dict)
            if flight_options and (not isinstance(flight_options, dict) or 'error' not in flight_options):
                if isinstance(flight_options, list):
                    modified_plan['flights'] = flight_options
                elif flight_options:
                    modified_plan['flights'] = [flight_options]
                else:
                    modified_plan['flights'] = []
                
                if modified_plan['flights']:
                    bot_reply = f"I've updated your flight options. Found {len(modified_plan['flights'])} new flight(s)."
                else:
                    bot_reply = "I couldn't find new flight options at this time. Please try again later."
            else:
                bot_reply = "I couldn't find new flight options at this time. Please try again later."
                
        elif intent == 'edit_itinerary':
            # Use Gemini to modify the itinerary text
            itinerary_prompt = f"""
            You are updating a travel itinerary based on user feedback.
            
            **Current Itinerary:**
            {current_plan.get('itinerary_text', '')}
            
            **User's Request:**
            "{user_message}"
            
            **Trip Details:**
            Destination: {destination}
            Duration: {details.get('days', '')} days
            Interests: {', '.join(details.get('interests', []))}
            
            Please update the itinerary according to the user's request. Keep the same structure and format.
            Return only the updated itinerary text.
            """
            
            svc = _get_gemini_service()
            if not svc:
                updated_itinerary = "I couldn't update the itinerary at this time."
            else:
                updated_itinerary = svc.generate_chat_response(itinerary_prompt)
            modified_plan['itinerary_text'] = updated_itinerary
            bot_reply = "I've updated your itinerary based on your request."
            
        else:
            # Generic modification - use Gemini to understand and apply changes
            modification_prompt = f"""
            You are helping modify a trip plan. Here's the current plan:
            
            {json.dumps(current_plan, indent=2)}
            
            The user wants to: "{user_message}"
            
            Please return a JSON object with the modified plan. Keep the same structure but update the relevant fields.
            Return ONLY the JSON object, no additional text.
            """
            
            svc = _get_gemini_service()
            if not svc:
                bot_reply = "I understand your request, but I need more specific details. Could you clarify what you'd like to change?"
            else:
                modification_response = svc.generate_chat_response(modification_prompt)
                modification_json = modification_response.strip().replace("```json", "").replace("```", "")
                try:
                    modified_plan = json.loads(modification_json)
                    bot_reply = "I've updated your trip plan based on your request."
                except:
                    bot_reply = "I understand your request, but I need more specific details. Could you clarify what you'd like to change?"
        
        return modified_plan, bot_reply
        
    except Exception as e:
        print(f"Error in modify_trip_plan: {e}")
        import traceback
        traceback.print_exc()
        return current_plan, f"Sorry, I encountered an error while modifying your trip: {str(e)}"