# """Lightweight Gemini service shim.

# This module provides a small wrapper around the Google/Generative Gemini SDK when
# available. It intentionally falls back to a safe, non-throwing reply when the SDK
# or API key is not present so the Flask app doesn't crash on import.

# Install the official package and set GEMINI_API_KEY to enable full functionality:
#     pip install google-generative-ai
#     set GEMINI_API_KEY=<your-key>
# """
# import os
# import logging

# logger = logging.getLogger(__name__)

# # Try to import the common google generative ai package. If it's not available
# # we will continue but operate in a degraded (fallback) mode.
# try:
#     import google.generativeai as genai
# except Exception:
#     genai = None


# class GeminiService:
#     def __init__(self):
#         self.api_key = os.getenv('GEMINI_API_KEY')
#         self.enabled = bool(self.api_key and genai is not None)

#         if self.enabled:
#             try:
#                 # The google.generativeai package exposes a configure helper in
#                 # newer versions. If present, use it; otherwise leave the SDK
#                 # as-is and rely on the package's defaults.
#                 if hasattr(genai, 'configure'):
#                     genai.configure(api_key=self.api_key)
#                 logger.info('Gemini service initialized (SDK detected).')
#             except Exception as e:
#                 logger.warning(f'Failed to configure Gemini SDK: {e}')
#                 self.enabled = False
#         else:
#             if not genai:
#                 logger.info('Gemini SDK not installed; running in fallback mode.')
#             elif not self.api_key:
#                 logger.info('GEMINI_API_KEY not set; Gemini disabled.')

#     def generate_chat_response(self, prompt: str) -> str:
#         """Generate a short reply for the given prompt.

#         If the real Gemini SDK + API key is available this will attempt to call it.
#         Otherwise the function returns a safe fallback message so the app keeps
#         running while you enable/configure the real service.
#         """
#         if not self.enabled:
#             # Clear, non-technical fallback so the user sees a useful message.
#             return (
#                 "Sorry — the AI backend (Gemini) is not configured on this server. "
#                 "Please set GEMINI_API_KEY and install the google-generative-ai package."
#             )

#         try:
#             # Try a few common SDK shapes so this shim works across versions.
#             # 1) google.generativeai.chat.create (recent versions)
#             if hasattr(genai, 'chat') and hasattr(genai.chat, 'create'):
#                 resp = genai.chat.create(model='gemini-1.5', messages=[{'role': 'user', 'content': prompt}])
#                 # Extract sensible text from response object
#                 try:
#                     return resp.choices[0].message.get('content') or str(resp)
#                 except Exception:
#                     return str(resp)

#             # 2) google.generativeai.generate (older/simple interface)
#             if hasattr(genai, 'generate'):
#                 resp = genai.generate(model='text-bison-001', prompt=prompt)
#                 # Some versions expose .text
#                 if hasattr(resp, 'text'):
#                     return resp.text
#                 return str(resp)

#             # 3) As a last resort try models.generate_content (if present)
#             if hasattr(genai, 'models') and hasattr(genai.models, 'generate_content'):
#                 resp = genai.models.generate_content(model='gemini-2.5-flash', contents=prompt)
#                 return getattr(resp, 'text', str(resp))

#             # Unknown API shape — return stringified response so behavior is visible
#             logger.warning('Gemini SDK present but API shape unrecognized; returning raw result.')
#             return 'Gemini SDK present but unable to call it with this shim.'

#         except Exception as e:
#             logger.exception('Error while calling Gemini SDK')
#             return f"Sorry, the assistant encountered an error: {e}"


# # Single global instance for importers to use
# gemini_service = GeminiService()


# File: services/gemini_service.py
import os
import google.generativeai as genai
import google.ai.generativelanguage as glm

class GeminiService:
    def __init__(self):
        """Initializes the Gemini client and models."""
        self.stt_model = None
        self.chat_model = None
        try:
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            if not gemini_api_key:
                raise ValueError("GEMINI_API_KEY environment variable not found!")
            genai.configure(api_key=gemini_api_key)

            # Use the correct models available to your key
            self.stt_model = genai.GenerativeModel('gemini-2.5-flash')
            self.chat_model = genai.GenerativeModel('gemini-2.5-pro')
            print("✅ Gemini Service Initialized successfully.")
        except Exception as e:
            print(f"❌ Error initializing Gemini Service: {e}")

    def speech_to_text(self, audio_file_bytes, mime_type='audio/webm'):
        """Transcribes audio bytes into text."""
        if not self.stt_model:
            return None
        try:
            audio_file_part = glm.Part(inline_data=glm.Blob(mime_type=mime_type, data=audio_file_bytes))
            prompt_parts = ["Please transcribe the following audio:", audio_file_part]
            response = self.stt_model.generate_content(prompt_parts)
            return response.text.strip()
        except Exception as e:
            print(f"❌ Gemini STT Error: {e}")
            return None

    def generate_chat_response(self, prompt):
        """Generates a conversational response from a full prompt."""
        if not self.chat_model:
            return "Error: Chat model not initialized."
        try:
            response = self.chat_model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"❌ Gemini Conversation Error: {e}")
            return "Sorry, I encountered an error. Please try again."

# Create a single instance to be used across the app
gemini_service = GeminiService()