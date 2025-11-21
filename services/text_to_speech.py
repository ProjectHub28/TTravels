# File: services/text_to_speech.py
import os
from elevenlabs.client import ElevenLabs
from elevenlabs import save

class ElevenLabsService:
    def __init__(self):
        """Initializes the ElevenLabs client."""
        self.client = None
        try:
            elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
            if not elevenlabs_api_key:
                raise ValueError("ELEVENLABS_API_KEY environment variable not found!")
            self.client = ElevenLabs(api_key=elevenlabs_api_key)
            print("✅ ElevenLabs Service Initialized successfully.")
        except Exception as e:
            print(f"❌ Error initializing ElevenLabs Service: {e}")

    def text_to_speech(self, text_to_synthesize):
        """Converts text into speech audio bytes.

        Returns:
            bytes OR (bytes, metadata_dict)
        """
        if not self.client:
            return None
        try:
            # The ElevenLabs client may return an iterator/stream of bytes
            audio_stream = self.client.text_to_speech.convert(
                voice_id="21m00Tcm4TlvDq8ikWAM",  # Voice ID for "Rachel"
                text=text_to_synthesize,
                model_id="eleven_multilingual_v2"
            )
            # Normalize stream -> bytes
            audio_bytes = b"".join(chunk for chunk in audio_stream)

            # Best-effort MIME detection: ElevenLabs typically returns mp3; prefer mp3
            metadata = {"mime": "audio/mpeg", "source": "elevenlabs"}
            return (audio_bytes, metadata)
        except Exception as e:
            print(f"❌ ElevenLabs TTS Error: {e}")
            return None

# Create a single instance
tts_service = ElevenLabsService()