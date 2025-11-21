import os
import whisper
import tempfile
import logging
from typing import Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SpeechToTextService:
    def __init__(self, model_size: str = "base"):
        """
        Initialize the Speech-to-Text service using OpenAI Whisper.
        
        Args:
            model_size: Whisper model size ("tiny", "base", "small", "medium", "large")
        """
        self.model_size = model_size
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the Whisper model."""
        try:
            logger.info(f"Loading Whisper model: {self.model_size}")
            self.model = whisper.load_model(self.model_size)
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            raise
    
    def transcribe_audio(self, file_path: str, language: Optional[str] = None) -> Tuple[str, dict]:
        """
        Transcribe audio file to text using Whisper.
        
        Args:
            file_path: Path to the audio file
            language: Optional language code (e.g., 'en', 'hi', 'es')
            
        Returns:
            Tuple of (transcribed_text, metadata)
        """
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Audio file not found: {file_path}")
            
            # Configure transcription options
            options = {
                "language": language,
                "task": "transcribe",
                "fp16": False,  # Use fp32 for better compatibility
            }
            
            # Remove None values
            options = {k: v for k, v in options.items() if v is not None}
            
            logger.info(f"Transcribing audio: {file_path}")
            result = self.model.transcribe(file_path, **options)
            
            transcribed_text = result["text"].strip()
            metadata = {
                "language": result.get("language", "unknown"),
                "duration": result.get("segments", [{}])[-1].get("end", 0) if result.get("segments") else 0,
                "segments": len(result.get("segments", [])),
                "confidence": self._calculate_confidence(result.get("segments", []))
            }
            
            logger.info(f"Transcription completed. Text: {transcribed_text[:100]}...")
            return transcribed_text, metadata
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise
    
    def _calculate_confidence(self, segments: list) -> float:
        """Calculate average confidence from segments."""
        if not segments:
            return 0.0
        
        total_confidence = 0
        count = 0
        
        for segment in segments:
            if "no_speech_prob" in segment:
                # Convert no_speech_prob to confidence
                confidence = 1.0 - segment["no_speech_prob"]
                total_confidence += confidence
                count += 1
        
        return total_confidence / count if count > 0 else 0.0
    
    def transcribe_audio_file(self, audio_file, language: Optional[str] = None) -> Tuple[str, dict]:
        """
        Transcribe audio file object to text.
        
        Args:
            audio_file: File object from Flask request
            language: Optional language code
            
        Returns:
            Tuple of (transcribed_text, metadata)
        """
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            audio_file.save(temp_file.name)
            temp_file.flush()
            
            try:
                return self.transcribe_audio(temp_file.name, language)
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_file.name)
                except OSError:
                    pass

# Global instance
stt_service = SpeechToTextService()

def transcribe_audio(file_path: str) -> str:
    """
    Legacy function for backward compatibility.
    
    Args:
        file_path: Path to the audio file
        
    Returns:
        Transcribed text
    """
    text, _ = stt_service.transcribe_audio(file_path)
    return text
