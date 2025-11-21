import logging
from typing import Optional, Tuple, Dict, List
from deep_translator import GoogleTranslator, single_detection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TranslationService:
    def __init__(self):
        """
        Initialize the Translation service using Deep Translator.
        """
        # Language code mapping for better compatibility
        self.language_codes = {
            'english': 'en',
            'hindi': 'hi',
            'spanish': 'es',
            'french': 'fr',
            'german': 'de',
            'italian': 'it',
            'portuguese': 'pt',
            'russian': 'ru',
            'japanese': 'ja',
            'korean': 'ko',
            'chinese': 'zh',
            'arabic': 'ar',
            'bengali': 'bn',
            'tamil': 'ta',
            'telugu': 'te',
            'marathi': 'mr',
            'gujarati': 'gu',
            'kannada': 'kn',
            'malayalam': 'ml',
            'punjabi': 'pa',
            'urdu': 'ur'
        }
        
        # Supported languages by deep-translator
        self.supported_languages = {
            'en': 'english', 'hi': 'hindi', 'es': 'spanish', 'fr': 'french',
            'de': 'german', 'it': 'italian', 'pt': 'portuguese', 'ru': 'russian',
            'ja': 'japanese', 'ko': 'korean', 'zh': 'chinese', 'ar': 'arabic',
            'bn': 'bengali', 'ta': 'tamil', 'te': 'telugu', 'mr': 'marathi',
            'gu': 'gujarati', 'kn': 'kannada', 'ml': 'malayalam', 'pa': 'punjabi',
            'ur': 'urdu', 'ne': 'nepali', 'si': 'sinhala', 'th': 'thai',
            'vi': 'vietnamese', 'tr': 'turkish', 'pl': 'polish', 'nl': 'dutch',
            'sv': 'swedish', 'da': 'danish', 'no': 'norwegian', 'fi': 'finnish'
        }
    
    def detect_language(self, text: str) -> Tuple[str, float]:
        """
        Detect the language of the given text.
        
        Args:
            text: Text to detect language for
            
        Returns:
            Tuple of (language_code, confidence)
        """
        try:
            detected_lang = single_detection(text)
            return detected_lang, 0.8  # Deep translator doesn't provide confidence
        except Exception as e:
            logger.error(f"Language detection failed: {e}")
            return 'en', 0.0
    
    def translate_text(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translate text from source language to target language.
        
        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code
            
        Returns:
            Translated text
        """
        if source_lang == target_lang:
            return text
        
        try:
            translator = GoogleTranslator(source=source_lang, target=target_lang)
            result = translator.translate(text)
            return result
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return text
    
    def detect_and_translate(self, text: str, target_lang: str = 'en') -> Tuple[str, str, float]:
        """
        Detect language and translate text to target language.
        
        Args:
            text: Text to translate
            target_lang: Target language code
            
        Returns:
            Tuple of (translated_text, detected_lang, confidence)
        """
        detected_lang, confidence = self.detect_language(text)
        translated_text = self.translate_text(text, detected_lang, target_lang)
        
        logger.info(f"Translated from {detected_lang} to {target_lang} (confidence: {confidence:.2f})")
        return translated_text, detected_lang, confidence
    
    def translate_back(self, text: str, target_lang: str, source_lang: str = 'en') -> str:
        """
        Translate text back to target language.
        
        Args:
            text: Text to translate
            target_lang: Target language code
            source_lang: Source language code
            
        Returns:
            Translated text
        """
        return self.translate_text(text, source_lang, target_lang)
    
    def get_supported_languages(self) -> List[Dict[str, str]]:
        """
        Get list of supported languages.
        
        Returns:
            List of language dictionaries
        """
        try:
            languages = []
            for code, name in self.supported_languages.items():
                languages.append({
                    'code': code,
                    'name': name
                })
            return languages
        except Exception as e:
            logger.error(f"Failed to get supported languages: {e}")
            return []
    
    def is_language_supported(self, lang_code: str) -> bool:
        """
        Check if a language code is supported.
        
        Args:
            lang_code: Language code to check
            
        Returns:
            True if supported, False otherwise
        """
        return lang_code in self.supported_languages
    
    def normalize_language_code(self, lang_input: str) -> str:
        """
        Normalize language input to standard language code.
        
        Args:
            lang_input: Language name or code
            
        Returns:
            Normalized language code
        """
        # Check if it's already a code
        if len(lang_input) == 2:
            return lang_input.lower()
        
        # Check if it's a language name
        normalized = self.language_codes.get(lang_input.lower(), lang_input.lower())
        return normalized

# Global instance
translation_service = TranslationService()

def detect_and_translate(text: str, target_lang: str = 'en') -> Tuple[str, str]:
    """
    Legacy function for backward compatibility.
    
    Args:
        text: Text to translate
        target_lang: Target language code
        
    Returns:
        Tuple of (translated_text, detected_lang)
    """
    translated_text, detected_lang, _ = translation_service.detect_and_translate(text, target_lang)
    return translated_text, detected_lang

def translate_back(text: str, target_lang: str, source_lang: str = 'en') -> str:
    """
    Legacy function for backward compatibility.
    
    Args:
        text: Text to translate
        target_lang: Target language code
        source_lang: Source language code
        
    Returns:
        Translated text
    """
    return translation_service.translate_back(text, target_lang, source_lang)
